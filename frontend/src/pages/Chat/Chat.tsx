import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer } from "hiraki";
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
  searchSessions,
  type RAGSource,
  type SessionEntry,
  type SessionSearchResult,
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
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-500 text-[10px] font-bold text-white shadow-[0_0_8px_rgba(34,197,94,0.15)]">
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
    <div className="overflow-hidden rounded-[6px] border border-emerald-900/20 bg-slate-800/30 text-xs">
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
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SessionSearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
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

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchSessions(searchQuery, projectKey);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, projectKey]);

  async function switchSession(sessionId: string) {
    setActiveSession(sessionId);
    setMessages([]);
    try {
      const history = await getSessionHistory(sessionId);
      setMessages(
        history.map((m) => ({ id: ++msgId, role: m.role as "user" | "assistant", content: m.content })),
      );
    } catch {
      toast(t("chat.error_loading_session"), "error");
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
      toast(t("chat.error_creating_session"), "error");
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
      toast(t("chat.error_deleting_session"), "error");
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
      toast(t("chat.error_response"), "error");
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
      <Drawer.Root open={sessionsOpen} onOpenChange={setSessionsOpen} direction="left" variant="sheet">
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Drawer.Content className="flex w-64 flex-col border-r border-slate-700 bg-slate-900 outline-none">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h3 className="text-sm font-semibold text-white">{t("chat.sessions")}</h3>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleNewSession}
                  className="rounded-[6px] p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-emerald-300"
                  title={t("chat.new_session")}
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <Drawer.Close className="rounded-[6px] p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Drawer.Close>
              </div>
            </div>
            <div className="relative px-3 py-2">
              <svg className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("chat.search_sessions_placeholder")}
                className="w-full rounded-[6px] border border-emerald-900/30 bg-slate-800/60 py-1.5 pl-8 pr-2 text-xs text-white outline-none backdrop-blur-sm placeholder-slate-600 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.12)]"
              />
            </div>
            <Drawer.ScrollArea className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
              {searching && (
                <p className="px-2 py-8 text-center text-xs text-slate-500">{t("chat.search_sessions")}</p>
              )}
              {!searching && searchResults !== null && searchResults.length === 0 && (
                <p className="px-2 py-8 text-center text-xs text-slate-500">{t("chat.no_results")}</p>
              )}
              {!searching && searchResults === null && sessions.length === 0 && (
                <p className="px-2 py-8 text-center text-xs text-slate-500">
                  {t("chat.no_sessions")}
                </p>
              )}
              {searchResults !== null
                ? searchResults.map((r) => (
                    <div
                      key={r.session.id}
                      className={`cursor-pointer rounded-[6px] px-2 py-1.5 text-xs transition ${
                        activeSession === r.session.id
                          ? "bg-emerald-600/15 text-emerald-300"
                          : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                      onClick={() => {
                        switchSession(r.session.id);
                        setSearchQuery("");
                        setSearchResults(null);
                      }}
                    >
                      <span className="block truncate font-medium">{r.session.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {r.matches[r.matches.length - 1].content}
                      </span>
                    </div>
                  ))
                : sessions.map((s) => (
                    <div
                      key={s.id}
                      className={`group flex cursor-pointer items-center justify-between rounded-[6px] px-2 py-1.5 text-xs transition ${
                        activeSession === s.id
                          ? "bg-emerald-600/15 text-emerald-300"
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
                        title={t("chat.delete")}
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
            </Drawer.ScrollArea>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <div className="flex flex-1 flex-col">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSessionsOpen(true)}
              className="rounded-[6px] p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              title={t("chat.sessions")}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold">{t("chat.title")}</h1>
              {currentPath && (
                <p className="mt-0.5 text-sm text-slate-400">
                  {t("chat.asking_about")} <span className="font-medium text-emerald-400">{analysis?.projectName || currentPath}</span>
                </p>
              )}
              {activeSession && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Session: {sessions.find((s) => s.id === activeSession)?.name || activeSession}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await clearChatMemory();
                setMessages([]);
                toast(t("chat.history_cleared"), "success");
              } catch {
                toast(t("chat.error_clearing"), "error");
              }
            }}
            className="rounded-[6px] border border-emerald-900/30 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-sm transition-all duration-200 hover:border-red-800/50 hover:text-red-400"
          >
            {t("chat.clear")}
          </button>
        </div>

        <div
          ref={listRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-[6px] border border-emerald-900/20 bg-slate-900/30 p-4 backdrop-blur-sm"
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
                  className={`max-w-[75%] rounded-[6px] px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-emerald-600/15 text-white"
                      : "border border-emerald-900/20 bg-slate-800/50 text-slate-200"
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
                            {t("chat.sources")}
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
              <div className="w-full max-w-md rounded-[6px] border border-slate-700/50 bg-slate-800/50 p-4">
                {currentPath ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <svg className="h-4 w-4 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t("chat.searching")}
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
            className="min-h-[48px] flex-1 resize-none rounded-[6px] border border-emerald-900/30 bg-slate-800/60 px-4 py-3 text-sm text-white outline-none backdrop-blur-sm transition placeholder:text-slate-600 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.12)]"
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
