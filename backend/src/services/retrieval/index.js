/**
 * Entry point retrieval — pilih provider via RAG_RETRIEVAL_PROVIDER.
 *
 * Provider tersedia:
 *   postgres  → FTS + keyword ILIKE (default)
 *   vector    → pgvector (stub, belum diimplementasikan)
 *
 * Untuk migrasi ke vector search: implementasikan vectorRetrievalService.js
 * lalu set RAG_RETRIEVAL_PROVIDER=vector di .env.
 * ragService dan controller tidak perlu diubah.
 */
const postgresRetrievalService = require('./postgresRetrievalService');
const vectorRetrievalService = require('./vectorRetrievalService');

const PROVIDERS = {
  postgres: postgresRetrievalService,
  vector: vectorRetrievalService,
};

const providerName = (process.env.RAG_RETRIEVAL_PROVIDER || 'postgres').toLowerCase();
const retrievalService = PROVIDERS[providerName] || postgresRetrievalService;

if (!PROVIDERS[providerName]) {
  console.warn(`[RAG] Provider "${providerName}" tidak dikenal, fallback ke postgres`);
}

module.exports = retrievalService;
