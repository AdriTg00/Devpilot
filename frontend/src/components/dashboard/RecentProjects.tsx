import Card from "../ui/Card";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function RecentProjects() {
  const { t } = useLanguage();
  const { recentProjects, setCurrentPath } = useProject();

  return (
    <Card>
      <h2 className="mb-4 text-xl font-semibold">
        {t("recent.title")}
      </h2>

      {recentProjects.length === 0 ? (
        <p className="text-slate-400">
          {t("recent.empty")}
        </p>
      ) : (
        <ul className="space-y-1">
          {recentProjects.map((path) => (
            <li key={path}>
              <button
                onClick={() => setCurrentPath(path)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              >
                {path}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}