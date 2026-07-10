const express = require('express');
const multer = require('multer');
const { uploadRps, getLatestRps } = require('../controllers/adminController');
const requireAdmin = require('../middleware/requireAdmin'); 
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Gunakan memoryStorage agar kompatibel dengan Vercel (tidak ada akses filesystem permanen)
const storage = multer.memoryStorage();

// Multer filter config
const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Hanya file PDF yang diperbolehkan!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20 MB
  },
  fileFilter: fileFilter
});

// Route for getting latest RPS
//test
router.get('/rps/latest', (req, res, next) => {
  console.log('[DEBUG ROUTE] === GET /api/admin/rps/latest HIT ===');
  console.log('[DEBUG ROUTE] Authorization Header:', req.headers.authorization ? 'ADA' : 'TIDAK ADA');
  next();
}, authMiddleware, requireAdmin, getLatestRps);

// Route for uploading RPS
router.post('/upload-rps', authMiddleware, requireAdmin, upload.single('rpsFile'), uploadRps);

module.exports = router;
