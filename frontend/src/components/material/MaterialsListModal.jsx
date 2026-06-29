import { useEffect, useState } from 'react';
import { materialAPI } from '../../services/api';

const FILE_TYPE_LABELS = {
  pdf: 'PDF',
  docx: 'Word',
  doc: 'Word (DOC)',
  pptx: 'PowerPoint',
  ppt: 'PowerPoint (PPT)',
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export default function MaterialsListModal({ open, onClose }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;

    const fetchMaterials = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await materialAPI.getMaterials();
        setMaterials(res.data.materials || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Gagal memuat daftar materi.');
      } finally {
        setLoading(false);
      }
    };

    fetchMaterials();
  }, [open]);

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Daftar Materi</h2>
          <button type="button" onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {loading && <p style={styles.status}>Memuat materi...</p>}
        {error && <div style={styles.error}>{error}</div>}

        {!loading && !error && materials.length === 0 && (
          <p style={styles.empty}>Belum ada materi diupload.</p>
        )}

        {!loading && materials.length > 0 && (
          <div style={styles.list}>
            {materials.map((item) => (
              <div key={item.id} style={styles.item}>
                <div style={styles.itemHeader}>
                  <span style={styles.itemIcon}>📄</span>
                  <div style={styles.itemInfo}>
                    <p style={styles.itemTitle}>{item.title}</p>
                    <p style={styles.itemFilename}>{item.filename || '-'}</p>
                  </div>
                  <span style={styles.badge}>
                    {FILE_TYPE_LABELS[item.file_type] || item.file_type || 'Materi'}
                  </span>
                </div>
                <div style={styles.itemMeta}>
                  <span>{Number(item.content_length || 0).toLocaleString('id-ID')} karakter</span>
                  <span>·</span>
                  <span>{item.chunk_count || 0} bagian</span>
                  <span>·</span>
                  <span>{formatDate(item.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    background: 'var(--auth-card-bg)',
    border: '1px solid var(--auth-card-border)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '560px',
    maxHeight: '80vh',
    padding: '1.5rem',
    boxShadow: 'var(--auth-card-shadow)',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    flexShrink: 0,
  },
  title: {
    margin: 0,
    color: 'var(--text-color)',
    fontSize: '1.15rem',
    fontWeight: 700,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '1.1rem',
    cursor: 'pointer',
  },
  status: { color: 'var(--text-hint)', fontSize: '0.875rem', margin: 0 },
  empty: { color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 },
  error: {
    background: '#450a0a',
    color: '#fca5a5',
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.875rem',
  },
  list: {
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.65rem',
  },
  item: {
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '0.75rem',
    background: 'var(--input-container-bg)',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.6rem',
  },
  itemIcon: { fontSize: '1.1rem', flexShrink: 0 },
  itemInfo: { flex: 1, minWidth: 0 },
  itemTitle: {
    margin: 0,
    color: 'var(--text-color)',
    fontSize: '0.9rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemFilename: {
    margin: '0.15rem 0 0',
    color: 'var(--text-hint)',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  badge: {
    background: 'var(--badge-bg)',
    color: 'var(--badge-color)',
    border: '1px solid var(--badge-border)',
    borderRadius: '12px',
    padding: '0.15rem 0.5rem',
    fontSize: '0.7rem',
    flexShrink: 0,
  },
  itemMeta: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.35rem',
    marginTop: '0.5rem',
    color: 'var(--text-hint)',
    fontSize: '0.75rem',
  },
};
