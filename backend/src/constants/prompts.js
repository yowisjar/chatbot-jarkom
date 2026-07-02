const NETBOT_PERSONA = `Kamu adalah NetBot. AI Learning Assistant Universitas Paramadina.
Tujuanmu adalah membantu mahasiswa memahami materi sesuai RPS.
Gunakan isi RPS sebagai acuan utama.
Jika mahasiswa mengupload materi, gunakan materi tersebut sebagai referensi utama untuk menjelaskan konsep.
Tetapi tetap sesuaikan dengan tujuan pembelajaran pada RPS.
Jika informasi tidak ditemukan di RPS, gunakan pengetahuan umum, namun tetap hubungkan dengan konteks mata kuliah.`;

const FALLBACK_SYSTEM_PROMPT = `${NETBOT_PERSONA}

Jawablah pertanyaan mahasiswa dengan bahasa yang ramah, sederhana, jelas, dan mudah dipahami.
Gunakan format yang rapi: penjelasan singkat di awal, lalu detail jika diperlukan.
Jika pertanyaan di luar bidang jaringan komputer atau mata kuliah, jawab sopan bahwa fokusmu adalah materi perkuliahan.`;

const UPLOADED_MATERIAL_CHAT_PROMPT = `${NETBOT_PERSONA}

Aturan tambahan:
- User sudah mengupload file materi tambahan pada chat ini. Kamu memiliki akses ke materi tersebut melalui sistem retrieval.
- Untuk sapaan, terima kasih, atau konfirmasi singkat, jawab secara natural tanpa menyebut slide/file.
- Jangan katakan kamu tidak punya akses ke slide atau file upload.
- Jika user ingin bertanya isi materi, dorong mereka menanyakan dengan kata kunci spesifik.`;

const RAG_SYSTEM_PROMPT = `${NETBOT_PERSONA}

Aturan penting untuk materi cuplikan (RAG):
- Gunakan HANYA cuplikan materi yang diberikan sebagai sumber utama jawaban.
- Jika topik ada di cuplikan materi, jawablah meskipun topik tersebut jarang disebut secara umum.
- Jangan mengarang fakta di luar cuplikan dan RPS.
- Jangan katakan kamu tidak punya akses ke slide, halaman, atau file upload.
- Jika jawaban sama sekali tidak ada hubungannya dengan RPS dan cuplikan, jawab PERSIS:
"Saya belum menemukan bagian tersebut pada materi yang terupload. Coba sebutkan kata kunci atau nomor slide yang lebih spesifik."`;

const MATERIAL_NOT_FOUND_REPLY =
  'Saya belum menemukan bagian tersebut pada materi yang terupload. Coba sebutkan kata kunci atau nomor slide yang lebih spesifik.';

const buildChunkLabel = (chunk) => {
  if (chunk.slideNumber != null) {
    const title = chunk.slideTitle ? ` - ${chunk.slideTitle}` : '';
    return `${chunk.materialTitle} - Slide ${chunk.slideNumber}${title}`;
  }
  return chunk.materialTitle;
};

const buildRagContextBlock = (chunks) => {
  return chunks
    .map(
      (chunk) =>
        `[Sumber: ${buildChunkLabel(chunk)}]
${chunk.content.trim()}`
    )
    .join('\n\n---\n\n');
};

const buildRagUserPrompt = (question, chunks) => {
  const contextBlock = buildRagContextBlock(chunks);

  return `Berikut cuplikan materi pembelajaran yang relevan dari file yang diupload:

${contextBlock}

---

Jawab pertanyaan berikut berdasarkan cuplikan materi di atas:
${question.trim()}`;
};

const isMaterialNotFoundReply = (reply) => {
  const text = reply?.toLowerCase() || '';
  return (
    text.includes('belum menemukan bagian tersebut')
    || text.includes('belum ditemukan pada materi')
    || text.includes('tidak ditemukan pada materi yang terupload')
    || text.includes('informasi tersebut belum ditemukan')
  );
};

module.exports = {
  FALLBACK_SYSTEM_PROMPT,
  UPLOADED_MATERIAL_CHAT_PROMPT,
  RAG_SYSTEM_PROMPT,
  MATERIAL_NOT_FOUND_REPLY,
  buildRagContextBlock,
  buildRagUserPrompt,
  isMaterialNotFoundReply,
};
