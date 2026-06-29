const DEFAULT_SESSION_TITLES = new Set(['Chat Baru', 'New Chat']);

export const isDefaultSessionTitle = (title) =>
  DEFAULT_SESSION_TITLES.has(String(title || '').trim());

export const generateSessionTitle = (message) => {
  const cleaned = message.replace(/[?!.,]/g, '').trim();
  if (!cleaned) return 'Chat Baru';
  return cleaned.length > 50 ? `${cleaned.substring(0, 50)}...` : cleaned;
};

/** Naikkan session ke atas sidebar setelah aktivitas terbaru */
export const bumpSessionInList = (sessions, sessionId, patch = {}) => {
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index === -1) return sessions;

  const updated = {
    ...sessions[index],
    ...patch,
    updated_at: patch.updated_at || new Date().toISOString(),
  };

  return [updated, ...sessions.filter((s) => s.id !== sessionId)];
};
