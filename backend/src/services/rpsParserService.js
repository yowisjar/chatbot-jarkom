const adminRepository = require('../repositories/adminRepository');

/**
 * Mengambil isi RPS terbaru dari database.
 * Digunakan sebagai konteks utama oleh Chatbot Gemini.
 * @returns {Promise<string|null>} Extracted text dari RPS atau null jika belum ada.
 */
const getLatestRps = async () => {
  try {
    const doc = await adminRepository.getLatestRpsDocument();
    return doc ? doc.extracted_text : null;
  } catch (error) {
    console.error('[rpsParserService] Gagal mengambil RPS terbaru:', error.message);
    return null;
  }
};

module.exports = {
  getLatestRps
};
