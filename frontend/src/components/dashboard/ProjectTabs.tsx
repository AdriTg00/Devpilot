import { useProject } from "../../contexts/ProjectContext";

export default function ProjectTabs() {
  const { projectTabs, activeTabId, switchTab, closeTab, uploading } = useProject();

  if (projectTabs.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-emerald-900/20 pb-2">
      {projectTabs.map((tab) => {
        const isActive = tab.id === activeTabId;
        return (
          <div
            key={tab.id}
            className={`group flex items-center gap-2 rounded-t-lg px-3 py-2 text-sm transition-all cursor-pointer select-none ${
              isActive
                ? "border border-b-0 border-emerald-900/30 bg-slate-800/60 text-emerald-300 shadow-[0_-2px_8px_rgba(34,197,94,0.06)]"
                : "text-slate-500 hover:bg-slate-800/30 hover:text-slate-200"
            }`}
            onClick={() => switchTab(tab.id)}
          >
            <span className="max-w-32 truncate">{tab.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
              className="ml-1 rounded p-0.5 text-slate-600 opacity-0 transition hover:bg-red-600/20 hover:text-red-400 group-hover:opacity-100"
              title="Close"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        );
      })}
      {uploading && (
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-500">
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs">Opening...</span>
        </div>
      )}
    </div>
  );
}
