import { useState } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { exportProject, shareProject } from "../../services/projectService";
import { useToast } from "../../contexts/ToastContext";
import Card from "../ui/Card";

export default function CurrentProject() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const { analysis, closeProject, closing, currentPath, previousPath, resumeProject, loading } = useProject();
    const [exporting, setExporting] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [resuming, setResuming] = useState(false);

    async function handleResume() {
        setResuming(true);
        try {
            await resumeProject();
        } catch {
            toast("Error al retomar proyecto", "error");
        } finally {
            setResuming(false);
        }
    }

    if (!analysis) {
        if (!previousPath) return null;

        return (
            <Card>
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-sm text-slate-400">Previous project</p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-300">
                            {previousPath.split("\\").pop()}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">{previousPath}</p>
                    </div>
                    <button
                        onClick={handleResume}
                        disabled={resuming || loading}
                        className="shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
                    >
                        {resuming ? "Opening..." : "Resume"}
                    </button>
                </div>
            </Card>
        );
    }

    async function handleExport() {
        setExporting(true);
        try {
            await exportProject(currentPath, "en");
        } catch {
            /* silent */
        } finally {
            setExporting(false);
        }
    }

    async function handleShare() {
        setSharing(true);
        setShareLink(null);
        try {
            const result = await shareProject(currentPath, 7);
            setShareLink(result.url);
        } catch {
            toast("Error al generar link de compartir", "error");
        } finally {
            setSharing(false);
        }
    }

    function copyLink() {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            toast("Link copiado al portapapeles", "success");
        }
    }

    return (
        <Card>
            <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                    <p className="text-sm text-slate-400">
                        {t("current_project.title")}
                    </p>
                    <h2 className="mt-2 truncate text-2xl font-bold">
                        {analysis.projectName}
                    </h2>
                    <p className="mt-2 truncate text-slate-500">
                        {analysis.projectPath}
                    </p>
                    {shareLink && (
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-700/40 bg-emerald-900/20 px-3 py-2">
                            <span className="truncate text-xs text-emerald-300">{shareLink}</span>
                            <button
                                onClick={copyLink}
                                className="shrink-0 rounded-md bg-emerald-700 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-emerald-600"
                            >
                                Copy
                            </button>
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 gap-2">
                    <button
                        onClick={handleShare}
                        disabled={sharing}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-emerald-700 hover:text-emerald-400 disabled:opacity-50"
                    >
                        {sharing ? "..." : "Share"}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-emerald-700 hover:text-emerald-400 disabled:opacity-50"
                    >
                        {exporting ? "..." : "Export"}
                    </button>
                    <button
                        onClick={closeProject}
                        disabled={closing}
                        className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-red-800 hover:text-red-400 disabled:opacity-50"
                    >
                        {closing ? "..." : t("current_project.close")}
                    </button>
                </div>
            </div>
        </Card>
    );
}