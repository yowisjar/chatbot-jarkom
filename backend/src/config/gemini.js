require('dotenv').config();

const keyManager = require('../services/gemini/keyManager');

const SAFE_AI_MESSAGE = 'Terjadi masalah saat menghubungi layanan AI.';

const geminiConfig = {
  model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  maxOutputTokens: Number(process.env.GEMINI_MAX_OUTPUT_TOKENS) || 1024,
};

const validateGeminiConfig = () => {
  keyManager.loadKeys();

  if (!keyManager.hasKeys()) {
    throw new Error(
      'Tidak ada Gemini API key ditemukan. Set GEMINI_API_KEY_1, GEMINI_API_KEY_2, ... di file .env'
    );
  }
};

const logGeminiStartup = () => {
  keyManager.loadKeys();
  const status = keyManager.getStatus();

  console.log(`[Gemini] Total API Keys: ${status.totalKeys}`);
  console.log(`[Gemini] Available: ${status.available} | Unavailable: ${status.unavailable}`);
  console.log(`[Gemini] Model aktif: ${geminiConfig.model}`);
  console.log(`[Gemini] Max output tokens: ${geminiConfig.maxOutputTokens}`);
};

module.exports = {
  geminiConfig,
  validateGeminiConfig,
  logGeminiStartup,
  SAFE_AI_MESSAGE,
};
