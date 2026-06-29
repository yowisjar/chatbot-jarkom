const materialRepository = require('../../../repositories/materialRepository');

const searchExactPhrases = async (phrases, limit, conversationId) => {
  if (!phrases.length) return [];

  const chunks = await materialRepository.searchByExactPhrases(phrases, limit, conversationId);
  return chunks.map((chunk) => ({ ...chunk, source: 'exact-phrase' }));
};

module.exports = {
  searchExactPhrases,
};
