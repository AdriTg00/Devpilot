import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import Card from "../ui/Card";

interface LangInfo {
  color: string;
  label: string;
}

const LANG_INFO: Record<string, LangInfo> = {
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

function getLangInfo(ext: string): LangInfo {
  return LANG_INFO[ext] || { color: "#6B7280", label: ext };
}

function LanguageBar({ byType, t: _t }: { byType: Record<string, { lines: number }>; t: (k: string, p?: Record<string, string | number>) => string }) {
  const entries = Object.entries(byType);
  const total = entries.reduce((s, [, v]) => s + v.lines, 0);
  if (total === 0) return null;

  return (
    <Card>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-emerald-400/60">
        {_t("stats.lang_distribution")}
      </p>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-800/60">
        {entries.map(([ext, stats]) => {
          const pct = (stats.lines / total) * 100;
          if (pct < 1) return null;
          return (
            <div
              key={ext}
              title={`${getLangInfo(ext).label}: ${stats.lines} lines (${pct.toFixed(1)}%)`}
              className="transition-all hover:opacity-80"
              style={{
                width: `${pct}%`,
                backgroundColor: getLangInfo(ext).color,
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {entries.map(([ext, stats]) => {
          const pct = total > 0 ? (stats.lines / total) * 100 : 0;
          return (
            <span key={ext} className="flex items-center gap-1.5 text-xs text-slate-400">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: getLangInfo(ext).color }}
              />
              {getLangInfo(ext).label}
              <span className="text-slate-500">{pct.toFixed(1)}%</span>
            </span>
          );
        })}
      </div>
    </Card>
  );
}

function LangCard({
  ext,
  files,
  lines,
  functions,
  classes,
  maxLines,
}: {
  ext: string;
  files: number;
  lines: number;
  functions: number;
  classes: number;
  maxLines: number;
}) {
  const { label, color } = getLangInfo(ext);
  const linePct = maxLines > 0 ? (lines / maxLines) * 100 : 0;

  return (
    <Card className="!p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded" style={{ backgroundColor: color }} />
        <span className="text-sm font-medium text-white">{label}</span>
        <span className="ml-auto text-[10px] text-slate-500">{ext}</span>
      </div>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-700">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${linePct}%`, backgroundColor: color }}
        />
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <span className="text-slate-500">Files</span>
        <span className="text-right text-slate-200">{files}</span>
        <span className="text-slate-500">Lines</span>
        <span className="text-right text-slate-200">{lines.toLocaleString()}</span>
        <span className="text-slate-500">Functions</span>
        <span className="text-right text-slate-200">{functions}</span>
        <span className="text-slate-500">Classes</span>
        <span className="text-right text-slate-200">{classes}</span>
      </div>
    </Card>
  );
}

export default function StatsGrid() {
  const { t } = useLanguage();
  const { analysis, loading } = useProject();
  const dash = analysis ? undefined : (loading ? "..." : "—");

  const byType = analysis?.by_type;
  const maxLines = byType
    ? Math.max(...Object.values(byType).map((s) => s.lines), 1)
    : 1;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:gap-6">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/60">{t("stats.total_files")}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">{analysis?.files ?? dash ?? 0}</h2>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/60">{t("stats.lines")}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
            {analysis ? analysis.lines.toLocaleString() : dash ?? 0}
          </h2>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/60">{t("stats.functions")}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">{analysis?.functions ?? dash ?? 0}</h2>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wider text-emerald-400/60">{t("stats.classes")}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">{analysis?.classes ?? dash ?? 0}</h2>
        </Card>
      </div>

      {byType && Object.keys(byType).length > 0 && (
        <>
          <LanguageBar byType={byType} t={t} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(byType)
              .sort(([, a], [, b]) => b.lines - a.lines)
              .map(([ext, stats]) => (
                <LangCard
                  key={ext}
                  ext={ext}
                  files={stats.files}
                  lines={stats.lines}
                  functions={stats.functions}
                  classes={stats.classes}
                  maxLines={maxLines}
                />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
