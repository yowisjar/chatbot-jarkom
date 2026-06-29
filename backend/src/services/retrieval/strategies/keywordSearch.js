const materialRepository = require('../../../repositories/materialRepository');

/**
 * Strategi pencarian keyword ILIKE dengan scoring.
 * @param {string[]} keywords
 * @param {number} limit
 * @param {number} conversationId
 * @returns {Promise<import('../types').RetrievedChunk[]>}
 */
const searchKeywords = async (keywords, limit, conversationId) => {
  if (!keywords.length) return [];

  const chunks = await materialRepository.searchByKeywords(keywords, limit, conversationId);
  return chunks.map((chunk) => ({ ...chunk, source: 'keyword' }));
};

module.exports = {
  searchKeywords,
};
