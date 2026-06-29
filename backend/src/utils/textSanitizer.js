const MIN_TEXT_LENGTH = 20;

/**
 * Sanitasi teks hasil ekstraksi agar aman disimpan ke PostgreSQL (UTF-8).
 * @param {string} rawText
 * @returns {string}
 */
const sanitizeExtractedText = (rawText) => {
  if (rawText == null) {
    return '';
  }

  let text = String(rawText);

  text = text.replace(/\0/g, '');
  text = text.replace(/\u0000/g, '');
  text = text.replace(/\uFFFD/g, '');
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  text = text.normalize('NFKC');
  text = text.replace(/\0/g, '');
  text = text.replace(/\u0000/g, '');
  text = text.replace(/\uFFFD/g, '');

  return text.trim();
};

const validateExtractedText = (cleanText, fileLabel = 'File') => {
  if (!cleanText || cleanText.length < MIN_TEXT_LENGTH) {
    throw new Error(`${fileLabel} tidak memiliki teks yang dapat dibaca.`);
  }
  return cleanText;
};

module.exports = {
  sanitizeExtractedText,
  validateExtractedText,
  MIN_TEXT_LENGTH,
};
