import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { streamAiFix, fetchCodeReviewCategories, readFileContent, getCodeReviewJson } from "../../services/projectService";
import type { CodeReviewCategory, CodeReviewJsonData } from "../../services/projectService";
import Card from "../ui/Card";
import Button from "../ui/Button";
import DiffViewer from "../ui/DiffViewer";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const COLOR_PALETTE: Record<string, { dot: string; color: string }> = {
  red:    { dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]", color: "text-red-400 border-red-800/40" },
  amber:  { dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", color: "text-amber-400 border-amber-800/40" },
  orange: { dot: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]", color: "text-orange-400 border-orange-800/40" },
  yellow: { dot: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]", color: "text-yellow-400 border-yellow-800/40" },
  blue:   { dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]", color: "text-blue-400 border-blue-800/40" },
};

const FALLBACK_META: Record<string, { dot: string; color: string }> = {
  "Potential Bugs": { dot: "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]", color: "text-red-400 border-red-800/40" },
  "Code Smells": { dot: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]", color: "text-amber-400 border-amber-800/40" },
  "Security": { dot: "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]", color: "text-orange-400 border-orange-800/40" },
  "Performance": { dot: "bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]", color: "text-yellow-400 border-yellow-800/40" },
  "Maintainability": { dot: "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]", color: "text-blue-400 border-blue-800/40" },
};

const DEFAULT_META = { dot: "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]", color: "text-slate-400 border-emerald-900/30" };

export default function CodeReview() {
  const { currentPath, analysis } = useProject();
  const { language, t } = useLanguage();
  const { toast } = useToast();

  const [catDefs, setCatDefs] = useState<CodeReviewCategory[] | null>(null);

  const categoryMeta = useMemo(() => {
    if (!catDefs) return FALLBACK_META;
    const map: Record<string, { dot: string; color: string }> = {};
    for (const c of catDefs) {
      map[c.name] = COLOR_PALETTE[c.color] ?? DEFAULT_META;
    }
    return map;
  }, [catDefs]);

  useEffect(() => {
    let cancelled = false;
    fetchCodeReviewCategories()
      .then((cats) => { if (!cancelled) setCatDefs(cats); })
      .catch(() => { if (!cancelled) setCatDefs(null); });
    return () => { cancelled = true; };
  }, []);

  const [loading, setLoading] = useState(false);
  const [reviewData, setReviewData] = useState<CodeReviewJsonData | null>(null);
  const [reviewError, setReviewError] = useState(false);
  const [reviewHistory, setReviewHistory] = useState<Array<{ id: number; timestamp: Date; data: CodeReviewJsonData }>>([]);
  const [activeReviewId, setActiveReviewId] = useState<number | null>(null);
  const nextReviewId = useRef(1);
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [fixingStream, setFixingStream] = useState("");
  const [fixResultKey, setFixResultKey] = useState<string | null>(null);
  const [fixResultContent, setFixResultContent] = useState("");
  const [fixOriginalContent, setFixOriginalContent] = useState("");

  const activeReviewData = useMemo(() => {
    if (reviewData) return reviewData;
    if (!activeReviewId) return null;
    return reviewHistory.find((h) => h.id === activeReviewId)?.data ?? null;
  }, [reviewData, activeReviewId, reviewHistory]);

  if (!analysis || !currentPath) return null;

  async function handleReview() {
    setLoading(true);
    setReviewData(null);
    setReviewError(false);
    try {
      const data = await getCodeReviewJson(currentPath, language);
      const id = nextReviewId.current++;
      const entry = { id, timestamp: new Date(), data };
      setReviewHistory((prev) => [entry, ...prev]);
      setActiveReviewId(id);
      setReviewData(data);
    } catch {
      setReviewError(true);
      toast("Error running code review", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleAIFix(fileRel: string, issue: string, fix: string, key: string) {
    const fullPath = fileRel.includes(":") ? fileRel : `${currentPath.replace(/\\/g, "/").replace(/\/+$/, "")}/${fileRel.replace(/\\/g, "/")}`;
    setFixResultKey(null);
    setFixResultContent("");
    setFixOriginalContent("");
    setFixingKey(key);
    setFixingStream("");

    let original = "";
    try {
      original = await readFileContent(fullPath);
    } catch { /* non-fatal — diff will show everything as added */ }
    setFixOriginalContent(original);

    streamAiFix(
      fullPath, issue, fix,
      (text) => setFixingStream(text),
      (fixedContent) => {
        setFixResultKey(key);
        setFixResultContent(fixedContent);
        setFixingKey(null);
        setFixingStream("");
      },
      () => {
        toast(t("code_review.failed_fix", { file: fileRel }), "error");
        setFixingKey(null);
        setFixingStream("");
      },
    );
  }

  function handleCopyFix(content: string) {
    navigator.clipboard.writeText(content).then(
      () => toast(t("code_review.copied"), "success"),
      () => toast(t("code_review.copy_failed"), "error"),
    );
  }

  function handleDismissFix() {
    setFixResultKey(null);
    setFixResultContent("");
    setFixOriginalContent("");
  }

  return (
    <div className="space-y-4">
      <Button onClick={handleReview} loading={loading} variant="secondary">
        {loading ? t("code_review.running") : t("code_review.run")}
      </Button>

      {/* Review history selector */}
      {reviewHistory.length > 1 && !loading && (
        <div className="flex flex-wrap gap-2">
          {reviewHistory.map((h) => {
            const isActive = h.id === activeReviewId;
            return (
              <button
                key={h.id}
                onClick={() => { setActiveReviewId(h.id); setReviewData(null); setReviewError(false); }}
                className={`rounded-[6px] border px-3 py-1.5 text-xs transition-all duration-200 ${
                  isActive
                    ? "border-emerald-700/50 bg-emerald-600/10 text-emerald-300 shadow-[0_0_8px_rgba(34,197,94,0.08)]"
                    : "border-emerald-900/20 text-slate-500 hover:border-emerald-700/40 hover:text-slate-200"
                }`}
              >
                {h.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {(loading || activeReviewData || reviewError) && (
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
<div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-emerald-600/15 shadow-[0_0_10px_rgba(34,197,94,0.08)]">
                   <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{t("code_review.title")}</h3>
                  <p className="text-xs text-slate-500">
                    {loading ? t("code_review.analyzing") : reviewError ? t("code_review.error") : t("code_review.categories_reviewed", { count: activeReviewData!.categories.length })}
                  </p>
                </div>
              </div>

              {loading && !activeReviewData && (
                <div className="flex items-center gap-2 py-8 text-center text-sm text-slate-500">
                  <div className="flex-1">
                    <div className="mx-auto mb-3 h-1.5 w-48 animate-pulse rounded-full bg-slate-700" />
                    <div className="mx-auto mb-2 h-1.5 w-36 animate-pulse rounded-full bg-slate-700" />
                    <div className="mx-auto h-1.5 w-40 animate-pulse rounded-full bg-slate-700" />
                  </div>
                </div>
              )}

              {reviewError && !activeReviewData && (
                <div className="py-8 text-center text-sm text-red-400">
                  {t("code_review.failed")}
                </div>
              )}

              {activeReviewData && (activeReviewData.categories.length === 0 || activeReviewData.categories.every((c) => c.findings.length === 0)) && (
                <div className="py-8 text-center text-sm text-slate-400">
                  {t("code_review.no_issues")}
                </div>
              )}

              {activeReviewData && activeReviewData.categories.some((c) => c.findings.length > 0) && (
                <div className="space-y-4">
                  {activeReviewData.categories.map((cat, i) => {
                    if (cat.findings.length === 0) return null;
                    const meta = categoryMeta[cat.name] || DEFAULT_META;

                    return (
                      <div
                        key={i}
                        className={`rounded-[6px] border ${meta.color} bg-slate-800/40 p-4`}
                      >
                        <div className="mb-3 flex items-center gap-2.5">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                          <h4 className="text-sm font-semibold text-white">{cat.name}</h4>
                          <span className="ml-auto text-[10px] text-slate-500">{cat.findings.length} {cat.findings.length === 1 ? t("code_review.issue_single") : t("code_review.issues")}</span>
                        </div>

                        {cat.findings.length > 0 && (
                          <div className="space-y-3">
                          {cat.findings.map((f, j) => {
                            const findingKey = `${i}-${j}`;
                            return (
                            <div key={findingKey} className="rounded-[6px] bg-slate-900/60 p-3">
                              <div className="mb-2 flex items-start gap-2">
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.color} border ${meta.color.split(" ")[1] || "border-slate-700"}`}>
                                  {f.tag}
                                </span>
                                <span className="text-xs font-medium text-slate-200">{f.desc}</span>
                              </div>
                              {f.file && (
                                <p className="mb-1 text-[11px] text-slate-500">
                                  <span className="text-slate-600">{t("code_review.file")}</span>{" "}
                                  <code className="rounded bg-slate-800 px-1 py-0.5 text-emerald-400">{f.file}</code>
                                  {f.line && <span className="ml-2 text-slate-600">{t("code_review.line", { line: f.line })}</span>}
                                </p>
                              )}
                              {f.issue && (
                                <p className="mb-1.5 text-[11px] leading-relaxed text-slate-400">
                                  <span className="font-medium text-slate-500">{t("code_review.issue_label")}</span> {f.issue}
                                </p>
                              )}
                              {f.fix && (
                                <p className="text-[11px] leading-relaxed text-emerald-400/80">
                                  <span className="font-medium text-emerald-500/60">{t("code_review.fix_label")}</span> {f.fix}
                                </p>
                              )}
                              {f.file && (
                                <div className="mt-2 flex justify-end">
                                  <button
                                    onClick={() => handleAIFix(f.file, f.issue, f.fix, findingKey)}
                                    disabled={fixingKey === findingKey}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/15 px-2 py-1 text-[10px] font-medium text-emerald-400 transition-all duration-200 hover:bg-emerald-600/25 hover:shadow-[0_0_8px_rgba(34,197,94,0.15)] disabled:opacity-50"
                                  >
                                    {fixingKey === findingKey ? (
                                      <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                    ) : (
                                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                    )}
                                    {t("code_review.ai_fix")}
                                  </button>
                                </div>
                              )}

                              {/* Fix streaming — right below this finding */}
                              {fixingKey === findingKey && (
                                <div className="mt-3 rounded-[6px] border border-emerald-700/30 bg-slate-900/80 p-3">
                                  <div className="mb-2 flex items-center gap-2.5">
                                    <svg className="h-3.5 w-3.5 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span className="text-xs text-slate-400">{t("code_review.generating_fix")}</span>
                                  </div>
                                  <pre className="max-h-32 overflow-auto rounded bg-slate-950 p-2 text-[10px] leading-relaxed text-slate-500">
                                    {fixingStream || t("code_review.waiting_ai")}
                                  </pre>
                                </div>
                              )}

                              {/* Fix result with DiffView + Copy + Dismiss */}
                              {fixResultKey === findingKey && fixResultContent && (
                                <div className="mt-3 rounded-[6px] border border-emerald-700/30 bg-slate-900/80 p-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                                      <span className="text-xs font-medium text-white">{t("code_review.suggested_fix")}</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleCopyFix(fixResultContent)}
                                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white transition-all duration-200 hover:bg-emerald-500 hover:shadow-[0_0_10px_rgba(34,197,94,0.25)]"
                                      >
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        {t("code_review.copy")}
                                      </button>
                                      <button
                                        onClick={handleDismissFix}
                                        className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-400 transition hover:border-red-800 hover:text-red-400"
                                      >
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  {fixOriginalContent ? (
                                    <DiffViewer original={fixOriginalContent} modified={fixResultContent} />
                                  ) : (
                                    <pre className="max-h-40 overflow-auto rounded bg-slate-950 p-2 text-[10px] leading-relaxed text-emerald-300 whitespace-pre-wrap">
                                      {fixResultContent}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                          })}
                        </div>
                      )}
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
