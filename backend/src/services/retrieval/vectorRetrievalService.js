/**
 * Stub provider untuk migrasi pgvector di masa depan.
 * Ganti RAG_RETRIEVAL_PROVIDER=vector setelah implementasi selesai.
 */
const searchRelevantChunks = async () => {
  throw new Error(
    'Vector retrieval belum diimplementasikan. Set RAG_RETRIEVAL_PROVIDER=postgres di .env'
  );
};

module.exports = {
  searchRelevantChunks,
};
