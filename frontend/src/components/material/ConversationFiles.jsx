import { materialAPI } from '../../services/api';

const FILE_TYPE_ICONS = {
  pdf: '📕',
  docx: '📘',
  doc: '📘',
  pptx: '📙',
  ppt: '📙',
};

export default function ConversationFiles({
  conversationId,
  materials,
  loading,
  onOpenUpload,
  onDeleteMaterial,
}) {
  if (!conversationId) return null;

  return (
    <div className="chat-files-bar" style={styles.bar}>
      <div className="chat-files-left" style={styles.left}>
        <span style={styles.label}>File chat ini:</span>
        {loading ? (
          <span style={styles.loadingText}>Memuat...</span>
        ) : materials.length === 0 ? (
          <span style={styles.emptyText}>Belum ada file · upload untuk RAG pada chat ini</span>
        ) : (
          <div className="chat-files-list" style={styles.fileList}>
            {materials.map((item) => (
              <div key={item.id} style={styles.fileChip}>
                <span>{FILE_TYPE_ICONS[item.file_type] || '📄'}</span>
                <span style={styles.fileTitle} title={item.title}>{item.title}</span>
                <button
                  type="button"
                  onClick={() => onDeleteMaterial?.(item.id)}
                  style={styles.removeBtn}
                  title="Hapus file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <button type="button" onClick={onOpenUpload} className="chat-files-upload-btn" style={styles.uploadBtn}>
        📎 Upload File
      </button>
    </div>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    padding: '0.65rem 1.5rem',
    borderBottom: '1px solid var(--header-border)',
    background: 'var(--input-container-bg)',
    flexShrink: 0,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  label: {
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  loadingText: {
    color: 'var(--text-hint)',
    fontSize: '0.8rem',
  },
  emptyText: {
    color: 'var(--text-hint)',
    fontSize: '0.8rem',
  },
  fileList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  fileChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: 'var(--badge-bg)',
    border: '1px solid var(--badge-border)',
    borderRadius: '16px',
    padding: '0.2rem 0.55rem',
    fontSize: '0.75rem',
    color: 'var(--text-secondary)',
    maxWidth: '200px',
  },
  fileTitle: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  removeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-hint)',
    cursor: 'pointer',
    fontSize: '0.7rem',
    padding: 0,
    lineHeight: 1,
  },
  uploadBtn: {
    background: 'transparent',
    border: '1px solid var(--card-border)',
    color: 'var(--text-secondary)',
    borderRadius: '8px',
    padding: '0.4rem 0.75rem',
    fontSize: '0.8rem',
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
};
