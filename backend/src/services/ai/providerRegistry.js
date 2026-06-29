/**
 * Registry provider AI — siap untuk fallback multi-provider di masa depan.
 *
 * Alur rencana:
 *   Gemini → (limit) → OpenRouter → (gagal) → Ollama
 *
 * Saat ini hanya Gemini yang terdaftar dan aktif.
 */
const geminiProvider = require('../gemini/geminiService');

const providers = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    active: true,
    generateFallbackResponse: geminiProvider.generateFallbackResponse,
    generateRagResponse: geminiProvider.generateRagResponse,
  },
  // { id: 'openrouter', name: 'OpenRouter', active: false, ... },
  // { id: 'ollama', name: 'Ollama', active: false, ... },
];

const getActiveProvider = () => providers.find((p) => p.active) || providers[0];

module.exports = {
  providers,
  getActiveProvider,
};
