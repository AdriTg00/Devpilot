import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const POLL_INTERVAL = 5000;
const LAUNCHER_BASE = "";

interface StatusResponse {
  alive: boolean;
  starting: boolean;
}

async function getStatus(): Promise<StatusResponse> {
  const res = await fetch(`${LAUNCHER_BASE}/__backend/status`);
  if (!res.ok) return { alive: false, starting: false };
  return res.json();
}

async function startBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${LAUNCHER_BASE}/__backend/start`, { method: "POST" });
    if (!res.ok) return false;
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export default function BackendStatusOverlay() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(false);

  const check = useCallback(async () => {
    try {
      const s = await getStatus();
      setStatus(s);
      if (s.alive) setStarting(false);
    } catch {
      setStatus({ alive: false, starting: false });
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [check]);

  async function handleStart() {
    setStarting(true);
    setError(false);
    const ok = await startBackend();
    if (!ok) {
      // poll will pick up when it's actually running
      setError(true);
    }
  }

  const show = status && !status.alive && !starting;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed bottom-6 right-6 z-40"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <div className="w-80 overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
              <span className="flex h-3 w-3 shrink-0 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
              <span className="text-sm font-medium text-slate-200">Backend Offline</span>
            </div>
            <div className="px-4 py-3">
              <p className="mb-3 text-xs text-slate-400">
                The DevPilot backend (FastAPI) is not running. Start it to use AI features.
              </p>
              {error && (
                <p className="mb-2 text-xs text-amber-400">
                  Waiting for backend to start... this may take a moment.
                </p>
              )}
              <button
                onClick={handleStart}
                disabled={starting}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {starting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Starting...
                  </span>
                ) : (
                  "Start Backend"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
