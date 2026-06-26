import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import Card from "../ui/Card";

export default function CurrentProject() {
    const { t } = useLanguage();
    const { analysis } = useProject();

    if (!analysis)
        return null;

    return (

        <Card>

            <p className="text-sm text-slate-400">
                {t("current_project.title")}
            </p>

            <h2 className="mt-2 text-2xl font-bold">
                {analysis.projectName}
            </h2>

            <p className="mt-2 break-all text-slate-500">
                {analysis.projectPath}
            </p>

        </Card>

    );

}