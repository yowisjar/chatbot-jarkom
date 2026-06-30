const { GoogleGenerativeAI } = require('@google/generative-ai');
const { geminiConfig, SAFE_AI_MESSAGE } = require('../../config/gemini');
const {
  FALLBACK_SYSTEM_PROMPT,
  UPLOADED_MATERIAL_CHAT_PROMPT,
  RAG_SYSTEM_PROMPT,
  buildRagUserPrompt,
} = require('../../constants/prompts');
const keyManager = require('./keyManager');

const ALL_KEYS_BUSY_MESSAGE =
  'AI sedang sibuk karena seluruh kuota API sedang habis. Silakan coba lagi beberapa saat.';

class GeminiError extends Error {
  constructor(internalMessage, statusCode = 502, publicMessage = SAFE_AI_MESSAGE) {
    super(internalMessage);
    this.name = 'GeminiError';
    this.statusCode = statusCode;
    this.publicMessage = publicMessage;
  }
}

const logGeminiError = (err, keyId, context = 'generateContent') => {
  console.error(`[Gemini] ${context} (Key #${keyId}) — error asli:`);
  console.error(`  message : ${err.message}`);
  if (err.status != null) console.error(`  status  : ${err.status}`);
  if (err.statusText) console.error(`  statusText: ${err.statusText}`);
  if (err.errorDetails) console.error('  details :', JSON.stringify(err.errorDetails, null, 2));
};

const isQuotaExceededError = (err) => {
  const message = err.message?.toLowerCase() || '';
  const details = JSON.stringify(err.errorDetails || {}).toLowerCase();

  return (
    err.status === 429
    || message.includes('resource_exhausted')
    || message.includes('quota exceeded')
    || message.includes('quota')
    || message.includes('rate limit')
    || details.includes('resource_exhausted')
    || details.includes('quota exceeded')
  );
};

const createGenerativeModel = (apiKey, systemInstruction) => {
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: geminiConfig.model,
    systemInstruction,
  });
};

const formatHistoryForGemini = (conversationHistory) => {
  return conversationHistory.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));
};

const callGeminiWithKey = async (keyEntry, systemInstruction, contents) => {
  const model = createGenerativeModel(keyEntry.key, systemInstruction);

  const result = await model.generateContent({
    contents,
    generationConfig: {
      maxOutputTokens: geminiConfig.maxOutputTokens,
    },
  });

  const text = result.response.text();

  if (!text || !text.trim()) {
    throw new GeminiError('Gemini mengembalikan respons kosong', 502);
  }

  return text.trim();
};

const executeGenerateContent = async (systemInstruction, contents) => {
  if (!keyManager.hasKeys()) {
    throw new GeminiError(
      'Tidak ada GEMINI_API_KEY yang dikonfigurasi',
      503,
      ALL_KEYS_BUSY_MESSAGE
    );
  }

  const triedKeyIds = new Set();
  const maxAttempts = keyManager.getTotalKeys();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const keyEntry = keyManager.getCurrentKey();

    if (!keyEntry || triedKeyIds.has(keyEntry.id)) {
      break;
    }

    triedKeyIds.add(keyEntry.id);

    try {
      console.log(
        `[Gemini] Menggunakan Key #${keyEntry.id} (${geminiConfig.model})`
      );

      const response = await callGeminiWithKey(
        keyEntry,
        systemInstruction,
        contents
      );

      console.log(`[Gemini] Key #${keyEntry.id} berhasil.`);
      return response;
    } catch (err) {
      logGeminiError(err, keyEntry.id);

      const errorMessage = err.message?.toLowerCase() || '';

      // ===== QUOTA HABIS =====
      if (isQuotaExceededError(err)) {
        console.warn(
          `[Gemini] Key #${keyEntry.id} quota habis. Pindah ke key berikutnya...`
        );

        keyManager.markUnavailable(keyEntry.id);
        continue;
      }

      // ===== API KEY / PROJECT BERMASALAH =====
      if (
        err.status === 401 ||
        err.status === 403 ||
        errorMessage.includes('api key') ||
        errorMessage.includes('api_key') ||
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('permission denied') ||
        errorMessage.includes('forbidden') ||
        errorMessage.includes('denied access')
      ) {
        console.warn(
          `[Gemini] Key #${keyEntry.id} tidak valid / tidak memiliki akses. Skip ke key berikutnya...`
        );

        keyManager.markUnavailable(keyEntry.id);
        continue;
      }

      // ===== SERVER GEMINI SEDANG BERMASALAH =====
      if (
        err.status === 500 ||
        err.status === 502 ||
        err.status === 503 ||
        err.status === 504 ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('internal')
      ) {
        console.warn(
          `[Gemini] Gemini sedang sibuk. Coba key berikutnya...`
        );

        keyManager.markUnavailable(keyEntry.id);
        continue;
      }

      // ===== MODEL SALAH =====
      if (
        err.status === 404 ||
        errorMessage.includes('not found')
      ) {
        throw new GeminiError(
          `Model "${geminiConfig.model}" tidak ditemukan: ${err.message}`,
          502
        );
      }

      // ===== ERROR LAIN =====
      console.warn(
        `[Gemini] Error tidak dikenal pada Key #${keyEntry.id}. Mencoba key berikutnya...`
      );

      keyManager.markUnavailable(keyEntry.id);
      continue;
    }
  }

  throw new GeminiError(
    'Semua Gemini API Key sedang unavailable',
    503,
    ALL_KEYS_BUSY_MESSAGE
  );
};

// const executeGenerateContent = async (systemInstruction, contents) => {
//   if (!keyManager.hasKeys()) {
//     throw new GeminiError(
//       'Tidak ada GEMINI_API_KEY yang dikonfigurasi',
//       503,
//       ALL_KEYS_BUSY_MESSAGE
//     );
//   }

//   const triedKeyIds = new Set();
//   const maxAttempts = keyManager.getTotalKeys();

//   for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
//     const keyEntry = keyManager.getCurrentKey();

//     if (!keyEntry || triedKeyIds.has(keyEntry.id)) {
//       break;
//     }

//     triedKeyIds.add(keyEntry.id);

//     try {
//       console.log(`[Gemini] Memanggil model: ${geminiConfig.model}`);
//       return await callGeminiWithKey(keyEntry, systemInstruction, contents);
//     } catch (err) {
//       if (err instanceof GeminiError && !isQuotaExceededError(err)) {
//         throw err;
//       }

//       if (isQuotaExceededError(err)) {
//         logGeminiError(err, keyEntry.id);
//         keyManager.markUnavailable(keyEntry.id);
//         continue;
//       }

//       logGeminiError(err, keyEntry.id);

//       const errorMessage = err.message?.toLowerCase() || '';

//       if (errorMessage.includes('api key') || errorMessage.includes('api_key')) {
//         keyManager.markUnavailable(keyEntry.id);
//         continue;
//       }

//       if (err.status === 404 || errorMessage.includes('not found')) {
//         throw new GeminiError(
//           `Model "${geminiConfig.model}" tidak ditemukan: ${err.message}`,
//           502
//         );
//       }

//       if (err.status === 503 || errorMessage.includes('overloaded')) {
//         throw new GeminiError(`Gemini overloaded: ${err.message}`, 503);
//       }

//       throw new GeminiError(`Gemini gagal: ${err.message}`, 502);
//     }
//   }

//   throw new GeminiError(
//     'Semua Gemini API key sedang unavailable',
//     503,
//     ALL_KEYS_BUSY_MESSAGE
//   );
// };

const generateFallbackResponse = async (conversationHistory) => {
  if (!conversationHistory || conversationHistory.length === 0) {
    throw new GeminiError('Riwayat percakapan tidak boleh kosong', 400);
  }

  const contents = formatHistoryForGemini(conversationHistory);
  return executeGenerateContent(FALLBACK_SYSTEM_PROMPT, contents);
};

const generateUploadedMaterialChatResponse = async (conversationHistory) => {
  if (!conversationHistory || conversationHistory.length === 0) {
    throw new GeminiError('Riwayat percakapan tidak boleh kosong', 400);
  }

  const contents = formatHistoryForGemini(conversationHistory);
  return executeGenerateContent(UPLOADED_MATERIAL_CHAT_PROMPT, contents);
};

const generateRagResponse = async ({ question, chunks, conversationHistory = [] }) => {
  if (!question?.trim()) {
    throw new GeminiError('Pertanyaan tidak boleh kosong', 400);
  }

  if (!chunks || chunks.length === 0) {
    throw new GeminiError('Chunk materi tidak boleh kosong untuk mode RAG', 400);
  }

  const priorHistory = conversationHistory.slice(0, -1);
  const ragPrompt = buildRagUserPrompt(question, chunks);

  const contents = [
    ...formatHistoryForGemini(priorHistory),
    { role: 'user', parts: [{ text: ragPrompt }] },
  ];

  return executeGenerateContent(RAG_SYSTEM_PROMPT, contents);
};

module.exports = {
  generateFallbackResponse,
  generateUploadedMaterialChatResponse,
  generateRagResponse,
  GeminiError,
  executeGenerateContent,
};
