import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { streamCodeReview } from "../../services/projectService";
import Card from "../ui/Card";
import Button from "../ui/Button";
import TypingEffect from "../ui/TypingEffect";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  "Potential Bugs": { icon: "🐛", color: "text-red-400 border-red-800/40" },
  "Code Smells": { icon: "⚠️", color: "text-amber-400 border-amber-800/40" },
  "Security": { icon: "🔒", color: "text-orange-400 border-orange-800/40" },
  "Performance": { icon: "⚡", color: "text-yellow-400 border-yellow-800/40" },
  "Maintainability": { icon: "📦", color: "text-blue-400 border-blue-800/40" },
};

export default function CodeReview() {
  const { currentPath, analysis } = useProject();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");

  if (!analysis || !currentPath) return null;

  function handleReview() {
    setLoading(true);
    setResult("");
    streamCodeReview(
      currentPath,
      language,
      (text) => setResult(text),
      () => setLoading(false),
      () => {
        setResult("Error running code review.");
        setLoading(false);
      },
    );
  }

  const sections = result
    ? result.split(/(?=^### )/m).filter(Boolean)
    : [];

  return (
    <div className="space-y-4">
      <Button onClick={handleReview} loading={loading} variant="secondary">
        {loading ? "Running Code Review…" : "AI Code Review"}
      </Button>

      <AnimatePresence mode="wait">
        {(loading || result) && (
          <motion.div
            key="review"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 text-sm">
                  🔍
                </div>
                <div>
                  <h3 className="font-semibold text-white">Code Review</h3>
                  <p className="text-xs text-slate-500">
                    {loading ? "Analyzing source files…" : `${sections.length} categories reviewed`}
                  </p>
                </div>
              </div>

              {loading && !result && (
                <div className="flex items-center gap-2 py-8 text-center text-sm text-slate-500">
                  <div className="flex-1">
                    <div className="mx-auto mb-3 h-1.5 w-48 animate-pulse rounded-full bg-slate-700" />
                    <div className="mx-auto mb-2 h-1.5 w-36 animate-pulse rounded-full bg-slate-700" />
                    <div className="mx-auto h-1.5 w-40 animate-pulse rounded-full bg-slate-700" />
                  </div>
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  {sections.map((section, i) => {
                    const headerMatch = section.match(/^### (.+)/m);
                    const title = headerMatch?.[1] || "";
                    const body = section.replace(/^### .+\n*/m, "").trim();
                    if (!body || body === "Ninguno detectado.") return null;

                    const meta = CATEGORY_META[title] || { icon: "📋", color: "text-slate-400 border-slate-700" };

                    return (
                      <div
                        key={i}
                        className={`rounded-xl border ${meta.color} bg-slate-800/40 p-4`}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <span className="text-lg">{meta.icon}</span>
                          <h4 className="text-sm font-semibold text-white">{title}</h4>
                        </div>
                        <div className="prose prose-invert max-w-none text-xs text-slate-300 [&_code]:rounded [&_code]:bg-slate-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px] [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3">
                          <TypingEffect text={body} loading={false} speed={5} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
