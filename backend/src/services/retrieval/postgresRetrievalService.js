const { ragConfig } = require('../../config/rag');
const { preprocessQuery } = require('./queryPreprocessor');
const { mergeChunksByBestScore, rankChunks } = require('./chunkRanker');
const { logRetrieval } = require('./retrievalLogger');
const { searchFullText } = require('./strategies/fullTextSearch');
const { searchKeywords } = require('./strategies/keywordSearch');
const { searchBySlide } = require('./strategies/slideLookup');
const { searchExactPhrases } = require('./strategies/exactPhraseSearch');

const OSI_TCP_IP_EXPANSION =
  'model osi tcp/ip lapisan application transport internet network access physical data link network';

const hasOsiTopic = (query) => /\bosi\b/i.test(query);
const hasTcpIpTopic = (query) => /tcp\s*\/?\s*ip/i.test(query);
const isOsiTcpIpComparisonQuery = (query) => hasOsiTopic(query) && hasTcpIpTopic(query);

const stripInternalFields = (chunk) => {
  const { source, sources, ...rest } = chunk;
  return rest;
};

const runRetrievalPipeline = async (preprocessed, limit, conversationId, logCtx = {}) => {
  const fetchLimit = limit * 8;
  const stages = [];
  const { original, slideNumber, phrases, expandedKeywords, expandedQuery } = preprocessed;

  if (slideNumber != null) {
    const slideChunks = await searchBySlide(slideNumber, fetchLimit, conversationId);
    stages.push({ source: 'slide-lookup', chunks: slideChunks });
  }

  const ftsOriginal = await searchFullText(original, fetchLimit, conversationId);
  stages.push({ source: 'fts-original', chunks: ftsOriginal });

  if (expandedQuery !== original) {
    const ftsExpanded = await searchFullText(expandedQuery, fetchLimit, conversationId);
    stages.push({ source: 'fts-expanded', chunks: ftsExpanded });
  }

  const keywordResults = await searchKeywords(expandedKeywords, fetchLimit, conversationId);
  stages.push({ source: 'keyword-ilik', chunks: keywordResults });

  const phraseList = [...phrases, ...expandedKeywords.filter((k) => k.includes(' '))];
  if (phraseList.length > 0) {
    const phraseResults = await searchExactPhrases(phraseList, fetchLimit, conversationId);
    stages.push({ source: 'exact-phrase', chunks: phraseResults });
  }

  const allRaw = stages.flatMap((s) => s.chunks);
  const allScored = rankChunks(
    allRaw,
    original,
    expandedKeywords,
    phrases,
    slideNumber,
    fetchLimit
  );

  const selected = allScored
    .filter((chunk) => (chunk.score ?? 0) > 0)
    .slice(0, limit);

  logRetrieval({
    query: original,
    conversationId,
    intent: logCtx.intent,
    slideNumber,
    keywords: preprocessed.keywords,
    phrases,
    synonymTerms: preprocessed.synonymTerms,
    topicTerms: preprocessed.topicTerms,
    expandedKeywords,
    expandedQuery,
    stages,
    allScored,
    selected,
  });

  return selected.map(stripInternalFields);
};

const searchOsiTcpIpComparison = async (trimmedQuery, limit, conversationId, preprocessed, logCtx) => {
  const fetchLimit = limit * 4;
  const stages = [];
  const expanded = `${trimmedQuery} ${OSI_TCP_IP_EXPANSION}`;

  const ftsExpanded = await searchFullText(expanded, fetchLimit, conversationId);
  stages.push({ source: 'fts-osi-expanded', chunks: ftsExpanded });

  const ftsOriginal = await searchFullText(trimmedQuery, fetchLimit, conversationId);
  stages.push({ source: 'fts-osi-original', chunks: ftsOriginal });

  const osiKeywords = ['osi', 'model osi', 'tcp/ip', 'tcpip', 'application', 'transport', 'internet'];
  const keywordResults = await searchKeywords(osiKeywords, fetchLimit, conversationId);
  stages.push({ source: 'keyword-osi', chunks: keywordResults });

  const allScored = mergeChunksByBestScore(
    [[...ftsExpanded, ...ftsOriginal, ...keywordResults]],
    fetchLimit
  );

  const selected = allScored.slice(0, limit);

  logRetrieval({
    query: trimmedQuery,
    conversationId,
    intent: logCtx.intent,
    slideNumber: preprocessed.slideNumber,
    keywords: preprocessed.keywords,
    phrases: preprocessed.phrases,
    synonymTerms: [...preprocessed.synonymTerms, OSI_TCP_IP_EXPANSION],
    topicTerms: preprocessed.topicTerms,
    expandedKeywords: preprocessed.expandedKeywords,
    expandedQuery: expanded,
    stages,
    allScored,
    selected,
  });

  return selected.map(stripInternalFields);
};

/**
 * @type {import('./types').RetrievalProvider}
 */
const searchRelevantChunks = async (query, options = {}) => {
  const limit = options.limit || ragConfig.topK;
  const conversationId = options.conversationId ?? null;
  const trimmedQuery = query?.trim();

  if (!trimmedQuery || conversationId == null) {
    return [];
  }

  const preprocessed = preprocessQuery(trimmedQuery);
  const logCtx = { intent: options.intent };

  if (isOsiTcpIpComparisonQuery(trimmedQuery)) {
    return searchOsiTcpIpComparison(trimmedQuery, limit, conversationId, preprocessed, logCtx);
  }

  return runRetrievalPipeline(preprocessed, limit, conversationId, logCtx);
};

module.exports = {
  searchRelevantChunks,
};
