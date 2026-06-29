import { useState, useRef, useEffect } from 'react';

export default function ChatInput({ onSend, loading, disabled }) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  useEffect(() => {
    if (!loading) {
      isSubmittingRef.current = false;
    }
  }, [loading]);

  const handleSend = () => {
    if (!message.trim() || loading || disabled || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    const trimmed = message.trim();
    setMessage('');
    onSend(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input-wrapper" style={styles.inputWrapper}>
      <div style={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tanyakan sesuatu tentang Jaringan Komputer..."
          style={styles.textarea}
          disabled={disabled || loading}
          rows={1}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!message.trim() || loading || disabled}
          aria-busy={loading}
          style={!message.trim() || loading || disabled ? styles.sendBtnDisabled : styles.sendBtn}
        >
          {loading ? (
            <span style={styles.loadingSpinner}>⏳</span>
          ) : (
            <span>➤</span>
          )}
        </button>
      </div>
      <p className="chat-input-hint" style={styles.hint}>
        Fokus pada materi Jaringan Komputer · Enter untuk kirim
      </p>
    </div>
  );
}

const styles = {
  inputWrapper: {
    padding: '1rem 1.5rem 1.25rem',
    borderTop: '1px solid var(--input-wrapper-border)',
    background: 'var(--input-wrapper-bg)',
    transition: 'background-color var(--transition-speed), border-color var(--transition-speed)',
  },
  inputContainer: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'flex-end',
    background: 'var(--input-container-bg)',
    border: '1px solid var(--input-container-border)',
    borderRadius: '12px',
    padding: '0.5rem 0.75rem',
    transition: 'background-color var(--transition-speed), border-color var(--transition-speed)',
  },
  textarea: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--input-text-color)',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    resize: 'none',
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: '0.25rem 0',
    maxHeight: '120px',
    overflowY: 'auto',
    transition: 'color var(--transition-speed)',
  },
  sendBtn: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    flexShrink: 0,
    transition: 'opacity 0.2s',
  },
  sendBtnDisabled: {
    background: 'var(--btn-disabled-bg)',
    color: 'var(--btn-disabled-text)',
    border: 'none',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    cursor: 'not-allowed',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    flexShrink: 0,
  },
  loadingSpinner: { fontSize: '0.85rem' },
  hint: {
    color: 'var(--input-hint-color)',
    fontSize: '0.75rem',
    textAlign: 'center',
    marginTop: '0.5rem',
    marginBottom: 0,
    transition: 'color var(--transition-speed)',
  },
};
