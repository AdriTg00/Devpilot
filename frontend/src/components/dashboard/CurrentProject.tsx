import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import Card from "../ui/Card";

export default function CurrentProject() {
    const { t } = useLanguage();
    const { analysis, closeProject, closing } = useProject();

    if (!analysis)
        return null;

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
                <button
                    onClick={closeProject}
                    disabled={closing}
                    className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 transition hover:border-red-800 hover:text-red-400 disabled:opacity-50"
                >
                    {closing ? "..." : t("current_project.close")}
                </button>
            </div>
        </Card>
    );
}