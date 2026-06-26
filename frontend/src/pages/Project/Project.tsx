import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import ProjectSelector from "../../components/dashboard/ProjectSelector";
import CurrentProject from "../../components/dashboard/CurrentProject";
import StatsGrid from "../../components/dashboard/StatsGrid";
import ProjectActions from "../../components/dashboard/ProjectActions";
import Card from "../../components/ui/Card";

export default function Project() {
  const { t } = useLanguage();
  const { analysis } = useProject();

  return (
    <div className="space-y-6">
      <ProjectSelector />
      {analysis && (
        <>
          <CurrentProject />
          <StatsGrid />
          <ProjectActions />
        </>
      )}
      {!analysis && (
        <Card>
          <p className="text-slate-400">{t("project.select")}</p>
        </Card>
      )}
    </div>
  );
}
