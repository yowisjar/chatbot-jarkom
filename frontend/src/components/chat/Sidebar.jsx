import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onGoHome,
  loadingSession,
  isOpen = false,
}) {
  const { user, logout } = useAuth();
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (confirmDelete === id) {
      setDeletingId(id);
      await onDeleteSession(id);
      setDeletingId(null);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Hari ini';
    if (days === 1) return 'Kemarin';
    if (days < 7) return `${days} hari lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  return (
    <aside
      className={`chat-sidebar${isOpen ? ' chat-sidebar--open' : ''}`}
      style={styles.sidebar}
    >
      <div style={styles.sidebarHeader}>
        <button
          type="button"
          onClick={onGoHome}
          style={styles.brandButton}
          title="Kembali ke Home"
        >
          <span style={styles.brandIcon}>🌐</span>
          <span style={styles.brandName}>NetBot</span>
        </button>
        <button onClick={onNewChat} style={styles.newChatBtn} disabled={loadingSession}>
          {loadingSession ? '...' : '＋ Chat Baru'}
        </button>
      </div>

      <div style={styles.historyList}>
        <p style={styles.historyLabel}>Riwayat Chat</p>
        {sessions.length === 0 ? (
          <div style={styles.emptyHistory}>
            <p style={styles.emptyText}>Belum ada riwayat chat</p>
            <p style={styles.emptyHint}>Klik "Chat Baru" untuk mulai</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session.id)}
              style={{
                ...styles.sessionItem,
                ...(activeSessionId === session.id ? styles.sessionItemActive : {}),
              }}
            >
              <div style={styles.sessionIcon}>💬</div>
              <div style={styles.sessionInfo}>
                <p style={styles.sessionTitle}>{session.title}</p>
                <p style={styles.sessionDate}>{formatDate(session.updated_at)}</p>
              </div>
              <button
                onClick={(e) => handleDelete(e, session.id)}
                style={{
                  ...styles.deleteBtn,
                  ...(confirmDelete === session.id ? styles.deleteBtnConfirm : {}),
                }}
                title={confirmDelete === session.id ? 'Klik lagi untuk hapus' : 'Hapus chat'}
                disabled={deletingId === session.id}
              >
                {deletingId === session.id ? '⏳' : confirmDelete === session.id ? '✓' : '🗑'}
              </button>
            </div>
          ))
        )}
      </div>

      <div style={styles.userSection}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>{user?.name?.[0]?.toUpperCase()}</div>
          <div style={styles.userDetail}>
            <p style={styles.userName}>{user?.name}</p>
            <p style={styles.userEmail}>{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} style={styles.logoutBtn} title="Keluar">
          ⏻
        </button>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '280px',
    minWidth: '280px',
    background: 'var(--sidebar-bg)',
    display: 'flex',
    flexDirection: 'column',
    borderRight: '1px solid var(--sidebar-border)',
    height: '100vh',
    fontFamily: "'Inter', -apple-system, sans-serif",
    transition: 'background-color var(--transition-speed), border-color var(--transition-speed)',
  },
  sidebarHeader: {
    padding: '1.25rem',
    borderBottom: '1px solid var(--sidebar-border)',
    transition: 'border-color var(--transition-speed)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  brandButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginBottom: '1rem',
    padding: 0,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'left',
  },
  brandIcon: { fontSize: '1.5rem' },
  brandName: { color: 'var(--text-color)', fontWeight: 700, fontSize: '1.25rem', transition: 'color var(--transition-speed)' },
  newChatBtn: {
    width: '100%',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.65rem 1rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.75rem',
  },
  historyLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    padding: '0 0.5rem',
    marginBottom: '0.5rem',
    transition: 'color var(--transition-speed)',
  },
  emptyHistory: {
    padding: '2rem 0.5rem',
    textAlign: 'center',
  },
  emptyText: { color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0, transition: 'color var(--transition-speed)' },
  emptyHint: { color: 'var(--text-hint)', fontSize: '0.75rem', marginTop: '0.25rem', transition: 'color var(--transition-speed)' },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.65rem 0.75rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background 0.15s',
    marginBottom: '0.25rem',
  },
  sessionItemActive: {
    background: 'var(--session-active-bg)',
    border: '1px solid var(--session-active-border)',
  },
  sessionIcon: { fontSize: '1rem', flexShrink: 0 },
  sessionInfo: { flex: 1, minWidth: 0 },
  sessionTitle: {
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'color var(--transition-speed)',
  },
  sessionDate: {
    color: 'var(--text-hint)',
    fontSize: '0.75rem',
    margin: 0,
    marginTop: '0.15rem',
    transition: 'color var(--transition-speed)',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.85rem',
    padding: '0.25rem',
    borderRadius: '4px',
    opacity: 0.5,
    flexShrink: 0,
  },
  deleteBtnConfirm: {
    opacity: 1,
    background: '#7f1d1d',
  },
  userSection: {
    padding: '1rem',
    borderTop: '1px solid var(--sidebar-border)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    transition: 'border-color var(--transition-speed)',
  },
  userInfo: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    minWidth: 0,
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.875rem',
    flexShrink: 0,
  },
  userDetail: { minWidth: 0 },
  userName: {
    color: 'var(--text-color)',
    fontSize: '0.875rem',
    fontWeight: 600,
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'color var(--transition-speed)',
  },
  userEmail: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    margin: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    transition: 'color var(--transition-speed)',
  },
  logoutBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    borderRadius: '6px',
    padding: '0.4rem 0.6rem',
    cursor: 'pointer',
    fontSize: '1rem',
    flexShrink: 0,
    transition: 'border-color var(--transition-speed), color var(--transition-speed)',
  },
};
