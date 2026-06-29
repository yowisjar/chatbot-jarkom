const materialRepository = require('../../../repositories/materialRepository');

const searchBySlide = async (slideNumber, limit, conversationId) => {
  const chunks = await materialRepository.searchBySlideNumber(slideNumber, limit, conversationId);
  return chunks.map((chunk) => ({ ...chunk, source: 'slide-lookup' }));
};

module.exports = {
  searchBySlide,
};
