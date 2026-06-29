import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/common/ThemeToggle';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      return setError('Password dan konfirmasi password tidak sama');
    }
    if (form.password.length < 6) {
      return setError('Password minimal 6 karakter');
    }

    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registrasi gagal, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.themeToggleWrap}>
        <ThemeToggle />
      </div>
      <div style={styles.card}>
        <div style={styles.header}>
          <div style={styles.icon}>🌐</div>
          <h1 style={styles.title}>Daftar Akun</h1>
          <p style={styles.subtitle}>Buat akun untuk mulai belajar Jaringan Komputer</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Nama Lengkap</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Nama kamu"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Email</label>
            <input
              type="email"
              style={styles.input}
              placeholder="email@contoh.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={styles.input}
              placeholder="Minimal 6 karakter"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Konfirmasi Password</label>
            <input
              type="password"
              style={styles.input}
              placeholder="Ulangi password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
            />
          </div>
          <button type="submit" style={loading ? styles.btnDisabled : styles.btn} disabled={loading}>
            {loading ? 'Mendaftar...' : 'Daftar'}
          </button>
        </form>

        <p style={styles.footer}>
          Sudah punya akun?{' '}
          <Link to="/login" style={styles.link}>Masuk di sini</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    background: 'var(--auth-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
    fontFamily: "'Inter', -apple-system, sans-serif",
    position: 'relative',
    transition: 'background var(--transition-speed)',
  },
  themeToggleWrap: {
    position: 'absolute',
    top: '1.25rem',
    right: '1.25rem',
  },
  card: {
    background: 'var(--auth-card-bg)',
    borderRadius: '16px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '420px',
    border: '1px solid var(--auth-card-border)',
    boxShadow: 'var(--auth-card-shadow)',
    transition: 'background-color var(--transition-speed), border-color var(--transition-speed), box-shadow var(--transition-speed)',
  },
  header: { textAlign: 'center', marginBottom: '2rem' },
  icon: { fontSize: '3rem', marginBottom: '0.5rem' },
  title: { color: 'var(--text-color)', fontSize: '1.8rem', fontWeight: 700, margin: 0, transition: 'color var(--transition-speed)' },
  subtitle: { color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.5rem', transition: 'color var(--transition-speed)' },
  error: {
    background: '#450a0a',
    color: '#fca5a5',
    border: '1px solid #7f1d1d',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  label: { color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, transition: 'color var(--transition-speed)' },
  input: {
    background: 'var(--auth-input-bg)',
    border: '1px solid var(--card-border)',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: 'var(--text-color)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'border-color 0.2s, background-color var(--transition-speed), color var(--transition-speed)',
  },
  btn: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '0.5rem',
  },
  btnDisabled: {
    background: 'var(--btn-disabled-bg)',
    color: 'var(--btn-disabled-text)',
    border: 'none',
    borderRadius: '8px',
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: 600,
    cursor: 'not-allowed',
    marginTop: '0.5rem',
  },
  footer: { textAlign: 'center', color: 'var(--text-hint)', fontSize: '0.875rem', marginTop: '1.5rem', transition: 'color var(--transition-speed)' },
  link: { color: '#3b82f6', textDecoration: 'none', fontWeight: 500 },
};
