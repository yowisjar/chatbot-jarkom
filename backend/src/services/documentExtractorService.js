const path = require('path');
const mammoth = require('mammoth');
const JSZip = require('jszip');
const { extractTextFromPdf, extractPagesFromPdf } = require('./pdfService');
const { sanitizeExtractedText, validateExtractedText } = require('../utils/textSanitizer');

const LEGACY_DOC_MESSAGE =
  'Format .doc (Word lama) belum didukung penuh. Silakan convert ke .docx terlebih dahulu.';
const LEGACY_PPT_MESSAGE =
  'Format .ppt (PowerPoint lama) belum didukung penuh. Silakan convert ke .pptx terlebih dahulu.';

const FILE_TYPE_LABELS = {
  pdf: 'PDF',
  docx: 'Word (DOCX)',
  doc: 'Word (DOC)',
  pptx: 'PowerPoint (PPTX)',
  ppt: 'PowerPoint (PPT)',
};

const resolveFileType = (filename) => {
  const ext = path.extname(filename).toLowerCase();
  const map = {
    '.pdf': 'pdf',
    '.docx': 'docx',
    '.doc': 'doc',
    '.pptx': 'pptx',
    '.ppt': 'ppt',
  };
  return map[ext] || null;
};

const logExtraction = (fileType, rawLength, cleanLength, segmentCount = 0) => {
  console.log(`[Extract:${fileType}] Karakter sebelum sanitasi: ${rawLength}`);
  console.log(`[Extract:${fileType}] Karakter setelah sanitasi: ${cleanLength}`);
  if (segmentCount > 0) {
    console.log(`[Extract:${fileType}] Segmen slide/halaman: ${segmentCount}`);
  }
};

const extractTextNodesFromXml = (xml) => {
  const textNodes = xml.match(/<a:t[^>]*>[^<]*<\/a:t>/g) || [];
  return textNodes
    .map((node) => node.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

const extractSlideTitleFromXml = (xml) => {
  const titleBlockMatch = xml.match(/<p:sp[\s\S]*?<p:ph[^>]*type="title"[^>]*\/?>[\s\S]*?<\/p:sp>/i);
  if (titleBlockMatch) {
    const title = extractTextNodesFromXml(titleBlockMatch[0]);
    if (title) return title;
  }

  const ctrTitleMatch = xml.match(/<p:sp[\s\S]*?<p:ph[^>]*type="ctrTitle"[^>]*\/?>[\s\S]*?<\/p:sp>/i);
  if (ctrTitleMatch) {
    const title = extractTextNodesFromXml(ctrTitleMatch[0]);
    if (title) return title;
  }

  return null;
};

/**
 * Ekstrak teks dari buffer DOCX.
 * @param {Buffer} buffer
 */
const extractTextFromDocx = async (buffer) => {
  const result = await mammoth.extractRawText({ buffer });
  const rawText = result.value ?? '';
  const cleanText = sanitizeExtractedText(rawText);
  logExtraction('docx', rawText.length, cleanText.length);
  return { text: validateExtractedText(cleanText, 'File Word (DOCX)'), segments: null };
};

/**
 * Ekstrak slide dari buffer PPTX.
 * @param {Buffer} buffer
 */
const extractSlidesFromPptx = async (buffer) => {
  const zip = await JSZip.loadAsync(buffer);

  const slidePaths = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/i)[1], 10);
      const numB = parseInt(b.match(/slide(\d+)/i)[1], 10);
      return numA - numB;
    });

  const segments = [];

  for (const slidePath of slidePaths) {
    const slideNumber = parseInt(slidePath.match(/slide(\d+)/i)[1], 10);
    const xml = await zip.files[slidePath].async('text');
    const slideTitle = extractSlideTitleFromXml(xml);
    const rawContent = extractTextNodesFromXml(xml);
    const content = sanitizeExtractedText(rawContent);

    if (!content) continue;

    segments.push({
      slideNumber,
      slideTitle: slideTitle || null,
      content,
    });
  }

  const rawText = segments.map((segment) => segment.content).join('\n\n');
  const cleanText = sanitizeExtractedText(rawText);
  logExtraction('pptx', rawText.length, cleanText.length, segments.length);

  return {
    text: validateExtractedText(cleanText, 'File PowerPoint (PPTX)'),
    segments,
  };
};

/**
 * Ekstrak teks dari buffer file materi berdasarkan ekstensi/tipe.
 * @param {Buffer} buffer - Buffer isi file (dari req.file.buffer via memoryStorage)
 * @param {string} originalFilename - Nama asli file untuk menentukan tipe
 * @returns {Promise<{ text: string, fileType: string, segments: Array|null }>}
 * segments: [{ slideNumber, slideTitle, content }]
 */
const extractTextFromDocument = async (buffer, originalFilename) => {
  const fileType = resolveFileType(originalFilename);

  if (!fileType) {
    throw new Error('Format file tidak didukung. Gunakan PDF, DOCX, atau PPTX.');
  }

  if (fileType === 'doc') {
    throw new Error(LEGACY_DOC_MESSAGE);
  }

  if (fileType === 'ppt') {
    throw new Error(LEGACY_PPT_MESSAGE);
  }

  switch (fileType) {
    case 'pdf': {
      const { text, pages } = await extractPagesFromPdf(buffer);
      return {
        text,
        fileType,
        segments: pages.length > 0 ? pages : null,
      };
    }
    case 'docx':
      return { ...(await extractTextFromDocx(buffer)), fileType };
    case 'pptx': {
      const result = await extractSlidesFromPptx(buffer);
      return { ...result, fileType };
    }
    default:
      throw new Error('Format file tidak didukung.');
  }
};

module.exports = {
  extractTextFromDocument,
  resolveFileType,
  FILE_TYPE_LABELS,
};
