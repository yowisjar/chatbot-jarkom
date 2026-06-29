const express = require('express');
const multer = require('multer');
const { materialUpload, MAX_FILE_SIZE } = require('../config/upload');
const authMiddleware = require('../middleware/auth');
const {
  uploadMaterial,
  getMaterials,
  getMaterialById,
  deleteMaterial,
  rechunkMaterials,
} = require('../controllers/materialController');

const router = express.Router();

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        message: `Ukuran file maksimal ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
      });
    }
    return res.status(400).json({ message: err.message });
  }

  if (err) {
    return res.status(400).json({ message: err.message });
  }

  next();
};

router.use(authMiddleware);

router.post('/rechunk', rechunkMaterials);
router.post('/upload', materialUpload.single('file'), handleUploadError, uploadMaterial);
router.get('/', getMaterials);
router.get('/:id', getMaterialById);
router.delete('/:id', deleteMaterial);

module.exports = router;
