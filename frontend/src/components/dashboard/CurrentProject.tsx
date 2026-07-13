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
            toast(t("current_project.resume_error"), "error");
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
                        <p className="text-sm text-slate-400">{t("current_project.previous")}</p>
                        <p className="mt-1 truncate text-sm font-medium text-slate-300">
                            {previousPath.replace(/\\/g, "/").split("/").filter(Boolean).pop()}
                        </p>
                        <p className="mt-1 truncate text-xs text-slate-500">{previousPath}</p>
                    </div>
                    <button
                        onClick={handleResume}
                        disabled={resuming || loading}
                        className="shrink-0 rounded-[6px] border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 backdrop-blur-sm shadow-[0_0_12px_rgba(34,197,94,0.08)] transition-all duration-200 hover:bg-emerald-500/20 hover:border-emerald-400/60 hover:text-emerald-200 hover:shadow-[0_0_20px_rgba(34,197,94,0.18)] disabled:opacity-50"
                    >
                        {resuming ? t("current_project.opening") : t("current_project.resume")}
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
            toast(t("current_project.share_error"), "error");
        } finally {
            setSharing(false);
        }
    }

    function copyLink() {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            toast(t("current_project.link_copied"), "success");
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
                        <div className="mt-2 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-900/10 px-3 py-2">
                            <span className="truncate text-xs text-emerald-300">{shareLink}</span>
                                <button
                                    onClick={copyLink}
                                    className="shrink-0 rounded-[6px] bg-emerald-700/30 px-2 py-1 text-[10px] font-medium text-emerald-300 backdrop-blur-sm transition-all duration-200 hover:bg-emerald-600/40"
                                >
                                    {t("current_project.copy")}
                                </button>
                        </div>
                    )}
                </div>
                <div className="flex shrink-0 gap-2">
                    <button
                        onClick={handleShare}
                        disabled={sharing}
                        className="rounded-[6px] border border-emerald-900/30 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-sm transition-all duration-200 hover:border-emerald-700/50 hover:text-emerald-300 hover:bg-slate-700/40 disabled:opacity-50"
                    >
                        {sharing ? "..." : t("current_project.share")}
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="rounded-[6px] border border-emerald-900/30 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-sm transition-all duration-200 hover:border-emerald-700/50 hover:text-emerald-300 hover:bg-slate-700/40 disabled:opacity-50"
                    >
                        {exporting ? "..." : t("current_project.export")}
                    </button>
                    <button
                        onClick={closeProject}
                        disabled={closing}
                        className="rounded-[6px] border border-emerald-900/30 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-400 backdrop-blur-sm transition-all duration-200 hover:border-red-800/50 hover:text-red-400 hover:bg-red-900/20 disabled:opacity-50"
                    >
                        {closing ? "..." : t("current_project.close")}
                    </button>
                </div>
            </div>
        </Card>
    );
}