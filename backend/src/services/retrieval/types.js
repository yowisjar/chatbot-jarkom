/**
 * @typedef {Object} RetrievedChunk
 * @property {number} id
 * @property {string} content
 * @property {number} chunkIndex
 * @property {number|null} slideNumber
 * @property {string|null} slideTitle
 * @property {number} materialId
 * @property {string} materialTitle
 * @property {number|null} score
 * @property {'fts'|'keyword'|'vector'} [source]
 */

/**
 * @typedef {Object} RetrievalProvider
 * @property {(query: string, options?: { limit?: number, conversationId?: number }) => Promise<RetrievedChunk[]>} searchRelevantChunks
 */

module.exports = {};
