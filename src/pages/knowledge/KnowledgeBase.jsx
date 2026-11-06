import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import Badge from '../../components/Badge';
import Icon from '../../components/Icon';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md', '.csv', '.json'];
const SUPPORTED_FORMAT_LABEL = 'PDF, DOCX, TXT, MD, CSV, JSON';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

const SUGGESTED_QUESTIONS = [
  'What are the services available?',
  'What are the check-in and check-out times?',
  'What is the cancellation policy?',
  'What room types are available?',
  'How can I make a reservation?',
  'What facilities are available?',
];

export default function KnowledgeBase() {
  const { user, notify } = useStore();
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' | 'documents' | 'settings'

  // Documents State
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [searchDocQuery, setSearchDocQuery] = useState('');

  // Upload State
  const [selectedFile, setSelectedFile] = useState(null);
  const [customTitle, setCustomTitle] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadSuccessMsg, setUploadSuccessMsg] = useState(null);
  const [duplicateAlert, setDuplicateAlert] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const quickFileInputRef = useRef(null);

  // Chunks Modal State
  const [activeDocForChunks, setActiveDocForChunks] = useState(null);
  const [docChunks, setDocChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [ragSelectedDocId, setRagSelectedDocId] = useState('');
  const [ragLoading, setRagLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [recentQuestions, setRecentQuestions] = useState([]);
  const [expandedSources, setExpandedSources] = useState({});
  const [expandedTechAudit, setExpandedTechAudit] = useState({});
  const [copiedMsgId, setCopiedMsgId] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});
  const chatBottomRef = useRef(null);

  // Settings State
  const [settingsConfig, setSettingsConfig] = useState({
    chunkSize: 800,
    chunkOverlap: 120,
    maxChunks: 4,
    minSimilarity: 0.05,
    modelName: 'StayFlow Grounded Context Engine',
    splitterType: 'RecursiveCharacterTextSplitter',
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Fetch documents list and SQL stats from backend
  const fetchDocuments = useCallback(async () => {
    setLoadingDocs(true);
    try {
      const [docsData, statsData] = await Promise.all([
        api('/api/documents'),
        api('/api/documents/stats').catch(() => null),
      ]);
      if (Array.isArray(docsData)) {
        setDocuments(docsData);
      } else {
        setDocuments([]);
      }
      if (statsData) {
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
      notify?.(err.message || 'Failed to fetch knowledge documents', 'error');
    } finally {
      setLoadingDocs(false);
    }
  }, [notify]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    if (activeTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, ragLoading, activeTab]);

  // Handle file selection with validation
  const validateAndSelectFile = (file) => {
    setUploadError('');
    setUploadSuccessMsg(null);
    setDuplicateAlert(null);

    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const msg = `File is too large (${formatBytes(file.size)}). Maximum allowed size is 10 MB.`;
      setUploadError(msg);
      notify?.(msg, 'error');
      setSelectedFile(null);
      return;
    }

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      const msg = `Unsupported file format "${ext}". Supported formats are: ${SUPPORTED_FORMAT_LABEL}`;
      setUploadError(msg);
      notify?.(msg, 'error');
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    setCustomTitle(baseName.replace(/[_-]/g, ' '));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    validateAndSelectFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    validateAndSelectFile(file);
  };

  // Upload handler
  const handleUploadSubmit = async (fileToUpload, titleOverride) => {
    const file = fileToUpload || selectedFile;
    if (!file) {
      setUploadError('Please select a document file first.');
      notify?.('Please select a document file first.', 'warning');
      return;
    }

    setUploadProgress(true);
    setUploadError('');
    setUploadSuccessMsg(null);
    setDuplicateAlert(null);

    const formData = new FormData();
    formData.append('file', file);
    const titleVal = (titleOverride || customTitle || '').trim();
    if (titleVal) {
      formData.append('title', titleVal);
    }

    try {
      const res = await api('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.is_duplicate) {
        setDuplicateAlert({
          message: res.message || 'Duplicate document detected. This exact file has already been processed.',
          document: res.document,
        });
        notify?.('Duplicate document detected. Processing was safely skipped.', 'warning');
      } else {
        setUploadSuccessMsg({
          message: res.message || 'Document uploaded and chunked successfully!',
          document: res.document,
          chunks_count: res.chunks_count,
        });
        notify?.(`Document processed into ${res.chunks_count} LangChain chunks!`, 'success');
        setSelectedFile(null);
        setCustomTitle('');
        if (fileInputRef.current) fileInputRef.current.value = '';
        if (quickFileInputRef.current) quickFileInputRef.current.value = '';
      }

      await fetchDocuments();
    } catch (err) {
      console.error('Document upload error:', err);
      const msg = err.message || 'Failed to upload and process document.';
      setUploadError(msg);
      notify?.(msg, 'error');
    } finally {
      setUploadProgress(false);
    }
  };

  // Delete document handler
  const handleDeleteDoc = async (docId, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${title}" and all its persisted chunks and embeddings?`)) {
      return;
    }

    try {
      await api(`/api/documents/${docId}`, { method: 'DELETE' });
      notify?.(`Document "${title}" and its chunks deleted successfully`, 'success');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      console.error('Delete error:', err);
      notify?.(err.message || 'Failed to delete document', 'error');
    }
  };

  // Inspect chunks handler
  const handleViewChunks = async (doc) => {
    setActiveDocForChunks(doc);
    setLoadingChunks(true);
    setDocChunks([]);
    try {
      const data = await api(`/api/documents/${doc.id}/chunks`);
      setDocChunks(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load chunks:', err);
      notify?.(err.message || 'Failed to load document chunks', 'error');
    } finally {
      setLoadingChunks(false);
    }
  };

  // Ask Question / Chat Submit
  const handleSendQuestion = async (queryOverride) => {
    const q = (typeof queryOverride === 'string' ? queryOverride : chatInput).trim();
    if (!q) return;

    const userMsgId = `usr-${Date.now()}`;
    const timestampStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Append user message immediately to chat stream
    const userMsg = {
      id: userMsgId,
      sender: 'user',
      text: q,
      timestamp: timestampStr,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setRagLoading(true);

    try {
      const payload = {
        question: q,
        document_id: ragSelectedDocId ? parseInt(ragSelectedDocId, 10) : null,
        limit: settingsConfig.maxChunks || 4,
        min_similarity: settingsConfig.minSimilarity || 0.05,
      };

      const result = await api('/api/documents/rag/answer', {
        method: 'POST',
        body: payload,
      });

      const aiMsgId = `ai-${Date.now()}`;
      const aiMsg = {
        id: aiMsgId,
        sender: 'ai',
        text: result.answer,
        grounded: Boolean(result.grounded),
        sources: result.sources || [],
        model_used: result.model_used || 'StayFlow AI Assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages((prev) => [...prev, aiMsg]);

      // Add to recent questions list
      setRecentQuestions((prev) => [
        {
          id: Date.now(),
          question: q,
          answer: result.answer,
          grounded: Boolean(result.grounded),
          sources: result.sources || [],
          timestamp: timestampStr,
        },
        ...prev.filter((item) => item.question !== q).slice(0, 7),
      ]);
    } catch (err) {
      console.error('RAG Q&A Error:', err);
      const errMsg = err.message || 'Failed to generate answer from knowledge base.';
      notify?.(errMsg, 'error');

      const errorAiMsg = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `I apologize, but I encountered an error while retrieving information: ${errMsg}. Please check your connection or try asking again.`,
        grounded: false,
        sources: [],
        model_used: 'StayFlow AI Assistant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setChatMessages((prev) => [...prev, errorAiMsg]);
    } finally {
      setRagLoading(false);
    }
  };

  // Re-load question from Recent Questions panel
  const handleSelectRecentQuestion = (item) => {
    setChatInput(item.question);
    setActiveTab('chat');
  };

  // Copy AI response text to clipboard
  const handleCopyText = (msgId, text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    notify?.('Answer copied to clipboard!', 'success');
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Thumbs up / down feedback
  const handleFeedback = (msgId, type) => {
    setFeedbackState((prev) => ({
      ...prev,
      [msgId]: prev[msgId] === type ? null : type,
    }));
    notify?.(type === 'up' ? 'Marked as helpful' : 'Feedback recorded', 'info');
  };

  // Clear chat conversation
  const handleClearChat = () => {
    setChatMessages([]);
    notify?.('Chat conversation cleared', 'info');
  };

  // Save Settings handler
  const handleSaveSettings = (e) => {
    e.preventDefault();
    setSettingsSaved(true);
    notify?.('RAG parameters updated successfully', 'success');
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const totalChunksCount = stats?.total_chunks ?? documents.reduce((acc, d) => acc + (d.chunks_count ?? d.chunk_count ?? 0), 0);
  const totalDocsCount = stats?.total_documents ?? documents.length;

  const filteredDocs = documents.filter((d) => {
    if (!searchDocQuery) return true;
    const q = searchDocQuery.toLowerCase();
    return (
      (d.title || '').toLowerCase().includes(q) ||
      (d.source_type || '').toLowerCase().includes(q) ||
      (d.filename || '').toLowerCase().includes(q) ||
      String(d.id).includes(q)
    );
  });

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1440, margin: '0 auto' }}>
      {/* Page Header */}
      <PageHead
        title="Knowledge Base & AI Assistant"
        subtitle="Chat with AI using verified hotel knowledge documents, inspect persisted SQL chunks, and manage property documentation."
      />

      {/* Top 4 Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 20,
        }}
      >
        {/* Card 1: Knowledge Documents */}
        <div className="panel" style={{ padding: '16px 20px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: 'rgba(20, 184, 166, 0.15)',
              color: 'var(--teal, #14b8a6)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="file" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--sub, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Knowledge Documents
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--head-color, #fff)' }}>
              {totalDocsCount}
            </div>
          </div>
        </div>

        {/* Card 2: Document Chunks */}
        <div className="panel" style={{ padding: '16px 20px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: 'rgba(217, 119, 6, 0.15)',
              color: 'var(--gold, #f59e0b)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="grid" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--sub, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Document Chunks
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--head-color, #fff)' }}>
              {totalChunksCount}
            </div>
          </div>
        </div>

        {/* Card 3: Tenant Isolation */}
        <div className="panel" style={{ padding: '16px 20px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="shield" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--sub, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tenant Isolation
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--head-color, #fff)' }}>
              Tenant #{user?.tenant_id || 1} (Strict)
            </div>
          </div>
        </div>

        {/* Card 4: AI Assistant Status */}
        <div className="panel" style={{ padding: '16px 20px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="bot" size={22} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--sub, #9ca3af)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              AI Assistant Status
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#34d399', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
              Online & Ready
            </div>
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border, #333)', paddingBottom: 12 }}>
        <button
          className={`btn ${activeTab === 'chat' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('chat')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', fontWeight: 600 }}
        >
          <Icon name="bot" size={16} />
          <span>Chat with AI</span>
        </button>

        <button
          className={`btn ${activeTab === 'documents' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('documents')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', fontWeight: 600 }}
        >
          <Icon name="file" size={16} />
          <span>Knowledge Documents</span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.15)',
              padding: '1px 6px',
              borderRadius: 10,
              fontSize: 11,
              marginLeft: 2,
            }}
          >
            {documents.length}
          </span>
        </button>

        <button
          className={`btn ${activeTab === 'settings' ? 'primary' : 'secondary'}`}
          onClick={() => setActiveTab('settings')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px', fontWeight: 600 }}
        >
          <Icon name="cog" size={16} />
          <span>Settings</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: CHAT WITH AI (MAIN CONVERSATIONAL WORKSPACE + RIGHT-SIDE PANELS)
          ========================================================================= */}
      {activeTab === 'chat' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: 20, alignItems: 'start' }}>
          {/* MAIN CHAT WORKSPACE (LEFT 65%) */}
          <div
            className="panel"
            style={{
              borderRadius: 12,
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 680,
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            }}
          >
            {/* Chat Top Action Bar */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--border, #333)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'rgba(0, 0, 0, 0.15)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: 'rgba(20, 184, 166, 0.15)',
                    color: 'var(--teal, #14b8a6)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Icon name="bot" size={18} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--head-color, #fff)' }}>
                    StayFlow AI Assistant
                  </div>
                  <div style={{ fontSize: 11, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                    Grounded with Hotel Knowledge
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Knowledge Scope Selector */}
                <select
                  className="input"
                  value={ragSelectedDocId}
                  onChange={(e) => setRagSelectedDocId(e.target.value)}
                  style={{ fontSize: 12, padding: '5px 8px', maxWidth: 220 }}
                  title="Filter search to a specific document or search all"
                >
                  <option value="">Scope: All Documents ({documents.length})</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      DOC-{d.id}: {d.title || d.filename}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="btn secondary"
                  onClick={handleClearChat}
                  title="Clear chat history"
                  style={{ padding: '5px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  <Icon name="refresh" size={12} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Conversational Chat Stream Area */}
            <div
              style={{
                flex: 1,
                padding: '24px 20px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
                maxHeight: 520,
              }}
            >
              {/* Empty State Welcome Card */}
              {chatMessages.length === 0 && (
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border, #333)',
                    borderRadius: 12,
                    padding: 24,
                    textAlign: 'center',
                    maxWidth: 620,
                    margin: '30px auto',
                  }}
                >
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: 'rgba(20, 184, 166, 0.12)',
                      color: 'var(--teal, #14b8a6)',
                      display: 'grid',
                      placeItems: 'center',
                      margin: '0 auto 14px',
                    }}
                  >
                    <Icon name="sparkles" size={26} />
                  </div>
                  <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--head-color, #fff)', marginBottom: 8 }}>
                    Welcome to StayFlow AI Assistant
                  </h3>
                  <p style={{ fontSize: 13, color: 'var(--sub, #9ca3af)', lineHeight: 1.6, marginBottom: 18 }}>
                    Ask questions regarding hotel facilities, room amenities, dining hours, check-in policies,
                    or service requests. Answers are synthesized strictly from approved hotel documents with zero hallucination.
                  </p>
                  <div style={{ fontSize: 12, color: 'var(--teal, #14b8a6)', fontWeight: 500 }}>
                    Select a question below or type your own question to start.
                  </div>
                </div>
              )}

              {/* Message List */}
              {chatMessages.map((msg) => {
                if (msg.sender === 'user') {
                  // User Message Bubble (Right aligned)
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 10,
                        alignItems: 'flex-start',
                      }}
                    >
                      <div
                        style={{
                          maxWidth: '75%',
                          background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.25) 0%, rgba(13, 148, 136, 0.35) 100%)',
                          border: '1px solid rgba(20, 184, 166, 0.4)',
                          borderRadius: '14px 14px 2px 14px',
                          padding: '12px 16px',
                          color: '#fff',
                        }}
                      >
                        <div style={{ fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                          {msg.text}
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.6)', marginTop: 4, textAlign: 'right' }}>
                          {msg.timestamp}
                        </div>
                      </div>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: 'rgba(59, 130, 246, 0.2)',
                          color: '#3b82f6',
                          display: 'grid',
                          placeItems: 'center',
                          flexShrink: 0,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                        title="You"
                      >
                        U
                      </div>
                    </div>
                  );
                }

                // AI Response Card (Left aligned)
                const isSourcesOpen = Boolean(expandedSources[msg.id]);
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        background: msg.grounded ? 'rgba(20, 184, 166, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: msg.grounded ? 'var(--teal, #14b8a6)' : 'var(--gold, #f59e0b)',
                        display: 'grid',
                        placeItems: 'center',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <Icon name="bot" size={18} />
                    </div>

                    <div
                      style={{
                        flex: 1,
                        maxWidth: '85%',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: msg.grounded
                          ? '1px solid rgba(20, 184, 166, 0.3)'
                          : '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: '2px 14px 14px 14px',
                        padding: '16px 18px',
                      }}
                    >
                      {/* AI Response Header with Status Badge */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--head-color, #fff)' }}>
                            StayFlow AI
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--sub, #9ca3af)' }}>
                            {msg.timestamp}
                          </span>
                        </div>

                        <div>
                          {msg.grounded ? (
                            <Badge color="green">✓ Verified with Hotel Knowledge Base</Badge>
                          ) : (
                            <Badge color="brass">⚠ Information Unavailable in Documents</Badge>
                          )}
                        </div>
                      </div>

                      {/* Main Conversational Answer Text */}
                      <div
                        style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                          color: '#f3f4f6',
                          whiteSpace: 'pre-line',
                          marginBottom: 12,
                        }}
                      >
                        {msg.text}
                      </div>

                      {/* Actions Toolbar: Copy + Helpful Feedback */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                          paddingTop: 8,
                          fontSize: 12,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button
                            type="button"
                            onClick={() => handleCopyText(msg.id, msg.text)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: copiedMsgId === msg.id ? 'var(--teal, #14b8a6)' : 'var(--sub, #9ca3af)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                          >
                            <Icon name="copy" size={13} />
                            <span>{copiedMsgId === msg.id ? 'Copied!' : 'Copy'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'up')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: feedbackState[msg.id] === 'up' ? 'var(--teal, #14b8a6)' : 'var(--sub, #9ca3af)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                            title="Helpful response"
                          >
                            <Icon name="thumbsUp" size={13} />
                            <span>Helpful</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFeedback(msg.id, 'down')}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: feedbackState[msg.id] === 'down' ? '#f87171' : 'var(--sub, #9ca3af)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              padding: '2px 6px',
                              borderRadius: 4,
                            }}
                            title="Not helpful"
                          >
                            <Icon name="thumbsDown" size={13} />
                          </button>
                        </div>

                        {/* Collapsible Knowledge Sources Toggle */}
                        {msg.sources && msg.sources.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedSources((prev) => ({ ...prev, [msg.id]: !prev[msg.id] }))}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border, #333)',
                              color: 'var(--sub, #9ca3af)',
                              fontSize: 11,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              padding: '3px 8px',
                              borderRadius: 6,
                            }}
                          >
                            <Icon name="file" size={12} style={{ color: 'var(--teal, #14b8a6)' }} />
                            <span>{isSourcesOpen ? 'Hide Knowledge Sources' : `Knowledge Sources (${msg.sources.length})`}</span>
                            <Icon name={isSourcesOpen ? 'chevronUp' : 'chevronDown'} size={12} />
                          </button>
                        )}
                      </div>

                      {/* Expandable Knowledge Sources Body */}
                      {isSourcesOpen && msg.sources && msg.sources.length > 0 && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                          }}
                        >
                          {msg.sources.map((src, sIdx) => {
                            const isTechOpen = Boolean(expandedTechAudit[`${msg.id}-${sIdx}`]);
                            return (
                              <div
                                key={sIdx}
                                style={{
                                  background: 'rgba(0, 0, 0, 0.25)',
                                  border: '1px solid var(--border, #333)',
                                  borderRadius: 8,
                                  padding: '10px 12px',
                                }}
                              >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span
                                      style={{
                                        background: 'rgba(20, 184, 166, 0.15)',
                                        color: 'var(--teal, #14b8a6)',
                                        padding: '1px 6px',
                                        borderRadius: 4,
                                        fontSize: 10,
                                        fontWeight: 700,
                                      }}
                                    >
                                      Source {src.source_index || sIdx + 1}
                                    </span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>
                                      {src.document_title || `Document #${src.document_id}`}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {src.score !== undefined && (
                                      <span style={{ fontSize: 11, color: 'var(--gold, #f59e0b)', fontWeight: 600 }}>
                                        {(src.score * 100).toFixed(0)}% match
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setExpandedTechAudit((prev) => ({
                                          ...prev,
                                          [`${msg.id}-${sIdx}`]: !prev[`${msg.id}-${sIdx}`],
                                        }))
                                      }
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--sub, #9ca3af)',
                                        fontSize: 10,
                                        cursor: 'pointer',
                                        textDecoration: 'underline',
                                      }}
                                    >
                                      {isTechOpen ? 'Hide Audit' : 'Audit'}
                                    </button>
                                  </div>
                                </div>

                                <div style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic', lineHeight: 1.5 }}>
                                  &ldquo;{src.excerpt}&rdquo;
                                </div>

                                {isTechOpen && (
                                  <div
                                    style={{
                                      marginTop: 8,
                                      padding: '6px 8px',
                                      background: 'rgba(0,0,0,0.4)',
                                      borderRadius: 4,
                                      fontSize: 10,
                                      color: 'var(--sub, #9ca3af)',
                                      display: 'flex',
                                      gap: 12,
                                      flexWrap: 'wrap',
                                    }}
                                  >
                                    <span>Chunk ID: <strong style={{ color: '#fff' }}>{src.chunk_id || '—'}</strong></span>
                                    <span>Doc Ref: <strong style={{ color: '#fff' }}>{src.document_id || '—'}</strong></span>
                                    {src.token_count && (
                                      <span>Tokens: <strong style={{ color: '#fff' }}>{src.token_count}</strong></span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Real-time Loading Indicator */}
              {ragLoading && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: 'rgba(20, 184, 166, 0.15)',
                      color: 'var(--teal, #14b8a6)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <Icon name="refresh" size={18} className="spin" />
                  </div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid var(--border, #333)',
                      borderRadius: '2px 14px 14px 14px',
                      padding: '12px 16px',
                      fontSize: 13,
                      color: 'var(--sub, #9ca3af)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span className="spin" style={{ display: 'inline-block' }}>⟳</span>
                    <span>AI is checking the hotel&apos;s verified information...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Suggested Questions Chips Bar */}
            <div
              style={{
                padding: '10px 18px',
                borderTop: '1px solid var(--border, #333)',
                background: 'rgba(0, 0, 0, 0.15)',
              }}
            >
              <div style={{ fontSize: 11, color: 'var(--sub, #9ca3af)', marginBottom: 6, fontWeight: 500 }}>
                Suggested Questions:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {SUGGESTED_QUESTIONS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendQuestion(prompt)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border, #333)',
                      color: 'var(--sub, #9ca3af)',
                      padding: '4px 10px',
                      borderRadius: 14,
                      fontSize: 11,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--teal, #14b8a6)';
                      e.currentTarget.style.borderColor = 'var(--teal, #14b8a6)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--sub, #9ca3af)';
                      e.currentTarget.style.borderColor = 'var(--border, #333)';
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input Bar at Bottom */}
            <div
              style={{
                padding: '14px 18px',
                borderTop: '1px solid var(--border, #333)',
                background: 'rgba(0, 0, 0, 0.25)',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                {/* Hidden Quick File Picker */}
                <input
                  ref={quickFileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt,.md,.csv,.json"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      validateAndSelectFile(f);
                      setActiveTab('documents');
                    }
                  }}
                />

                {/* Attachment Icon Button */}
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => quickFileInputRef.current?.click()}
                  title="Upload knowledge document"
                  style={{ padding: '10px 12px', borderRadius: 8, height: 42 }}
                >
                  <Icon name="paperclip" size={16} />
                </button>

                {/* Question Input Textarea */}
                <div style={{ flex: 1, position: 'relative' }}>
                  <textarea
                    className="input"
                    rows={2}
                    value={chatInput}
                    maxLength={500}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendQuestion();
                      }
                    }}
                    placeholder="Type your question about the hotel's information..."
                    style={{
                      width: '100%',
                      fontSize: 13,
                      lineHeight: 1.5,
                      padding: '10px 14px',
                      borderRadius: 8,
                      resize: 'none',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      right: 10,
                      bottom: 6,
                      fontSize: 10,
                      color: 'var(--sub, #9ca3af)',
                    }}
                  >
                    {chatInput.length} / 500
                  </div>
                </div>

                {/* Ask AI Button */}
                <button
                  className="btn primary"
                  onClick={() => handleSendQuestion()}
                  disabled={ragLoading || !chatInput.trim()}
                  style={{
                    padding: '10px 20px',
                    fontSize: 13,
                    fontWeight: 600,
                    height: 42,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 8,
                  }}
                >
                  {ragLoading ? (
                    <>
                      <Icon name="refresh" size={14} className="spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="send" size={14} />
                      <span>Ask AI</span>
                    </>
                  )}
                </button>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--sub, #9ca3af)' }}>
                <span>Press <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: 3 }}>Enter</kbd> to submit, <kbd style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: 3 }}>Shift + Enter</kbd> for new line</span>
                <span>Tenant #{user?.tenant_id || 1} Isolated</span>
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR PANELS (KNOWLEDGE DOCUMENTS & RECENT QUESTIONS) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Panel 1: Knowledge Documents Card */}
            <div className="panel" style={{ padding: 20, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="file" size={16} style={{ color: 'var(--teal, #14b8a6)' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--head-color, #fff)' }}>
                    Knowledge Documents
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--teal, #14b8a6)',
                    fontSize: 12,
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  View all ({documents.length})
                </button>
              </div>

              {/* Upload Knowledge Document Trigger */}
              <div
                onClick={() => {
                  setActiveTab('documents');
                }}
                style={{
                  border: '1px dashed rgba(20, 184, 166, 0.4)',
                  background: 'rgba(20, 184, 166, 0.05)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: 14,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal, #14b8a6)', marginBottom: 2 }}>
                  + Upload Knowledge Document
                </div>
                <div style={{ fontSize: 11, color: 'var(--sub, #9ca3af)' }}>
                  Max: 10 MB • PDF, DOCX, TXT, MD, CSV, JSON
                </div>
              </div>

              {/* Compact Document List */}
              {documents.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--sub, #9ca3af)', textAlign: 'center', padding: '16px 0' }}>
                  No documents uploaded yet. Upload hotel manuals, call scripts, or policies to get started.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 260, overflowY: 'auto' }}>
                  {documents.slice(0, 5).map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border, #333)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ overflow: 'hidden', paddingRight: 8 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {doc.title || doc.filename}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--sub, #9ca3af)', display: 'flex', gap: 6, marginTop: 2 }}>
                          <span>{(doc.source_type || 'PDF').toUpperCase()}</span>
                          <span>•</span>
                          <span>{doc.chunks_count ?? doc.chunk_count ?? 0} chunks</span>
                          <span>•</span>
                          <span>{formatBytes(doc.file_size || doc.file_size_bytes)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button
                          className="btn secondary"
                          onClick={() => handleViewChunks(doc)}
                          title="Inspect Chunks"
                          style={{ padding: '3px 6px', fontSize: 11 }}
                        >
                          Chunks
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => handleDeleteDoc(doc.id, doc.title || doc.filename)}
                          title="Delete"
                          style={{ padding: '3px 6px', fontSize: 11, color: '#f87171' }}
                        >
                          <Icon name="trash" size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Panel 2: Recent Questions Card */}
            <div className="panel" style={{ padding: 20, borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="sparkles" size={16} style={{ color: 'var(--gold, #f59e0b)' }} />
                  <h3 style={{ fontSize: 15, fontWeight: 600, margin: 0, color: 'var(--head-color, #fff)' }}>
                    Recent Questions
                  </h3>
                </div>
                {recentQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecentQuestions([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--sub, #9ca3af)',
                      fontSize: 11,
                      cursor: 'pointer',
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>

              {recentQuestions.length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--sub, #9ca3af)', textAlign: 'center', padding: '16px 0' }}>
                  No questions asked in this session yet. Ask a question to see history here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                  {recentQuestions.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleSelectRecentQuestion(item)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border, #333)',
                        borderRadius: 8,
                        padding: '10px 12px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'var(--teal, #14b8a6)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        e.currentTarget.style.borderColor = 'var(--border, #333)';
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#e5e7eb', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.question}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 10 }}>
                        <span style={{ color: item.grounded ? 'var(--teal, #14b8a6)' : 'var(--gold, #f59e0b)' }}>
                          {item.grounded ? '✓ Answered' : '⚠ Unavailable'}
                        </span>
                        <span style={{ color: 'var(--sub, #9ca3af)' }}>{item.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: KNOWLEDGE DOCUMENTS (FULL REPOSITORY & UPLOAD INTERFACE)
          ========================================================================= */}
      {activeTab === 'documents' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(340px, 420px) 1fr', gap: 24, alignItems: 'start' }}>
          {/* UPLOAD FORM PANEL */}
          <div className="panel" style={{ padding: 24, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: 'rgba(20, 184, 166, 0.15)',
                  color: 'var(--teal, #14b8a6)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="upload" size={18} />
              </div>
              <h2 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: 'var(--head-color, #fff)' }}>
                Upload Knowledge Document
              </h2>
            </div>

            {/* Constraints Badges */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border, #333)',
                borderRadius: 8,
                padding: '12px 14px',
                marginBottom: 18,
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ color: 'var(--sub, #9ca3af)' }}>Max Allowed Size:</span>
                <span style={{ fontWeight: 600, color: 'var(--teal, #14b8a6)' }}>10 MB</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--sub, #9ca3af)' }}>Supported Formats:</span>
                <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{SUPPORTED_FORMAT_LABEL}</span>
              </div>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragOver(false); }}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--teal, #14b8a6)' : 'rgba(255, 255, 255, 0.15)'}`,
                background: isDragOver ? 'rgba(20, 184, 166, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                borderRadius: 10,
                padding: '30px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                marginBottom: 16,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.05)',
                  color: isDragOver ? 'var(--teal, #14b8a6)' : 'var(--sub, #9ca3af)',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 12px',
                }}
              >
                <Icon name="upload" size={24} />
              </div>
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--head-color, #fff)', marginBottom: 4 }}>
                Drag & drop document here, or <span style={{ color: 'var(--teal, #14b8a6)', textDecoration: 'underline' }}>browse</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--sub, #9ca3af)' }}>
                PDF, Word (.docx), Markdown, Text, CSV, or JSON
              </div>
            </div>

            {/* Selected File Card */}
            {selectedFile && (
              <div
                style={{
                  background: 'rgba(20, 184, 166, 0.08)',
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <Icon name="file" size={18} style={{ color: 'var(--teal, #14b8a6)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#fff', wordBreak: 'break-all' }}>
                      {selectedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--sub, #9ca3af)',
                      cursor: 'pointer',
                      padding: 2,
                    }}
                    title="Remove file"
                  >
                    <Icon name="x" size={14} />
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--sub, #9ca3af)' }}>
                  <span>Size: <strong style={{ color: '#fff' }}>{formatBytes(selectedFile.size)}</strong></span>
                  <span>•</span>
                  <span>Type: <strong style={{ color: 'var(--teal, #14b8a6)', textTransform: 'uppercase' }}>{selectedFile.name.split('.').pop()}</strong></span>
                </div>

                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, color: 'var(--sub, #9ca3af)', marginBottom: 4 }}>
                    Document Title (optional display name):
                  </label>
                  <input
                    type="text"
                    className="input"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g., Hotel Policy & Inbound Call Script"
                    style={{ width: '100%', fontSize: 13 }}
                  />
                </div>
              </div>
            )}

            {/* Error Message */}
            {uploadError && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span>⚠</span>
                <span>{uploadError}</span>
              </div>
            )}

            {/* Duplicate Notice */}
            {duplicateAlert && (
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  color: '#fbbf24',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>ℹ Duplicate Document Prevented</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                  {duplicateAlert.message}
                </p>
                {duplicateAlert.document && (
                  <div style={{ marginTop: 6, fontSize: 12, color: '#e5e7eb' }}>
                    Existing Document: <strong>#{duplicateAlert.document.id} - {duplicateAlert.document.title}</strong>
                  </div>
                )}
              </div>
            )}

            {/* Success Message */}
            {uploadSuccessMsg && (
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#34d399',
                  borderRadius: 8,
                  padding: '12px 14px',
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✓ Upload & Ingestion Complete</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5 }}>
                  {uploadSuccessMsg.message}
                </p>
                <div style={{ marginTop: 6, fontSize: 12, color: '#e5e7eb' }}>
                  Document: <strong>{uploadSuccessMsg.document?.title}</strong> ({uploadSuccessMsg.chunks_count} LangChain chunks saved)
                </div>
              </div>
            )}

            {/* Upload Button */}
            <button
              className="btn primary"
              onClick={() => handleUploadSubmit()}
              disabled={!selectedFile || uploadProgress}
              style={{
                width: '100%',
                padding: '11px 16px',
                fontSize: 14,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: !selectedFile || uploadProgress ? 'not-allowed' : 'pointer',
                opacity: !selectedFile || uploadProgress ? 0.6 : 1,
              }}
            >
              {uploadProgress ? (
                <>
                  <Icon name="refresh" size={16} className="spin" />
                  <span>Processing with LangChain...</span>
                </>
              ) : (
                <>
                  <Icon name="upload" size={16} />
                  <span>Upload & Ingest Document</span>
                </>
              )}
            </button>
          </div>

          {/* DOCUMENTS DIRECTORY PANEL */}
          <div className="panel" style={{ padding: 24, borderRadius: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 4px', color: 'var(--head-color, #fff)' }}>
                  Knowledge Documents Directory
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--sub, #9ca3af)' }}>
                  Active hotel knowledge sources available for conversational RAG inquiries
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="input"
                    value={searchDocQuery}
                    onChange={(e) => setSearchDocQuery(e.target.value)}
                    placeholder="Search documents..."
                    style={{ paddingLeft: 30, fontSize: 13, width: 200 }}
                  />
                  <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--sub, #9ca3af)' }}>
                    <Icon name="search" size={14} />
                  </div>
                </div>

                <button
                  className="btn secondary"
                  onClick={fetchDocuments}
                  title="Refresh documents"
                  style={{ padding: '7px 12px' }}
                >
                  <Icon name="refresh" size={14} />
                </button>
              </div>
            </div>

            {loadingDocs ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--sub, #9ca3af)' }}>
                <Icon name="refresh" size={28} className="spin" style={{ margin: '0 auto 12px', display: 'block' }} />
                Loading knowledge documents...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  border: '1px dashed var(--border, #333)',
                  borderRadius: 8,
                  color: 'var(--sub, #9ca3af)',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: 'var(--sub, #9ca3af)',
                    display: 'grid',
                    placeItems: 'center',
                    margin: '0 auto 14px',
                  }}
                >
                  <Icon name="file" size={24} />
                </div>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--head-color, #fff)', marginBottom: 6 }}>
                  {documents.length === 0 ? 'No documents uploaded yet' : 'No matching documents found'}
                </div>
                <p style={{ maxWidth: 400, margin: '0 auto 16px', fontSize: 13 }}>
                  Upload hotel policies, call scripts, room manuals, or guest FAQs using the form on the left.
                </p>
              </div>
            ) : (
              <div className="table-wrap" style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Doc ID</th>
                      <th>Title & File</th>
                      <th style={{ width: 100 }}>Type</th>
                      <th style={{ width: 90 }}>Size</th>
                      <th style={{ width: 100 }}>Chunks</th>
                      <th style={{ width: 110 }}>Status</th>
                      <th style={{ width: 130 }}>Uploaded</th>
                      <th style={{ width: 140, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDocs.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <code style={{ fontSize: 12, color: 'var(--teal, #14b8a6)' }}>
                            DOC-{doc.id}
                          </code>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--head-color, #fff)', fontSize: 13 }}>
                            {doc.title || doc.filename}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--sub, #9ca3af)' }}>
                            {doc.filename}
                          </div>
                        </td>
                        <td>
                          <Badge color="blue">
                            {(doc.source_type || 'PDF').toUpperCase()}
                          </Badge>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--sub, #9ca3af)' }}>
                          {formatBytes(doc.file_size || doc.file_size_bytes)}
                        </td>
                        <td>
                          <span
                            style={{
                              fontWeight: 600,
                              color: 'var(--gold, #f59e0b)',
                              background: 'rgba(245, 158, 11, 0.1)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                            }}
                          >
                            {doc.chunks_count ?? doc.chunk_count ?? 0} chunks
                          </span>
                        </td>
                        <td>
                          <Badge color={String(doc.status || '').toLowerCase() === 'completed' || String(doc.status || '').toLowerCase() === 'processed' ? 'green' : 'red'}>
                            {doc.status || 'Completed'}
                          </Badge>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--sub, #9ca3af)' }}>
                          {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              className="btn secondary"
                              onClick={() => handleViewChunks(doc)}
                              title="View and inspect persisted SQL chunks"
                              style={{ padding: '4px 8px', fontSize: 12 }}
                            >
                              Chunks
                            </button>
                            <button
                              className="btn secondary"
                              onClick={() => {
                                setRagSelectedDocId(String(doc.id));
                                setActiveTab('chat');
                              }}
                              title="Chat about this document"
                              style={{ padding: '4px 8px', fontSize: 12, color: 'var(--teal, #14b8a6)' }}
                            >
                              <Icon name="bot" size={13} />
                            </button>
                            <button
                              className="btn secondary"
                              onClick={() => handleDeleteDoc(doc.id, doc.title || doc.filename)}
                              title="Delete document and its chunks"
                              style={{ padding: '4px 8px', fontSize: 12, color: '#f87171' }}
                            >
                              <Icon name="trash" size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: SETTINGS (RAG & TEXT SPLITTING PARAMETERS)
          ========================================================================= */}
      {activeTab === 'settings' && (
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="panel" style={{ padding: 28, borderRadius: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: 'rgba(20, 184, 166, 0.15)',
                  color: 'var(--teal, #14b8a6)',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon name="cog" size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: 'var(--head-color, #fff)' }}>
                  RAG & Knowledge Processing Configuration
                </h2>
                <div style={{ fontSize: 13, color: 'var(--sub, #9ca3af)' }}>
                  Tune LangChain text splitting, embedding retrieval, and grounding thresholds for Tenant #{user?.tenant_id || 1}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--head-color, #fff)', marginBottom: 6 }}>
                    Text Splitter Algorithm:
                  </label>
                  <select
                    className="input"
                    value={settingsConfig.splitterType}
                    onChange={(e) => setSettingsConfig({ ...settingsConfig, splitterType: e.target.value })}
                    style={{ width: '100%', fontSize: 13 }}
                  >
                    <option value="RecursiveCharacterTextSplitter">RecursiveCharacterTextSplitter (LangChain Recommended)</option>
                    <option value="CharacterTextSplitter">CharacterTextSplitter</option>
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--sub, #9ca3af)', marginTop: 4 }}>
                    Splits hierarchically by paragraphs, sentences, and words.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--head-color, #fff)', marginBottom: 6 }}>
                    LLM Synthesis Engine:
                  </label>
                  <select
                    className="input"
                    value={settingsConfig.modelName}
                    onChange={(e) => setSettingsConfig({ ...settingsConfig, modelName: e.target.value })}
                    style={{ width: '100%', fontSize: 13 }}
                  >
                    <option value="StayFlow Grounded Context Engine">StayFlow Grounded Context Engine (Local Zero-Hallucination)</option>
                    <option value="Gemini-1.5-Flash">Gemini-1.5-Flash (Google GenAI)</option>
                    <option value="OpenAI GPT-4o-mini">OpenAI GPT-4o-mini</option>
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--sub, #9ca3af)', marginTop: 4 }}>
                    Synthesizes guest responses from verified context.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--head-color, #fff)', marginBottom: 6 }}>
                    Chunk Size (Characters):
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={200}
                    max={2000}
                    step={50}
                    value={settingsConfig.chunkSize}
                    onChange={(e) => setSettingsConfig({ ...settingsConfig, chunkSize: parseInt(e.target.value, 10) || 800 })}
                    style={{ width: '100%', fontSize: 13 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--sub, #9ca3af)', marginTop: 4 }}>
                    Target length of each persistent SQL chunk.
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--head-color, #fff)', marginBottom: 6 }}>
                    Chunk Overlap (Characters):
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={0}
                    max={500}
                    step={10}
                    value={settingsConfig.chunkOverlap}
                    onChange={(e) => setSettingsConfig({ ...settingsConfig, chunkOverlap: parseInt(e.target.value, 10) || 120 })}
                    style={{ width: '100%', fontSize: 13 }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--sub, #9ca3af)', marginTop: 4 }}>
                    Maintains contextual continuity across adjacent chunks.
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--head-color, #fff)', marginBottom: 6 }}>
                    Max Retrieval Chunks per Query:
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={1}
                    max={10}
                    value={settingsConfig.maxChunks}
                    onChange={(e) => setSettingsConfig({ ...settingsConfig, maxChunks: parseInt(e.target.value, 10) || 4 })}
                    style={{ width: '100%', fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--head-color, #fff)', marginBottom: 6 }}>
                    Minimum Cosine Similarity:
                  </label>
                  <input
                    type="number"
                    className="input"
                    min={0.01}
                    max={0.9}
                    step={0.01}
                    value={settingsConfig.minSimilarity}
                    onChange={(e) => setSettingsConfig({ ...settingsConfig, minSimilarity: parseFloat(e.target.value) || 0.05 })}
                    style={{ width: '100%', fontSize: 13 }}
                  />
                </div>
              </div>

              {settingsSaved && (
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#34d399',
                    borderRadius: 8,
                    padding: '10px 14px',
                    fontSize: 13,
                  }}
                >
                  ✓ Parameters updated and active for Tenant #{user?.tenant_id || 1}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button
                  type="submit"
                  className="btn primary"
                  style={{ padding: '10px 24px', fontSize: 14, fontWeight: 600 }}
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          PERSISTED CHUNKS MODAL
          ========================================================================= */}
      {activeDocForChunks && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setActiveDocForChunks(null)}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: 900,
              maxHeight: '85vh',
              borderRadius: 12,
              padding: 24,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 17, fontWeight: 600, margin: 0, color: 'var(--head-color, #fff)' }}>
                  Persisted LangChain SQL Chunks
                </h3>
                <div style={{ fontSize: 13, color: 'var(--sub, #9ca3af)' }}>
                  Document: <strong>{activeDocForChunks.title || activeDocForChunks.filename}</strong> (DOC-{activeDocForChunks.id})
                </div>
              </div>
              <button
                className="btn secondary"
                onClick={() => setActiveDocForChunks(null)}
                style={{ padding: '6px 12px' }}
              >
                <Icon name="x" size={16} />
              </button>
            </div>

            {/* Chunks List */}
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: 6 }}>
              {loadingChunks ? (
                <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--sub, #9ca3af)' }}>
                  <Icon name="refresh" size={24} className="spin" style={{ margin: '0 auto 10px', display: 'block' }} />
                  Retrieving chunks from SQL database...
                </div>
              ) : docChunks.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--sub, #9ca3af)' }}>
                  No persisted chunks found for this document.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--sub, #9ca3af)', marginBottom: 2 }}>
                    Showing all <strong>{docChunks.length}</strong> persistent chunks with embeddings in MySQL for Tenant #{user?.tenant_id || 1}
                  </div>

                  {docChunks.map((chunk) => (
                    <div
                      key={chunk.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border, #333)',
                        borderRadius: 8,
                        padding: 14,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              background: 'rgba(20, 184, 166, 0.15)',
                              color: 'var(--teal, #14b8a6)',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 700,
                            }}
                          >
                            Chunk #{chunk.chunk_index}
                          </span>
                          <code style={{ fontSize: 11, color: 'var(--sub, #9ca3af)' }}>
                            ID: {chunk.chunk_id || chunk.id}
                          </code>
                        </div>

                        <div style={{ fontSize: 12, color: 'var(--sub, #9ca3af)' }}>
                          {chunk.char_count || chunk.chunk_text?.length || 0} chars • ~{chunk.token_count || Math.round((chunk.chunk_text?.length || 0) / 4)} tokens
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'rgba(0, 0, 0, 0.3)',
                          padding: '10px 12px',
                          borderRadius: 6,
                          fontSize: 13,
                          lineHeight: 1.6,
                          color: '#e5e7eb',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                          maxHeight: 180,
                          overflowY: 'auto',
                        }}
                      >
                        {chunk.chunk_text}
                      </div>

                      {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--sub, #9ca3af)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span>Metadata:</span>
                          {Object.entries(chunk.metadata).map(([k, v]) => (
                            <span key={k} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1px 6px', borderRadius: 3 }}>
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={() => setActiveDocForChunks(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
