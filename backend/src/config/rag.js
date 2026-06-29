require('dotenv').config();

const ragConfig = {
  // Jumlah chunk maksimal yang diambil dari database
  topK: Number(process.env.RAG_TOP_K) || 5,
  // Jumlah referensi maksimal yang ditampilkan ke user
  maxReferences: Number(process.env.RAG_MAX_REFERENCES) || 3,
  // Skor minimum full-text search (0–1). Di bawah ini dianggap tidak relevan
  minRankScore: Number(process.env.RAG_MIN_RANK_SCORE) || 0.05,
  // Panjang minimum kata kunci untuk pencarian ILIKE fallback
  minKeywordLength: Number(process.env.RAG_MIN_KEYWORD_LENGTH) || 3,
};

module.exports = { ragConfig };
