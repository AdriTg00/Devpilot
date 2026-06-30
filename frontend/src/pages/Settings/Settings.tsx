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
  label: string;
  desc: string;
  free: boolean;
  local: boolean;
  needsKey: boolean;
}

const PROVIDERS: ProviderDef[] = [
  { id: "ollama", label: "Ollama", desc: "Open-source models, runs on your machine", free: true, local: true, needsKey: false },
  { id: "openai", label: "OpenAI", desc: "GPT-4o, GPT-4o-mini. Fast & powerful", free: false, local: false, needsKey: true },
  { id: "anthropic", label: "Claude", desc: "Claude 3.5 Sonnet. Great for code review", free: false, local: false, needsKey: true },
  { id: "google", label: "Gemini", desc: "Gemini 2.0 Flash. Google's latest", free: false, local: false, needsKey: true },
  { id: "groq", label: "Groq", desc: "Fast inference. Free tier available", free: true, local: false, needsKey: true },
  { id: "auto", label: "Auto", desc: "Smart detection. Ollama → Groq → first available", free: true, local: false, needsKey: false },
];

const MODEL_PRESETS = [
  { id: "fast", label: "Fast", desc: "Quick responses" },
  { id: "balanced", label: "Balanced", desc: "Good quality" },
  { id: "code", label: "Code", desc: "Best for code" },
];

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string } | null>>({});

  useEffect(() => {
    getSettings()
      .then((s) => setSettings(s))
      .catch(() => toast("Failed to load settings"))
      .finally(() => setLoading(false));
  }, [toast]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    try {
      const result = await updateSettings(settings);
      setSettings(result.settings);
      // Show warnings as toasts
      for (const w of result.warnings) {
        toast(w, "info");
        // Auto-switch provider display to match what backend actually uses
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

  async function handleTest(provider: string) {
    if (!settings) return;
    const keyField = `${provider}_api_key` as keyof Settings;
    const apiKey = settings[keyField] as string;
    if (!apiKey) {
      toast(`Enter an API key for ${provider} first`, "info");
      return;
    }
    setTesting(provider);
    try {
      const result = await testProviderConnection(provider, apiKey);
      setTestResults((prev) => ({ ...prev, [provider]: result }));
      if (!result.success) {
        toast(result.message, "error");
        update("provider", "auto");
        toast(`Switched to Auto provider`, "info");
      } else {
        toast(result.message, "success");
      }
    } catch {
      const fail = { success: false, message: "Connection test failed" };
      setTestResults((prev) => ({ ...prev, [provider]: fail }));
      toast("Connection test failed", "error");
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
          <h2 className="mb-1 text-lg font-semibold">AI Model</h2>
          <p className="mb-4 text-sm text-slate-400">Choose which AI service to use for chat, code review, and documentation.</p>

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
                    <span className="text-sm font-medium text-white">{p.label}</span>
                    {p.local && (
                      <span className="shrink-0 rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        Local
                      </span>
                    )}
                    {p.free && !p.local && (
                      <span className="shrink-0 rounded bg-emerald-900/50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                        Free
                      </span>
                    )}
                    {p.needsKey && (
                      <span className="shrink-0 rounded bg-amber-900/50 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                        Key
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] leading-tight text-slate-500">{p.desc}</p>
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
                {p.label} API Key
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={(settings?.[`${p.id}_api_key` as keyof Settings] as string) ?? ""}
                  onChange={(e) => update(`${p.id}_api_key` as keyof Settings, e.target.value as any)}
                  placeholder={`sk-... (${p.label} API key)`}
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
                        : testResults[p.id] && !testResults[p.id].success
                          ? "border-red-600 bg-red-600/20 text-red-400"
                          : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {testing === p.id ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-emerald-400" />
                  ) : testResults[p.id]?.success ? (
                    "Connected"
                  ) : testResults[p.id] && !testResults[p.id].success ? (
                    "Failed"
                  ) : (
                    "Test"
                  )}
                </button>
              </div>
              {testResults[p.id] && !testResults[p.id].success && (
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
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">Model quality</p>
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
                      <div className={`text-xs font-medium ${active ? "text-emerald-400" : "text-slate-300"}`}>{m.label}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500">{m.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Ollama specific: model name text input ── */}
          {provider === "ollama" && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-slate-500">Ollama model name</label>
              <input
                type="text"
                value={settings?.ollama_model ?? ""}
                onChange={(e) => update("ollama_model", e.target.value)}
                placeholder="qwen2.5-coder:7b"
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
          <span>Advanced settings</span>
          <svg className={`h-4 w-4 transition ${showAdvanced ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-white">Temperature</h3>
              <p className="mb-3 text-xs text-slate-500">Lower = more precise. Higher = more creative.</p>
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
                <span>0 — Precise</span>
                <span className="font-mono text-emerald-400">{settings?.temperature?.toFixed(1) ?? "0.2"}</span>
                <span>2 — Creative</span>
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 text-sm font-semibold text-white">Max tokens</h3>
              <p className="mb-2 text-xs text-slate-500">Maximum response length from the AI.</p>
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
                <h3 className="mb-3 text-sm font-semibold text-white">Ollama server URL</h3>
                <p className="mb-2 text-xs text-slate-500">Change only if Ollama runs on a different machine.</p>
                <input
                  type="text"
                  value={settings?.ollama_base_url ?? "http://localhost:11434"}
                  onChange={(e) => update("ollama_base_url", e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
                />
              </Card>
            )}

            <Card>
              <h3 className="mb-3 text-sm font-semibold text-white">RAG (Code Indexing)</h3>
              <p className="mb-3 text-xs text-slate-500">How code is split and searched for AI context.</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: "rag_chunk_lines" as const, label: "Chunk size (lines)", min: 10, max: 500, step: 5 },
                  { key: "rag_overlap_lines" as const, label: "Overlap (lines)", min: 0, max: 100, step: 1 },
                  { key: "rag_max_chunks_per_file" as const, label: "Max chunks / file", min: 1, max: 200, step: 1 },
                  { key: "rag_max_results" as const, label: "Max search results", min: 1, max: 50, step: 1 },
                ].map(({ key, label, min, max, step }) => (
                  <div key={key}>
                    <label className="mb-1 block text-[11px] text-slate-500">
                      {label}: <span className="text-emerald-400">{settings?.[key] ?? 0}</span>
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
                onClick={() => setLanguage(lang)}
                className={`rounded-lg border px-5 py-2.5 text-sm font-medium transition ${
                  language === lang
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
