const fs = require('fs');
const { PDFParse } = require('pdf-parse');
const { sanitizeExtractedText, validateExtractedText } = require('../utils/textSanitizer');

/**
 * Ekstrak teks per halaman PDF. Satu halaman = satu slide (asumsi PDF dari PowerPoint).
 * @param {string} filePath
 * @returns {Promise<{ text: string, pages: Array<{ slideNumber: number, slideTitle: null, content: string }> }>}
 */
const extractPagesFromPdf = async (filePath) => {
  if (!fs.existsSync(filePath)) {
    throw new Error('File PDF tidak ditemukan di server');
  }

  let parser;

  try {
    const buffer = fs.readFileSync(filePath);
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const pages = (result.pages || [])
      .map((page) => {
        const content = sanitizeExtractedText(page.text ?? '');
        return {
          slideNumber: page.num,
          slideTitle: null,
          content,
        };
      })
      .filter((page) => page.content.trim());

    const text = pages.map((page) => page.content).join('\n\n');

    console.log(`[Extract:pdf] Halaman dengan teks: ${pages.length}`);
    console.log(`[Extract:pdf] Karakter setelah sanitasi: ${text.length}`);

    validateExtractedText(text, 'PDF');

    return { text, pages };
  } catch (err) {
    if (err.message.includes('tidak memiliki teks')) {
      throw err;
    }

    console.error('[PDF] Gagal membaca file:', err.message);
    throw new Error(`Gagal membaca isi PDF: ${err.message}`);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      await parser.destroy();
    }
  }
};

/**
 * Ekstrak teks dari file PDF di disk (gabungan semua halaman).
 * @param {string} filePath
 * @returns {Promise<string>}
 */
const extractTextFromPdf = async (filePath) => {
  const { text } = await extractPagesFromPdf(filePath);
  return text;
};

module.exports = {
  extractTextFromPdf,
  extractPagesFromPdf,
};
