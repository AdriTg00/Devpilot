import Card from "../ui/Card";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";

export default function RecentProjects() {
  const { t } = useLanguage();
  const { recentProjects, setCurrentPath, clearRecentProjects } = useProject();

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">{t("recent.title")}</h2>
        {recentProjects.length > 0 && (
          <button
            onClick={clearRecentProjects}
            className="rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:text-red-400"
          >
            {t("recent.clear")}
          </button>
        )}
      </div>

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