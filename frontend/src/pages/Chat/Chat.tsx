import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { streamProjectQuestion, streamCasualChat, clearChatMemory } from "../../services/projectService";
import Button from "../../components/ui/Button";
import TypingEffect, { CodeSkeleton } from "../../components/ui/TypingEffect";
import { useToast } from "../../contexts/ToastContext";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
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

export default function Chat() {
  const { currentPath, analysis } = useProject();
  const { language, t } = useLanguage();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [typingId, setTypingId] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  async function handleSend() {
    const question = input.trim();
    if (!question) return;

    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setMessages((prev) => [...prev, { id: ++msgId, role: "user", content: question }]);
    setLoading(true);

    const newId = ++msgId;
    setMessages((prev) => [...prev, { id: newId, role: "assistant", content: "" }]);
    setTypingId(newId);

    const onChunk = (text: string) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === newId ? { ...m, content: text } : m)),
      );
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
      streamProjectQuestion(currentPath, question, language, onChunk, onDone, onError);
    } else {
      streamCasualChat(question, onChunk, onDone, onError);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-4xl flex-col">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("chat.title")}</h1>
          {currentPath && (
            <p className="mt-1 text-sm text-slate-400">
              {t("chat.asking_about")} <span className="font-medium text-emerald-400">{analysis?.projectName || currentPath}</span>
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
                  <TypingEffect
                    text={msg.content}
                    loading={typingId === msg.id}
                    speed={25}
                  />
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
              <CodeSkeleton />
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
  );
}
