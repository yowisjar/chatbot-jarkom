/**
 * Sinonim dan perluasan topik untuk meningkatkan recall retrieval.
 * Mendukung sinonim dua arah untuk materi Jaringan Komputer.
 */

const NETWORK_SYNONYM_GROUPS = [
  ['komunikasi terpadu', 'unified communications', 'unified communication', 'uc'],
  ['unified communications', 'komunikasi terpadu'],
  ['web', 'www', 'http', 'html', 'web server', 'website', 'situs web'],
  ['domain', 'dns', 'domain name system', 'nama domain'],
  ['pemilik domain', 'whois', 'registrant', 'registrar', 'domain owner'],
  ['whois', 'registrant', 'registrar', 'admin contact', 'technical contact', 'billing contact'],
  ['wireless', 'nirkabel', 'wifi', 'wi-fi', 'bluetooth', 'wimax', 'wlan'],
  ['packet switching', 'paket switching', 'pertukaran paket'],
  ['client server', 'klien server', 'client-server', 'arsitektur client server'],
  ['modem', 'modulator demodulator', 'modulasi demodulasi'],
  ['voice over ip', 'voip', 'voice over internet protocol'],
  ['vpn', 'virtual private network', 'jaringan pribadi virtual'],
  ['rfid', 'radio frequency identification'],
  ['sensor nirkabel', 'wireless sensor network', 'wsn', 'sensor network'],
  ['bandwidth', 'bandwith', 'lebar pita', 'frekuensi', 'hertz', 'hz'],
  ['dns security test', 'dnssec', 'uji keamanan dns', 'spoofability', 'zone transfer'],
  ['dns server test', 'dns server', 'nameserver', 'name server'],
  ['web server test', 'pengujian web server', 'secure website connection', 'security header'],
  ['email server', 'smtp', 'mail server', 'email server test'],
  ['audit domain', 'audit dns', 'proses audit domain'],
];

const SYNONYM_RULES = [
  { patterns: [/pemilik\s+(sebuah\s+)?domain|domain\s+pemilik|siapa\s+pemilik/i], terms: ['whois', 'registrant', 'registrar', 'domain'] },
  { patterns: [/\bwhois\b/i], terms: ['whois', 'registrant', 'registrar', 'admin contact', 'domain'] },
  { patterns: [/\bemail\b|e-mail|surat\s+elektronik/i], terms: ['email', 'smtp', 'mail server', 'mx record', 'spf', 'dkim'] },
  { patterns: [/\bweb\b|website|situs|www\b/i], terms: ['web', 'www', 'http', 'html', 'web server', 'https'] },
  { patterns: [/komunikasi\s+terpadu|unified\s+communications?|\buc\b/i], terms: ['unified communications', 'komunikasi terpadu', 'voip', 'collaboration'] },
  { patterns: [/jaringan\s+nirkabel|nirkabel|wireless|\bwifi\b|\bwi-fi\b/i], terms: ['wireless', 'nirkabel', 'wifi', 'bluetooth', 'wimax', 'wlan'] },
  { patterns: [/packet\s*switching|paket\s*switching/i], terms: ['packet switching', 'paket switching'] },
  { patterns: [/client\s*server|klien\s*server/i], terms: ['client server', 'klien server'] },
  { patterns: [/\bmodem\b/i], terms: ['modem', 'modulator demodulator'] },
  { patterns: [/voice\s*over\s*ip|\bvoip\b/i], terms: ['voice over ip', 'voip'] },
  { patterns: [/\bvpn\b|virtual\s*private\s*network/i], terms: ['vpn', 'virtual private network'] },
  { patterns: [/\brfid\b/i], terms: ['rfid', 'radio frequency identification'] },
  { patterns: [/sensor\s*nirkabel|wireless\s*sensor/i], terms: ['wireless sensor network', 'sensor nirkabel', 'wsn'] },
  { patterns: [/bandwidth|bandwith|lebar\s*pita/i], terms: ['bandwidth', 'bandwith', 'frekuensi', 'hertz'] },
  { patterns: [/dns\s*security|keamanan\s*dns|dnssec/i], terms: ['dns security test', 'dnssec', 'spoofability', 'zone transfer'] },
  { patterns: [/dns\s*server|nameserver/i], terms: ['dns server', 'dns server test', 'dns record', 'nameserver'] },
  { patterns: [/web\s*server|pengujian\s*web/i], terms: ['web server', 'web server test', 'https', 'security header'] },
  { patterns: [/audit\s*domain|audit\s*dns|proses\s*audit/i], terms: ['audit domain', 'audit dns', 'whois', 'dns record'] },
];

const TOPIC_RULES = [
  { patterns: [/pemilik|whois|registran/i, /domain/i], terms: ['whois', 'registrant', 'registrar', 'admin contact', 'domain'] },
  { patterns: [/dns\s*security/i], terms: ['dns security test', 'dnssec', 'spoofability', 'zone transfer'] },
  { patterns: [/web\s*server/i], terms: ['web server', 'web server test', 'https', 'security header', 'malware detection'] },
  { patterns: [/dns\s*server\s*test/i], terms: ['dns server test', 'dns server', 'dns record', 'nameserver'] },
  { patterns: [/email\s*server/i], terms: ['email server test', 'smtp', 'mx record', 'spf', 'dkim'] },
];

const addTerms = (set, ...terms) => {
  for (const term of terms) {
    const trimmed = term.trim().toLowerCase();
    if (trimmed) set.add(trimmed);
  }
};

const matchesAny = (text, patterns) => patterns.some((p) => p.test(text));

const expandFromGroups = (text) => {
  const terms = new Set();
  const lower = text.toLowerCase();

  for (const group of NETWORK_SYNONYM_GROUPS) {
    const hit = group.some((term) => lower.includes(term.toLowerCase()));
    if (hit) addTerms(terms, ...group);
  }

  return [...terms];
};

const expandSynonyms = (query) => {
  const text = query.toLowerCase();
  const terms = new Set(expandFromGroups(text));

  for (const rule of SYNONYM_RULES) {
    if (matchesAny(text, rule.patterns)) {
      addTerms(terms, ...rule.terms);
    }
  }

  return [...terms];
};

const expandQueryKeywords = (query) => {
  const text = query.toLowerCase();
  const keywords = new Set();

  for (const rule of TOPIC_RULES) {
    if (rule.patterns.every((pattern) => pattern.test(text))) {
      addTerms(keywords, ...rule.terms);
    }
  }

  return [...keywords];
};

const buildExpandedQuery = (query, extraTerms) => {
  if (!extraTerms.length) return query;
  return `${query} ${extraTerms.join(' ')}`;
};

module.exports = {
  NETWORK_SYNONYM_GROUPS,
  expandSynonyms,
  expandQueryKeywords,
  buildExpandedQuery,
};
