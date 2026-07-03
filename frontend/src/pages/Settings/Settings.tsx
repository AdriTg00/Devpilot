import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { getSettings, updateSettings, testProviderConnection, type Settings } from "../../services/api";

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const languages = ["en", "es"] as const;

interface ProviderDef {
  id: string;
  free: boolean;
  local: boolean;
  needsKey: boolean;
}

const PROVIDERS: ProviderDef[] = [
  { id: "ollama", free: true, local: true, needsKey: false },
  { id: "openai", free: false, local: false, needsKey: true },
  { id: "anthropic", free: false, local: false, needsKey: true },
  { id: "google", free: false, local: false, needsKey: true },
  { id: "groq", free: true, local: false, needsKey: true },
  { id: "auto", free: true, local: false, needsKey: false },
];

const MODEL_PRESETS = [
  { id: "fast" },
  { id: "balanced" },
  { id: "code" },
];

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<"en" | "es">(language);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  useEffect(() => {
    getSettings()
      .then((s) => setSettings(s))
      .catch(() => toast(t("settings.load_error")))
      .finally(() => setLoading(false));
  }, [t, toast]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    if (pendingLanguage !== language) {
      setLanguage(pendingLanguage);
    }
    try {
      const result = await updateSettings(settings);
      setSettings(result.settings);
      for (const w of result.warnings) {
        toast(w, "info");
      }
      if (result.warnings.length === 0) {
        toast(t("settings.saved"), "success");
      }
    } catch {
      toast(t("settings.save_error"), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(providerId: string) {
    if (!settings) return;
    const keyField = `${providerId}_api_key` as keyof Settings;
    const apiKey = settings[keyField] as string;
    if (!apiKey) {
      toast(t("settings.enter_api_key", { provider: providerId }), "info");
      return;
    }
    setTesting(providerId);
    try {
      const result = await testProviderConnection(providerId, apiKey);
      setTestResults((prev) => ({ ...prev, [providerId]: result }));
      if (!result.success) {
        toast(result.message, "error");
        update("provider", "auto");
        toast(t("settings.switched_to_auto"), "info");
      } else {
        toast(result.message, "success");
      }
    } catch {
      const fail = { success: false, message: t("settings.test_connection_failed") };
      setTestResults((prev) => ({ ...prev, [providerId]: fail }));
      toast(t("settings.test_connection_failed"), "error");
    } finally {
      setTesting(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500" />
      </div>
    );
  }

  const provider = settings?.provider ?? "auto";
  const isCloud = provider !== "ollama" && provider !== "auto";

  return (
    <motion.div className="mx-auto max-w-2xl space-y-6 pb-8" variants={stagger} initial="hidden" animate="visible">
      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
        <h1 className="text-2xl font-bold">{t("settings.title")}</h1>
      </motion.div>

      {/* ── Provider Selection ── */}
      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
        <Card>
          <h2 className="mb-1 text-lg font-semibold">{t("settings.ai_model")}</h2>
          <p className="mb-4 text-sm text-slate-400">{t("settings.ai_model_desc")}</p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {PROVIDERS.map((p) => {
              const active = provider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => update("provider", p.id)}
                  className={`rounded-xl border p-3 text-left transition-all ${
                    active
                      ? "border-emerald-500 bg-emerald-600/10 ring-1 ring-emerald-500/30"
                      : "border-slate-800 bg-slate-900/50 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{t(`provider.${p.id}.label`)}</span>
                    {p.local && (
                      <span className="shrink-0 rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        {t("badge.local")}
                      </span>
                    )}
                    {p.free && !p.local && (
                      <span className="shrink-0 rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        {t("badge.free")}
                      </span>
                    )}
                    {p.needsKey && (
                      <span className="shrink-0 rounded bg-amber-900/50 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                        {t("badge.key")}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-tight text-slate-500">{t(`provider.${p.id}.desc`)}</p>
                </button>
              );
            })}
          </div>

          {/* ── API Key inputs (for cloud providers that need keys) ── */}
          {PROVIDERS.filter((p) => p.needsKey).map((p) => (
            <div
              key={p.id}
              className={`mt-3 overflow-hidden transition-all ${
                provider === p.id ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">
                {t("settings.api_key", { provider: t(`provider.${p.id}.label`) })}
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={(settings?.[`${p.id}_api_key` as keyof Settings] as string) ?? ""}
                  onChange={(e) => update(`${p.id}_api_key` as keyof Settings, e.target.value)}
                  placeholder={t("settings.api_key_placeholder", { provider: t(`provider.${p.id}.label`) })}
                  className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
                />
                <button
                  onClick={() => handleTest(p.id)}
                  disabled={testing === p.id}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    testing === p.id
                      ? "border-slate-700 bg-slate-800 text-slate-500"
                      : testResults[p.id]?.success
                        ? "border-emerald-600 bg-emerald-600/20 text-emerald-400"
                        : testResults[p.id]?.success === false
                          ? "border-red-600 bg-red-600/20 text-red-400"
                          : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {testing === p.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-emerald-400" />
                  ) : testResults[p.id]?.success ? (
                    t("settings.connected")
                  ) : testResults[p.id]?.success === false ? (
                    t("settings.failed")
                  ) : (
                    t("settings.test")
                  )}
                </button>
              </div>
              {testResults[p.id]?.success === false && (
                <p className="mt-1 text-xs text-red-400">{testResults[p.id]?.message}</p>
              )}
              {testResults[p.id]?.success && (
                <p className="mt-1 text-xs text-emerald-400">{testResults[p.id]?.message}</p>
              )}
            </div>
          ))}

          {/* ── Model preset (only for cloud providers) ── */}
          {isCloud && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">{t("settings.model_quality")}</p>
              <div className="flex gap-2">
                {MODEL_PRESETS.map((m) => {
                  const active = settings?.provider_model === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => update("provider_model", m.id)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-left transition-all ${
                        active
                          ? "border-emerald-500 bg-emerald-600/10"
                          : "border-slate-700/50 bg-slate-800/30 hover:border-slate-600"
                      }`}
                    >
                      <div className={`text-xs font-medium ${active ? "text-emerald-400" : "text-slate-300"}`}>{t(`preset.${m.id}.label`)}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500">{t(`preset.${m.id}.desc`)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Ollama specific: model name text input ── */}
          {provider === "ollama" && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">{t("settings.ollama_model_name")}</label>
              <input
                type="text"
                value={settings?.ollama_model ?? ""}
                onChange={(e) => update("ollama_model", e.target.value)}
                placeholder={t("settings.ollama_model_placeholder")}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* ── Advanced settings ── */}
      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-900/50 px-5 py-3 text-sm font-medium text-slate-400 transition hover:border-slate-700 hover:text-slate-300"
        >
          <span>{t("settings.advanced")}</span>
          <svg className={`h-4 w-4 transition ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-white">{t("settings.temperature")}</h3>
              <p className="mb-3 text-xs text-slate-500">{t("settings.temperature_desc")}</p>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings?.temperature ?? 0.2}
                onChange={(e) => update("temperature", parseFloat(e.target.value))}
                className="w-full accent-emerald-500"
              />
              <div className="mt-1 flex justify-between text-[11px] text-slate-600">
                <span>{t("settings.temperature_precise")}</span>
                <span className="font-mono text-emerald-400">{settings?.temperature?.toFixed(1) ?? "0.2"}</span>
                <span>{t("settings.temperature_creative")}</span>
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 text-sm font-semibold text-white">{t("settings.max_tokens")}</h3>
              <p className="mb-2 text-xs text-slate-500">{t("settings.max_tokens_desc")}</p>
              <input
                type="number"
                min={64}
                max={128_000}
                step={64}
                value={settings?.max_tokens ?? 4096}
                onChange={(e) => update("max_tokens", parseInt(e.target.value) || 4096)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </Card>

            {provider === "ollama" && (
              <Card>
                <h3 className="mb-3 text-sm font-semibold text-white">{t("settings.ollama_url")}</h3>
                <p className="mb-2 text-xs text-slate-500">{t("settings.ollama_url_desc")}</p>
                <input
                  type="text"
                  value={settings?.ollama_base_url ?? "http://localhost:11434"}
                  onChange={(e) => update("ollama_base_url", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </Card>
            )}

            <Card>
              <h3 className="mb-3 text-sm font-semibold text-white">{t("settings.rag")}</h3>
              <p className="mb-3 text-xs text-slate-500">{t("settings.rag_desc_short")}</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "rag_chunk_lines" as const, labelKey: "settings.rag_chunk_lines", min: 10, max: 500, step: 5 },
                  { key: "rag_overlap_lines" as const, labelKey: "settings.rag_overlap", min: 0, max: 100, step: 1 },
                  { key: "rag_max_chunks_per_file" as const, labelKey: "settings.rag_max_chunks", min: 1, max: 200, step: 1 },
                  { key: "rag_max_results" as const, labelKey: "settings.rag_max_results", min: 1, max: 50, step: 1 },
                ].map(({ key, labelKey, min, max, step }) => (
                  <div key={key}>
                    <label className="mb-1 block text-[11px] text-slate-500">
                      {t(labelKey)}: <span className="text-emerald-400">{settings?.[key] ?? 0}</span>
                    </label>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      step={step}
                      value={settings?.[key] ?? 0}
                      onChange={(e) => update(key, parseInt(e.target.value) || 0)}
                      className="w-full rounded-lg border border-slate-700 bg-slate-800 px-2 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </motion.div>

      {/* ── Language ── */}
      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("settings.language")}</h2>
          <div className="flex gap-3">
            {languages.map((lang) => (
              <button
                key={lang}
                onClick={() => setPendingLanguage(lang)}
                className={`rounded-lg border px-5 py-2.5 text-sm font-medium transition ${
                  pendingLanguage === lang
                    ? "border-emerald-500 bg-emerald-600 text-white"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                }`}
              >
                {t(`lang.${lang}`)}
              </button>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* ── Save ── */}
      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
        <div className="flex justify-end">
          <Button onClick={handleSave} loading={saving}>
            {t("settings.save")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
