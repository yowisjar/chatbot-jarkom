const { PDFParse } = require('pdf-parse');
const { sanitizeExtractedText, validateExtractedText } = require('../utils/textSanitizer');

/**
 * Ekstrak teks per halaman PDF. Satu halaman = satu slide (asumsi PDF dari PowerPoint).
 * @param {Buffer} buffer - Buffer isi file PDF (dari req.file.buffer via memoryStorage)
 * @returns {Promise<{ text: string, pages: Array<{ slideNumber: number, slideTitle: null, content: string }> }>}
 */
const extractPagesFromPdf = async (buffer) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Buffer PDF tidak valid');
  }

  let parser;

  try {
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

    console.error('[PDF] Gagal membaca buffer:', err.message);
    throw new Error(`Gagal membaca isi PDF: ${err.message}`);
  } finally {
    if (parser && typeof parser.destroy === 'function') {
      await parser.destroy();
    }
  }
};

/**
 * Ekstrak teks dari buffer PDF (gabungan semua halaman).
 * @param {Buffer} buffer - Buffer isi file PDF (dari req.file.buffer via memoryStorage)
 * @returns {Promise<string>}
 */
const extractTextFromPdf = async (buffer) => {
  const { text } = await extractPagesFromPdf(buffer);
  return text;
};

module.exports = {
  extractTextFromPdf,
  extractPagesFromPdf,
};
