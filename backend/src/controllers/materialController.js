const materialService = require('../services/materialService');

// POST /api/materials/upload
const uploadMaterial = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File materi wajib diupload (field: file)',
      });
    }

    const { title, conversationId } = req.body;

    const result = await materialService.uploadMaterialFile(req.file, title, {
      userId: req.user.id,
      conversationId: conversationId || null,
    });

    res.status(201).json({
      success: true,
      material: {
        id: result.material.id,
        title: result.material.title,
        filename: result.material.filename,
        file_type: result.material.file_type,
        file_path: result.material.file_path,
        conversation_id: result.material.conversation_id,
        uploaded_at: result.material.uploaded_at,
        created_at: result.material.created_at,
      },
      conversationId: result.conversationId,
      charactersExtracted: result.charactersExtracted,
      chunksCreated: result.chunksCreated,
    });
  } catch (err) {
    console.error('[Material] Upload error:', err.message);

    if (err.name === 'UploadLimitError') {
      return res.status(429).json({
        success: false,
        message: err.message,
      });
    }

    if (err.name === 'ConversationNotFoundError') {
      return res.status(404).json({
        success: false,
        message: err.message,
      });
    }

    const clientErrors = [
      'PDF', 'pdf', 'Word', 'DOCX', 'PowerPoint', 'PPTX',
      'belum didukung', 'tidak memiliki teks', 'Format file',
      'Format .doc', 'Format .ppt', 'convert',
    ];

    if (clientErrors.some((keyword) => err.message.includes(keyword))) {
      return res.status(400).json({ success: false, message: err.message });
    }

    res.status(500).json({ success: false, message: 'Gagal menyimpan materi' });
  }
};

// GET /api/materials?conversationId=123
const getMaterials = async (req, res) => {
  try {
    const { conversationId } = req.query;

    if (!conversationId) {
      return res.status(400).json({
        message: 'conversationId wajib diisi',
      });
    }

    const materials = await materialService.getMaterialsByConversation(
      Number(conversationId),
      req.user.id
    );

    res.json({ materials });
  } catch (err) {
    console.error('[Material] Get all error:', err.message);
    res.status(500).json({ message: 'Gagal mengambil daftar materi' });
  }
};

// GET /api/materials/:id
const getMaterialById = async (req, res) => {
  try {
    const material = await materialService.getMaterialById(req.params.id, req.user.id);

    if (!material) {
      return res.status(404).json({ message: 'Materi tidak ditemukan' });
    }

    res.json({ material });
  } catch (err) {
    console.error('[Material] Get by id error:', err.message);
    res.status(500).json({ message: 'Gagal mengambil detail materi' });
  }
};

// DELETE /api/materials/:id
const deleteMaterial = async (req, res) => {
  try {
    const deleted = await materialService.deleteMaterial(req.params.id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ message: 'Materi tidak ditemukan' });
    }

    res.json({ message: 'Materi berhasil dihapus', id: deleted.id });
  } catch (err) {
    console.error('[Material] Delete error:', err.message);
    res.status(500).json({ message: 'Gagal menghapus materi' });
  }
};

// POST /api/materials/rechunk
const rechunkMaterials = async (_req, res) => {
  try {
    const result = await materialService.rechunkAllMaterials();

    res.json({
      message: 'Rechunk materi berhasil',
      materialsProcessed: result.materialsProcessed,
      totalChunks: result.totalChunks,
    });
  } catch (err) {
    console.error('[Material] Rechunk error:', err.message);
    res.status(500).json({ message: 'Gagal melakukan rechunk materi' });
  }
};

module.exports = {
  uploadMaterial,
  getMaterials,
  getMaterialById,
  deleteMaterial,
  rechunkMaterials,
};
