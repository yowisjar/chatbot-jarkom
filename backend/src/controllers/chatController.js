const pool = require('../config/database');
const { generateAnswer } = require('../services/ragService');
const { GeminiError } = require('../services/geminiService');

// Buat judul otomatis dari pesan pertama
const generateTitle = (message) => {
  const cleaned = message.replace(/[?!.,]/g, '').trim();
  return cleaned.length > 50 ? cleaned.substring(0, 50) + '...' : cleaned;
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
  try {
    // Pastikan session milik user ini
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
  const { session_id, message } = req.body;

  if (!session_id || !message || !message.trim()) {
    return res.status(400).json({ message: 'session_id dan message wajib diisi' });
  }

  try {
    // Validasi session milik user ini
    const sessionCheck = await pool.query(
      'SELECT * FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [session_id, req.user.id]
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Chat session tidak ditemukan' });
    }

    const session = sessionCheck.rows[0];

    // Simpan pesan user
    await pool.query(
      'INSERT INTO chat_messages (session_id, sender, message) VALUES ($1, $2, $3)',
      [session_id, 'user', message.trim()]
    );

    // Ambil history percakapan untuk konteks AI (max 10 pesan terakhir)
    const historyResult = await pool.query(
      `SELECT sender, message FROM chat_messages
       WHERE session_id = $1
       ORDER BY created_at DESC LIMIT 10`,
      [session_id]
    );
    const history = historyResult.rows.reverse();

    // Format history untuk Gemini service
    const conversationHistory = history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.message,
    }));

    const { reply: botReply, source, materialsUsed, references } = await generateAnswer(
      message.trim(),
      conversationHistory,
      session_id
    );

    // Simpan balasan bot
    await pool.query(
      'INSERT INTO chat_messages (session_id, sender, message) VALUES ($1, $2, $3)',
      [session_id, 'bot', botReply]
    );

    // Auto update judul jika masih "Chat Baru" (dari pesan pertama)
    if (session.title === 'Chat Baru') {
      const newTitle = generateTitle(message);
      await pool.query(
        'UPDATE chat_sessions SET title = $1, updated_at = NOW() WHERE id = $2',
        [newTitle, session_id]
      );
    } else {
      await pool.query(
        'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
        [session_id]
      );
    }

    res.json({
      reply: botReply,
      source,
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

// DELETE /api/chats/:id — Hapus session chat
const deleteSession = async (req, res) => {
  const { id } = req.params;
  try {
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
