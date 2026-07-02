import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  streamSessionChat,
  streamToolChat,
  clearChatMemory,
  listSessions,
  createSession,
  deleteSession,
  getSessionHistory,
  type RAGSource,
  type SessionEntry,
  type ToolEvent,
} from "../../services/projectService";
import Button from "../../components/ui/Button";
import TypingEffect, { CodeSkeleton } from "../../components/ui/TypingEffect";
import { useToast } from "../../contexts/ToastContext";

interface ToolCallEntry {
  tool: string;
  args: Record<string, unknown>;
  status: "running" | "done";
  result?: string;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: RAGSource[];
  toolCalls?: ToolCallEntry[];
}

let msgId = 0;

const messageVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1 },
};

function UserIcon() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white">
      U
    </div>
  );
}

function BotIcon() {
  return (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-600 bg-slate-700 text-[10px] font-bold text-slate-300">
      AI
    </div>
  );
}

function ToolCallCard({ call }: { call: ToolCallEntry }) {
  const [open, setOpen] = useState(false);
  const args = call.args as Record<string, string>;
  const icon = call.tool === "read_file" ? "📄" : call.tool === "search_code" ? "🔍" : call.tool === "list_files" ? "📁" : "⚙️";
  const label = call.tool === "read_file" ? `Read ${args.path ?? ""}` : call.tool === "search_code" ? `Search "${args.query ?? ""}"` : call.tool === "list_files" ? `List ${args.path ?? ""}` : call.tool === "get_project_structure" ? "Project structure" : call.tool;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700/50 bg-slate-800/30 text-xs">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-slate-700/30"
      >
        <span className="shrink-0">{icon}</span>
        <span className="flex-1 truncate text-slate-300">{label}</span>
        {call.status === "running" ? (
          <svg className="h-3.5 w-3.5 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg className={`h-3.5 w-3.5 text-slate-500 transition ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>
      {open && call.result && (
        <pre className="max-h-48 overflow-auto border-t border-slate-700/50 p-3 text-[11px] text-slate-400">
          {call.result}
        </pre>
      )}
    </div>
  );
}

export default function Chat() {
  const { currentPath, analysis } = useProject();
  const { t } = useLanguage();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingId, setTypingId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionsOpen, setSessionsOpen] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const projectKey = currentPath || "_casual";

  const loadSessions = useCallback(async () => {
    try {
      const list = await listSessions(projectKey);
      setSessions(list);
    } catch {
      /* silent */
    }
  }, [projectKey]);

  useEffect(() => {
    loadSessions();
    setActiveSession(null);
    setMessages([]);
  }, [loadSessions]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [activeSession]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  async function switchSession(sessionId: string) {
    setActiveSession(sessionId);
    setMessages([]);
    try {
      const history = await getSessionHistory(sessionId);
      setMessages(
        history.map((m) => ({ id: ++msgId, role: m.role as "user" | "assistant", content: m.content })),
      );
    } catch {
      toast("Error loading session", "error");
    }
  }

  async function handleNewSession() {
    try {
      const session = await createSession(projectKey);
      setSessions((prev) => [...prev, session]);
      setActiveSession(session.id);
      setMessages([]);
      return session;
    } catch {
      toast("Error creating session", "error");
      return null;
    }
  }

  async function handleDeleteSession(sessionId: string) {
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSession === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
    } catch {
      toast("Error deleting session", "error");
    }
  }

  async function handleSend() {
    const question = input.trim();
    if (!question) return;

    let sessionId = activeSession;
    if (!sessionId) {
      const session = await handleNewSession();
      if (!session) return;
      sessionId = session.id;
    }

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setMessages((prev) => [...prev, { id: ++msgId, role: "user", content: question }]);
    setLoading(true);

    const newId = ++msgId;
    setMessages((prev) => [...prev, { id: newId, role: "assistant", content: "", toolCalls: [] }]);
    setTypingId(newId);

    const onChunk = (text: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newId ? { ...m, content: text } : m)),
      );
    };

    const onToolEvent = (event: ToolEvent) => {
      if (event.type === "tool_call") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === newId
              ? {
                  ...m,
                  toolCalls: [
                    ...(m.toolCalls || []),
                    { tool: event.tool!, args: event.args!, status: "running" as const },
                  ],
                }
              : m,
          ),
        );
      } else if (event.type === "tool_result") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === newId
              ? {
                  ...m,
                  toolCalls: (m.toolCalls || []).map((tc) =>
                    tc.tool === event.tool && tc.status === "running"
                      ? { ...tc, status: "done" as const, result: event.result }
                      : tc,
                  ),
                }
              : m,
          ),
        );
      }
    };

    const onDone = () => {
      setLoading(false);
      setTimeout(() => setTypingId(null), 3000);
    };

    const onError = () => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === newId ? { ...m, content: t("chat.error") } : m,
        ),
      );
      setLoading(false);
      setTypingId(null);
      toast("Error al obtener respuesta", "error");
    };

    if (currentPath) {
      streamToolChat(question, currentPath, onChunk, onToolEvent, onDone, onError, sessionId);
    } else {
      streamSessionChat(question, sessionId, onChunk, onDone, onError);
    }

    loadSessions();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-5xl gap-4">
      <div
        className={`flex shrink-0 flex-col transition-all ${
          sessionsOpen ? "w-56" : "w-10"
        }`}
      >
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setSessionsOpen(!sessionsOpen)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            title={sessionsOpen ? "Collapse" : "Expand"}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sessionsOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
            </svg>
          </button>
          {sessionsOpen && (
            <button
              onClick={handleNewSession}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-emerald-400"
              title="New session"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          )}
        </div>

        {sessionsOpen && (
          <div className="flex-1 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-2">
            {sessions.length === 0 && (
              <p className="px-2 py-8 text-center text-xs text-slate-500">
                No sessions yet
              </p>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 text-xs transition ${
                  activeSession === s.id
                    ? "bg-emerald-600/20 text-emerald-300"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
                onClick={() => switchSession(s.id)}
              >
                <span className="truncate">{s.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSession(s.id);
                  }}
                  className="shrink-0 rounded p-0.5 text-slate-600 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                  title="Delete"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t("chat.title")}</h1>
            {currentPath && (
              <p className="mt-1 text-sm text-slate-400">
                {t("chat.asking_about")} <span className="font-medium text-emerald-400">{analysis?.projectName || currentPath}</span>
              </p>
            )}
            {activeSession && (
              <p className="mt-0.5 text-xs text-slate-500">
                Session: {sessions.find((s) => s.id === activeSession)?.name || activeSession}
              </p>
            )}
          </div>
          <button
            onClick={async () => {
              try {
                await clearChatMemory();
                setMessages([]);
                toast("Historial limpiado", "success");
              } catch {
                toast("Error al limpiar historial", "error");
              }
            }}
            className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-red-800 hover:text-red-400"
          >
            {t("chat.clear")}
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-800 bg-slate-900/50 p-4"
        >
          {messages.length === 0 && (
            <div className="flex h-full items-center justify-center">
              <p className="max-w-md text-center text-sm text-slate-500">
                {currentPath
                  ? t("chat.empty")
                  : t("chat.no_project")}
              </p>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                variants={messageVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.25, ease: "easeOut" }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {msg.role === "user" ? <UserIcon /> : <BotIcon />}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-emerald-600/20 text-white"
                      : "border border-slate-700/50 bg-slate-800/50 text-slate-200"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <>
                      {msg.toolCalls && msg.toolCalls.length > 0 && (
                        <div className="mb-3 space-y-1.5">
                          {msg.toolCalls.map((tc, i) => (
                            <ToolCallCard key={i} call={tc} />
                          ))}
                        </div>
                      )}
                      <TypingEffect
                        text={msg.content}
                        loading={typingId === msg.id}
                        speed={25}
                      />
                      {msg.sources && msg.sources.length > 0 && typingId !== msg.id && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-700/50 pt-2">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                            Sources:
                          </span>
                          {msg.sources.map((src, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 rounded-md bg-slate-700/60 px-1.5 py-0.5 text-[11px] text-slate-300"
                            >
                              <svg className="h-3 w-3 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {src.file}:{src.line_start}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && !typingId && (
            <div className="flex gap-3">
              <BotIcon />
              <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-800/50 p-4">
                {currentPath ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="h-4 w-4 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Searching project code...
                  </div>
                ) : (
                  <CodeSkeleton />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            disabled={loading}
            rows={1}
            className="min-h-[48px] flex-1 resize-none rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
          />
          <Button
            onClick={handleSend}
            loading={loading}
            disabled={!input.trim()}
            className="!h-auto !px-6 !py-3"
          >
            {t("chat.send")}
          </Button>
        </div>
      </div>
    </div>
  );
}
