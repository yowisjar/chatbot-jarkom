import { useState, useRef } from 'react';
import { materialAPI, ALLOWED_MATERIAL_EXTENSIONS, MAX_MATERIAL_FILE_SIZE } from '../../services/api';

const FILE_TYPE_LABELS = {
  pdf: 'PDF',
  docx: 'Word (DOCX)',
  doc: 'Word (DOC)',
  pptx: 'PowerPoint (PPTX)',
  ppt: 'PowerPoint (PPT)',
};

export default function UploadMaterialModal({
  open,
  onClose,
  conversationId,
  onSuccess,
}) {
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  if (!open) return null;

  const resetForm = () => {
    setTitle('');
    setFile(null);
    setError('');
    setSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateFile = (selectedFile) => {
    const ext = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_MATERIAL_EXTENSIONS.includes(ext)) {
      return 'Format tidak didukung. Gunakan PDF, Word (.doc/.docx), atau PowerPoint (.ppt/.pptx).';
    }
    if (selectedFile.size > MAX_MATERIAL_FILE_SIZE) {
      return 'Ukuran file maksimal 10MB.';
    }
    return null;
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    setError('');
    setSuccess(null);
    if (!selected) {
      setFile(null);
      return;
    }
    const validationError = validateFile(selected);
    if (validationError) {
      setError(validationError);
      setFile(null);
      e.target.value = '';
      return;
    }
    setFile(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!file) {
      setError('Pilih file materi terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('file', file);
      if (conversationId) {
        formData.append('conversationId', String(conversationId));
      }

      const res = await materialAPI.uploadMaterial(formData);

      if (!res.data.success) {
        setError(res.data.message || 'Gagal mengupload materi.');
        return;
      }

      setSuccess({
        filename: res.data.material?.filename || file.name,
        fileType: res.data.material?.file_type,
        fileTypeLabel: FILE_TYPE_LABELS[res.data.material?.file_type] || res.data.material?.file_type,
        charactersExtracted: res.data.charactersExtracted,
        chunksCreated: res.data.chunksCreated,
        conversationId: res.data.conversationId,
      });
      onSuccess?.(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal mengupload materi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-upload-overlay" style={styles.overlay} onClick={handleClose}>
      <div className="chat-upload-modal" style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Upload File ke Chat Ini</h2>
          <button type="button" onClick={handleClose} style={styles.closeBtn}>✕</button>
        </div>

        {success ? (
          <div style={styles.successBox}>
            <p style={styles.successTitle}>✅ File berhasil diupload!</p>
            <p style={styles.successItem}><strong>File:</strong> {success.filename}</p>
            <p style={styles.successItem}><strong>Tipe:</strong> {success.fileTypeLabel}</p>
            <p style={styles.successItem}><strong>Karakter diekstrak:</strong> {success.charactersExtracted.toLocaleString('id-ID')}</p>
            <p style={styles.successItem}><strong>Chunk dibuat:</strong> {success.chunksCreated}</p>
            <p style={styles.successHint}>File hanya digunakan dalam chat ini.</p>
            <button type="button" onClick={handleClose} style={styles.submitBtn}>
              Tutup
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={styles.form}>
            <p style={styles.hint}>
              File yang diupload hanya berlaku untuk chat ini · PDF, Word, PowerPoint · Maks. 10MB · Maks. 2 file/hari
            </p>

            {error && <div style={styles.error}>{error}</div>}

            <div style={styles.field}>
              <label style={styles.label}>Judul Materi (opsional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Contoh: Modul OSI Layer"
                style={styles.input}
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>File Materi</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx"
                onChange={handleFileChange}
                style={styles.fileInput}
              />
              {file && <p style={styles.fileName}>{file.name}</p>}
            </div>

            <div className="chat-upload-actions" style={styles.actions}>
              <button type="button" onClick={handleClose} style={styles.cancelBtn} disabled={loading}>
                Batal
              </button>
              <button type="submit" style={loading ? styles.submitBtnDisabled : styles.submitBtn} disabled={loading}>
                {loading ? 'Mengupload...' : 'Upload'}
              </button>
            </div>
          </form>
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
    zIndex: 1100,
    padding: '1rem',
  },
  modal: {
    background: 'var(--auth-card-bg)',
    border: '1px solid var(--auth-card-border)',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '480px',
    padding: '1.5rem',
    boxShadow: 'var(--auth-card-shadow)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
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
  form: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  hint: {
    margin: 0,
    fontSize: '0.8rem',
    color: 'var(--text-hint)',
    lineHeight: 1.5,
  },
  error: {
    background: '#450a0a',
    color: '#fca5a5',
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    padding: '0.75rem',
    fontSize: '0.875rem',
  },
  field: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  label: { color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500 },
  input: {
    background: 'var(--auth-input-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '0.65rem 0.85rem',
    color: 'var(--text-color)',
    fontSize: '0.9rem',
  },
  fileInput: { fontSize: '0.85rem', color: 'var(--text-secondary)' },
  fileName: { margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' },
  actions: { display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' },
  cancelBtn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-muted)',
    borderRadius: '8px',
    padding: '0.6rem 1rem',
    cursor: 'pointer',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.25rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  submitBtnDisabled: {
    background: 'var(--btn-disabled-bg)',
    color: 'var(--btn-disabled-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.6rem 1.25rem',
    fontWeight: 600,
    cursor: 'not-allowed',
  },
  successBox: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  successTitle: { margin: 0, color: '#22c55e', fontWeight: 600 },
  successItem: { margin: 0, color: 'var(--text-secondary)', fontSize: '0.875rem' },
  successHint: { margin: 0, color: 'var(--text-hint)', fontSize: '0.8rem' },
};
