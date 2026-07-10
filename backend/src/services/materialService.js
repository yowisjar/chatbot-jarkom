const path = require('path');
const pool = require('../config/database');
const materialRepository = require('../repositories/materialRepository');
const { extractTextFromDocument, FILE_TYPE_LABELS } = require('./documentExtractorService');
const { splitTextIntoChunks, splitSegmentsIntoChunks } = require('./chunkService');

const DAILY_LIMIT_MESSAGE =
  'Batas upload file harian sudah tercapai. Maksimal 2 file per hari.';

class UploadLimitError extends Error {
  constructor(message = DAILY_LIMIT_MESSAGE) {
    super(message);
    this.name = 'UploadLimitError';
    this.statusCode = 429;
  }
}

class ConversationNotFoundError extends Error {
  constructor(message = 'Conversation tidak ditemukan') {
    super(message);
    this.name = 'ConversationNotFoundError';
    this.statusCode = 404;
  }
}

const sanitizeTitle = (title, filename) => {
  const trimmed = title?.trim();
  if (trimmed) return trimmed;

  return path.basename(filename, path.extname(filename)).replace(/[_-]/g, ' ');
};

const saveChunksForMaterial = async (materialId, content, segments = null) => {
  await materialRepository.deleteChunksByMaterialId(materialId);

  let chunkEntries;

  if (segments?.length) {
    chunkEntries = splitSegmentsIntoChunks(segments);
  } else {
    chunkEntries = splitTextIntoChunks(content).map((part) => ({
      content: part,
      slideNumber: null,
      slideTitle: null,
    }));
  }

  if (chunkEntries.length === 0) {
    return 0;
  }

  await materialRepository.saveMaterialChunks(materialId, chunkEntries);
  return chunkEntries.length;
};

const resolveConversationId = async (userId, conversationId) => {
  if (conversationId) {
    const parsedId = Number(conversationId);
    const check = await pool.query(
      'SELECT id FROM chat_sessions WHERE id = $1 AND user_id = $2',
      [parsedId, userId]
    );

    if (check.rows.length === 0) {
      throw new ConversationNotFoundError();
    }

    return parsedId;
  }

  const created = await pool.query(
    `INSERT INTO chat_sessions (user_id, title) VALUES ($1, $2) RETURNING id`,
    [userId, 'Chat Baru']
  );

  return created.rows[0].id;
};

const assertDailyUploadLimit = async (userId) => {
  const count = await materialRepository.countDailyUploadsByUser(userId);

  if (count >= materialRepository.DAILY_UPLOAD_LIMIT) {
    throw new UploadLimitError();
  }
};

/**
 * Upload dan proses file materi mahasiswa.
 * Menggunakan req.file.buffer (memoryStorage) — file tidak disimpan di disk.
 */
const uploadMaterialFile = async (file, title, { userId, conversationId }) => {
  await assertDailyUploadLimit(userId);

  const resolvedConversationId = await resolveConversationId(userId, conversationId);

  // Ekstrak teks langsung dari buffer (memoryStorage — tidak ada path fisik)
  const { text: extractedText, fileType, segments } = await extractTextFromDocument(
    file.buffer,
    file.originalname
  );

  const material = await materialRepository.createMaterial({
    title: sanitizeTitle(title, file.originalname),
    filename: file.originalname,
    filePath: null, // File tidak disimpan di disk
    fileType,
    content: extractedText,
    userId,
    conversationId: resolvedConversationId,
  });

  const chunksCreated = await saveChunksForMaterial(material.id, extractedText, segments);

  return {
    material,
    conversationId: resolvedConversationId,
    filename: file.originalname,
    fileType,
    fileTypeLabel: FILE_TYPE_LABELS[fileType] || fileType,
    charactersExtracted: extractedText.length,
    chunksCreated,
  };
};

const rechunkAllMaterials = async () => {
  const materials = await materialRepository.findMaterialsWithContent();
  let totalChunks = 0;

  for (const material of materials) {
    const chunksCreated = await saveChunksForMaterial(material.id, material.content);
    totalChunks += chunksCreated;
  }

  return {
    materialsProcessed: materials.length,
    totalChunks,
  };
};

const getMaterialsByConversation = async (conversationId, userId) => {
  return materialRepository.findMaterialsByConversation(conversationId, userId);
};

const getMaterialById = async (id, userId) => {
  return materialRepository.findMaterialById(id, userId);
};

const deleteMaterial = async (id, userId) => {
  const deleted = await materialRepository.deleteMaterialById(id, userId);

  if (!deleted) {
    return null;
  }

  // File tidak disimpan di disk (memoryStorage) — tidak perlu hapus file fisik

  return deleted;
};

module.exports = {
  uploadMaterialFile,
  uploadMaterialPdf: uploadMaterialFile,
  rechunkAllMaterials,
  saveChunksForMaterial,
  getMaterialsByConversation,
  getMaterialById,
  deleteMaterial,
  resolveConversationId,
  UploadLimitError,
  ConversationNotFoundError,
  DAILY_LIMIT_MESSAGE,
};
