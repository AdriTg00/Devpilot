import StatCard from "./StatCard";

import { useProject } from "../../contexts/ProjectContext";

export default function StatsGrid() {

  const { analysis } = useProject();

  return (
    <div className="grid grid-cols-4 gap-6">

      <StatCard
        title="Python Files"
        value={analysis?.python_files ?? 0}
      />

      <StatCard
        title="Lines"
        value={analysis?.lines ?? 0}
      />

      <StatCard
        title="Functions"
        value={analysis?.functions ?? 0}
      />

      <StatCard
        title="Classes"
        value={analysis?.classes ?? 0}
      />

    </div>
  );
}