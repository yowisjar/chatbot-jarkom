const pool = require('../config/database');

const DAILY_UPLOAD_LIMIT = Number(process.env.MATERIAL_DAILY_UPLOAD_LIMIT) || 2;

const mapMaterialRow = (row) => ({
  id: row.id,
  title: row.title,
  filename: row.filename,
  file_path: row.file_path,
  file_type: row.file_type,
  content: row.content,
  user_id: row.user_id,
  conversation_id: row.conversation_id,
  uploaded_at: row.uploaded_at,
  is_global: row.is_global,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

const mapChunkRow = (row) => ({
  id: row.id,
  content: row.content,
  chunkIndex: row.chunk_index,
  materialId: row.material_id,
  materialTitle: row.material_title,
  slideNumber: row.slide_number != null ? Number(row.slide_number) : null,
  slideTitle: row.slide_title ?? null,
  score: row.score != null ? Number(row.score) : null,
});

const createMaterial = async ({
  title,
  filename,
  filePath,
  fileType,
  content,
  userId,
  conversationId,
}) => {
  const result = await pool.query(
    `INSERT INTO materials (title, filename, file_path, file_type, content, user_id, conversation_id, uploaded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     RETURNING id, title, filename, file_path, file_type, content, user_id, conversation_id, uploaded_at, is_global, created_at, updated_at`,
    [title, filename, filePath, fileType, content, userId, conversationId]
  );

  return mapMaterialRow(result.rows[0]);
};

const countDailyUploadsByUser = async (userId) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM materials
     WHERE user_id = $1
       AND uploaded_at::date = CURRENT_DATE`,
    [userId]
  );

  return result.rows[0].total;
};

const findMaterialsByConversation = async (conversationId, userId) => {
  const result = await pool.query(
    `SELECT m.id, m.title, m.filename, m.file_path, m.file_type,
            LENGTH(m.content) AS content_length,
            COUNT(mc.id)::int AS chunk_count,
            m.conversation_id, m.uploaded_at, m.created_at, m.updated_at
     FROM materials m
     LEFT JOIN material_chunks mc ON mc.material_id = m.id
     WHERE m.conversation_id = $1 AND m.user_id = $2
     GROUP BY m.id
     ORDER BY m.uploaded_at DESC`,
    [conversationId, userId]
  );

  return result.rows;
};

const findAllMaterials = async (userId, conversationId) => {
  if (conversationId) {
    return findMaterialsByConversation(conversationId, userId);
  }

  const result = await pool.query(
    `SELECT m.id, m.title, m.filename, m.file_path, m.file_type,
            LENGTH(m.content) AS content_length,
            COUNT(mc.id)::int AS chunk_count,
            m.conversation_id, m.uploaded_at, m.created_at, m.updated_at
     FROM materials m
     LEFT JOIN material_chunks mc ON mc.material_id = m.id
     WHERE m.user_id = $1
     GROUP BY m.id
     ORDER BY m.uploaded_at DESC`,
    [userId]
  );

  return result.rows;
};

const findMaterialById = async (id, userId) => {
  const result = await pool.query(
    `SELECT id, title, filename, file_path, file_type, content, user_id, conversation_id,
            uploaded_at, is_global, created_at, updated_at
     FROM materials
     WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  return result.rows[0] ? mapMaterialRow(result.rows[0]) : null;
};

const findMaterialsWithContent = async () => {
  const result = await pool.query(
    `SELECT id, title, content
     FROM materials
     WHERE content IS NOT NULL AND TRIM(content) != ''
     ORDER BY id ASC`
  );

  return result.rows;
};

const deleteMaterialById = async (id, userId) => {
  const result = await pool.query(
    `DELETE FROM materials WHERE id = $1 AND user_id = $2
     RETURNING id, title, filename, file_path`,
    [id, userId]
  );

  return result.rows[0] || null;
};

const deleteChunksByMaterialId = async (materialId) => {
  await pool.query('DELETE FROM material_chunks WHERE material_id = $1', [materialId]);
};

const createMaterialChunk = async ({ materialId, chunkIndex, content, slideNumber, slideTitle }) => {
  const result = await pool.query(
    `INSERT INTO material_chunks (material_id, chunk_index, content, slide_number, slide_title)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [materialId, chunkIndex, content, slideNumber ?? null, slideTitle ?? null]
  );

  return result.rows[0];
};

const saveMaterialChunks = async (materialId, chunks) => {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = typeof chunks[i] === 'string'
      ? { content: chunks[i], slideNumber: null, slideTitle: null }
      : chunks[i];

    await createMaterialChunk({
      materialId,
      chunkIndex: i,
      content: chunk.content,
      slideNumber: chunk.slideNumber,
      slideTitle: chunk.slideTitle,
    });
  }
  return chunks.length;
};

const buildConversationFilter = (conversationId, paramIndex) => ({
  clause: `AND m.conversation_id = $${paramIndex}`,
  params: [conversationId],
});

const searchByFullText = async (query, limit, conversationId) => {
  if (conversationId == null) {
    return [];
  }

  const sanitized = query.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!sanitized) {
    return [];
  }

  const filter = buildConversationFilter(conversationId, 3);

  const result = await pool.query(
    `SELECT
       mc.id,
       mc.content,
       mc.chunk_index,
       mc.slide_number,
       mc.slide_title,
       mc.material_id,
       m.title AS material_title,
       GREATEST(
         ts_rank(mc.content_tsv, plainto_tsquery('indonesian', $1)),
         ts_rank(mc.content_tsv, plainto_tsquery('simple', $1))
       ) AS score
     FROM material_chunks mc
     INNER JOIN materials m ON m.id = mc.material_id
     WHERE (
       mc.content_tsv @@ plainto_tsquery('indonesian', $1)
       OR mc.content_tsv @@ plainto_tsquery('simple', $1)
     )
       ${filter.clause}
     ORDER BY score DESC
     LIMIT $2`,
    [sanitized, limit, ...filter.params]
  );

  return result.rows.map(mapChunkRow);
};

const searchByKeywords = async (keywords, limit, conversationId) => {
  if (!keywords.length || conversationId == null) {
    return [];
  }

  const patterns = keywords.map((word) => `%${word}%`);
  const filter = buildConversationFilter(conversationId, 3);
  const keywordCount = Math.max(keywords.length, 1);

  const result = await pool.query(
    `SELECT
       mc.id,
       mc.content,
       mc.chunk_index,
       mc.slide_number,
       mc.slide_title,
       mc.material_id,
       m.title AS material_title,
       (
         SELECT COUNT(*)::float / $4
         FROM unnest($1::text[]) AS pattern
         WHERE mc.content ILIKE pattern OR m.title ILIKE pattern OR COALESCE(mc.slide_title, '') ILIKE pattern
       ) AS score
     FROM material_chunks mc
     INNER JOIN materials m ON m.id = mc.material_id
     WHERE (mc.content ILIKE ANY($1::text[])
        OR m.title ILIKE ANY($1::text[])
        OR COALESCE(mc.slide_title, '') ILIKE ANY($1::text[]))
       ${filter.clause}
     ORDER BY score DESC, mc.slide_number ASC NULLS LAST, mc.chunk_index ASC
     LIMIT $2`,
    [patterns, limit, ...filter.params, keywordCount]
  );

  return result.rows
    .map(mapChunkRow)
    .filter((chunk) => (chunk.score ?? 0) > 0);
};

const countMaterials = async () => {
  const result = await pool.query('SELECT COUNT(*)::int AS total FROM materials');
  return result.rows[0].total;
};

const countMaterialsInConversation = async (conversationId) => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS total FROM materials WHERE conversation_id = $1`,
    [conversationId]
  );
  return result.rows[0].total;
};

const searchBySlideNumber = async (slideNumber, limit, conversationId) => {
  if (conversationId == null || !slideNumber) return [];

  const filter = buildConversationFilter(conversationId, 3);

  const result = await pool.query(
    `SELECT
       mc.id,
       mc.content,
       mc.chunk_index,
       mc.slide_number,
       mc.slide_title,
       mc.material_id,
       m.title AS material_title,
       1.0 AS score
     FROM material_chunks mc
     INNER JOIN materials m ON m.id = mc.material_id
     WHERE mc.slide_number = $1
       ${filter.clause}
     ORDER BY mc.chunk_index ASC
     LIMIT $2`,
    [slideNumber, limit, ...filter.params]
  );

  return result.rows.map(mapChunkRow);
};

const searchByExactPhrases = async (phrases, limit, conversationId) => {
  if (!phrases.length || conversationId == null) return [];

  const patterns = phrases.map((p) => `%${p}%`);
  const filter = buildConversationFilter(conversationId, 3);
  const phraseCount = Math.max(phrases.length, 1);

  const result = await pool.query(
    `SELECT
       mc.id,
       mc.content,
       mc.chunk_index,
       mc.slide_number,
       mc.slide_title,
       mc.material_id,
       m.title AS material_title,
       (
         SELECT COUNT(*)::float / $4
         FROM unnest($1::text[]) AS pattern
         WHERE mc.content ILIKE pattern
            OR COALESCE(mc.slide_title, '') ILIKE pattern
            OR m.title ILIKE pattern
       ) AS score
     FROM material_chunks mc
     INNER JOIN materials m ON m.id = mc.material_id
     WHERE (mc.content ILIKE ANY($1::text[])
        OR COALESCE(mc.slide_title, '') ILIKE ANY($1::text[])
        OR m.title ILIKE ANY($1::text[]))
       ${filter.clause}
     ORDER BY score DESC
     LIMIT $2`,
    [patterns, limit, ...filter.params, phraseCount]
  );

  return result.rows
    .map((row) => ({
      ...mapChunkRow(row),
      score: Math.max(Number(row.score) * 1.5, 0.3),
    }))
    .filter((chunk) => (chunk.score ?? 0) > 0);
};

module.exports = {
  DAILY_UPLOAD_LIMIT,
  createMaterial,
  countDailyUploadsByUser,
  findMaterialsByConversation,
  findAllMaterials,
  findMaterialById,
  findMaterialsWithContent,
  deleteMaterialById,
  deleteChunksByMaterialId,
  createMaterialChunk,
  saveMaterialChunks,
  searchByFullText,
  searchByKeywords,
  searchBySlideNumber,
  searchByExactPhrases,
  countMaterials,
  countMaterialsInConversation,
};
