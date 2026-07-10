import { useMemo } from "react";

interface RawLine {
  type: "added" | "removed" | "same";
  content: string;
}

type Entry =
  | { kind: "line"; type: "added" | "removed" | "same"; content: string }
  | { kind: "gap"; count: number };

const CONTEXT = 3;

function computeRaw(orig: string[], mod: string[]): RawLine[] {
  if (orig.length === 0) return mod.map((c) => ({ type: "added", content: c }));
  if (mod.length === 0) return orig.map((c) => ({ type: "removed", content: c }));
  if (orig.length * mod.length > 250_000) {
    return [
      ...orig.map((c) => ({ type: "removed" as const, content: c })),
      ...mod.map((c) => ({ type: "added" as const, content: c })),
    ];
  }

  const m = orig.length, n = mod.length;
  const dp: Uint32Array[] = Array.from({ length: m + 1 }, () => new Uint32Array(n + 1));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = orig[i - 1] === mod[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);

  const result: RawLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && orig[i - 1] === mod[j - 1]) {
      result.unshift({ type: "same", content: orig[i - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "added", content: mod[j - 1] }); j--;
    } else {
      result.unshift({ type: "removed", content: orig[i - 1] }); i--;
    }
  }
  return result;
}

function buildView(raw: RawLine[]): Entry[] {
  const isChanged = raw.map((l) => l.type !== "same");
  const visible = raw.map((_, idx) => {
    if (isChanged[idx]) return true;
    for (let d = 1; d <= CONTEXT; d++) {
      if (idx - d >= 0 && isChanged[idx - d]) return true;
      if (idx + d < raw.length && isChanged[idx + d]) return true;
    }
    return false;
  });

  const out: Entry[] = [];
  let i = 0;
  while (i < raw.length) {
    if (visible[i]) {
      out.push({ kind: "line", type: raw[i].type, content: raw[i].content }); i++;
    } else {
      let cnt = 0;
      while (i < raw.length && !visible[i]) { cnt++; i++; }
      out.push({ kind: "gap", count: cnt });
    }
  }
  return out;
}

interface Props {
  original: string;
  modified: string;
}

export default function DiffViewer({ original, modified }: Props) {
  const { entries, added, removed } = useMemo(() => {
    const raw = computeRaw(original.split("\n"), modified.split("\n"));
    return {
      entries: buildView(raw),
      added: raw.filter((l) => l.type === "added").length,
      removed: raw.filter((l) => l.type === "removed").length,
    };
  }, [original, modified]);

  const hasChanges = added > 0 || removed > 0;

  return (
    <div>
      <div className="mb-2 flex items-center gap-3 text-[11px]">
        {hasChanges ? (
          <>
            <span className="flex items-center gap-1 font-semibold text-emerald-400">
              <span className="text-sm leading-none">+</span>{added}
            </span>
            <span className="flex items-center gap-1 font-semibold text-red-400">
              <span className="text-sm leading-none">−</span>{removed}
            </span>
            <span className="text-slate-600">
              {added + removed} line{added + removed !== 1 ? "s" : ""} changed
            </span>
          </>
        ) : (
          <span className="text-slate-500 italic">No changes detected</span>
        )}
      </div>
      <div className="max-h-72 overflow-auto rounded-lg bg-slate-950 font-mono text-[11px] leading-[1.6]">
        {entries.map((entry, idx) =>
          entry.kind === "gap" ? (
            <div key={idx} className="select-none px-4 py-0.5 text-slate-600 italic">
              ╌╌╌ {entry.count} unchanged {entry.count === 1 ? "line" : "lines"} ╌╌╌
            </div>
          ) : (
            <div
              key={idx}
              className={
                entry.type === "added"
                  ? "flex gap-2 bg-emerald-950/60 px-3 py-px text-emerald-300"
                  : entry.type === "removed"
                  ? "flex gap-2 bg-red-950/60 px-3 py-px text-red-400 opacity-80"
                  : "flex gap-2 px-3 py-px text-slate-500"
              }
            >
              <span className="w-3 shrink-0 select-none font-bold">
                {entry.type === "added" ? "+" : entry.type === "removed" ? "−" : " "}
              </span>
              <span className="whitespace-pre break-all">{entry.content || " "}</span>
            </div>
          )
        )}
      </div>
    </div>
  );
}
