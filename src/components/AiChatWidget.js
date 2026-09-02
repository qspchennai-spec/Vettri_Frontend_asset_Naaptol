import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles, X, Send, Maximize2, Minimize2, Mic, Paperclip, Plus,
  MessageSquare, Loader2, Search, Wrench, FileText, Mail, UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  streamAssistantMessage, streamAssistantConfirm, fetchConversations, fetchConversationMessages,
} from "../services/aiAssistantStream";
import MarkdownLite from "./ai/MarkdownLite";
import ConfirmActionCard from "./ai/ConfirmActionCard";
import "./AiChatWidget.css";
const ASSISTANT_NAME = "Vettri";

const ADMIN_STARTERS = [
  "Which employee has the most assets?",
  "Which warranties expire this month?",
  "Show unassigned laptops",
  "Show duplicate serial numbers",
  "Generate monthly asset report",
];

const EMPLOYEE_STARTERS = [
  "Show my assets",
  "Where is my laptop?",
  "Is my warranty still active?",
];

const TOOL_LABELS = {
  search_assets: { icon: Search, label: "Searching assets" },
  get_asset_details: { icon: Search, label: "Looking up asset" },
  assign_asset: { icon: UserPlus, label: "Assigning asset" },
  return_asset: { icon: UserPlus, label: "Processing return" },
  create_asset: { icon: Plus, label: "Creating asset" },
  update_asset: { icon: Wrench, label: "Updating asset" },
  search_employees: { icon: Search, label: "Searching employees" },
  create_employee: { icon: UserPlus, label: "Creating employee" },
  update_employee: { icon: Wrench, label: "Updating employee" },
  schedule_maintenance: { icon: Wrench, label: "Scheduling maintenance" },
  get_maintenance_due: { icon: Wrench, label: "Checking maintenance schedule" },
  generate_report: { icon: FileText, label: "Generating report" },
  email_report: { icon: Mail, label: "Sending email" },
};

function ToolBadge({ toolName }) {
  const meta = TOOL_LABELS[toolName] || { icon: Loader2, label: "Working on it" };
  const Icon = meta.icon;
  return (
    <div className="ai-tool-badge">
      <Icon size={12} /> {meta.label}…
    </div>
  );
}

function newAssistantMessage() {
  return { role: "assistant", text: "", streaming: true, toolCalls: [], pendingConfirm: null, resolvedConfirm: null };
}

export default function AiChatWidget() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [open, setOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [attachedFileName, setAttachedFileName] = useState(null);
  const [listening, setListening] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open, fullScreen]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open, fullScreen]);

  // Web Speech API is optional — most browsers support it, but we feature-detect
  // rather than assume, and quietly hide the mic button where it's unavailable.
  const speechSupported = typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleVoiceInput = () => {
    if (!speechSupported) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => (prev ? prev + " " + transcript : transcript));
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) setAttachedFileName(file.name);
    e.target.value = "";
  };

  // ── Updating the currently-streaming assistant message in place ─────────
  const updateLastAssistant = (patchFn) => {
    setMessages((prev) => {
      const next = [...prev];
      const lastIdx = next.length - 1;
      if (lastIdx < 0 || next[lastIdx].role !== "assistant") return prev;
      next[lastIdx] = patchFn(next[lastIdx]);
      return next;
    });
  };

  const send = useCallback((textOverride) => {
    const rawText = (textOverride ?? input).trim();
    if (!rawText || sending) return;

    const text = attachedFileName ? `${rawText}\n\n[Attached file: ${attachedFileName}]` : rawText;

    setMessages((m) => [...m, { role: "user", text }, newAssistantMessage()]);
    setInput("");
    setAttachedFileName(null);
    setSending(true);

    abortRef.current = streamAssistantMessage({ conversationId, message: text }, {
      onMeta: ({ conversationId: cid }) => setConversationId((prev) => prev || cid),
      onDelta: (delta) => updateLastAssistant((m) => ({ ...m, text: m.text + delta })),
      onToolCall: ({ toolName }) => updateLastAssistant((m) => ({ ...m, toolCalls: [...m.toolCalls, toolName] })),
      onConfirmRequired: ({ actionId, description }) => {
        updateLastAssistant((m) => ({ ...m, streaming: false, pendingConfirm: { actionId, description } }));
        setSending(false);
      },
      onDone: () => {
        updateLastAssistant((m) => ({ ...m, streaming: false }));
        setSending(false);
      },
      onError: (msg) => {
        updateLastAssistant((m) => ({ ...m, streaming: false, text: m.text || msg }));
        setSending(false);
      },
    });
  }, [input, sending, attachedFileName, conversationId]);

  const handleConfirmDecision = (msgIndex, actionId, approve) => {
    setMessages((prev) => {
      const next = [...prev];
      next[msgIndex] = { ...next[msgIndex], resolvedConfirm: approve ? "approved" : "declined" };
      next.push(newAssistantMessage());
      return next;
    });
    setSending(true);

    streamAssistantConfirm({ actionId, approve }, {
      onDelta: (delta) => updateLastAssistant((m) => ({ ...m, text: m.text + delta })),
      onToolCall: ({ toolName }) => updateLastAssistant((m) => ({ ...m, toolCalls: [...m.toolCalls, toolName] })),
      onConfirmRequired: ({ actionId: nextId, description }) => {
        updateLastAssistant((m) => ({ ...m, streaming: false, pendingConfirm: { actionId: nextId, description } }));
        setSending(false);
      },
      onDone: () => { updateLastAssistant((m) => ({ ...m, streaming: false })); setSending(false); },
      onError: (msg) => { updateLastAssistant((m) => ({ ...m, streaming: false, text: m.text || msg })); setSending(false); },
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const startNewChat = () => {
    abortRef.current?.abort?.();
    setMessages([]);
    setConversationId(null);
    setInput("");
  };

  const openHistoryConversation = async (cid) => {
    setHistoryLoading(true);
    try {
      const msgs = await fetchConversationMessages(cid);
      setMessages(msgs.map((m) => ({
        role: m.role,
        text: m.content,
        streaming: false,
        toolCalls: [],
        pendingConfirm: null,
        resolvedConfirm: null,
      })));
      setConversationId(cid);
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      setHistory(await fetchConversations());
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (fullScreen) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullScreen]);

  const starters = isAdmin ? ADMIN_STARTERS : EMPLOYEE_STARTERS;

  return (
    <>
      <button
        className={`ai-chat-fab ${open ? "ai-chat-fab-open" : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI Assistant" : "Open AI Assistant"}
        title={`Ask ${ASSISTANT_NAME} AI`}
      >
        {open ? <X size={20} /> : <Sparkles size={20} />}
      </button>

      {open && (
        <div className={`ai-chat-panel ${fullScreen ? "ai-chat-panel-fullscreen" : ""}`} role="dialog" aria-label="AI Asset Assistant">
          <div className="ai-chat-header">
            <div className="ai-chat-header-icon"><Sparkles size={16} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="ai-chat-header-title">{ASSISTANT_NAME} AI Assistant</div>
              <div className="ai-chat-header-sub">Ask, search, and act on assets, employees &amp; maintenance</div>
            </div>
            <button className="ai-chat-icon-btn" title="New chat" onClick={startNewChat}><Plus size={16} /></button>
            <button
              className="ai-chat-icon-btn"
              title={fullScreen ? "Exit full screen" : "Full screen"}
              onClick={() => setFullScreen((v) => !v)}
            >
              {fullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
          </div>

          <div className="ai-chat-workspace">
            {fullScreen && (
              <div className="ai-chat-sidebar">
                <div className="ai-chat-sidebar-title">Chat history</div>
                <button className="ai-chat-sidebar-newbtn" onClick={startNewChat}><Plus size={13} /> New chat</button>
                <div className="ai-chat-sidebar-list">
                  {historyLoading && <div className="ai-chat-sidebar-loading">Loading…</div>}
                  {history.map((c) => (
                    <button
                      key={c.conversationId}
                      className={`ai-chat-sidebar-item ${c.conversationId === conversationId ? "active" : ""}`}
                      onClick={() => openHistoryConversation(c.conversationId)}
                    >
                      <MessageSquare size={13} />
                      <span className="ai-chat-sidebar-item-title">{c.title}</span>
                    </button>
                  ))}
                  {!historyLoading && history.length === 0 && (
                    <div className="ai-chat-sidebar-empty">No past conversations yet.</div>
                  )}
                </div>
              </div>
            )}

            <div className="ai-chat-main">
              <div className="ai-chat-body" ref={scrollRef}>
                {messages.length === 0 && (
                  <div className="ai-chat-empty">
                    <div className="ai-chat-empty-icon"><Sparkles size={22} /></div>
                    <div className="ai-chat-empty-title">Hi {user?.name?.split(" ")[0] || "there"}, ask me anything.</div>
                    <div className="ai-chat-starters">
                      {starters.map((s) => (
                        <button key={s} className="ai-chat-starter-chip" onClick={() => send(s)}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((m, i) => (
                  <div key={i} className={`ai-chat-msg ai-chat-msg-${m.role}`}>
                    {m.role === "user" ? (
                      <div className="ai-chat-bubble ai-chat-bubble-user">{m.text}</div>
                    ) : (
                      <div className="ai-chat-bubble ai-chat-bubble-assistant">
                        {m.toolCalls?.map((t, idx) => <ToolBadge key={idx} toolName={t} />)}

                        {m.text ? (
                          <MarkdownLite text={m.text} />
                        ) : m.streaming ? (
                          <div className="ai-chat-typing"><span /><span /><span /></div>
                        ) : null}

                        {m.pendingConfirm && !m.resolvedConfirm && (
                          <ConfirmActionCard
                            description={m.pendingConfirm.description}
                            onDecide={(approve) => handleConfirmDecision(i, m.pendingConfirm.actionId, approve)}
                          />
                        )}
                        {m.pendingConfirm && m.resolvedConfirm && (
                          <div className="ai-confirm-resolved-inline">
                            {m.resolvedConfirm === "approved" ? "✓ Confirmed" : "✕ Cancelled"}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {attachedFileName && (
                <div className="ai-chat-attachment-chip">
                  <Paperclip size={12} /> {attachedFileName}
                  <button onClick={() => setAttachedFileName(null)}><X size={11} /></button>
                </div>
              )}

              <div className="ai-chat-input-row">
                <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileSelect} />
                <button
                  className="ai-chat-icon-btn ai-chat-input-icon-btn"
                  title="Attach a file"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip size={15} />
                </button>
                {speechSupported && (
                  <button
                    className={`ai-chat-icon-btn ai-chat-input-icon-btn ${listening ? "ai-chat-mic-active" : ""}`}
                    title="Voice input"
                    onClick={toggleVoiceInput}
                  >
                    <Mic size={15} />
                  </button>
                )}
                <input
                  ref={inputRef}
                  className="ai-chat-input"
                  placeholder="Ask a question or tell me what to do..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <button className="ai-chat-send-btn" onClick={() => send()} disabled={!input.trim() || sending} aria-label="Send">
                  <Send size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
