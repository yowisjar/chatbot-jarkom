/**
 * Deteksi intent pesan user untuk menentukan apakah perlu RAG.
 * @returns {'general' | 'material_question'}
 */
const detectQuestionIntent = (message) => {
  const text = message?.trim().toLowerCase();
  if (!text) return 'general';

  if (isGreeting(text)) return 'general';
  if (isThanks(text)) return 'general';
  if (isPureAcknowledgment(text)) return 'general';
  if (isMetaOrConfirmationMessage(text)) return 'general';
  if (hasSubstantiveQuestionSignal(text)) return 'material_question';

  return 'general';
};

const isGreeting = (text) =>
  /^(hai|halo|hi|hello|hey|selamat\s+(pagi|siang|sore|malam)|assalamualaikum|pagi|siang|sore|malam)[\s!.,?]*$/i.test(text);

const isThanks = (text) =>
  /^(terima kasih|thanks|thank you|makasih|thx|syukron)[\s!.,?]*$/i.test(text);

const isPureAcknowledgment = (text) =>
  /^(baik|oke|ok|okey|paham|siap|lanjut|ya|iya|yoi|noted|mengerti|understood|sip|mantap)(\s+(baik|oke|ok|lanjut|paham|siap))?[\s!.,?]*$/i.test(text);

const isMetaOrConfirmationMessage = (text) => {
  const metaPatterns = [
    /apakah\s+(saya\s+)?(bisa|boleh)\s+(bertanya|menanyakan|tanya)/i,
    /bisakah\s+saya\s+(bertanya|menanyakan|tanya)/i,
    /boleh\s+(saya\s+)?(bertanya|menanyakan|tanya)/i,
    /saya\s+(ingin|mau|akan)\s+(bertanya|menanyakan|tanya)/i,
    /(ingin|mau)\s+menanyakan\s+pertanyaan/i,
    /menanyakan\s+pertanyaan\s+seputar/i,
    /bertanya\s+seputar\s+materi/i,
    /materi\s+(yang\s+)?(saya\s+)?(upload|unggah).*(apakah|bisa|boleh)/i,
    /apakah\s+(kamu|anda|chatbot|bot)\s+(bisa|boleh)/i,
  ];

  if (metaPatterns.some((pattern) => pattern.test(text))) {
    return !hasSubstantiveQuestionSignal(text);
  }

  return false;
};

const hasSubstantiveQuestionSignal = (text) => {
  if (/slide\s*[#.:]?\s*\d+|halaman\s*\d+|page\s*\d+|bagian\s*\d+/i.test(text)) {
    return true;
  }

  const substantivePatterns = [
    /\b(jelaskan|terangkan|uraikan|definisikan|sebutkan|gambarkan|jabarkan|ringkas|jelaskan)\b/i,
    /\b(bagaimana|mengapa|kenapa|kapan|dimana|di\s+mana)\b/i,
    /\b(perbedaan|beda|bandingkan|versus|vs\.?)\b/i,
    /\b(apa\s+(itu|adalah|fungsi|kegunaan|peran|maksud))\b/i,
    /\b(osi|tcp\s*\/?\s*ip|udp|ip\s+address|subnet|dns|dhcp|vlan|routing|switching|firewall|router|switch|topologi|protokol|ethernet|wifi|nat|vpn|gateway|lan|wan|whois|voip|rfid|modem|wireless|nirkabel|unified\s+communications|komunikasi\s+terpadu|bandwidth|smtp|http|html|www|web\s*server|dnssec|registrar|registrant)\b/i,
  ];

  if (substantivePatterns.some((pattern) => pattern.test(text))) {
    return true;
  }

  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 6 && /\b(apa|siapa|berapa)\b/i.test(text)) {
    if (!/apakah\s+(saya\s+)?(bisa|boleh)/i.test(text)) return true;
  }

  return false;
};

module.exports = {
  detectQuestionIntent,
};
