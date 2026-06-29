import { useState } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { exportProject } from "../../services/projectService";
import Card from "../ui/Card";

export default function CurrentProject() {
    const { t } = useLanguage();
    const { analysis, closeProject, closing, currentPath } = useProject();
    const [exporting, setExporting] = useState(false);

    if (!analysis)
        return null;

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
                </div>
                <div className="flex shrink-0 gap-2">
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