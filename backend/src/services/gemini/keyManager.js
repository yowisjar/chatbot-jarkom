const COOLDOWN_MS = Number(process.env.GEMINI_KEY_COOLDOWN_MS) || 5 * 60 * 1000;

/** @type {Array<{id:number, envName:string, key:string, available:boolean, cooldownUntil:number|null}>} */
let keys = [];
let roundRobinIndex = 0;
let lastUsedKeyId = null;

const parseKeyId = (envName) => {
  if (envName === 'GEMINI_API_KEY') return 1;
  return parseInt(envName.replace('GEMINI_API_KEY_', ''), 10);
};

const loadKeys = () => {
  const numberedEntries = Object.entries(process.env)
    .filter(([name, value]) => name.startsWith('GEMINI_API_KEY_') && value?.trim())
    .sort((a, b) => parseKeyId(a[0]) - parseKeyId(b[0]));

  let entries = numberedEntries;

  if (entries.length === 0 && process.env.GEMINI_API_KEY?.trim()) {
    entries = [['GEMINI_API_KEY', process.env.GEMINI_API_KEY]];
  }

  keys = entries.map(([envName, value]) => ({
    id: parseKeyId(envName),
    envName,
    key: value.trim(),
    available: true,
    cooldownUntil: null,
  }));

  roundRobinIndex = 0;
  lastUsedKeyId = keys[0]?.id ?? null;

  console.log(`[Gemini] Loaded ${keys.length} API Key${keys.length !== 1 ? 's' : ''}`);

  return keys;
};

const resetCooldown = () => {
  const now = Date.now();
  let reactivated = 0;

  for (const entry of keys) {
    if (!entry.available && entry.cooldownUntil && entry.cooldownUntil <= now) {
      entry.available = true;
      entry.cooldownUntil = null;
      reactivated += 1;
      console.log(`[Gemini] Key #${entry.id} cooldown selesai, aktif kembali`);
    }
  }

  return reactivated;
};

const availableKeys = () => {
  resetCooldown();
  return keys.filter((entry) => entry.available);
};

const findKeyById = (id) => keys.find((entry) => entry.id === id);

const getCurrentKey = () => {
  resetCooldown();

  if (keys.length === 0) {
    return null;
  }

  const active = availableKeys();
  if (active.length === 0) {
    return null;
  }

  for (let i = 0; i < keys.length; i += 1) {
    const index = (roundRobinIndex + i) % keys.length;
    const entry = keys[index];

    if (entry.available) {
      roundRobinIndex = (index + 1) % keys.length;
      lastUsedKeyId = entry.id;
      console.log(`[Gemini] Using Key #${entry.id}`);
      return entry;
    }
  }

  return null;
};

const peekNextKey = () => {
  resetCooldown();

  if (keys.length === 0) return null;

  for (let i = 0; i < keys.length; i += 1) {
    const index = (roundRobinIndex + i) % keys.length;
    const entry = keys[index];
    if (entry.available) return entry;
  }

  return null;
};

const nextKey = () => getCurrentKey();

const markUnavailable = (id) => {
  const entry = findKeyById(id);
  if (!entry) return null;

  entry.available = false;
  entry.cooldownUntil = Date.now() + COOLDOWN_MS;
  console.log(`[Gemini] Key #${id} quota exceeded`);

  const next = peekNextKey();
  if (next && next.id !== id) {
    console.log(`[Gemini] Switching to Key #${next.id}`);
  }

  return entry;
};

const getStatus = () => {
  resetCooldown();

  return {
    totalKeys: keys.length,
    available: availableKeys().length,
    unavailable: keys.length - availableKeys().length,
    currentKey: lastUsedKeyId,
  };
};

const getTotalKeys = () => keys.length;

const hasKeys = () => keys.length > 0;

loadKeys();

module.exports = {
  loadKeys,
  getCurrentKey,
  nextKey,
  markUnavailable,
  resetCooldown,
  availableKeys,
  getStatus,
  getTotalKeys,
  hasKeys,
  COOLDOWN_MS,
};
