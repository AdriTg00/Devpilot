import { useState } from "react";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import tsx from "react-syntax-highlighter/dist/esm/languages/prism/tsx";
import typescript from "react-syntax-highlighter/dist/esm/languages/prism/typescript";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import jsx from "react-syntax-highlighter/dist/esm/languages/prism/jsx";
import javascript from "react-syntax-highlighter/dist/esm/languages/prism/javascript";
import bash from "react-syntax-highlighter/dist/esm/languages/prism/bash";
import json from "react-syntax-highlighter/dist/esm/languages/prism/json";
import css from "react-syntax-highlighter/dist/esm/languages/prism/css";
import scss from "react-syntax-highlighter/dist/esm/languages/prism/scss";
import markdown from "react-syntax-highlighter/dist/esm/languages/prism/markdown";
import yaml from "react-syntax-highlighter/dist/esm/languages/prism/yaml";
import go from "react-syntax-highlighter/dist/esm/languages/prism/go";
import rust from "react-syntax-highlighter/dist/esm/languages/prism/rust";
import java from "react-syntax-highlighter/dist/esm/languages/prism/java";
import cpp from "react-syntax-highlighter/dist/esm/languages/prism/cpp";
import docker from "react-syntax-highlighter/dist/esm/languages/prism/docker";
import sql from "react-syntax-highlighter/dist/esm/languages/prism/sql";

SyntaxHighlighter.registerLanguage("tsx", tsx);
SyntaxHighlighter.registerLanguage("typescript", typescript);
SyntaxHighlighter.registerLanguage("python", python);
SyntaxHighlighter.registerLanguage("jsx", jsx);
SyntaxHighlighter.registerLanguage("javascript", javascript);
SyntaxHighlighter.registerLanguage("bash", bash);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("scss", scss);
SyntaxHighlighter.registerLanguage("markdown", markdown);
SyntaxHighlighter.registerLanguage("yaml", yaml);
SyntaxHighlighter.registerLanguage("go", go);
SyntaxHighlighter.registerLanguage("rust", rust);
SyntaxHighlighter.registerLanguage("java", java);
SyntaxHighlighter.registerLanguage("cpp", cpp);
SyntaxHighlighter.registerLanguage("docker", docker);
SyntaxHighlighter.registerLanguage("sql", sql);

const extToLang: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  py: "python",
  rb: "ruby",
  rs: "rust",
  go: "go",
  java: "java",
  cpp: "cpp",
  c: "cpp",
  h: "cpp",
  hpp: "cpp",
  cs: "csharp",
  css: "css",
  scss: "scss",
  less: "css",
  json: "json",
  xml: "markup",
  html: "markup",
  md: "markdown",
  yaml: "yaml",
  yml: "yaml",
  toml: "ini",
  ini: "ini",
  cfg: "ini",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  ps1: "powershell",
  sql: "sql",
  graphql: "graphql",
  dockerfile: "docker",
  diff: "diff",
  dockerignore: "ignore",
  gitignore: "ignore",
  env: "ini",
  lock: "json",
};

import Card from "../ui/Card";
import Spinner from "../ui/Spinner";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { saveFile } from "../../services/projectService";
import { useToast } from "../../contexts/ToastContext";
import TypingEffect from "../ui/TypingEffect";

export default function FileViewer() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const {
    selectedFile,
    fileContent,
    fileExplanation,
    explainSelectedFile,
    explaining,
    fileLoading,
    selectFile,
  } = useProject();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);

  if (!selectedFile) {
    return (
      <Card>
        <h2 className="mb-6 text-xl font-semibold">
          {t("viewer.title")}
        </h2>
        <p className="text-slate-400">
          {t("viewer.select")}
        </p>
      </Card>
    );
  }

  function startEditing() {
    setEditContent(fileContent);
    setEditing(true);
  }

  function cancelEditing() {
    setEditing(false);
    setEditContent("");
  }

  async function handleSave() {
    if (!selectedFile) return;
    setSaving(true);
    try {
      await saveFile(selectedFile.path, editContent);
      await selectFile(selectedFile);
      setEditing(false);
      setEditContent("");
      toast("File saved", "success");
    } catch {
      toast("Error saving file", "error");
    } finally {
      setSaving(false);
    }
  }

  const ext = selectedFile.name.split(".").pop() ?? "";
  const lang = extToLang[ext] ?? "typescript";

  return (
    <Card>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="truncate text-xl font-semibold">
            {selectedFile.name}
          </h2>
          {editing && (
            <span className="shrink-0 rounded-md bg-emerald-600/20 px-2 py-0.5 text-[11px] font-medium text-emerald-400">
              EDITING
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          {editing ? (
            <>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving && <Spinner size="sm" />}
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancelEditing}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:text-slate-200"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-emerald-700 hover:text-emerald-400"
              >
                Edit
              </button>
              <button
                onClick={explainSelectedFile}
                disabled={explaining}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {explaining && <Spinner size="sm" />}
                {explaining ? t("viewer.generating") : t("viewer.explain")}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col">
          <h3 className="mb-3 text-lg font-semibold">{t("viewer.code")}</h3>
          <div className="max-h-[600px] flex-1 overflow-auto rounded-lg bg-slate-950 p-4">
            {fileLoading ? (
              <div className="flex h-full items-center justify-center">
                <Spinner size="lg" className="text-emerald-500" />
              </div>
            ) : editing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                spellCheck={false}
                className="h-full min-h-[400px] w-full resize-none bg-transparent font-mono text-[13px] leading-relaxed text-slate-200 outline-none"
              />
            ) : (
              <SyntaxHighlighter
                language={lang}
                style={oneDark}
                customStyle={{ margin: 0, borderRadius: 0, background: "transparent", fontSize: "0.8125rem" }}
                codeTagProps={{ style: { fontFamily: "inherit" } }}
                showLineNumbers
              >
                {fileContent}
              </SyntaxHighlighter>
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t("viewer.ai")}</h3>
            {explaining && (
              <span className="text-sm text-slate-400">
                {fileExplanation.length} {t("viewer.chars")}
              </span>
            )}
          </div>
          <div className="max-h-[600px] flex-1 overflow-auto rounded-lg border border-slate-700 bg-slate-900 p-4">
            {fileExplanation || explaining ? (
              <TypingEffect text={fileExplanation} loading={explaining} />
            ) : (
              <p className="text-slate-400">{t("viewer.no_explanation")}</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
