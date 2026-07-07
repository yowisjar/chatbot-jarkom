const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const { generateAnswer } = require('../services/ragService');
const { GeminiError } = require('../services/geminiService');
const topicRepository = require('../repositories/topicRepository');

const DEFAULT_TITLES = new Set(['Chat Baru', 'New Chat']);

const isDefaultTitle = (title) => DEFAULT_TITLES.has(String(title || '').trim());

const generateTitle = (message) => {
  const cleaned = message.replace(/[?!.,]/g, '').trim();
  if (!cleaned) return 'Chat Baru';
  return cleaned.length > 50 ? `${cleaned.substring(0, 50)}...` : cleaned;
};

const removeConversationUploadFiles = async (sessionId, userId) => {
  const result = await pool.query(
    'SELECT file_path FROM materials WHERE conversation_id = $1 AND user_id = $2',
    [sessionId, userId]
  );

  for (const row of result.rows) {
    if (!row.file_path) continue;
    const absolutePath = path.join(__dirname, '../..', row.file_path);
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (err) {
      console.error('[Chat] Gagal hapus file upload:', row.file_path, err.message);
    }
  }
};

// POST /api/chats/new — Buat session baru
const createSession = async (req, res) => {
  try {
    const result = await pool.query(
      'INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING *',
      [req.user.id, 'Chat Baru']
    );
    res.status(201).json({ session: result.rows[0] });
  } catch (err) {
    console.error('Create session error:', err.message);
    res.status(500).json({ message: 'Gagal membuat chat baru' });
  }
};

// GET /api/chats — Ambil semua history chat user
const getSessions = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, created_at, updated_at
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [req.user.id]
    );
    res.json({ sessions: result.rows });
  } catch (err) {
    console.error('Get sessions error:', err.message);
    res.status(500).json({ message: 'Gagal mengambil history chat' });
  }
};

// GET /api/chats/:id — Ambil isi percakapan satu session
const getSessionMessages = async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: 'ID chat tidak valid' });
  }

  try {
    const sessionCheck = await pool.query(
      'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Chat tidak ditemukan' });
    }

    const messages = await pool.query(
      'SELECT id, sender, message, created_at FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [id]
    );
    res.json({ messages: messages.rows });
  } catch (err) {
    console.error('Get messages error:', err.message);
    res.status(500).json({ message: 'Gagal mengambil pesan' });
  }
};

// POST /api/chat — Kirim pesan dan dapatkan jawaban AI
const sendMessage = async (req, res) => {
  const { session_id, message, topicId } = req.body;

  if (!session_id || !message || !message.trim()) {
    return res.status(400).json({ message: 'session_id dan message wajib diisi' });
  }

  try {
    const sessionCheck = await pool.query(
      'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [session_id, req.user.id]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Chat session tidak ditemukan' });
    }

    const session = sessionCheck.rows[0];
    const trimmedMessage = message.trim();

    await pool.query(
      'INSERT INTO chat_messages (session_id, sender, message) VALUES ($1, $2, $3)',
      [session_id, 'user', trimmedMessage]
    );

    let sessionTitle = session.title;

    // Auto-rename sekali saat pesan pertama (sebelum AI, agar title tetap meski AI gagal)
    if (isDefaultTitle(session.title)) {
      sessionTitle = generateTitle(trimmedMessage);
      await pool.query(
        'UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2',
        [sessionTitle, session_id]
      );
    } else {
      await pool.query(
        'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
        [session_id]
      );
    }

    const historyResult = await pool.query(
      `SELECT sender, message FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [session_id]
    );
    const history = historyResult.rows.reverse();

    const conversationHistory = history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message,
    }));

    let aiQuestion = trimmedMessage;
    
    if (topicId) {
      try {
        const topic = await topicRepository.getTopicById(topicId);
        if (topic) {
          const promptParts = [];
          if (topic.title) promptParts.push(`Topik: ${topic.title}`);
          if (topic.meeting_number) promptParts.push(`Pertemuan ${topic.meeting_number}`);
          
          const targetText = [];
          if (topic.cpmk) targetText.push(topic.cpmk);
          if (topic.sub_cpmk) targetText.push(topic.sub_cpmk);
          
          if (targetText.length > 0) {
            promptParts.push('Target Pembelajaran\n' + targetText.join('\n'));
          }
          
          const internalContext = promptParts.join('\n\n');
          
          if (internalContext) {
            aiQuestion = `${trimmedMessage}\n\n[CONTEXT INTERNAL RPS]\n${internalContext}`;
          }
        }
      } catch (err) {
        console.error('[Chat] Gagal mengambil detail topik untuk internal context:', err.message);
      }
    }

    const { reply: botReply, source, materialsUsed, references } = await generateAnswer(
      aiQuestion,
      conversationHistory,
      session_id
    );

    await pool.query(
      'INSERT INTO chat_messages (session_id, sender, message) VALUES ($1, $2, $3)',
      [session_id, 'bot', botReply]
    );

    res.json({
      reply: botReply,
      source,
      sessionTitle,
      ...(materialsUsed && { materialsUsed }),
      references: references || [],
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error('[Chat] GeminiError internal:', err.message);
      return res.status(err.statusCode).json({ message: err.publicMessage });
    }
    console.error('Send message error:', err.message);
    res.status(500).json({ message: 'Gagal mendapatkan respons dari AI' });
  }
};

// DELETE /api/chats/:id — Hapus session chat (+ cascade messages & materials)
const deleteSession = async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: 'ID chat tidak valid' });
  }

  try {
    const sessionCheck = await pool.query(
      'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Chat tidak ditemukan' });
    }

    await removeConversationUploadFiles(id, req.user.id);

    const result = await pool.query(
      'DELETE FROM chat_sessions WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Chat tidak ditemukan' });
    }

    res.json({ message: 'Chat berhasil dihapus' });
  } catch (err) {
    console.error('Delete session error:', err.message);
    res.status(500).json({ message: 'Gagal menghapus chat' });
  }
};

module.exports = {
  createSession,
  getSessions,
  getSessionMessages,
  sendMessage,
  deleteSession,
};
