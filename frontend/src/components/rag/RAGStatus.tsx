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
      toast(t("rag.reindexed", { files: result.files }), "success");
      const updated = await getRAGStatus(currentPath);
      setStatus(updated);
    } catch {
      toast(t("rag.rebuild_failed"), "error");
    } finally {
      setRebuilding(false);
    }
  }

  async function handleClear() {
    try {
      await clearRAGIndex(currentPath);
      toast(t("rag.clear_success"), "success");
      setStatus(null);
    } catch {
      toast(t("rag.clear_failed"), "error");
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
            className="rounded-[6px] border border-emerald-900/30 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-sm transition-all duration-200 hover:border-emerald-700/50 hover:bg-slate-700/40 disabled:opacity-50"
          >
            {rebuilding ? "..." : t("rag.rebuild")}
          </button>
          <button
            onClick={handleClear}
            className="rounded-[6px] border border-emerald-900/30 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-300 backdrop-blur-sm transition-all duration-200 hover:border-red-800/50 hover:bg-red-900/20"
          >
            {t("rag.clear")}
          </button>
        </div>
      </div>
    </Card>
  );
}
