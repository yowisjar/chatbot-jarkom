const express = require('express');
const authMiddleware = require('../middleware/auth');
const { getAiStatus } = require('../controllers/systemController');

const router = express.Router();

router.use(authMiddleware);
router.get('/ai-status', getAiStatus);

module.exports = router;
