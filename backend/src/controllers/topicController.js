'use strict';

const topicRepository = require('../repositories/topicRepository');

/**
 * GET /api/topics
 * Mengembalikan daftar topik pembelajaran (id + title saja).
 * Mahasiswa tidak melihat meeting_number.
 */
const getTopics = async (req, res) => {
  try {
    const topics = await topicRepository.getAllTopics();
    return res.json(topics);
  } catch (error) {
    console.error('[topicController] Error getTopics:', error.message);
    return res.status(500).json({ message: 'Terjadi kesalahan saat mengambil daftar topik.' });
  }
};

/**
 * GET /api/topics/:id
 * Mengembalikan detail satu topik (termasuk meeting_number, cpmk, dll).
 * Digunakan chatbot untuk konteks pertemuan.
 */
const getTopicById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'ID topik tidak valid.' });
    }

    const topic = await topicRepository.getTopicById(id);
    if (!topic) {
      return res.status(404).json({ message: 'Topik tidak ditemukan.' });
    }

    return res.json(topic);
  } catch (error) {
    console.error('[topicController] Error getTopicById:', error.message);
    return res.status(500).json({ message: 'Terjadi kesalahan saat mengambil detail topik.' });
  }
};

module.exports = {
  getTopics,
  getTopicById,
};
