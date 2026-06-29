import { useState, useEffect, useCallback, useRef } from 'react';
import { chatAPI, materialAPI } from '../services/api';
import { TOPIC_PROMPTS } from '../constants/topicPrompts';
import Sidebar from '../components/chat/Sidebar';
import ChatArea from '../components/chat/ChatArea';
import ChatInput from '../components/chat/ChatInput';
import ThemeToggle from '../components/common/ThemeToggle';
import UploadMaterialModal from '../components/material/UploadMaterialModal';
import ConversationFiles from '../components/material/ConversationFiles';
import '../styles/chat-responsive.css';

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadConversationId, setUploadConversationId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sendingRef = useRef(false);

  const isHome = activeSessionId === null;
  const isBusy = loadingMsg || loadingSession;

  const closeSidebar = () => setSidebarOpen(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await chatAPI.getSessions();
      setSessions(res.data.sessions);
    } catch (err) {
      console.error('Gagal memuat history:', err.message);
    }
  }, []);

  const fetchMaterials = useCallback(async (sessionId) => {
    if (!sessionId) {
      setMaterials([]);
      return;
    }

    setLoadingMaterials(true);
    try {
      const res = await materialAPI.getMaterials(sessionId);
      setMaterials(res.data.materials || []);
    } catch (err) {
      console.error('Gagal memuat file chat:', err.message);
      setMaterials([]);
    } finally {
      setLoadingMaterials(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    fetchMaterials(activeSessionId);
  }, [activeSessionId, fetchMaterials]);

  useEffect(() => {
    if (!sidebarOpen) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [sidebarOpen]);

  const handleGoHome = () => {
    setActiveSessionId(null);
    setMessages([]);
    setMaterials([]);
    closeSidebar();
  };

  const handleSelectSession = async (sessionId) => {
    if (sessionId === activeSessionId) {
      closeSidebar();
      return;
    }
    setActiveSessionId(sessionId);
    setMaterials([]);
    setLoadingMessages(true);
    closeSidebar();
    try {
      const res = await chatAPI.getMessages(sessionId);
      setMessages(res.data.messages);
    } catch (err) {
      console.error('Gagal memuat pesan:', err.message);
    } finally {
      setLoadingMessages(false);
    }
  };

  const createSession = async () => {
    const res = await chatAPI.createSession();
    const newSession = res.data.session;
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessages([]);
    setMaterials([]);
    return newSession.id;
  };

  const handleNewChat = async () => {
    setLoadingSession(true);
    closeSidebar();
    try {
      await createSession();
    } catch (err) {
      console.error('Gagal membuat chat baru:', err.message);
    } finally {
      setLoadingSession(false);
    }
  };

  const sendMessageToSession = async (sessionId, message) => {
    sendingRef.current = true;
    setLoadingMsg(true);

    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      message,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await chatAPI.sendMessage(sessionId, message);
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        message: res.data.reply,
        created_at: new Date().toISOString(),
        references: res.data.references || [],
        source: res.data.source,
      };
      setMessages((prev) => [...prev, botMsg]);
      await fetchSessions();
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.message;

      let errorText = '❌ Maaf, terjadi kesalahan. Coba lagi ya.';
      if (status === 429) {
        errorText = `⏳ ${serverMsg || 'Terlalu banyak permintaan ke AI. Tunggu beberapa saat lalu coba lagi.'}`;
      }

      const errMsg = {
        id: `err-${Date.now()}`,
        sender: 'bot',
        message: errorText,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoadingMsg(false);
      sendingRef.current = false;
    }
  };

  const handleSendMessage = async (message) => {
    if (!message?.trim() || isBusy || sendingRef.current) return;

    let sessionId = activeSessionId;

    if (!sessionId) {
      setLoadingSession(true);
      try {
        sessionId = await createSession();
      } catch (err) {
        console.error('Gagal membuat chat:', err.message);
        return;
      } finally {
        setLoadingSession(false);
      }
    }

    closeSidebar();
    await sendMessageToSession(sessionId, message.trim());
  };

  const handleTopicClick = async (topic) => {
    const prompt = TOPIC_PROMPTS[topic];
    if (!prompt || isBusy || sendingRef.current) return;
    await handleSendMessage(prompt);
  };

  const handleDeleteSession = async (sessionId) => {
    try {
      await chatAPI.deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        setActiveSessionId(null);
        setMessages([]);
        setMaterials([]);
      }
    } catch (err) {
      console.error('Gagal menghapus chat:', err.message);
    }
  };

  const handleOpenUpload = async () => {
    let conversationId = activeSessionId;

    if (!conversationId) {
      setLoadingSession(true);
      try {
        conversationId = await createSession();
      } catch (err) {
        console.error('Gagal membuat chat untuk upload:', err.message);
        return;
      } finally {
        setLoadingSession(false);
      }
    }

    closeSidebar();
    setUploadConversationId(conversationId);
    setShowUploadModal(true);
  };

  const handleUploadSuccess = async (data) => {
    const conversationId = data.conversationId;

    if (conversationId && conversationId !== activeSessionId) {
      setActiveSessionId(conversationId);
      setMessages([]);
      await fetchSessions();
    }

    await fetchMaterials(conversationId || activeSessionId);
  };

  const handleDeleteMaterial = async (materialId) => {
    try {
      await materialAPI.deleteMaterial(materialId);
      setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    } catch (err) {
      console.error('Gagal menghapus file:', err.message);
    }
  };

  return (
    <div className="chat-layout" style={styles.layout}>
      {sidebarOpen && (
        <button
          type="button"
          className="chat-sidebar-backdrop"
          onClick={closeSidebar}
          aria-label="Tutup menu"
        />
      )}

      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        onGoHome={handleGoHome}
        loadingSession={loadingSession}
        isOpen={sidebarOpen}
      />

      <div className="chat-main" style={styles.main}>
        <div className="chat-header" style={styles.chatHeader}>
          <div className="chat-header-left" style={styles.headerLeft}>
            <button
              type="button"
              className="chat-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu riwayat chat"
            >
              ☰
            </button>
            {!isHome && <div style={styles.statusDot} />}
            <span className="chat-header-title" style={styles.headerTitle}>
              {activeSessionId
                ? sessions.find((s) => s.id === activeSessionId)?.title || 'Chat'
                : 'NetBot – Asisten Jaringan Komputer'}
            </span>
          </div>
          <div style={styles.headerRight}>
            <ThemeToggle style={{ width: '32px', height: '32px' }} />
          </div>
        </div>

        <ConversationFiles
          conversationId={activeSessionId}
          materials={materials}
          loading={loadingMaterials}
          onOpenUpload={handleOpenUpload}
          onDeleteMaterial={handleDeleteMaterial}
        />

        {loadingMessages ? (
          <div className="chat-loading-messages" style={styles.loadingMessages}>
            <p style={{ color: 'var(--text-hint)' }}>Memuat pesan...</p>
          </div>
        ) : (
          <ChatArea
            messages={messages}
            loading={loadingMsg}
            activeSessionId={activeSessionId}
            onTopicClick={handleTopicClick}
            chipsDisabled={isBusy}
          />
        )}

        <ChatInput
          onSend={handleSendMessage}
          loading={isBusy}
          disabled={isBusy}
        />
      </div>

      <UploadMaterialModal
        open={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setUploadConversationId(null);
        }}
        conversationId={uploadConversationId || activeSessionId}
        onSuccess={handleUploadSuccess}
      />
    </div>
  );
}

const styles = {
  layout: {
    background: 'var(--bg-color)',
    fontFamily: "'Inter', -apple-system, sans-serif",
  },
  main: {
    background: 'var(--chat-bg)',
    transition: 'background-color var(--transition-speed)',
  },
  chatHeader: {
    borderBottom: '1px solid var(--header-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'var(--header-bg)',
    padding: '1rem 1.5rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flexShrink: 0,
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#22c55e',
    boxShadow: '0 0 6px #22c55e',
    flexShrink: 0,
  },
  headerTitle: {
    color: 'var(--header-title-color)',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  loadingMessages: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
};
