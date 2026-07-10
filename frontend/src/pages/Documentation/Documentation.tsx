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
  const { language, t } = useLanguage();
  const { toast } = useToast();

  const [docLoading, setDocLoading] = useState(false);
  const [readmeLoading, setReadmeLoading] = useState(false);
  const [documentation, setDocumentation] = useState("");
  const [readmeResult, setReadmeResult] = useState<{
    readme_path: string;
    already_existed: boolean;
    backup_path?: string | null;
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
        setDocumentation(t("docs.error_generating"));
        setDocLoading(false);
        toast(t("docs.error_generating"), "error");
      },
    );
  }

  async function handleGenerateReadme() {
    if (!currentPath) return;

    if (!window.confirm(t("docs.readme_confirm_overwrite"))) return;

    setReadmeLoading(true);
    setReadmeResult(null);
    try {
      const data = await generateReadme(currentPath, language);
      setReadmeResult(data);
      toast(t("docs.readme_success"), "success");
    } catch {
      setReadmeResult({ readme_path: "", already_existed: false });
      toast(t("docs.readme_error"), "error");
    } finally {
      setReadmeLoading(false);
    }
  }

  function handleExportPdf() {
    if (!documentation) {
      toast(t("docs.export_first"), "error");
      return;
    }
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast(t("docs.allow_popups"), "error");
      return;
    }
    printWindow.document.write(`
      <html>
      <head>
        <title>${t("docs.title")}</title>
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

  const shortcutKeys: [string, string][] = [
    ["?", "docs.shortcuts.show"],
    ["Esc", "docs.shortcuts.close"],
    ["Ctrl+K", "docs.shortcuts.file_search"],
    ["Ctrl+Shift+F", "docs.shortcuts.project_search"],
    ["Ctrl+F", "docs.shortcuts.file_find"],
    ["Ctrl+E", "docs.shortcuts.toggle_edit"],
    ["Ctrl+S", "docs.shortcuts.save_file"],
    ["Enter", "docs.shortcuts.send"],
  ];

  const apiEndpoints: [string, string][] = [
    ["GET /health", "docs.api.health"],
    ["GET /health/detailed", "docs.api.health_detailed"],
    ["GET /metrics", "docs.api.metrics"],
    ["GET/PUT /api/v1/settings", "docs.api.settings"],
    ["POST /api/v1/project/analyze", "docs.api.analyze"],
    ["POST /api/v1/project/question-stream", "docs.api.question_stream"],
    ["POST /api/v1/chat/tool-stream", "docs.api.tool_stream"],
    ["POST /api/v1/project/export", "docs.api.export"],
    ["POST /api/v1/project/share", "docs.api.share"],
    ["GET /shared/{token}", "docs.api.shared"],
  ];

  return (
    <div className="space-y-6 pb-8">
      <h1 className="text-2xl font-bold text-white">{t("docs.title")}</h1>

      {/* === Project Tools (top) === */}
      {currentPath && (
        <>
          <div className="flex flex-wrap gap-4">
            <Button onClick={handleGenerateDoc} loading={docLoading}>
              {docLoading ? t("docs.generating_doc") : t("docs.generate_doc")}
            </Button>
            <Button onClick={handleGenerateReadme} loading={readmeLoading} variant="secondary">
              {readmeLoading ? t("docs.generating_readme") : t("docs.generate_readme")}
            </Button>
            {documentation && (
              <Button onClick={handleExportPdf} variant="secondary">
                {t("docs.export_pdf")}
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
                  <h2 className="mb-2 text-lg font-semibold text-emerald-400">{t("docs.readme_title")}</h2>
                  <p className="text-sm text-slate-300">
                    {t("docs.readme_path")} <code className="text-emerald-400">{readmeResult.readme_path}</code>
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {readmeResult.already_existed ? t("docs.readme_overwritten") : t("docs.readme_created")}
                  </p>
                  {readmeResult.backup_path && (
                    <p className="mt-1 text-sm text-slate-500">
                      {t("docs.readme_backup")} <code className="text-amber-400">{readmeResult.backup_path}</code>
                    </p>
                  )}
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
                  <h2 className="mb-4 text-lg font-semibold text-white">{t("docs.title")}</h2>
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
      <DocSection title={t("docs.about.title")}>
        <p>{t("docs.about.text")}</p>
      </DocSection>

      <DocSection title={t("docs.quick_start.title")}>
        <ol className="list-decimal space-y-2 pl-5">
          <li>{t("docs.quick_start.step1")}</li>
          <li>{t("docs.quick_start.step2")}</li>
          <li>{t("docs.quick_start.step3")}</li>
          <li>{t("docs.quick_start.step4")}</li>
          <li>{t("docs.quick_start.step5")}</li>
        </ol>
      </DocSection>

      <DocSection title={t("docs.shortcuts.title")}>
        <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {shortcutKeys.map(([key, descKey]) => (
            <div key={key} className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-slate-800/50">
              <Kbd>{key}</Kbd>
              <span className="text-sm text-slate-400">{t(descKey)}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-600">{t("docs.shortcuts.hint", { key: "?" })}</p>
      </DocSection>

      <DocSection title={t("docs.providers.title")}>
        <div className="space-y-3">
          <div>
            <h3 className="font-medium text-slate-300">{t("docs.providers.ollama_title")}</h3>
            <p className="text-xs text-slate-500">
              {t("docs.providers.ollama_desc", { cmd: "ollama pull qwen2.5-coder:7b" })}
            </p>
          </div>
          <div>
            <h3 className="font-medium text-slate-300">{t("docs.providers.groq_title")}</h3>
            <p className="text-xs text-slate-500">
              {t("docs.providers.groq_desc", { url: "console.groq.com" })}
            </p>
          </div>
        </div>
      </DocSection>

      <DocSection title={t("docs.rag.title")}>
        <p>{t("docs.rag.para1")}</p>
        <p className="mt-2 text-xs text-slate-500">{t("docs.rag.para2")}</p>
      </DocSection>

      <DocSection title={t("docs.api.title")}>
        <p className="mb-2 text-xs text-slate-500">
          {t("docs.api.description", { prefix: "/api/v1", docs: "/docs" })}
        </p>
        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
          {apiEndpoints.map(([ep, descKey]) => (
            <div key={ep} className="flex flex-col rounded-lg bg-slate-800/50 px-3 py-1.5">
              <code className="text-emerald-400">{ep}</code>
              <span className="text-slate-500">{t(descKey)}</span>
            </div>
          ))}
        </div>
      </DocSection>
    </div>
  );
}
