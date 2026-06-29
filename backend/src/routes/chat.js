const express = require('express');
const router = express.Router();
const {
  createSession,
  getSessions,
  getSessionMessages,
  sendMessage,
  deleteSession,
} = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

// Semua route chat butuh autentikasi
router.use(authMiddleware);

router.post('/new', createSession);           // Buat session baru
router.get('/', getSessions);                 // Ambil semua history
router.get('/:id', getSessionMessages);       // Ambil pesan satu session
router.delete('/:id', deleteSession);         // Hapus session

module.exports = router;
