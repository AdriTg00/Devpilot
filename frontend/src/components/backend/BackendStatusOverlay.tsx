import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ROOT_BASE } from "../../services/api";

const POLL_INTERVAL = 15000;
const INITIAL_DELAY = 6000;

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${ROOT_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function tryStartBackend(): Promise<boolean> {
  try {
    const res = await fetch("/__backend/start", {
      method: "POST",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return false;
    return (await res.json()).success === true;
  } catch {
    return false;
  }
}

export default function BackendStatusOverlay() {
  const [alive, setAlive] = useState<boolean | null>(null);
  const [visible, setVisible] = useState(false);
  const [starting, setStarting] = useState(false);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem("devpilot_backend_dismissed") === "1"
  );

  const dismiss = useCallback(() => {
    setDismissed(true);
    setVisible(false);
    sessionStorage.setItem("devpilot_backend_dismissed", "1");
  }, []);

  const check = useCallback(async () => {
    const ok = await checkHealth();
    setAlive(ok);
    if (ok) {
      setVisible(false);
      setStarting(false);
    } else if (!dismissed && alive !== null) {
      // Solo mostrar si ya sabiamos que estaba vivo y cayo
      setVisible(true);
    }
  }, [dismissed, alive]);

  useEffect(() => {
    const initialTimer = setTimeout(() => {
      check();
      const interval = setInterval(check, POLL_INTERVAL);
      return () => clearInterval(interval);
    }, INITIAL_DELAY);
    return () => clearTimeout(initialTimer);
  }, [check]);

  async function handleStart() {
    setStarting(true);
    const ok = await tryStartBackend();
    if (ok) {
      setTimeout(() => check(), 2000);
    } else {
      setStarting(false);
      dismiss();
    }
  }

  if (!visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-20 right-6 z-40"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-3 rounded-xl border border-amber-800/50 bg-amber-950/80 px-4 py-2.5 shadow-lg backdrop-blur">
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]" />
          <span className="text-xs text-amber-300">Backend not running</span>
          <button
            onClick={handleStart}
            disabled={starting}
            className="rounded-md bg-amber-700 px-2.5 py-1 text-[11px] font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
          >
            {starting ? "Starting..." : "Start"}
          </button>
          <button
            onClick={dismiss}
            className="ml-1 rounded p-0.5 text-amber-600 transition hover:text-amber-400"
            aria-label="Dismiss"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
