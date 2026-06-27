import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import {
  streamSummary,
  streamExplainProject,
} from "../../services/projectService";
import Card from "../ui/Card";
import Button from "../ui/Button";
import TypingEffect from "../ui/TypingEffect";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

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
      <div className="flex flex-wrap gap-4">
        <Button onClick={handleSummary} loading={summaryLoading}>
          AI Summary
        </Button>

        <Button onClick={handleExplain} loading={explainLoading} variant="secondary">
          Explain Project
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {(summaryLoading || summary) && (
          <motion.div
            key="summary"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <h3 className="mb-3 text-lg font-semibold">Project Summary</h3>
              <div className="max-h-80 overflow-y-auto">
                <TypingEffect text={summary} loading={summaryLoading} />
              </div>
            </Card>
          </motion.div>
        )}

        {(explainLoading || explanation) && (
          <motion.div
            key="explain"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <h3 className="mb-3 text-lg font-semibold">Project Analysis</h3>
              <div className="max-h-80 overflow-y-auto">
                <TypingEffect text={explanation} loading={explainLoading} />
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
