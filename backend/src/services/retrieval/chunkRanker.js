const { extractKeywords } = require('./queryPreprocessor');

const getChunkHaystack = (chunk) =>
  `${chunk.materialTitle} ${chunk.slideTitle || ''} ${chunk.content}`.toLowerCase();

const mergeChunksByBestScore = (chunkLists, limit = Infinity) => {
  const map = new Map();

  for (const chunk of chunkLists.flat()) {
    const existing = map.get(chunk.id);
    if (!existing || (chunk.score ?? 0) > (existing.score ?? 0)) {
      map.set(chunk.id, {
        ...chunk,
        sources: [...new Set([...(existing?.sources || []), chunk.source].filter(Boolean))],
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
};

const boostChunkRelevance = (chunk, query, expandedKeywords, phrases, slideNumber) => {
  let score = chunk.score ?? 0;
  const haystack = getChunkHaystack(chunk);
  const queryLower = query.toLowerCase();

  if (slideNumber != null && chunk.slideNumber === slideNumber) {
    score += 0.6;
  }

  for (const phrase of phrases || []) {
    const p = phrase.toLowerCase();
    if (p.length >= 4 && haystack.includes(p)) {
      score += p.split(' ').length >= 3 ? 0.35 : 0.22;
    }
  }

  for (const keyword of expandedKeywords) {
    const kw = keyword.toLowerCase();
    if (haystack.includes(kw)) {
      score += kw.includes(' ') ? 0.18 : 0.1;
    }
  }

  if (chunk.slideTitle) {
    const titleLower = chunk.slideTitle.toLowerCase();
    for (const keyword of extractKeywords(query)) {
      if (titleLower.includes(keyword)) score += 0.15;
    }
    for (const phrase of phrases || []) {
      if (phrase.length >= 4 && titleLower.includes(phrase.toLowerCase())) score += 0.2;
    }
  }

  for (const keyword of extractKeywords(query)) {
    if (haystack.includes(keyword)) score += 0.06;
  }

  if (queryLower.length >= 8 && haystack.includes(queryLower.slice(0, Math.min(queryLower.length, 40)))) {
    score += 0.25;
  }

  const isGenericIntro = /internet engineering task force|\bietf\b|rfc editor|standar internet global/i.test(haystack);
  const isSpecificQuery = expandedKeywords.some((k) => k.length > 4);

  if (isSpecificQuery && isGenericIntro && slideNumber == null) {
    score -= 0.2;
  }

  return { ...chunk, score: Math.max(score, 0) };
};

const rankChunks = (chunks, query, expandedKeywords, phrases, slideNumber, limit) => {
  const boosted = chunks.map((chunk) =>
    boostChunkRelevance(chunk, query, expandedKeywords, phrases, slideNumber)
  );
  return mergeChunksByBestScore([boosted], limit);
};

module.exports = {
  getChunkHaystack,
  mergeChunksByBestScore,
  boostChunkRelevance,
  rankChunks,
};
