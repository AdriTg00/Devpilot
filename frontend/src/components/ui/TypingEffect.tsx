import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

const SKELETON_LINES = [
  "const project = new Project();",
  "project.initialize();",
  "await project.loadModules();",
  "project.configure({",
  '  language: "auto",',
  "  optimize: true",
  "});",
  "project.analyze();",
];

export function CodeSkeleton() {
  return (
    <div className="animate-pulse space-y-3 rounded-lg border border-slate-700 bg-slate-900/50 p-4 font-mono text-xs">
      {SKELETON_LINES.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-6 text-right text-slate-600">{i + 1}</span>
          <div
            className="h-3 rounded bg-slate-700"
            style={{
              width: `${Math.max(30, line.length * 6 + (i % 3) * 20)}px`,
              opacity: 1 - i * 0.08,
            }}
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <span className="w-6 text-right text-slate-600">9</span>
        <span className="inline-block h-3 w-2 animate-pulse rounded-sm bg-emerald-500" />
      </div>
    </div>
  );
}

interface TypingEffectProps {
  text: string;
  loading: boolean;
  speed?: number;
}

export default function TypingEffect({ text, loading, speed = 25 }: TypingEffectProps) {
  const [displayed, setDisplayed] = useState(0);
  const prevLenRef = useRef(0);

  /* Split text into lines so paragraphs are preserved */
  const lines = text ? text.split("\n") : [];
  const flatWords: string[] = [];
  const lineBreaks: number[] = [];
  for (const line of lines) {
    if (flatWords.length > 0) {
      lineBreaks.push(flatWords.length);
    }
    const words = line.split(/\s+/).filter(Boolean);
    flatWords.push(...words);
  }
  const target = flatWords.length;

  useEffect(() => {
    if (displayed < target) {
      const interval = setInterval(() => {
        setDisplayed((prev) => {
          const next = prev + 1;
          return next >= target ? target : next;
        });
      }, speed);
      return () => clearInterval(interval);
    }
  }, [displayed, target, speed]);

  /* Only reset animation on truly new text, not stream increments */
  useEffect(() => {
    if (text.length < prevLenRef.current) {
      setDisplayed(0);
    }
    prevLenRef.current = text.length;
  }, [text]);

  useEffect(() => {
    if (!loading) {
      setDisplayed(target);
    }
  }, [loading, target]);

  if (loading && !text) {
    return (
      <div className="space-y-2">
        <CodeSkeleton />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Generating…
        </div>
      </div>
    );
  }

  /* Rebuild visible text respecting newline positions */
  const visibleWords = flatWords.slice(0, displayed);
  const breakSet = new Set(lineBreaks);
  let result = "";
  for (let i = 0; i < visibleWords.length; i++) {
    if (breakSet.has(i)) {
      result += "\n" + visibleWords[i];
    } else {
      result += (i === 0 ? "" : " ") + visibleWords[i];
    }
  }

  return (
    <div className="prose prose-invert max-w-none text-xs text-slate-200 [&_*]:text-xs [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_pre]:text-xs [&_code]:text-xs">
      <ReactMarkdown>{result}</ReactMarkdown>
      {loading && displayed < target && (
        <span className="inline-block h-4 w-2 animate-pulse rounded-sm bg-emerald-400 align-text-bottom" />
      )}
    </div>
  );
}
