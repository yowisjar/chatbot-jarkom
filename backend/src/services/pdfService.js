const pdfParse = require('pdf-parse');
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

  // Kumpulkan teks per halaman via pagerender callback (API pdf-parse 1.1.1)
  const collectedPages = [];

  const renderPage = async (pageData) => {
    const textContent = await pageData.getTextContent();
    const rawText = textContent.items.map((item) => item.str).join(' ');
    const content = sanitizeExtractedText(rawText);

    if (content.trim()) {
      collectedPages.push({
        slideNumber: pageData.pageNumber,
        slideTitle: null,
        content,
      });
    }

    return content;
  };

  try {
    await pdfParse(buffer, { pagerender: renderPage });

    const pages = collectedPages;
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
