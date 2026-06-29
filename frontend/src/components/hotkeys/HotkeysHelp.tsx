import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Shortcut {
  keys: string;
  desc: string;
  scope: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: "?", desc: "Show this help", scope: "Global" },
  { keys: "Esc", desc: "Close modal / cancel", scope: "Global" },
  { keys: "Ctrl+K", desc: "File search", scope: "Explorer" },
  { keys: "Ctrl+Shift+F", desc: "Search in project", scope: "Explorer" },
  { keys: "Ctrl+F", desc: "Search in file", scope: "File Viewer" },
  { keys: "Ctrl+E", desc: "Toggle edit mode", scope: "File Viewer" },
  { keys: "Ctrl+S", desc: "Save file", scope: "File Viewer" },
  { keys: "Enter", desc: "Send message", scope: "Chat" },
];

function ShortcutRow({ keys, desc, scope }: Shortcut) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition hover:bg-slate-800/50">
      <div className="flex items-center gap-3 min-w-0">
        <span className="shrink-0 rounded-md bg-slate-800 px-2 py-1 font-mono text-[11px] font-medium text-emerald-400">
          {keys}
        </span>
        <span className="text-sm text-slate-300">{desc}</span>
      </div>
      <span className="shrink-0 text-[10px] uppercase tracking-wider text-slate-500">{scope}</span>
    </div>
  );
}

export default function HotkeysHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(false)}
        >
          <motion.div
            className="mx-4 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
              <h2 className="text-lg font-bold text-white">Keyboard Shortcuts</h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-800 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="divide-y divide-slate-800 px-3 py-2">
              {SHORTCUTS.map((s, i) => (
                <ShortcutRow key={i} {...s} />
              ))}
            </div>
            <div className="border-t border-slate-800 px-5 py-3 text-center text-[11px] text-slate-600">
              Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-emerald-400">?</kbd> to open this help anytime
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
