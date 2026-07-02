'use strict';

const express = require('express');
const { getTopics, getTopicById } = require('../controllers/topicController');

const router = express.Router();

// GET /api/topics — daftar topik (publik, tidak butuh auth)
router.get('/', getTopics);

// GET /api/topics/:id — detail topik
router.get('/:id', getTopicById);

module.exports = router;
