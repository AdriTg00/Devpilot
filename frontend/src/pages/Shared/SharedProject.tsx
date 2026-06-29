import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { getSharedProject, type SharedProjectData } from "../../services/projectService";
import Card from "../../components/ui/Card";

const LANG_INFO: Record<string, { color: string; label: string }> = {
  ".py": { color: "#3572A5", label: "Python" },
  ".ts": { color: "#3178C6", label: "TypeScript" },
  ".tsx": { color: "#3178C6", label: "TSX" },
  ".js": { color: "#F7DF1E", label: "JavaScript" },
  ".jsx": { color: "#F7DF1E", label: "JSX" },
  ".html": { color: "#E34F26", label: "HTML" },
  ".css": { color: "#563D7C", label: "CSS" },
  ".json": { color: "#5B5B5B", label: "JSON" },
  ".md": { color: "#083FA1", label: "Markdown" },
  ".rs": { color: "#DEA584", label: "Rust" },
  ".go": { color: "#00ADD8", label: "Go" },
  ".java": { color: "#B07219", label: "Java" },
  ".c": { color: "#555555", label: "C" },
  ".cpp": { color: "#F34B7D", label: "C++" },
  ".h": { color: "#555555", label: "Header" },
};

function getLangInfo(ext: string) {
  return LANG_INFO[ext] || { color: "#6B7280", label: ext };
}

function LanguageBar({ byType }: { byType: Record<string, { lines: number }> }) {
  const entries = Object.entries(byType);
  const total = entries.reduce((s, [, v]) => s + v.lines, 0);
  if (total === 0) return null;

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-400">
        Language Distribution
      </p>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-700">
        {entries.map(([ext, stats]) => {
          const pct = (stats.lines / total) * 100;
          if (pct < 1) return null;
          return (
            <div
              key={ext}
              title={`${getLangInfo(ext).label}: ${stats.lines} lines (${pct.toFixed(1)}%)`}
              className="transition-all hover:opacity-80"
              style={{ width: `${pct}%`, backgroundColor: getLangInfo(ext).color }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([ext, stats]) => {
          const pct = total > 0 ? (stats.lines / total) * 100 : 0;
          return (
            <span key={ext} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: getLangInfo(ext).color }} />
              {getLangInfo(ext).label}
              <span className="text-slate-500">{pct.toFixed(1)}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function FileTree({ files }: { files: string[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-slate-300 transition hover:bg-slate-800/50"
      >
        <svg className={`h-4 w-4 text-slate-500 transition ${open ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium">File Tree</span>
        <span className="ml-auto text-xs text-slate-500">{files.length} files</span>
      </button>
      {open && (
        <div className="max-h-80 overflow-auto border-t border-slate-800 p-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded px-3 py-1 text-xs text-slate-400 hover:bg-slate-800">
              <svg className="h-3.5 w-3.5 shrink-0 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SharedProject() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedProjectData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("No token provided");
      setLoading(false);
      return;
    }
    getSharedProject(token)
      .then(setData)
      .catch((err) => {
        if (err?.response?.status === 404) {
          setError("Share not found or expired");
        } else {
          setError("Error loading shared project");
        }
      })
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="h-5 w-5 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading shared project...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-4xl">🔗</div>
          <h2 className="mb-2 text-xl font-bold text-white">
            {error || "Project not found"}
          </h2>
          <p className="mb-6 text-sm text-slate-400">
            This share link may have expired or is invalid.
          </p>
          <Link
            to="/project"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Go to DevPilot
          </Link>
        </div>
      </div>
    );
  }

  const { project_name, analysis, file_tree, file_count, expires_at } = data;
  const byType = analysis?.by_type;
  const maxLines = byType
    ? Math.max(...Object.values(byType).map((s) => s.lines), 1)
    : 1;

  return (
    <motion.div
      className="mx-auto max-w-5xl space-y-8 py-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{project_name}</h1>
          <p className="mt-1 text-sm text-slate-400">
            Shared project analysis &middot; Expires {new Date(expires_at).toLocaleDateString()}
          </p>
        </div>
        <Link
          to="/project"
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:border-emerald-700 hover:text-emerald-400"
        >
          Open in DevPilot
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card>
          <p className="text-xs text-slate-400">Files</p>
          <h2 className="mt-2 text-3xl font-bold text-white">{(file_count || analysis?.files) ?? 0}</h2>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Lines</p>
          <h2 className="mt-2 text-3xl font-bold text-white">
            {analysis?.lines?.toLocaleString() ?? 0}
          </h2>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Functions</p>
          <h2 className="mt-2 text-3xl font-bold text-white">{analysis?.functions ?? 0}</h2>
        </Card>
        <Card>
          <p className="text-xs text-slate-400">Classes</p>
          <h2 className="mt-2 text-3xl font-bold text-white">{analysis?.classes ?? 0}</h2>
        </Card>
      </div>

      {byType && Object.keys(byType).length > 0 && (
        <>
          <Card>
            <LanguageBar byType={byType} />
          </Card>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byType)
              .sort(([, a], [, b]) => b.lines - a.lines)
              .map(([ext, stats]) => {
                const { label, color } = getLangInfo(ext);
                const linePct = maxLines > 0 ? (stats.lines / maxLines) * 100 : 0;
                return (
                  <Card key={ext} className="!p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: color }} />
                      <span className="text-sm font-medium text-white">{label}</span>
                      <span className="ml-auto text-[10px] text-slate-500">{ext}</span>
                    </div>
                    <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
                      <div className="h-full rounded-full transition-all" style={{ width: `${linePct}%`, backgroundColor: color }} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                      <span className="text-slate-500">Files</span>
                      <span className="text-right text-slate-200">{stats.files}</span>
                      <span className="text-slate-500">Lines</span>
                      <span className="text-right text-slate-200">{stats.lines?.toLocaleString()}</span>
                      <span className="text-slate-500">Functions</span>
                      <span className="text-right text-slate-200">{stats.functions}</span>
                      <span className="text-slate-500">Classes</span>
                      <span className="text-right text-slate-200">{stats.classes}</span>
                    </div>
                  </Card>
                );
              })}
          </div>
        </>
      )}

      <FileTree files={file_tree} />

      <p className="text-center text-xs text-slate-600">
        Shared via DevPilot &middot; This link will expire on {new Date(expires_at).toLocaleDateString()}
      </p>
    </motion.div>
  );
}
