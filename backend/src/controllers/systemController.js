const keyManager = require('../services/gemini/keyManager');

// GET /api/system/ai-status
const getAiStatus = (_req, res) => {
  const status = keyManager.getStatus();

  res.json({
    totalKeys: status.totalKeys,
    available: status.available,
    unavailable: status.unavailable,
    currentKey: status.currentKey,
  });
};

module.exports = {
  getAiStatus,
};
