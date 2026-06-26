import Button from "../ui/Button";
import Card from "../ui/Card";

import { useProject } from "../../contexts/ProjectContext";

export default function ProjectSelector() {

  const {
    currentPath,
    setCurrentPath,
    analyze,
    loading,
  } = useProject();

  return (
    <Card>

      <h2 className="mb-6 text-xl font-semibold">
        Analyze Project
      </h2>

      <div className="flex gap-4">

        <input
          type="text"
          value={currentPath}
          onChange={(e) => setCurrentPath(e.target.value)}
          placeholder="Select a project..."
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none"
        />

        <Button>
          Browse
        </Button>

        <Button
          onClick={analyze}
          disabled={loading}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </Button>

      </div>

    </Card>
  );
}