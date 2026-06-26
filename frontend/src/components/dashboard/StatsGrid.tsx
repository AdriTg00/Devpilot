import StatCard from "./StatCard";
import Badge from "../ui/Badge";

import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";

const EXT_LABELS: Record<string, string> = {
  ".py": "Python",
  ".ts": "TypeScript",
  ".tsx": "TSX",
  ".html": "HTML",
  ".css": "CSS",
};

const EXT_VARIANTS: Record<string, "emerald" | "slate" | "amber"> = {
  ".py": "emerald",
  ".ts": "amber",
  ".tsx": "amber",
  ".html": "slate",
  ".css": "slate",
};

export default function StatsGrid() {
  const { t } = useLanguage();
  const { analysis } = useProject();

  return (
    <div className="space-y-6">

      <div className="grid grid-cols-4 gap-6">

        <StatCard
          title={t("stats.total_files")}
          value={analysis?.files ?? 0}
        />

        <StatCard
          title={t("stats.lines")}
          value={analysis?.lines ?? 0}
        />

        <StatCard
          title={t("stats.functions")}
          value={analysis?.functions ?? 0}
        />

        <StatCard
          title={t("stats.classes")}
          value={analysis?.classes ?? 0}
        />

      </div>

      {analysis?.by_type && (
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(analysis.by_type).map(([ext, stats]) => (
            <StatCard
              key={ext}
              title={
                <span className="flex items-center gap-2">
                  {EXT_LABELS[ext] || ext}
                  <Badge variant={EXT_VARIANTS[ext] || "slate"}>{ext}</Badge>
                </span>
              }
              value={t("stats.files_line")
                .replace("{files}", String(stats.files))
                .replace("{lines}", String(stats.lines))}
            />
          ))}
        </div>
      )}

    </div>
  );
}