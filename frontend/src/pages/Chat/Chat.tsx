import { useState, useRef, useEffect } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { streamProjectQuestion, streamCasualChat } from "../../services/projectService";
import Card from "../../components/ui/Card";
import TypingEffect, { CodeSkeleton } from "../../components/ui/TypingEffect";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
}

let msgId = 0;

export default function Chat() {
  const { currentPath, analysis } = useProject();
  const { language, t } = useLanguage();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingId, setTypingId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend() {
    const question = input.trim();
    if (!question) return;

    setInput("");
    setMessages((prev) => [...prev, { id: ++msgId, role: "user", content: question }]);
    setLoading(true);

    if (currentPath) {
      const newId = ++msgId;
      setMessages((prev) => [...prev, { id: newId, role: "assistant", content: "" }]);
      setTypingId(newId);
      streamProjectQuestion(
        currentPath,
        question,
        language,
        (text) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === newId ? { ...m, content: text } : m)),
          );
        },
        () => {
          setLoading(false);
          setTimeout(() => setTypingId(null), 3000);
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === newId ? { ...m, content: t("chat.error") } : m,
            ),
          );
          setLoading(false);
          setTypingId(null);
        },
      );
    } else {
      const newId = ++msgId;
      setMessages((prev) => [...prev, { id: newId, role: "assistant", content: "" }]);
      setTypingId(newId);
      streamCasualChat(
        question,
        (text) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === newId ? { ...m, content: text } : m)),
          );
        },
        () => {
          setLoading(false);
          setTimeout(() => setTypingId(null), 3000);
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === newId ? { ...m, content: t("chat.error") } : m,
            ),
          );
          setLoading(false);
          setTypingId(null);
        },
      );
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <Card>
      <h1 className="mb-6 text-2xl font-bold">{t("chat.title")}</h1>

      <>
        {currentPath && (
          <p className="mb-6 text-sm text-slate-400">
            {t("chat.asking_about")} <span className="font-medium text-emerald-400">{analysis?.projectName || currentPath}</span>
          </p>
        )}

        <div
          ref={listRef}
          className="mb-4 max-h-[500px] space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-4"
        >
          {messages.length === 0 && (
            <p className="text-center text-slate-500">
              {t("chat.empty")}
            </p>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  msg.role === "user"
                    ? "bg-emerald-700 text-white"
                    : "border border-slate-600 bg-slate-800 text-slate-200"
                }`}
              >
                {msg.role === "assistant" ? (
                  <TypingEffect
                    text={msg.content}
                    loading={typingId === msg.id}
                    speed={25}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-xs">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {loading && !typingId && (
            <div className="flex justify-start">
              <div className="w-full max-w-md rounded-lg border border-slate-600 bg-slate-800 p-3">
                <CodeSkeleton />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("chat.placeholder")}
            disabled={loading}
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-emerald-500 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {t("chat.send")}
          </button>
        </div>
      </>
    </Card>
  );
}
