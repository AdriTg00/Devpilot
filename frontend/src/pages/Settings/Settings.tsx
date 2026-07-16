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

const PROVIDER_MODELS: Record<string, { id: string; label: string }[]> = {
  openai: [
    { id: "gpt-4o-mini", label: "GPT-4o Mini" },
    { id: "gpt-4o", label: "GPT-4o" },
    { id: "gpt-4.1", label: "GPT-4.1" },
    { id: "gpt-4.1-nano", label: "GPT-4.1 Nano" },
    { id: "o3-mini", label: "o3-mini" },
  ],
  anthropic: [
    { id: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
    { id: "claude-sonnet-4-6", label: "Claude Sonnet 4" },
    { id: "claude-3-opus-latest", label: "Claude 3 Opus" },
  ],
  google: [
    { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { id: "gemini-2.5-pro-preview-03-25", label: "Gemini 2.5 Pro" },
  ],
  groq: [
    { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B" },
    { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" },
    { id: "llama-3.3-70b-specdec", label: "Llama 3.3 70B (SpecDec)" },
    { id: "mixtral-8x7b-32768", label: "Mixtral 8x7B" },
    { id: "gemma2-9b-it", label: "Gemma 2 9B" },
  ],
};

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [savedSettings, setSavedSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<"en" | "es">(language);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const isDirty = !!settings && JSON.stringify(settings) !== JSON.stringify(savedSettings);

  useEffect(() => {
    getSettings()
      .then((s) => { setSettings(s); setSavedSettings(s); })
      .catch(() => toast(t("settings.load_error"), "error"))
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
      setSavedSettings(result.settings);
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
      if (result.success) {
        toast(result.message, "success");
        const updated = { ...settings, provider: providerId };
        setSettings(updated);
      } else {
        toast(result.message, "error");
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400 shadow-[0_0_12px_rgba(34,197,94,0.15)]" />
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
                  onClick={() => {
                    if (!settings || provider === p.id) return;
                    update("provider", p.id);
                  }}
                  className={`rounded-[6px] border p-3 text-left transition-all duration-200 ${
                    active
                      ? "border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_16px_rgba(34,197,94,0.1)]"
                      : "border-emerald-900/20 bg-slate-900/30 hover:border-emerald-700/40"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{t(`provider.${p.id}.label`)}</span>
                    {p.local && (
                      <span className="shrink-0 rounded bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        {t("badge.local")}
                      </span>
                    )}
                    {p.free && !p.local && (
                      <span className="shrink-0 rounded bg-emerald-900/30 px-1.5 py-0.5 text-[10px] font-medium text-emerald-300">
                        {t("badge.free")}
                      </span>
                    )}
                    {p.needsKey && (
                      <span className="shrink-0 rounded bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-300">
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
                  <div className="relative flex-1">
                    <input
                      type={showKeys[p.id] ? "text" : "password"}
                      value={(settings?.[`${p.id}_api_key` as keyof Settings] as string) ?? ""}
                      onChange={(e) => {
                        update(`${p.id}_api_key` as keyof Settings, e.target.value);
                        setTestResults((prev) => ({ ...prev, [p.id]: null }));
                      }}
                      placeholder={t("settings.api_key_placeholder", { provider: t(`provider.${p.id}.label`) })}
                      className="w-full rounded-[6px] border border-emerald-900/30 bg-slate-800/60 px-3 py-2 pr-9 text-sm text-white backdrop-blur-sm placeholder:text-slate-600 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.12)] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeys((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                      tabIndex={-1}
                    >
                      {showKeys[p.id] ? (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                <button
                  onClick={() => handleTest(p.id)}
                  disabled={testing === p.id}
                  className={`shrink-0 rounded-[6px] border px-3 py-2 text-xs font-medium transition-all duration-200 ${
                    testing === p.id
                      ? "border-emerald-900/30 bg-slate-800/60 text-slate-500"
                      : testResults[p.id]?.success
                        ? "border-emerald-500/50 bg-emerald-600/10 text-emerald-300 shadow-[0_0_8px_rgba(34,197,94,0.08)]"
                        : testResults[p.id]?.success === false
                          ? "border-red-500/50 bg-red-600/10 text-red-300"
                          : "border-emerald-900/30 bg-slate-800/60 text-slate-300 hover:border-emerald-700/50 hover:shadow-[0_0_8px_rgba(34,197,94,0.06)]"
                  }`}
                >
                  {testing === p.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-emerald-400" />
                  ) : (
                    t("settings.test")
                  )}
                </button>
              </div>
              {testResults[p.id] && (
                <p className={`mt-1 text-xs ${testResults[p.id]?.success ? "text-emerald-300" : "text-red-300"}`}>
                  {testResults[p.id]?.message}
                </p>
              )}
            </div>
          ))}

          {/* ── Model selection (per provider) ── */}
          {isCloud && (
            <div className="mt-4 border-t border-emerald-900/20 pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">{t("settings.model")}</p>
              <div className="grid grid-cols-2 gap-2">
                {(PROVIDER_MODELS[provider] ?? []).map((m) => {
                  const active = settings?.provider_model === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => update("provider_model", m.id)}
                      className={`rounded-[6px] border px-3 py-2 text-left transition-all duration-200 ${
                        active
                          ? "border-emerald-500/50 bg-emerald-600/10 shadow-[0_0_8px_rgba(34,197,94,0.08)]"
                          : "border-emerald-900/20 bg-slate-800/30 hover:border-emerald-700/40"
                      }`}
                    >
                      <div className={`text-xs font-medium ${active ? "text-emerald-300" : "text-slate-300"}`}>{m.label}</div>
                      <div className="mt-0.5 text-[10px] font-mono text-slate-500">{m.id}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3">
                <p className="mb-1 text-[11px] text-slate-500">{t("settings.custom_model")}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={
                      settings?.provider_model && !(PROVIDER_MODELS[provider] ?? []).some((m) => m.id === settings.provider_model)
                        ? settings.provider_model
                        : ""
                    }
                    onChange={(e) => {
                      if (e.target.value) update("provider_model", e.target.value);
                    }}
                    placeholder={t("settings.custom_model_placeholder")}
                    className="flex-1 rounded-[6px] border border-emerald-900/30 bg-slate-800/60 px-3 py-2 text-xs text-white backdrop-blur-sm placeholder:text-slate-600 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.12)] focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Ollama specific: model name text input ── */}
          {provider === "ollama" && (
            <div className="mt-4 border-t border-emerald-900/20 pt-4">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">{t("settings.ollama_model_name")}</label>
              <input
                type="text"
                value={settings?.ollama_model ?? ""}
                onChange={(e) => update("ollama_model", e.target.value)}
                placeholder={t("settings.ollama_model_placeholder")}
                className="w-full rounded-[6px] border border-emerald-900/30 bg-slate-800/60 px-3 py-2 text-sm text-white backdrop-blur-sm placeholder:text-slate-600 focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.12)] focus:outline-none"
              />
            </div>
          )}
        </Card>
      </motion.div>

      {/* ── Advanced settings ── */}
      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex w-full items-center justify-between rounded-[6px] border border-emerald-900/30 bg-slate-900/30 px-5 py-3 text-sm font-medium text-slate-500 backdrop-blur-sm transition-all duration-200 hover:border-emerald-700/40 hover:text-emerald-300 hover:shadow-[0_0_8px_rgba(34,197,94,0.06)]"
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
                className="w-full range-cyber"
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
                className="w-full rounded-[6px] border border-emerald-900/30 bg-slate-800/60 px-3 py-2 text-sm text-white backdrop-blur-sm focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.12)] focus:outline-none"
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
                  className="w-full rounded-[6px] border border-emerald-900/30 bg-slate-800/60 px-3 py-2 text-sm text-white backdrop-blur-sm focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.12)] focus:outline-none"
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
                      className="w-full rounded-[6px] border border-emerald-900/30 bg-slate-800/60 px-2 py-1.5 text-xs text-white backdrop-blur-sm focus:border-emerald-500 focus:shadow-[0_0_12px_rgba(34,197,94,0.12)] focus:outline-none"
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
                className={`rounded-[6px] border px-5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  pendingLanguage === lang
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_12px_rgba(34,197,94,0.08)]"
                    : "border-emerald-900/30 bg-slate-800/60 text-slate-300 hover:border-emerald-700/50 hover:bg-slate-700/40"
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
        <div className="flex items-center justify-end gap-4">
          {isDirty && (
            <span className="flex items-center gap-1.5 rounded-[6px] border border-amber-800/40 bg-amber-900/20 px-3 py-1.5 text-xs text-amber-400">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {t("settings.unsaved_changes")}
            </span>
          )}
          <Button onClick={handleSave} loading={saving}>
            {t("settings.save")}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
