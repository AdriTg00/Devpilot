import { useMemo, useState } from "react";
import Card from "../ui/Card";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import FileTree from "./FileTree";

export default function FileExplorer() {
  const { t } = useLanguage();
  const {
    files,
    selectedFile,
    selectFile,
  } = useProject();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return files;
    const q = query.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(q) || f.path.toLowerCase().includes(q));
  }, [files, query]);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {t("explorer.title")}
        </h2>
        {files.length > 0 && (
          <span className="text-xs text-slate-500">
            {filtered.length}/{files.length}
          </span>
        )}
      </div>

      {files.length > 0 && (
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("explorer.search")}
          className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
        />
      )}

      {files.length === 0 ? (
        <p className="text-slate-400">
          {t("explorer.empty")}
        </p>
      ) : (
        <FileTree files={filtered} selectedFile={selectedFile} selectFile={selectFile} />
      )}
    </Card>
  );
}