import { useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { HOME_TOPICS } from '../../constants/topicPrompts';

// Format text dari bot (bold, newline)
const formatMessage = (text) => {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code style="background:var(--bg-color);color:var(--text-color);padding:2px 6px;border-radius:4px;font-size:0.85em;transition:background-color var(--transition-speed), color var(--transition-speed)">$1</code>')
    .replace(/\n/g, '<br/>');
};

export default function ChatArea({ messages, loading, activeSessionId, onTopicClick, chipsDisabled }) {
  const { user } = useAuth();
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!activeSessionId) {
    return (
      <div className="chat-area chat-empty-state" style={styles.emptyState}>
        <div className="chat-empty-icon" style={styles.emptyIcon}>🌐</div>
        <h2 className="chat-empty-title" style={styles.emptyTitle}>Selamat datang, {user?.name}!</h2>
        <p style={styles.emptySubtitle}>
          Tanyakan apa saja seputar Jaringan Komputer.
        </p>
        <div className="chat-topic-grid" style={styles.topicGrid}>
          {HOME_TOPICS.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => onTopicClick?.(topic)}
              disabled={chipsDisabled}
              className="chat-topic-chip"
              style={{
                ...styles.topicChip,
                ...(chipsDisabled ? styles.topicChipDisabled : {}),
              }}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="chat-area" style={styles.chatArea}>
      {messages.length === 0 && !loading ? (
        <div style={styles.emptyChat}>
          <p style={styles.emptyChatText}>💬 Mulai percakapan baru!</p>
          <p style={styles.emptyChatHint}>Ketik pertanyaanmu tentang Jaringan Komputer di bawah.</p>
        </div>
      ) : (
        <>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.messageWrapper,
                justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              {msg.sender === 'bot' && (
                <div style={styles.botAvatar}>🤖</div>
              )}
              <div
                className="chat-bubble"
                style={{
                  ...styles.bubble,
                  ...(msg.sender === 'user' ? styles.bubbleUser : styles.bubbleBot),
                }}
              >
                {msg.sender === 'bot' ? (
                  <div
                    dangerouslySetInnerHTML={{ __html: formatMessage(msg.message) }}
                  />
                ) : (
                  msg.message
                )}
                {msg.sender === 'bot'
                  && Array.isArray(msg.references)
                  && msg.references.length > 0 && (
                  <div style={styles.sources}>
                    {msg.references.map((ref, index) => (
                      <p key={`${ref.displayLabel || ref.materialTitle}-${index}`} style={styles.sourceText}>
                        Sumber: {ref.displayLabel || ref.materialTitle}
                      </p>
                    ))}
                  </div>
                )}
                <div style={styles.timestamp}>
                  {new Date(msg.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              {msg.sender === 'user' && (
                <div style={styles.userAvatar}>
                  {user?.name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div style={{ ...styles.messageWrapper, justifyContent: 'flex-start' }}>
              <div style={styles.botAvatar}>🤖</div>
              <div className="chat-bubble" style={{ ...styles.bubble, ...styles.bubbleBot }}>
                <div style={styles.typingDots}>
                  <span style={{ ...styles.dot, animationDelay: '0s' }} />
                  <span style={{ ...styles.dot, animationDelay: '0.2s' }} />
                  <span style={{ ...styles.dot, animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

const styles = {
  chatArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    textAlign: 'center',
  },
  emptyIcon: { fontSize: '4rem', marginBottom: '1rem' },
  emptyTitle: { color: 'var(--chat-empty-state-title)', fontSize: '1.5rem', fontWeight: 700, margin: 0, transition: 'color var(--transition-speed)' },
  emptySubtitle: { color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '2rem', transition: 'color var(--transition-speed)' },
  topicGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    justifyContent: 'center',
    maxWidth: '500px',
  },
  topicChip: {
    background: 'var(--empty-chip-bg)',
    border: '1px solid var(--empty-chip-border)',
    color: 'var(--empty-chip-text)',
    borderRadius: '20px',
    padding: '0.4rem 0.9rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    fontFamily: "'Inter', -apple-system, sans-serif",
    transition: 'background-color var(--transition-speed), border-color var(--transition-speed), color var(--transition-speed), opacity var(--transition-speed)',
  },
  topicChipDisabled: {
    cursor: 'not-allowed',
    opacity: 0.55,
  },
  emptyChat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  emptyChatText: { color: 'var(--text-muted)', fontSize: '1.1rem', margin: 0, transition: 'color var(--transition-speed)' },
  emptyChatHint: { color: 'var(--text-hint)', fontSize: '0.875rem', marginTop: '0.5rem', transition: 'color var(--transition-speed)' },
  messageWrapper: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '0.6rem',
  },
  botAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'var(--bubble-bot-bg)',
    border: '1px solid var(--bubble-bot-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1rem',
    color: 'var(--text-color)',
    flexShrink: 0,
    transition: 'background-color var(--transition-speed), border-color var(--transition-speed), color var(--transition-speed)',
  },
  userAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.8rem',
    flexShrink: 0,
  },
  bubble: {
    maxWidth: '70%',
    padding: '0.75rem 1rem',
    borderRadius: '12px',
    fontSize: '0.9rem',
    lineHeight: '1.6',
    wordBreak: 'break-word',
  },
  bubbleUser: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    color: 'white',
    borderBottomRightRadius: '4px',
  },
  bubbleBot: {
    background: 'var(--bubble-bot-bg)',
    color: 'var(--bubble-bot-text)',
    border: '1px solid var(--bubble-bot-border)',
    borderBottomLeftRadius: '4px',
    transition: 'background-color var(--transition-speed), color var(--transition-speed), border-color var(--transition-speed)',
  },
  timestamp: {
    fontSize: '0.7rem',
    opacity: 0.6,
    marginTop: '0.4rem',
    textAlign: 'right',
  },
  sources: {
    marginTop: '0.65rem',
    paddingTop: '0.55rem',
    borderTop: '1px solid var(--bubble-bot-border)',
  },
  sourceText: {
    margin: 0,
    fontSize: '0.72rem',
    color: 'var(--text-hint)',
    lineHeight: 1.4,
  },
  typingDots: {
    display: 'flex',
    gap: '4px',
    padding: '4px 2px',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#3b82f6',
    display: 'inline-block',
    animation: 'bounce 1.2s infinite ease-in-out',
  },
};
