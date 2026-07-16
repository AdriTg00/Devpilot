import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../contexts/LanguageContext";
import { getHealthDetailed, type HealthResponse } from "../../services/projectService";

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${
        ok ? "bg-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
      }`}
    />
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[6px] border border-emerald-900/20 bg-slate-900/40 p-4 backdrop-blur-sm shadow-sm">
      <p className="mb-1 text-[11px] uppercase tracking-wider text-emerald-400/60">{label}</p>
      <p className="truncate font-mono text-sm text-slate-200">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[6px] border border-emerald-900/20 bg-slate-900/40 p-5 backdrop-blur-sm cyber-glow">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function Health() {
  const { t } = useLanguage();
  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const d = await getHealthDetailed();
      setData(d);
      setError(null);
    } catch {
      setError(t("health.unreachable"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <svg className="h-5 w-5 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {t("health.loading")}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-[6px] bg-red-900/30">
          <span className="text-3xl">⚠</span>
        </div>
        <h2 className="mb-2 text-xl font-bold text-white">{t("health.offline")}</h2>
        <p className="text-sm text-slate-400">{error || t("health.offline_desc")}</p>
      </div>
    );
  }

  const { settings, services, storage, uptime_seconds, version } = data;

  const quota = data.quota;

  return (
    <motion.div
      className="mx-auto max-w-4xl space-y-6 py-4"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("health.title")}</h1>
          <p className="mt-1 text-sm text-slate-400">
            DevPilot v{version} &middot; {t("health.uptime")} {formatUptime(uptime_seconds)}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchHealth(); }}
          className="rounded-[6px] border border-emerald-900/30 px-4 py-2 text-sm text-slate-400 backdrop-blur-sm transition-all duration-200 hover:border-emerald-700/50 hover:text-emerald-300 hover:shadow-[0_0_8px_rgba(34,197,94,0.06)]"
        >
          {t("health.refresh")}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("health.provider")} value={settings.provider} />
        <StatCard label={t("health.model")} value={settings.model} />
        <StatCard label={t("health.temperature")} value={String(settings.temperature)} />
        <StatCard label={t("health.max_tokens")} value={String(settings.max_tokens)} />
      </div>

      {quota && !quota.has_quota && (
        <div className="rounded-[6px] border border-amber-800/50 bg-amber-950/40 p-4 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-amber-400">⚠</span>
            <div>
              <p className="text-sm font-medium text-amber-300">{t("health.quota_title")}</p>
              <p className="mt-1 text-xs text-amber-400/80">{quota.message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Section title={t("health.section_ollama")}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StatusDot ok={services.ollama.reachable} />
              <span className="text-sm text-slate-300">
                {services.ollama.reachable ? t("health.reachable") : t("health.unreachable_label")}
              </span>
              {services.ollama.error && (
                <span className="text-xs text-red-400">{services.ollama.error}</span>
              )}
            </div>
            {services.ollama.models.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] uppercase tracking-wider text-slate-500">{t("health.models")}</p>
                <div className="flex flex-wrap gap-1.5">
                  {services.ollama.models.map((m) => (
                    <span
                      key={m}
                      className="rounded-md bg-slate-800 px-2 py-1 font-mono text-[11px] text-emerald-300"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Section>

        <Section title={t("health.section_groq")}>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <StatusDot ok={services.groq.configured} />
              <span className="text-sm text-slate-300">
                {services.groq.configured ? t("health.api_configured") : t("health.no_api")}
              </span>
            </div>
            {services.groq.configured && (
              <div className="flex items-center gap-3">
                <StatusDot ok={services.groq.reachable} />
                <span className="text-sm text-slate-300">
                  {services.groq.reachable ? t("health.reachable") : t("health.unreachable_label")}
                </span>
              </div>
            )}
          </div>
        </Section>

        <Section title={t("health.section_rag")}>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <StatusDot ok={services.rag_ready} />
              <span className="text-sm text-slate-300">
                {services.rag_ready ? t("health.rag_ready") : t("health.rag_unavailable")}
              </span>
            </div>
            {services.rag && Object.keys(services.rag).length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(services.rag).map(([k, v]) => (
                  <div key={k} className="flex justify-between rounded-[6px] bg-slate-800/50 px-3 py-1.5">
                    <span className="text-slate-500">{k}</span>
                    <span className="text-slate-300">{String(v ?? "—")}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Section>

        <Section title={t("health.section_storage")}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between rounded-[6px] bg-slate-800/50 px-3 py-2">
              <span className="text-slate-500">{t("health.memory_file")}</span>
              <span className="text-slate-300 w-40 truncate text-right font-mono">{storage.memory_path}</span>
            </div>
            <div className="flex justify-between rounded-[6px] bg-slate-800/50 px-3 py-2">
              <span className="text-slate-500">{t("health.memory_size")}</span>
              <span className="text-slate-300">{formatBytes(storage.memory_bytes)}</span>
            </div>
            <div className="flex justify-between rounded-[6px] bg-slate-800/50 px-3 py-2">
              <span className="text-slate-500">{t("health.active_shares")}</span>
              <span className="text-slate-300">{storage.shares_count}</span>
            </div>
          </div>
        </Section>
      </div>
    </motion.div>
  );
}
