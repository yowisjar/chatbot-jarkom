const PREVIEW_LENGTH = 200;

const formatChunkMeta = (chunk) => {
  const slide = chunk.slideNumber != null ? `slide=${chunk.slideNumber}` : 'slide=n/a';
  return `id=${chunk.id} | ${chunk.materialTitle} | ${slide} | chunk=${chunk.chunkIndex}`;
};

const formatPreview = (content) =>
  (content || '').replace(/\s+/g, ' ').slice(0, PREVIEW_LENGTH);

const logRetrieval = (ctx) => {
  console.log('[RAG:Retrieval] ═══════════════════════════════════════');
  console.log(`[RAG:Retrieval] user message    : ${ctx.query}`);
  console.log(`[RAG:Retrieval] conversationId  : ${ctx.conversationId ?? 'n/a'}`);
  console.log(`[RAG:Retrieval] intent          : ${ctx.intent ?? 'n/a'}`);
  console.log(`[RAG:Retrieval] slide/page      : ${ctx.slideNumber ?? 'n/a'}`);
  console.log(`[RAG:Retrieval] keywords        : ${ctx.keywords.join(', ') || '(none)'}`);
  console.log(`[RAG:Retrieval] phrases         : ${(ctx.phrases || []).join(' | ') || '(none)'}`);
  console.log(`[RAG:Retrieval] synonym expand  : ${ctx.synonymTerms.join(', ') || '(none)'}`);
  console.log(`[RAG:Retrieval] topic expand    : ${ctx.topicTerms.join(', ') || '(none)'}`);
  console.log(`[RAG:Retrieval] expanded query  : ${ctx.expandedQuery || ctx.query}`);

  for (const stage of ctx.stages) {
    console.log(`[RAG:Retrieval] ── ${stage.source} (${stage.chunks.length} chunks) ──`);
    stage.chunks.forEach((chunk, i) => {
      console.log(
        `[RAG:Retrieval]   [${stage.source}] #${i + 1} score=${(chunk.score ?? 0).toFixed(4)} | ${formatChunkMeta(chunk)}`
      );
      console.log(`[RAG:Retrieval]       preview: ${formatPreview(chunk.content)}`);
    });
  }

  console.log('[RAG:Retrieval] ── merged & ranked ──');
  ctx.allScored.forEach((chunk, i) => {
    console.log(
      `[RAG:Retrieval]   merged #${i + 1} score=${(chunk.score ?? 0).toFixed(4)} | ${formatChunkMeta(chunk)}`
    );
  });

  console.log('[RAG:Retrieval] ── final selected ──');
  if (ctx.selected.length === 0) {
    console.log('[RAG:Retrieval]   (tidak ada chunk terpilih)');
  } else {
    ctx.selected.forEach((chunk, i) => {
      console.log(
        `[RAG:Retrieval]   ✓ #${i + 1} score=${(chunk.score ?? 0).toFixed(4)} | ${formatChunkMeta(chunk)}`
      );
      console.log(`[RAG:Retrieval]       preview: ${formatPreview(chunk.content)}`);
    });
  }

  console.log('[RAG:Retrieval] ═══════════════════════════════════════');
};

module.exports = {
  logRetrieval,
  formatChunkMeta,
};
