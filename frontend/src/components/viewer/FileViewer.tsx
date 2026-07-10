import { useState, useRef, useEffect, useMemo, useCallback } from "react";
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
import { saveFile, reindexProject } from "../../services/projectService";
import { useToast } from "../../contexts/ToastContext";
import TypingEffect from "../ui/TypingEffect";

export default function FileViewer() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const {
    selectedFile,
    fileContent,
    fileExplanation,
    fileTabs,
    activeFileTabId,
    closeFileTab,
    switchFileTab,
    explainSelectedFile,
    explaining,
    fileLoading,
    selectFile,
    currentPath,
  } = useProject();

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const matches = useMemo(() => {
    if (!searchQuery || !fileContent) return [];
    const q = searchQuery.toLowerCase();
    const lines: number[] = [];
    fileContent.split("\n").forEach((line, i) => {
      if (line.toLowerCase().includes(q)) lines.push(i + 1);
    });
    return lines;
  }, [searchQuery, fileContent]);

  useEffect(() => {
    if (!searchActive) {
      setSearchQuery("");
      setMatchIndex(0);
    }
  }, [searchActive]);

  useEffect(() => {
    if (searchActive && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchActive]);

  useEffect(() => {
    if (matches.length > 0 && scrollRef.current) {
      const lineEl = scrollRef.current.querySelector(`[data-line-number="${matches[matchIndex]}"]`);
      lineEl?.scrollIntoView({ block: "center" });
    }
  }, [matchIndex, matches]);

  function startEditing() {
    setEditContent(fileContent);
    setEditing(true);
    setSearchActive(false);
  }

  function cancelEditing() {
    setEditing(false);
    setEditContent("");
  }

  async function handleSave() {
    if (!selectedFile) return;
    try {
      await saveFile(selectedFile.path, editContent);
      await selectFile(selectedFile);
      setEditing(false);
      setEditContent("");
      toast(t("viewer.saved"), "success");
      if (currentPath) {
        reindexProject(currentPath, [selectedFile.path]).catch(() => {});
      }
    } catch {
      toast(t("viewer.save_error"), "error");
    }
  }

  const handleGlobalKeydown = useCallback((e: KeyboardEvent) => {
    const editMode = editing;
    if (e.key === "f" && (e.ctrlKey || e.metaKey) && !e.shiftKey && !editMode) {
      e.preventDefault();
      setSearchActive((prev) => !prev);
    }
    if (e.key === "Escape" && searchActive) {
      e.preventDefault();
      setSearchActive(false);
    }
    if (e.key === "e" && (e.ctrlKey || e.metaKey) && !e.shiftKey && selectedFile) {
      e.preventDefault();
      if (!editing) startEditing();
      else cancelEditing();
    }
    if (e.key === "s" && (e.ctrlKey || e.metaKey) && editing) {
      e.preventDefault();
      handleSave();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, searchActive, selectedFile, fileContent]);

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalKeydown);
    return () => window.removeEventListener("keydown", handleGlobalKeydown);
  }, [handleGlobalKeydown]);

  if (fileTabs.length === 0) {
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

  function navigateMatch(dir: 1 | -1) {
    if (matches.length === 0) return;
    setMatchIndex((prev) => {
      const next = prev + dir;
      if (next < 0) return matches.length - 1;
      if (next >= matches.length) return 0;
      return next;
    });
  }

  function handleSearchKeydown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      navigateMatch(e.shiftKey ? -1 : 1);
    }
    if (e.key === "Escape") {
      setSearchActive(false);
    }
  }

  const ext = (selectedFile?.name ?? "").split(".").pop() ?? "";
  const lang = extToLang[ext] ?? "typescript";

  return (
    <Card>
      {/* File tabs */}
      {fileTabs.length > 1 && (
        <div className="-mx-6 -mt-6 mb-4 flex flex-wrap items-center gap-1 border-b border-slate-700/50 px-6 pb-2">
          {fileTabs.map((ft) => {
            const isActive = ft.id === activeFileTabId;
            return (
              <div
                key={ft.id}
                className={`group flex cursor-pointer items-center gap-2 rounded-t-lg px-3 py-2 text-sm transition select-none ${
                  isActive
                    ? "border border-b-0 border-slate-700 bg-slate-800/60 text-slate-200"
                    : "text-slate-500 hover:bg-slate-800/30 hover:text-slate-300"
                }`}
                onClick={() => switchFileTab(ft.id)}
              >
                <span className="max-w-40 truncate">{ft.file.name}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); closeFileTab(ft.id); }}
                  className="ml-1 rounded p-0.5 text-slate-600 opacity-0 transition hover:bg-red-600/20 hover:text-red-400 group-hover:opacity-100"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <h2 className="truncate text-xl font-semibold">
            {selectedFile?.name ?? ""}
          </h2>

        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => { setSearchActive(true); setTimeout(() => searchInputRef.current?.focus(), 0); }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-emerald-700 hover:text-emerald-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {t("viewer.search")}
          </button>
          <button
            onClick={explainSelectedFile}
            disabled={explaining}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            {explaining && <Spinner size="sm" />}
            {explaining ? t("viewer.generating") : t("viewer.explain")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t("viewer.code")}</h3>
            {searchActive && (
              <div className="flex items-center gap-2">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setMatchIndex(0); }}
                  onKeyDown={handleSearchKeydown}
                  placeholder={t("viewer.search_placeholder")}
                  className="w-48 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white outline-none placeholder:text-slate-500 focus:border-emerald-500"
                />
                <span className="text-[11px] text-slate-500">
                  {matches.length > 0 ? `${matchIndex + 1}/${matches.length}` : "0/0"}
                </span>
                <button
                  onClick={() => navigateMatch(-1)}
                  disabled={matches.length === 0}
                  className="rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-white disabled:opacity-30"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                </button>
                <button
                  onClick={() => navigateMatch(1)}
                  disabled={matches.length === 0}
                  className="rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-white disabled:opacity-30"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <button
                  onClick={() => setSearchActive(false)}
                  className="rounded p-1 text-slate-500 transition hover:bg-slate-800 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div
            ref={scrollRef}
            className="max-h-[600px] flex-1 overflow-auto rounded-lg bg-slate-950 p-4"
          >
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
                lineProps={(lineNumber) => {
                  if (matches.includes(lineNumber)) {
                    const isActive = matches.indexOf(lineNumber) === matchIndex;
                    return {
                      style: {
                        backgroundColor: isActive ? "rgba(52, 211, 153, 0.25)" : "rgba(52, 211, 153, 0.08)",
                        display: "block",
                      },
                      "data-line-number": lineNumber,
                    };
                  }
                  return { "data-line-number": lineNumber };
                }}
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
