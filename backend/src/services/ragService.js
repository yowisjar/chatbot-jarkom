const retrievalService = require('./retrieval');
const materialRepository = require('../repositories/materialRepository');
const {
  generateFallbackResponse,
  generateRagResponse,
  generateUploadedMaterialChatResponse,
} = require('./geminiService');
const { ragConfig } = require('../config/rag');
const { buildReferences } = require('../utils/referenceFormatter');
const { detectQuestionIntent } = require('../utils/questionIntent');
const { isMaterialNotFoundReply, MATERIAL_NOT_FOUND_REPLY } = require('../constants/prompts');

/**
 * @param {string} question
 * @param {Array<{role: string, content: string}>} conversationHistory
 * @param {number} conversationId
 * @returns {Promise<import('./ragService').RagAnswer>}
 */
const generateAnswer = async (question, conversationHistory, conversationId) => {
  const trimmedQuestion = question?.trim();

  if (!trimmedQuestion) {
    throw new Error('Pertanyaan tidak boleh kosong');
  }

  const intent = detectQuestionIntent(trimmedQuestion);
  const materialCount = await materialRepository.countMaterialsInConversation(conversationId);
  const hasUploadedMaterials = materialCount > 0;

  console.log(`[RAG] intent=${intent} | conversationId=${conversationId} | uploadedMaterials=${materialCount}`);

  if (intent !== 'material_question') {
    const reply = hasUploadedMaterials
      ? await generateUploadedMaterialChatResponse(conversationHistory)
      : await generateFallbackResponse(conversationHistory);

    return {
      reply,
      source: 'fallback',
      references: [],
    };
  }

  if (hasUploadedMaterials) {
    const relevantChunks = await retrievalService.searchRelevantChunks(trimmedQuestion, {
      conversationId,
      intent,
      limit: ragConfig.maxReferences,
    });

    if (relevantChunks.length > 0) {
      const topChunks = relevantChunks.slice(0, ragConfig.maxReferences);

      const reply = await generateRagResponse({
        question: trimmedQuestion,
        chunks: topChunks,
        conversationHistory,
      });

      const usedMaterial = !isMaterialNotFoundReply(reply);

      return {
        reply,
        source: usedMaterial ? 'material' : 'fallback',
        ...(usedMaterial && {
          materialsUsed: [...new Set(topChunks.map((chunk) => chunk.materialTitle))],
          references: buildReferences(topChunks),
        }),
        ...(!usedMaterial && { references: [] }),
      };
    }

    return {
      reply: MATERIAL_NOT_FOUND_REPLY,
      source: 'fallback',
      references: [],
    };
  }

  const relevantChunks = await retrievalService.searchRelevantChunks(trimmedQuestion, {
    conversationId,
    intent,
    limit: ragConfig.maxReferences,
  });

  if (relevantChunks.length > 0) {
    const topChunks = relevantChunks.slice(0, ragConfig.maxReferences);
    const reply = await generateRagResponse({
      question: trimmedQuestion,
      chunks: topChunks,
      conversationHistory,
    });

    const usedMaterial = !isMaterialNotFoundReply(reply);

    return {
      reply,
      source: usedMaterial ? 'material' : 'fallback',
      ...(usedMaterial && {
        materialsUsed: [...new Set(topChunks.map((chunk) => chunk.materialTitle))],
        references: buildReferences(topChunks),
      }),
      ...(!usedMaterial && { references: [] }),
    };
  }

  const reply = await generateFallbackResponse(conversationHistory);

  return {
    reply,
    source: 'fallback',
    references: [],
  };
};

module.exports = {
  generateAnswer,
  detectQuestionIntent,
};
