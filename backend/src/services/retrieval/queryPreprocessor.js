const { ragConfig } = require('../../config/rag');
const { expandQueryKeywords, expandSynonyms } = require('../../utils/queryExpansion');

const STOP_WORDS = new Set([
  'yang', 'dan', 'di', 'ke', 'dari', 'pada', 'untuk', 'dengan', 'adalah', 'atau',
  'ini', 'itu', 'saya', 'kamu', 'anda', 'kita', 'mereka', 'apa', 'siapa', 'bagaimana',
  'mengapa', 'kapan', 'dimana', 'the', 'a', 'an', 'is', 'are', 'was', 'were',
  'tolong', 'jelaskan', 'terangkan', 'tentang', 'mohon', 'bisa', 'kah', 'dong',
  'perbedaan', 'beda', 'bandingkan', 'versus', 'vs', 'menurut', 'materi', 'berdasarkan',
  'ingin', 'mengetahui', 'langkah', 'dilakukan', 'proses', 'pengujian', 'penting',
  'jika', 'maka', 'agar', 'supaya', 'saja', 'juga', 'sudah', 'belum', 'akan',
  'slide', 'halaman', 'page', 'bagian', 'nomor', 'no',
]);

const SLIDE_PATTERNS = [
  /slide\s*[#.:]?\s*(\d+)/i,
  /halaman\s*(\d+)/i,
  /page\s*(\d+)/i,
  /bagian\s*(\d+)/i,
  /nomor\s*slide\s*(\d+)/i,
  /no\.?\s*(\d+)/i,
];

const detectSlideNumber = (query) => {
  for (const pattern of SLIDE_PATTERNS) {
    const match = query.match(pattern);
    if (match?.[1]) {
      const num = parseInt(match[1], 10);
      if (Number.isInteger(num) && num > 0) return num;
    }
  }
  return null;
};

const extractKeywords = (query) => {
  const withoutSlide = query
    .replace(/slide\s*[#.:]?\s*\d+/gi, ' ')
    .replace(/halaman\s*\d+/gi, ' ')
    .replace(/page\s*\d+/gi, ' ')
    .replace(/bagian\s*\d+/gi, ' ');

  return [...new Set(
    withoutSlide
      .toLowerCase()
      .replace(/[^\w\s/]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= ragConfig.minKeywordLength && !STOP_WORDS.has(word))
  )];
};

const extractPhrases = (query) => {
  const phrases = new Set();
  const lower = query.toLowerCase();

  const quoted = query.match(/"([^"]+)"/g);
  if (quoted) {
    quoted.forEach((q) => phrases.add(q.replace(/"/g, '').trim().toLowerCase()));
  }

  const words = lower
    .replace(/slide\s*[#.:]?\s*\d+/gi, '')
    .replace(/halaman\s*\d+/gi, '')
    .replace(/page\s*\d+/gi, '')
    .replace(/bagian\s*\d+/gi, '')
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  for (let len = 2; len <= 4; len += 1) {
    for (let i = 0; i <= words.length - len; i += 1) {
      const phrase = words.slice(i, i + len).join(' ');
      if (phrase.length >= 5) phrases.add(phrase);
    }
  }

  return [...phrases];
};

const preprocessQuery = (query) => {
  const original = query.trim();
  const slideNumber = detectSlideNumber(original);
  const keywords = extractKeywords(original);
  const phrases = extractPhrases(original);
  const synonymTerms = expandSynonyms(original);
  const topicTerms = expandQueryKeywords(original);

  const expandedKeywords = [...new Set([
    ...keywords,
    ...phrases,
    ...synonymTerms,
    ...topicTerms,
  ])];

  const expandedQuery = expandedKeywords.length > keywords.length
    ? `${original} ${[...synonymTerms, ...topicTerms].join(' ')}`
    : original;

  return {
    original,
    slideNumber,
    keywords,
    phrases,
    synonymTerms,
    topicTerms,
    expandedKeywords,
    expandedQuery,
  };
};

module.exports = {
  STOP_WORDS,
  detectSlideNumber,
  extractKeywords,
  extractPhrases,
  preprocessQuery,
};
