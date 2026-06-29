import { useTheme } from '../../context/ThemeContext';

export default function ThemeToggle({ style = {} }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{ ...styles.btn, ...style }}
      title={theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
      type="button"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}

const styles = {
  btn: {
    background: 'transparent',
    border: '1px solid var(--border-color)',
    color: 'var(--text-color)',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '1.1rem',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
};
