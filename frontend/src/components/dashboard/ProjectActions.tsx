import { useState } from "react";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  streamSummary,
  streamExplainProject,
} from "../../services/projectService";
import Card from "../ui/Card";
import TypingEffect from "../ui/TypingEffect";

export default function ProjectActions() {
  const { currentPath, analysis } = useProject();
  const { language } = useLanguage();

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [explainLoading, setExplainLoading] = useState(false);
  const [summary, setSummary] = useState("");
  const [explanation, setExplanation] = useState("");

  if (!analysis || !currentPath) return null;

  function handleSummary() {
    setSummaryLoading(true);
    setSummary("");
    streamSummary(
      currentPath,
      language,
      (text) => setSummary(text),
      () => setSummaryLoading(false),
      () => {
        setSummary("Error generating summary.");
        setSummaryLoading(false);
      },
    );
  }

  function handleExplain() {
    setExplainLoading(true);
    setExplanation("");
    streamExplainProject(
      currentPath,
      language,
      (text) => setExplanation(text),
      () => setExplainLoading(false),
      () => {
        setExplanation("Error explaining project.");
        setExplainLoading(false);
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <button
          onClick={handleSummary}
          disabled={summaryLoading}
          className="rounded-lg bg-emerald-600 px-5 py-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {summaryLoading ? "Summarizing..." : "AI Summary"}
        </button>

        <button
          onClick={handleExplain}
          disabled={explainLoading}
          className="rounded-lg bg-slate-700 px-5 py-2.5 font-medium text-white transition hover:bg-slate-600 disabled:opacity-50"
        >
          {explainLoading ? "Explaining..." : "Explain Project"}
        </button>
      </div>

      {(summaryLoading || summary) && (
        <Card>
          <h3 className="mb-3 text-lg font-semibold">Project Summary</h3>
          <TypingEffect text={summary} loading={summaryLoading} />
        </Card>
      )}

      {(explainLoading || explanation) && (
        <Card>
          <h3 className="mb-3 text-lg font-semibold">Project Analysis</h3>
          <TypingEffect text={explanation} loading={explainLoading} />
        </Card>
      )}
    </div>
  );
}
