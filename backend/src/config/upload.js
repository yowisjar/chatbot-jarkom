const path = require('path');
const multer = require('multer');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint',
]);

// Gunakan memoryStorage agar kompatibel dengan Vercel (tidak ada akses filesystem permanen)
const storage = multer.memoryStorage();

const materialFileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
  const isAllowedMime = ALLOWED_MIME_TYPES.has(file.mimetype);

  if (isAllowedExt || isAllowedMime) {
    cb(null, true);
    return;
  }

  cb(
    new Error('Format tidak didukung. Gunakan PDF (.pdf), Word (.doc, .docx), atau PowerPoint (.ppt, .pptx).'),
    false
  );
};

const materialUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: materialFileFilter,
});

module.exports = {
  materialUpload,
  pdfUpload: materialUpload,
  MAX_FILE_SIZE,
  ALLOWED_EXTENSIONS,
};
