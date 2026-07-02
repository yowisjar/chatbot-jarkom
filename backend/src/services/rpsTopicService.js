'use strict';

const topicRepository = require('../repositories/topicRepository');

// ============================================================
// STEP 1: Ekstrak semua blok "N. Materi [judul]"
// Pola dari RPS Universitas Paramadina:
//   "1. Materi Teknologi saat ini"
//   "2. Materi Komunikasi Daring"
// ============================================================
const extractMateri = (text) => {
  const pattern = /^(\d{1,2})\.\s+Materi\s+(.+)$/gm;
  const results = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    results.push({
      index: m.index,
      nomor: parseInt(m[1], 10),
      judul: m[2].trim(),
    });
  }
  return results;
};

// ============================================================
// STEP 2: Ekstrak semua "Kemampuan Akhir yang Diharapkan"
// Pola: "Kemampuan Akhir yang Diharapkan \t [teks sub_cpmk]"
// Diakhiri saat menemukan baris berikutnya (Nama Kajian, dll)
// ============================================================
const extractKemampuan = (text) => {
  const pattern = /Kemampuan Akhir yang Diharapkan\s*\t\s*(.+?)(?=\n(?:Nama Kajian|Nama Strategi|Pertemuan|$))/gs;
  const results = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    // Bersihkan noise nomor halaman PDF: "221000001/... Page 15"
    const cleaned = m[1]
      .replace(/\s*\d+\/[^\n]+?Page\s+\d+/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    results.push({ index: m.index, teks: cleaned });
  }
  return results;
};

// ============================================================
// STEP 3: Ekstrak semua nomor pertemuan
// Pola: "Pertemuan Penggunaan Strategi (Metode) \t 1"
// Jika ada "6 dan 7", ambil angka pertama saja
// ============================================================
const extractPertemuan = (text) => {
  const pattern = /Pertemuan Penggunaan Strategi \(Metode\)\s*\t\s*(\d{1,2})/g;
  const results = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    results.push({ index: m.index, nomor: parseInt(m[1], 10) });
  }
  return results;
};

// ============================================================
// STEP 4: Gabungkan hasil 3 ekstraksi menjadi array topik mentah.
// Untuk setiap blok Materi, cari Kemampuan & Pertemuan
// yang posisinya berada di antara blok tersebut dan blok berikutnya.
// ============================================================
const buildRawTopics = (text) => {
  const materiList    = extractMateri(text);
  const kemampuanList = extractKemampuan(text);
  const pertemuanList = extractPertemuan(text);

  console.log(`[Parser] Blok materi    ditemukan : ${materiList.length}`);
  console.log(`[Parser] Kemampuan akhir ditemukan : ${kemampuanList.length}`);
  console.log(`[Parser] Nomor pertemuan ditemukan : ${pertemuanList.length}`);

  const rawTopics = [];

  for (let i = 0; i < materiList.length; i++) {
    const materi         = materiList[i];
    const nextMateriIdx  = materiList[i + 1] ? materiList[i + 1].index : text.length;

    const kemampuan = kemampuanList.find(
      k => k.index > materi.index && k.index < nextMateriIdx
    );

    const pertemuan = pertemuanList.find(
      p => p.index > materi.index && p.index < nextMateriIdx
    );

    rawTopics.push({
      meeting_number : pertemuan ? pertemuan.nomor : materi.nomor,
      topic_title    : materi.judul,
      sub_cpmk       : kemampuan ? kemampuan.teks : null,
      cpmk           : null,
      references     : null,
    });
  }

  return rawTopics;
};

// ============================================================
// STEP 5: Validasi satu topik.
// Kembalikan { valid: true } atau { valid: false, reason: '...' }
// ============================================================
const validateTopic = (topic) => {
  if (!topic.meeting_number) {
    return { valid: false, reason: 'meeting_number kosong' };
  }
  if (!topic.topic_title || topic.topic_title.trim() === '') {
    return { valid: false, reason: 'topic_title kosong' };
  }
  if (!topic.sub_cpmk || topic.sub_cpmk.trim() === '') {
    return { valid: false, reason: 'sub_cpmk kosong' };
  }
  return { valid: true };
};

// ============================================================
// STEP 6: Filter duplikat berdasarkan meeting_number.
// Meeting yang sama hanya diambil sekali (kemunculan pertama).
// ============================================================
const deduplicateTopics = (topics) => {
  const seen = new Set();
  return topics.filter(t => {
    const key = t.meeting_number;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ============================================================
// STEP 7: Validasi & filter semua topik.
// Topik yang tidak valid dilewati + warning ke console.
// ============================================================
const filterValidTopics = (rawTopics) => {
  const valid   = [];
  const invalid = [];

  for (const topic of rawTopics) {
    const result = validateTopic(topic);
    if (result.valid) {
      valid.push(topic);
    } else {
      invalid.push({ topic, reason: result.reason });
      console.warn(
        `[Parser Warning] Meeting ${topic.meeting_number ?? '?'} ` +
        `("${topic.topic_title ?? ''}") dilewati — ${result.reason}`
      );
    }
  }

  return { valid, invalid };
};

// ============================================================
// STEP 8: Logging detail sebelum INSERT.
// Tampilkan setiap topik yang akan disimpan.
// ============================================================
const logTopicsBeforeInsert = (topics) => {
  console.log('\n[Parser] ─────────── PREVIEW DATA SEBELUM INSERT ───────────');
  topics.forEach(t => {
    console.log(`Meeting  : ${t.meeting_number}`);
    console.log(`Topic    :`);
    console.log(`  ${t.topic_title}`);
    console.log(`Sub CPMK :`);
    console.log(`  ${t.sub_cpmk}`);
    console.log('------------------------------------');
  });
  console.log('[Parser] ────────────────────────────────────────────────────\n');
};

// ============================================================
// STEP 9: Tampilkan summary parsing.
// ============================================================
const logSummary = (totalMeeting, totalBerhasil, totalGagal, totalDisimpan) => {
  console.log('\n====================================');
  console.log('       RPS Parsing Summary          ');
  console.log('====================================');
  console.log(`Meeting ditemukan  : ${totalMeeting}`);
  console.log(`Topic berhasil     : ${totalBerhasil}`);
  console.log(`Topic gagal        : ${totalGagal}`);
  console.log(`Topic disimpan     : ${totalDisimpan}`);
  console.log('====================================\n');
};

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Parse extracted_text RPS menjadi array topik.
 * Tidak melakukan operasi database.
 *
 * @param {string} text
 * @returns {Array<{meeting_number, topic_title, sub_cpmk, cpmk, references}>}
 */
const parseTopicsFromText = (text) => {
  if (!text || typeof text !== 'string') return [];

  const raw        = buildRawTopics(text);
  const deduped    = deduplicateTopics(raw);
  const { valid }  = filterValidTopics(deduped);

  return valid;
};

/**
 * Parse teks RPS lalu simpan ke database secara idempoten:
 * 1. Hapus SELURUH isi rps_topics (bukan hanya per-dokumen)
 *    agar tidak ada sisa data RPS lama dari dokumen manapun.
 * 2. INSERT topik hasil parsing yang sudah tervalidasi.
 *
 * @param {number} rpsDocumentId
 * @param {string} extractedText
 */
const parseAndSaveTopics = async (rpsDocumentId, extractedText) => {
  console.log(`\n[Parser] ══════════ MULAI PARSING rps_document_id=${rpsDocumentId} ══════════`);

  // --- Parsing ---
  const raw          = buildRawTopics(extractedText);
  const deduped      = deduplicateTopics(raw);
  const { valid, invalid } = filterValidTopics(deduped);

  const totalMeeting  = raw.length;
  const totalBerhasil = valid.length;
  const totalGagal    = invalid.length;

  // --- Preview sebelum INSERT ---
  logTopicsBeforeInsert(valid);

  // --- Summary ---
  logSummary(totalMeeting, totalBerhasil, totalGagal, totalBerhasil);

  if (valid.length === 0) {
    console.warn('[Parser] Tidak ada topik valid yang dapat disimpan.');
    return;
  }

  // --- Hapus SELURUH isi tabel rps_topics dulu (idempoten) ---
  // Ini memastikan tidak ada data lama dari RPS manapun yang tertinggal.
  await topicRepository.deleteAllTopics();
  console.log('[Parser] Seluruh data rps_topics lama telah dihapus.');

  // --- INSERT topik baru ---
  await topicRepository.insertTopics(rpsDocumentId, valid);
  console.log(`[Parser] ${valid.length} topik berhasil disimpan ke database.`);
  console.log(`[Parser] ══════════ SELESAI ══════════\n`);
};

module.exports = {
  parseTopicsFromText,
  parseAndSaveTopics,
};
