'use strict';

const pool = require('../config/database');

/**
 * Hapus SELURUH isi tabel rps_topics.
 * Dipanggil setiap kali RPS baru diupload agar tidak ada
 * data lama dari dokumen manapun yang tertinggal.
 */
const deleteAllTopics = async () => {
  await pool.query('DELETE FROM rps_topics');
};

/**
 * Hapus topik milik rpsDocumentId tertentu.
 * Utility — disimpan untuk keperluan selektif jika dibutuhkan.
 */
const deleteByRpsDocumentId = async (rpsDocumentId) => {
  await pool.query(
    'DELETE FROM rps_topics WHERE rps_document_id = $1',
    [rpsDocumentId]
  );
};

/**
 * Batch insert topik.
 * @param {number} rpsDocumentId
 * @param {Array<{meeting_number, topic_title, sub_cpmk, cpmk, references}>} topics
 */
const insertTopics = async (rpsDocumentId, topics) => {
  for (const topic of topics) {
    await pool.query(
      `INSERT INTO rps_topics
        (rps_document_id, meeting_number, topic_title, sub_cpmk, cpmk, "references")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        rpsDocumentId,
        topic.meeting_number ?? null,
        topic.topic_title,
        topic.sub_cpmk ?? null,
        topic.cpmk ?? null,
        topic.references ?? null,
      ]
    );
  }
};

/**
 * Ambil semua topik, urutkan berdasarkan meeting_number.
 * Hanya mengembalikan id dan topic_title (untuk endpoint publik mahasiswa).
 */
const getAllTopics = async () => {
  const result = await pool.query(
    `SELECT id, topic_title AS title
     FROM rps_topics
     ORDER BY meeting_number ASC NULLS LAST, id ASC`
  );
  return result.rows;
};

/**
 * Ambil detail satu topik berdasarkan id.
 */
const getTopicById = async (id) => {
  const result = await pool.query(
    `SELECT
       id,
       topic_title AS title,
       meeting_number,
       sub_cpmk,
       cpmk,
       "references",
       created_at
     FROM rps_topics
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  deleteAllTopics,
  deleteByRpsDocumentId,
  insertTopics,
  getAllTopics,
  getTopicById,
};
