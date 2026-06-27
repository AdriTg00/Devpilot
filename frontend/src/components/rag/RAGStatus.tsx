import { useEffect, useState } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { getRAGStatus, reindexProject, clearRAGIndex, type RAGStatus as RAGStatusData } from "../../services/projectService";
import Card from "../ui/Card";
import Badge from "../ui/Badge";

export default function RAGStatus() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { currentPath, analysis } = useProject();
  const [status, setStatus] = useState<RAGStatusData | null>(null);
  const [rebuilding, setRebuilding] = useState(false);

  useEffect(() => {
    if (!currentPath) return;
    getRAGStatus(currentPath).then(setStatus).catch(() => setStatus(null));
  }, [currentPath]);

  if (!analysis || !currentPath) return null;

  async function handleRebuild() {
    setRebuilding(true);
    try {
      const result = await reindexProject(currentPath);
      toast(`${result.files} files reindexed`, "success");
      const updated = await getRAGStatus(currentPath);
      setStatus(updated);
    } catch {
      toast("Rebuild failed", "error");
    } finally {
      setRebuilding(false);
    }
  }

  async function handleClear() {
    try {
      await clearRAGIndex(currentPath);
      toast("RAG index cleared", "success");
      setStatus(null);
    } catch {
      toast("Clear failed", "error");
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={status?.ready ? "emerald" : "amber"}>
            {status?.ready ? t("rag.ready") : t("rag.not_ready")}
          </Badge>
          {status?.ready && (
            <span className="text-xs text-slate-500">
              {t("rag.chunks", { chunks: status.total_chunks ?? 0 })}
              {status.project_chunks != null && (
                <> &middot; {t("rag.project_chunks", { chunks: status.project_chunks })}</>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRebuild}
            disabled={rebuilding}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-slate-700 disabled:opacity-50"
          >
            {rebuilding ? "..." : t("rag.rebuild")}
          </button>
          <button
            onClick={handleClear}
            className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-red-900/50"
          >
            {t("rag.clear")}
          </button>
        </div>
      </div>
    </Card>
  );
}
