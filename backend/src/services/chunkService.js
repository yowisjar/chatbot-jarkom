const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
/** Slide PPT/PDF — satu slide = satu chunk kecuali teks sangat panjang */
const MAX_SLIDE_CHUNK_CHARS = 6000;

/**
 * Pecah teks panjang menjadi array chunk dengan overlap.
 * @param {string} text
 * @param {number} [chunkSize=1000]
 * @param {number} [overlap=200]
 * @returns {string[]}
 */
const splitTextIntoChunks = (text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) => {
  if (!text || !text.trim()) {
    return [];
  }

  const normalized = text.trim();

  if (normalized.length <= chunkSize) {
    return [normalized];
  }

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    let end = Math.min(start + chunkSize, normalized.length);

    if (end < normalized.length) {
      const segment = normalized.slice(start, end);
      let breakAt = segment.lastIndexOf(' ');
      if (breakAt === -1) {
        breakAt = segment.lastIndexOf('\n');
      }

      if (breakAt > chunkSize * 0.4) {
        end = start + breakAt;
      }
    }

    const chunk = normalized.slice(start, end).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    if (end >= normalized.length) {
      break;
    }

    const nextStart = end - overlap;
    start = nextStart > start ? nextStart : end;
  }

  return chunks;
};

/**
 * Pecah segmen slide/halaman menjadi chunk dengan metadata slide.
 * PPT/PPTX/PDF: default 1 slide = 1 chunk agar retrieval lebih presisi.
 * @param {Array<{ slideNumber: number, slideTitle?: string|null, content: string }>} segments
 * @returns {Array<{ content: string, slideNumber: number|null, slideTitle: string|null }>}
 */
const splitSegmentsIntoChunks = (segments) => {
  const result = [];

  for (const segment of segments) {
    const content = segment.content?.trim();
    if (!content) continue;

    if (content.length <= MAX_SLIDE_CHUNK_CHARS) {
      result.push({
        content,
        slideNumber: segment.slideNumber ?? null,
        slideTitle: segment.slideTitle ?? null,
      });
      continue;
    }

    const parts = splitTextIntoChunks(content);
    for (const part of parts) {
      result.push({
        content: part,
        slideNumber: segment.slideNumber ?? null,
        slideTitle: segment.slideTitle ?? null,
      });
    }
  }

  return result;
};

module.exports = {
  splitTextIntoChunks,
  splitSegmentsIntoChunks,
  CHUNK_SIZE,
  CHUNK_OVERLAP,
  MAX_SLIDE_CHUNK_CHARS,
};
