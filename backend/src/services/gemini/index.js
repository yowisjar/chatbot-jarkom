const keyManager = require('./keyManager');
const geminiService = require('./geminiService');

module.exports = {
  keyManager,
  ...geminiService,
};
