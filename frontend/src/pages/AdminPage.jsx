import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import ThemeToggle from '../components/common/ThemeToggle';

export default function AdminPage() {
  const { logout, user } = useAuth();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLatestRps = async () => {
      try {
        const token = localStorage.getItem('token');
        console.log('[DEBUG FRONTEND] USER:', user);
        console.log('[DEBUG FRONTEND] TOKEN:', token);
        console.log('[DEBUG FRONTEND] FETCH START — URL:', `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/rps/latest`);
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/rps/latest`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'ngrok-skip-browser-warning': 'true'
            }
          }
        );
        console.log('[DEBUG FRONTEND] response.status:', response.status);
        console.log('[DEBUG FRONTEND] response.headers:', response.headers);
        console.log('[DEBUG FRONTEND] response.data (RAW):', response.data);
        console.log('[DEBUG FRONTEND] typeof response.data:', typeof response.data);
        console.log('[DEBUG FRONTEND] response.data.document:', response.data.document);
        console.log('[DEBUG FRONTEND] FETCH END');
        if (response.data.document) {
          setStatus(response.data.document);
        }
      } catch (err) {
        console.error('[DEBUG FRONTEND] Gagal memuat data RPS:', err);
        console.error('[DEBUG FRONTEND] err.response:', err.response);
        console.error('[DEBUG FRONTEND] err.response?.data:', err.response?.data);
      }
    };
    
    // Only fetch if admin is logged in
    if (user && user.role === 'admin') {
      fetchLatestRps();
    }
  }, [user]);

  // If a student somehow navigates here, kick them out
  if (user && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Hanya file PDF yang diperbolehkan.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setError('Ukuran file maksimal 20 MB.');
      return;
    }

    setUploading(true);
    setError(null);
    setStatus(null);

    const formData = new FormData();
    formData.append('rpsFile', file);

    try {
      const token = localStorage.getItem('token');
      // Use standard axios to hit the backend directly since it might not be exported from api.js the way we need
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/admin/upload-rps`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          },
        }
      );
      setStatus(response.data.document);
      setFile(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Gagal mengupload RPS.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.themeToggleWrap}>
        <ThemeToggle />
      </div>
      <div style={styles.content}>
        
        <header style={styles.header}>
          <h1 style={styles.title}>NetBot Admin</h1>
          <div style={styles.headerRight}>
            <span style={styles.email}>{user?.email}</span>
            <button onClick={logout} style={styles.logoutBtn}>Logout</button>
          </div>
        </header>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Upload RPS Mata Kuliah</h2>
          
          <div style={styles.uploadRow}>
            <input 
              type="file" 
              accept=".pdf"
              onChange={handleFileChange}
              style={styles.fileInput}
            />
            
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              style={(!file || uploading) ? styles.uploadBtnDisabled : styles.uploadBtn}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
          
          {error && <p style={styles.errorText}>{error}</p>}
        </section>

        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Status Upload</h2>
          
          {!status ? (
            <p style={styles.emptyText}>Belum ada RPS yang diupload.</p>
          ) : (
            <div style={styles.statusList}>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>File RPS</span>
                <span style={styles.statusValue}>{status.original_name}</span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Tanggal Upload</span>
                <span style={styles.statusValue}>
                  {new Date(status.created_at).toLocaleString('id-ID')}
                </span>
              </div>
              <div style={styles.statusRow}>
                <span style={styles.statusLabel}>Status</span>
                <span style={{ ...styles.statusValue, color: '#34d399' }}>Tersimpan</span>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--bg-color)',
    color: 'var(--text-color)',
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: '2rem',
    position: 'relative',
    transition: 'background var(--transition-speed), color var(--transition-speed)'
  },
  themeToggleWrap: {
    position: 'absolute',
    top: '1.25rem',
    right: '1.25rem',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '2rem'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '1rem',
    borderBottom: '1px solid var(--border-color)'
  },
  title: {
    margin: 0,
    color: '#3b82f6',
    fontSize: '1.5rem',
    fontWeight: 700
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  email: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem'
  },
  logoutBtn: {
    background: '#fee2e2',
    color: '#ef4444',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.875rem'
  },
  card: {
    background: 'var(--card-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '12px',
    padding: '1.5rem',
    boxShadow: 'var(--card-shadow)'
  },
  cardTitle: {
    margin: '0 0 1rem 0',
    fontSize: '1.125rem',
    fontWeight: 600
  },
  uploadRow: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  fileInput: {
    flex: 1,
    padding: '0.5rem',
    background: 'var(--input-bg)',
    border: '1px dashed var(--border-color)',
    borderRadius: '6px',
    color: 'var(--text-color)',
    cursor: 'pointer'
  },
  uploadBtn: {
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'opacity 0.2s'
  },
  uploadBtnDisabled: {
    background: 'var(--border-color)',
    color: 'var(--text-muted)',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    fontWeight: 600,
    cursor: 'not-allowed'
  },
  errorText: {
    color: '#ef4444',
    marginTop: '1rem',
    fontSize: '0.875rem'
  },
  emptyText: {
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    margin: 0
  },
  statusList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    paddingBottom: '0.5rem',
    borderBottom: '1px solid var(--border-color)'
  },
  statusLabel: {
    color: 'var(--text-muted)',
    fontSize: '0.875rem'
  },
  statusValue: {
    fontWeight: 500,
    fontSize: '0.875rem'
  }
};
