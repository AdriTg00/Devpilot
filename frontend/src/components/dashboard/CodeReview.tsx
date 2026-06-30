import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProject } from "../../contexts/ProjectContext";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import { streamCodeReview, streamAiFix } from "../../services/projectService";
import Card from "../ui/Card";
import Button from "../ui/Button";
import TypingEffect from "../ui/TypingEffect";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const CATEGORY_META: Record<string, { dot: string; color: string }> = {
  "Potential Bugs": { dot: "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]", color: "text-red-400 border-red-800/40" },
  "Code Smells": { dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]", color: "text-amber-400 border-amber-800/40" },
  "Security": { dot: "bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]", color: "text-orange-400 border-orange-800/40" },
  "Performance": { dot: "bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]", color: "text-yellow-400 border-yellow-800/40" },
  "Maintainability": { dot: "bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]", color: "text-blue-400 border-blue-800/40" },
};

export default function CodeReview() {
  const { currentPath, analysis } = useProject();
  const { language } = useLanguage();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [fixingKey, setFixingKey] = useState<string | null>(null);
  const [fixingStream, setFixingStream] = useState("");
  const [fixResultKey, setFixResultKey] = useState<string | null>(null);
  const [fixResultContent, setFixResultContent] = useState("");

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

  async function handleAIFix(fileRel: string, issue: string, fix: string, key: string) {
    const fullPath = fileRel.includes(":") ? fileRel : `${currentPath}\\${fileRel.replace(/\//g, "\\")}`;
    setFixResultKey(null);
    setFixResultContent("");
    setFixingKey(key);
    setFixingStream("");

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
        toast(`Failed to fix: ${fileRel}`, "error");
        setFixingKey(null);
        setFixingStream("");
      },
    );
  }

  function handleCopyFix(content: string) {
    navigator.clipboard.writeText(content).then(
      () => toast("Code copied to clipboard", "success"),
      () => toast("Failed to copy", "error"),
    );
  }

  function handleDismissFix() {
    setFixResultKey(null);
    setFixResultContent("");
  }

  interface Finding {
    tag: string;
    desc: string;
    file: string;
    line: string;
    issue: string;
    fix: string;
  }

  const categories = result
    ? result.split(/(?=^## )/m).filter((s) => s.startsWith("## "))
    : [];

  function parseFindings(body: string): Finding[] {
    const items = body.split(/(?=^### \[)/m).filter((s) => s.trim());
    return items.map((item) => {
      const headerMatch = item.match(/^### \[(.+?)\]\s*(.*)/m);
      const tag = headerMatch?.[1] || "";
      const desc = headerMatch?.[2]?.trim() || "";
      const fileMatch = item.match(/-?\s*\*?\*?File\*?\*?:\s*`?(.+?)`?\s*$/im);
      const lineMatch = item.match(/-?\s*\*?\*?Line\*?\*?:\s*~?(\d+)?\s*$/im);
      const issueMatch = item.match(/-?\s*\*?\*?Issue\*?\*?:\s*(.+?)(?=-?\s*\*?\*?Fix\*?\*?:|$)/is);
      const fixMatch = item.match(/-?\s*\*?\*?Fix\*?\*?:\s*(.+)/is);
      return {
        tag,
        desc,
        file: fileMatch?.[1]?.trim() || "",
        line: lineMatch?.[1]?.trim() || "",
        issue: issueMatch?.[1]?.trim() || "",
        fix: fixMatch?.[1]?.trim() || "",
      };
    });
  }

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
<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20">
                   <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Code Review</h3>
                  <p className="text-xs text-slate-500">
                    {loading ? "Analyzing source files…" : `${categories.length} categories reviewed`}
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
                  {categories.map((catRaw, i) => {
                    const titleMatch = catRaw.match(/^## (.+)/m);
                    const title = titleMatch?.[1]?.trim() || "";
                    const body = catRaw.replace(/^## .+\n*/m, "").trim();
                    if (!body || /ninguno detectado|none detected/i.test(body)) return null;

                    const meta = CATEGORY_META[title] || { dot: "bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]", color: "text-slate-400 border-slate-700" };
                    const findings = parseFindings(body);

                    return (
                      <div
                        key={i}
                        className={`rounded-xl border ${meta.color} bg-slate-800/40 p-4`}
                      >
                        <div className="mb-3 flex items-center gap-2.5">
                          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${meta.dot}`} />
                          <h4 className="text-sm font-semibold text-white">{title}</h4>
                          <span className="ml-auto text-[10px] text-slate-500">{findings.length} {findings.length === 1 ? "issue" : "issues"}</span>
                        </div>

                        {loading && findings.length === 0 && (
                          <div className="space-y-2 py-2">
                            <div className="h-2 w-3/4 animate-pulse rounded-full bg-slate-700" />
                            <div className="h-2 w-1/2 animate-pulse rounded-full bg-slate-700" />
                          </div>
                        )}

                        <div className="space-y-3">
                          {findings.map((f, j) => {
                            const findingKey = `${i}-${j}`;
                            return (
                            <div key={findingKey} className="rounded-lg bg-slate-900/60 p-3">
                              <div className="mb-2 flex items-start gap-2">
                                <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${meta.color} border ${meta.color.split(" ")[1] || "border-slate-700"}`}>
                                  {f.tag}
                                </span>
                                <span className="text-xs font-medium text-slate-200">{f.desc}</span>
                              </div>
                              {f.file && (
                                <p className="mb-1 text-[11px] text-slate-500">
                                  <span className="text-slate-600">File:</span>{" "}
                                  <code className="rounded bg-slate-700 px-1 py-0.5 text-emerald-400">{f.file}</code>
                                  {f.line && <span className="ml-2 text-slate-600">Line: ~{f.line}</span>}
                                </p>
                              )}
                              {f.issue && (
                                <p className="mb-1.5 text-[11px] leading-relaxed text-slate-400">
                                  <span className="font-medium text-slate-500">Issue:</span> {f.issue}
                                </p>
                              )}
                              {f.fix && (
                                <p className="text-[11px] leading-relaxed text-emerald-400/80">
                                  <span className="font-medium text-emerald-500/60">Fix:</span> {f.fix}
                                </p>
                              )}
                              {f.file && (
                                <div className="mt-2 flex justify-end">
                                  <button
                                    onClick={() => handleAIFix(f.file, f.issue, f.fix, findingKey)}
                                    disabled={fixingKey === findingKey}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600/20 px-2 py-1 text-[10px] font-medium text-emerald-400 transition hover:bg-emerald-600/30 disabled:opacity-50"
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
                                    AI Fix
                                  </button>
                                </div>
                              )}

                              {/* Fix streaming — right below this finding */}
                              {fixingKey === findingKey && (
                                <div className="mt-3 rounded-lg border border-emerald-700/30 bg-slate-900/80 p-3">
                                  <div className="mb-2 flex items-center gap-2.5">
                                    <svg className="h-3.5 w-3.5 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span className="text-xs text-slate-400">Generating fix...</span>
                                  </div>
                                  <pre className="max-h-32 overflow-auto rounded bg-slate-950 p-2 text-[10px] leading-relaxed text-slate-500">
                                    {fixingStream || "Waiting for AI..."}
                                  </pre>
                                </div>
                              )}

                              {/* Fix result with Copy + Dismiss */}
                              {fixResultKey === findingKey && fixResultContent && (
                                <div className="mt-3 rounded-lg border border-emerald-700/30 bg-slate-900/80 p-3">
                                  <div className="mb-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
                                      <span className="text-xs font-medium text-white">Suggested fix</span>
                                    </div>
                                    <div className="flex gap-1.5">
                                      <button
                                        onClick={() => handleCopyFix(fixResultContent)}
                                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-medium text-white transition hover:bg-emerald-700"
                                      >
                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                        Copy
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
                                  <pre className="max-h-40 overflow-auto rounded bg-slate-950 p-2 text-[10px] leading-relaxed text-emerald-300 whitespace-pre-wrap">
                                    {fixResultContent}
                                  </pre>
                                </div>
                              )}
                            </div>
                          );
                          })}
                        </div>

                        {/* fallback: si no se parsearon findings, mostrar como texto */}
                        {findings.length === 0 && body && (
                          <div className="prose prose-invert max-w-none text-xs text-slate-300 [&_code]:rounded [&_code]:bg-slate-700 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[11px] [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3">
                            <TypingEffect text={body} loading={loading} speed={5} />
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
