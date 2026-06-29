const materialRepository = require('../../../repositories/materialRepository');

/**
 * Strategi pencarian full-text PostgreSQL (indonesian + simple).
 * @param {string} query
 * @param {number} limit
 * @param {number} conversationId
 * @returns {Promise<import('../types').RetrievedChunk[]>}
 */
const searchFullText = async (query, limit, conversationId) => {
  const chunks = await materialRepository.searchByFullText(query, limit, conversationId);
  return chunks.map((chunk) => ({ ...chunk, source: 'fts' }));
};

module.exports = {
  searchFullText,
};
