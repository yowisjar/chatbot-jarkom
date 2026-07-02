const { extractTextFromPdf } = require('../services/pdfService');
const adminRepository = require('../repositories/adminRepository');
const rpsTopicService = require('../services/rpsTopicService');

const uploadRps = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'File RPS wajib diupload.' });
    }

    const { originalname, filename, path: filePath, size, mimetype } = req.file;
    const userId = req.user.id;

    // Extract text
    const extractedText = await extractTextFromPdf(filePath);

    // Save to database
    const documentData = {
      original_name: originalname,
      file_name: filename,
      file_path: filePath,
      file_size: size,
      mime_type: mimetype,
      extracted_text: extractedText,
      uploaded_by: userId
    };

    const savedDoc = await adminRepository.saveRpsDocument(documentData);

    // Fire-and-forget: parse topik dari RPS — tidak memblok response upload
    rpsTopicService.parseAndSaveTopics(savedDoc.id, extractedText).catch(err =>
      console.error('[adminController] Gagal parse topics:', err.message)
    );

    res.status(201).json({
      message: 'RPS berhasil diupload.',
      document: {
        id: savedDoc.id,
        original_name: savedDoc.original_name,
        file_size: savedDoc.file_size,
        created_at: savedDoc.created_at
      }
    });

  } catch (error) {
    console.error('Error in uploadRps:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat memproses RPS.' });
  }
};

const getLatestRps = async (req, res) => {
  console.log('[DEBUG CONTROLLER] getLatestRps() dipanggil');
  console.log('[DEBUG CONTROLLER] req.user:', req.user);
  try {
    const doc = await adminRepository.getLatestRpsDocument();
    console.log('[DEBUG CONTROLLER] Hasil getLatestRpsDocument():', doc);
    if (!doc) {
      console.log('[DEBUG CONTROLLER] doc null/undefined — mengirim { document: null }');
      return res.json({ document: null });
    }
    const responsePayload = {
      document: {
        id: doc.id,
        original_name: doc.original_name,
        created_at: doc.created_at
      }
    };
    console.log('[DEBUG CONTROLLER] Response dikirim:', JSON.stringify(responsePayload));
    return res.json(responsePayload);
  } catch (error) {
    console.error('[DEBUG CONTROLLER] Error in getLatestRps:', error);
    res.status(500).json({ message: 'Terjadi kesalahan saat mengambil RPS.' });
  }
};

module.exports = {
  uploadRps,
  getLatestRps
};
