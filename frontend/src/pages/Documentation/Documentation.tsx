import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  streamDocumentation,
  generateReadme,
} from "../../services/projectService";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import TypingEffect from "../../components/ui/TypingEffect";
import { useToast } from "../../contexts/ToastContext";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <h2 className="mb-3 text-sm font-semibold text-white">{title}</h2>
      <div className="prose prose-invert prose-sm max-w-none text-slate-400">
        {children}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="inline-block rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[11px] text-emerald-400">
      {children}
    </kbd>
  );
}

function mdToHtml(md: string): string {
  const parts: string[] = [];
  const lines = md.split("\n");
  let inCode = false;
  let codeLines: string[] = [];
  let inList = false;

  function flushCode() {
    if (codeLines.length) {
      parts.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      codeLines = [];
    }
  }

  function flushList() {
    if (inList) { parts.push("</ul>"); inList = false; }
  }

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode) { flushCode(); inCode = false; }
      else { flushList(); inCode = true; }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    if (line.trim() === "") { flushList(); continue; }

    const h1 = line.match(/^# (.+)/);
    if (h1) { flushList(); parts.push(`<h1>${inlineMd(h1[1])}</h1>`); continue; }
    const h2 = line.match(/^## (.+)/);
    if (h2) { flushList(); parts.push(`<h2>${inlineMd(h2[1])}</h2>`); continue; }
    const h3 = line.match(/^### (.+)/);
    if (h3) { flushList(); parts.push(`<h3>${inlineMd(h3[1])}</h3>`); continue; }

    const li = line.match(/^[-*]\s+(.+)/);
    if (li) {
      if (!inList) { parts.push("<ul>"); inList = true; }
      parts.push(`<li>${inlineMd(li[1])}</li>`);
      continue;
    }

    flushList();
    parts.push(`<p>${inlineMd(line)}</p>`);
  }

  flushCode();
  flushList();
  return parts.join("\n");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inlineMd(text: string): string {
  return text
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

export default function Documentation() {
  const { currentPath } = useProject();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [docLoading, setDocLoading] = useState(false);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [documentation, setDocumentation] = useState("");
  const [readmeResult, setReadmeResult] = useState<{
    readme_path: string;
    already_existed: boolean;
  } | null>(null);

  function handleGenerateDoc() {
    if (!currentPath) return;
    setDocLoading(true);
    setDocumentation("");
    streamDocumentation(
      currentPath,
      language,
      (text) => setDocumentation(text),
      () => setDocLoading(false),
      () => {
        setDocumentation("Error generating documentation.");
        setDocLoading(false);
        toast("Error al generar documentacion", "error");
      },
    );
  }

  async function handleGenerateReadme() {
    if (!currentPath) return;
    setReadmeLoading(true);
    setReadmeResult(null);
    try {
      const data = await generateReadme(currentPath, language);
      setReadmeResult(data);
      toast("README generado correctamente", "success");
    } catch {
      setReadmeResult({ readme_path: "", already_existed: false });
      toast("Error al generar README", "error");
    } finally {
      setReadmeLoading(false);
    }
  }

  function handleExportPdf() {
    if (!documentation) {
      toast("Generate documentation first", "error");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast("Allow popups to export PDF", "error");
      return;
    }
    printWindow.document.write(`
      <html>
      <head>
        <title>Documentation</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 40px; line-height: 1.8; color: #111; max-width: 800px; margin: 0 auto; }
          pre { background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; }
          code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 13px; background: #f0f0f0; padding: 1px 4px; border-radius: 3px; }
          pre code { background: none; padding: 0; }
          h1 { font-size: 26px; margin-top: 32px; margin-bottom: 8px; border-bottom: 2px solid #eee; padding-bottom: 8px; }
          h2 { font-size: 22px; margin-top: 28px; margin-bottom: 6px; }
          h3 { font-size: 18px; margin-top: 24px; margin-bottom: 4px; }
          p { margin: 12px 0; }
          ul { margin: 8px 0; padding-left: 24px; }
          li { margin: 4px 0; }
          strong { font-weight: 600; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${mdToHtml(documentation)}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  }

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-2xl font-bold text-white">Documentation</h1>

      {/* === Project Tools (top) === */}
      {currentPath && (
        <>
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleGenerateDoc} loading={docLoading}>
              {docLoading ? "Generating Documentation\u2026" : "Generate Documentation"}
            </Button>
            <Button onClick={handleGenerateReadme} loading={readmeLoading} variant="secondary">
              {readmeLoading ? "Generating README\u2026" : "Generate README"}
            </Button>
            {documentation && (
              <Button onClick={handleExportPdf} variant="secondary">
                Export PDF
              </Button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {readmeResult && (
              <motion.div
                key="readme"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <h2 className="mb-2 text-lg font-semibold text-emerald-400">README generated</h2>
                  <p className="text-sm text-slate-300">
                    Path: <code className="text-emerald-400">{readmeResult.readme_path}</code>
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {readmeResult.already_existed ? "Overwritten existing file." : "Created new file."}
                  </p>
                </Card>
              </motion.div>
            )}

            {(docLoading || documentation) && (
              <motion.div
                key="doc"
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <h2 className="mb-4 text-lg font-semibold text-white">Documentation</h2>
                  <div className="max-h-[60vh] overflow-y-auto">
                    <TypingEffect text={documentation} loading={docLoading} />
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <hr className="border-slate-800" />
        </>
      )}

      {/* === DevPilot Docs === */}
      <DocSection title="About DevPilot">
        <p>
          DevPilot is a local-first AI developer assistant. It analyzes your source code,
          indexes it with vector search (RAG), and lets you chat with an LLM that
          understands your project. All processing happens on your machine.
        </p>
      </DocSection>

      <DocSection title="Quick Start">
        <ol className="list-decimal space-y-2 pl-5">
          <li>Open a project folder from the <strong>Projects</strong> page (drag &amp; drop or browse).</li>
          <li>Wait for analysis to complete. The RAG index builds automatically.</li>
          <li>Go to <strong>Chat</strong> and ask questions about your code.</li>
          <li>Use the <strong>File Explorer</strong> to view, edit, and search files.</li>
          <li>Configure your LLM provider in <strong>Settings</strong> (Ollama or Groq).</li>
        </ol>
      </DocSection>

      <DocSection title="Keyboard Shortcuts">
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {[
            ["?", "Show keyboard shortcuts"],
            ["Esc", "Close modal / cancel"],
            ["Ctrl+K", "File search (Explorer)"],
            ["Ctrl+Shift+F", "Search in project code"],
            ["Ctrl+F", "Search inside file (Viewer)"],
            ["Ctrl+E", "Toggle edit mode (Viewer)"],
            ["Ctrl+S", "Save file (Viewer)"],
            ["Enter", "Send message (Chat)"],
          ].map(([key, desc]) => (
            <div key={key} className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-slate-800/50">
              <Kbd>{key}</Kbd>
              <span className="text-sm text-slate-400">{desc}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">Press <Kbd>?</Kbd> anywhere to see all shortcuts.</p>
      </DocSection>

      <DocSection title="LLM Providers">
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-slate-300">Ollama (default)</h3>
            <p className="text-xs text-slate-500">
              Local models via Ollama. Install Ollama separately and pull a model
              (e.g. <code className="text-emerald-400">ollama pull qwen2.5-coder:7b</code>).
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-300">Groq (cloud)</h3>
            <p className="text-xs text-slate-500">
              Fast cloud inference via Groq API. Create a free key at{" "}
              <a href="https://console.groq.com" className="text-emerald-400 underline" target="_blank" rel="noopener">
                console.groq.com
              </a>{" "}
              and add it to your <code className="text-emerald-400">.env</code> file.
            </p>
          </div>
        </div>
      </DocSection>

      <DocSection title="RAG (Retrieval-Augmented Generation)">
        <p>
          DevPilot indexes your project code into ChromaDB, a local vector database.
          When you ask a question in Chat, it retrieves the most relevant code snippets
          and includes them as context for the LLM, showing source citations inline.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          The index rebuilds automatically when you open or upload a project.
          Saving a file auto-reindexes just that file.
        </p>
      </DocSection>

      <DocSection title="API Endpoints">
        <p className="mb-2 text-xs text-slate-500">
          All API routes are prefixed with <code className="text-emerald-400">/api/v1</code>.
          Protected routes require a JWT token (login via <code className="text-emerald-400">POST /api/v1/auth/login</code>).
          Full Swagger docs at <a href="http://localhost:8000/docs" className="text-emerald-400 underline" target="_blank" rel="noopener">/docs</a>.
        </p>
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {[
            ["GET /health", "Basic health check"],
            ["GET /health/detailed", "Full service status"],
            ["GET /metrics", "Prometheus metrics"],
            ["POST /api/v1/auth/login", "JWT authentication"],
            ["GET/PUT /api/v1/settings", "LLM/RAG settings"],
            ["POST /api/v1/project/analyze", "Analyze project stats"],
            ["POST /api/v1/project/question-stream", "Streaming project Q&A"],
            ["POST /api/v1/chat/tool-stream", "Chat with tool-calling"],
            ["POST /api/v1/project/export", "Export project as ZIP"],
            ["POST /api/v1/project/share", "Generate share link"],
            ["GET /shared/{token}", "View shared project"],
          ].map(([ep, desc]) => (
            <div key={ep} className="flex flex-col rounded-lg bg-slate-800/50 px-3 py-1.5">
              <code className="text-emerald-400">{ep}</code>
              <span className="text-slate-500">{desc}</span>
            </div>
          ))}
        </div>
      </DocSection>
    </div>
  );
}
