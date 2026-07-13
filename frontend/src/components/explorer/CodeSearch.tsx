import { useState, useRef, useCallback } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { searchProject, type SearchMatch } from "../../services/projectService";

export default function CodeSearch() {
  const { t } = useLanguage();
  const { currentPath, analysis, selectFile } = useProject();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchMatch[]>([]);
  const [total, setTotal] = useState(0);
  const [truncated, setTruncated] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim() || !currentPath) return;
    setSearching(true);
    try {
      const data = await searchProject(currentPath, q);
      setResults(data.matches);
      setTotal(data.total);
      setTruncated(data.truncated);
    } catch {
      setResults([]);
      setTotal(0);
    } finally {
      setSearching(false);
    }
  }, [currentPath]);

  function handleChange(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setResults([]);
      setTotal(0);
      return;
    }
    timerRef.current = setTimeout(() => doSearch(value), 300);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (timerRef.current) clearTimeout(timerRef.current);
      doSearch(query);
    }
  }

  const grouped = groupByFile(results);

  return (
    <div>
      <div className="relative">
        <input
          data-search-input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`${t("explorer.search_code")} (Ctrl+Shift+F)`}
          className="w-full rounded-lg border border-emerald-900/30 bg-slate-800/60 pl-9 pr-3 py-2 text-sm text-white backdrop-blur-sm placeholder-slate-600 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.12)] focus:outline-none"
        />
        <svg
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {searching && (
        <p className="mt-2 text-xs text-slate-500">Buscando...</p>
      )}

      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="mt-2 text-xs text-slate-500">Sin resultados</p>
      )}

      {results.length > 0 && (
        <>
          <p className="mt-2 text-xs text-slate-500">
            {total} resultado{total !== 1 ? "s" : ""}
            {truncated ? " (mostrando los primeros 100)" : ""}
          </p>

          <div className="mt-2 max-h-[400px] overflow-y-auto space-y-3">
            {Object.entries(grouped).map(([filePath, fileMatches]) => (
              <div key={filePath}>
                <p className="mb-1 truncate text-xs font-medium text-slate-400">
                  {analysis?.projectPath
                    ? stripPrefix(filePath, analysis.projectPath)
                    : filePath}
                </p>
                <div className="space-y-0.5">
                  {fileMatches.slice(0, 10).map((m, i) => (
                    <button
                      key={`${m.path}-${m.line}-${i}`}
                      onClick={() => selectFile({ path: m.path, name: m.path.split(/[\\/]/).pop() || "" })}
                      className="flex w-full gap-2 rounded px-2 py-1 text-left font-mono text-xs transition hover:bg-slate-800"
                    >
                      <span className="shrink-0 w-8 text-right text-slate-600">
                        {m.line}
                      </span>
                      <span className="truncate text-slate-300">{m.content}</span>
                    </button>
                  ))}
                  {fileMatches.length > 10 && (
                    <p className="px-2 text-xs text-slate-600">... y {fileMatches.length - 10} más</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function groupByFile(matches: SearchMatch[]): Record<string, SearchMatch[]> {
  const grouped: Record<string, SearchMatch[]> = {};
  for (const m of matches) {
    if (!grouped[m.path]) grouped[m.path] = [];
    grouped[m.path].push(m);
  }
  return grouped;
}

function stripPrefix(path: string, root: string): string {
  const p = path.replace(/\\/g, "/");
  const r = root.replace(/\\/g, "/").replace(/\/+$/, "") + "/";
  return p.startsWith(r) ? p.slice(r.length) : p;
}
