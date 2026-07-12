import { useMemo, useRef, useEffect, useState } from "react";
import Card from "../ui/Card";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import FileTree from "./FileTree";
import CodeSearch from "./CodeSearch";

type Tab = "browse" | "search";

export default function FileExplorer() {
  const { t } = useLanguage();
  const {
    files,
    selectedFile,
    selectFile,
    analysis,
    currentPath,
  } = useProject();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("browse");
  const browseInputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
  }, [files, query]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        setTab("browse");
        setTimeout(() => browseInputRef.current?.focus(), 0);
      }
      if (e.key === "f" && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault();
        setTab("search");
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>('[data-search-input]');
          input?.focus();
        }, 0);
      }
      if (e.key === "Escape") {
        if (tab === "search") {
          setTab("browse");
        }
        setQuery("");
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tab]);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            data-cuelume-toggle="toggle"
            onClick={() => setTab("browse")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
              tab === "browse"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {t("explorer.title")} {tab !== "browse" && <span className="ml-1 text-[10px] text-slate-500">⌘K</span>}
          </button>
          <button
            data-cuelume-toggle="toggle"
            onClick={() => setTab("search")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition ${
              tab === "search"
                ? "bg-emerald-600 text-white"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Search {tab !== "search" && <span className="ml-1 text-[10px] text-slate-500">⇧⌘F</span>}
          </button>
        </div>
        {tab === "browse" && files.length > 0 && (
          <span className="text-xs text-slate-500">
            {filtered.length}/{files.length}
          </span>
        )}
      </div>

      {tab === "search" ? (
        <CodeSearch />
      ) : (
        <>
          {files.length > 0 && (
            <input
              ref={browseInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`${t("explorer.search")} (Ctrl+K)`}
              className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          )}

          {files.length === 0 ? (
            <p className="text-slate-400">
              {t("explorer.empty")}
            </p>
          ) : (
            <FileTree files={filtered} selectedFile={selectedFile} selectFile={selectFile} rootPath={analysis?.projectPath || currentPath} />
          )}
        </>
      )}
    </Card>
  );
}
