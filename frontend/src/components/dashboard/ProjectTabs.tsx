import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { X, Plus } from "lucide-react";

export default function ProjectTabs() {
  const {
    openProjects,
    activeProjectPath,
    switchProject,
    closeProject,
  } = useProject();
  const { t } = useLanguage();

  const entries = Object.entries(openProjects);

  if (entries.length === 0) return null;

  return (
    <div className="flex items-center gap-0.5 overflow-x-auto border-b border-slate-800 px-2">
      {entries.map(([path, project]) => (
        <div
          key={path}
          onClick={() => switchProject(path)}
          className={`group flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition ${
            path === activeProjectPath
              ? "border-emerald-400 text-emerald-300"
              : "border-transparent text-slate-500 hover:border-slate-600 hover:text-slate-300"
          }`}
        >
          <span className="max-w-[160px] truncate">
            {project?.analysis?.projectName || project?.projectName || path.split(/[\\/]/).pop() || "Project"}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeProject(path);
            }}
            className="rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-slate-700/50"
            title={t("current_project.close")}
          >
            <X size={14} />
          </button>
        </div>
      ))}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent("devpilot:open-project"));
        }}
        className="flex items-center gap-1 border-b-2 border-transparent px-3 py-2 text-sm text-slate-500 transition hover:text-slate-300"
        title="Open project"
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
