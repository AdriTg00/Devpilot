import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLanguage } from "../../contexts/LanguageContext";
import { useToast } from "../../contexts/ToastContext";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { getSettings, updateSettings, type Settings } from "../../services/api";

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const languages = ["en", "es"] as const;
const groqOptions = ["fast", "balanced", "code"] as const;
const providerOptions = ["auto", "ollama", "groq"] as const;

function RangeSlider({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-sm text-slate-400">
        {label}: <span className="text-emerald-400">{value}</span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-emerald-500"
      />
      <div className="flex justify-between text-xs text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();
  const { toast } = useToast();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then(setSettings)
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
      const updated = await updateSettings(settings);
      setSettings(updated);
      toast(t("settings.saved"), "success");
    } catch {
      toast(t("settings.save_error"), "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={stagger}
      initial="hidden"
      animate="visible"
    >
      <motion.h1
        className="text-2xl font-bold"
        variants={fadeUp}
        transition={{ duration: 0.3 }}
      >
        {t("settings.title")}
      </motion.h1>

      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("settings.provider")}</h2>
        <p className="mb-4 text-sm text-slate-400">{t("settings.provider_label")}</p>

        <div className="flex gap-3">
          {providerOptions.map((opt) => (
            <button
              key={opt}
              onClick={() => update("provider", opt)}
              className={`rounded-lg border px-5 py-2.5 text-sm font-medium transition ${
                settings?.provider === opt
                  ? "border-emerald-500 bg-emerald-600 text-white"
                  : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-400">{t("settings.ollama_model")}</label>
            <input
              type="text"
              value={settings?.ollama_model ?? ""}
              onChange={(e) => update("ollama_model", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-400">{t("settings.groq_model")}</label>
            <select
              value={settings?.groq_model ?? "fast"}
              onChange={(e) => update("groq_model", e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
            >
              {groqOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-sm text-slate-400">{t("settings.ollama_url")}</label>
          <input
            type="text"
            value={settings?.ollama_base_url ?? ""}
            onChange={(e) => update("ollama_base_url", e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </Card>
      </motion.div>

      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("settings.generation")}</h2>

        <div className="mb-4">
          <label className="mb-1 block text-sm text-slate-400">
            {t("settings.temperature")}: <span className="text-emerald-400">{settings?.temperature?.toFixed(1) ?? "0.2"}</span>
          </label>
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={settings?.temperature ?? 0.2}
            onChange={(e) => update("temperature", parseFloat(e.target.value))}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-slate-600">
            <span>0 (precise)</span>
            <span>2 (creative)</span>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm text-slate-400">{t("settings.max_tokens")}</label>
          <input
            type="number"
            min={64}
            max={128_000}
            step={64}
            value={settings?.max_tokens ?? 4096}
            onChange={(e) => update("max_tokens", parseInt(e.target.value) || 4096)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </Card>
      </motion.div>

      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("settings.rag")}</h2>
        <p className="mb-4 text-sm text-slate-400">{t("settings.rag_desc")}</p>

        <RangeSlider
          label={t("settings.rag_chunk_lines")}
          value={settings?.rag_chunk_lines ?? 50}
          min={10}
          max={500}
          step={5}
          onChange={(v) => update("rag_chunk_lines", v)}
        />

        <RangeSlider
          label={t("settings.rag_overlap")}
          value={settings?.rag_overlap_lines ?? 5}
          min={0}
          max={100}
          step={1}
          onChange={(v) => update("rag_overlap_lines", v)}
        />

        <div className="mb-3">
          <label className="mb-1 block text-sm text-slate-400">{t("settings.rag_max_chunks")}</label>
          <input
            type="number"
            min={1}
            max={200}
            value={settings?.rag_max_chunks_per_file ?? 20}
            onChange={(e) => update("rag_max_chunks_per_file", parseInt(e.target.value) || 20)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="mb-3">
          <label className="mb-1 block text-sm text-slate-400">{t("settings.rag_max_results")}</label>
          <input
            type="number"
            min={1}
            max={50}
            value={settings?.rag_max_results ?? 8}
            onChange={(e) => update("rag_max_results", parseInt(e.target.value) || 8)}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </Card>
      </motion.div>

      <motion.div variants={fadeUp} transition={{ duration: 0.3 }}>
      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("settings.language")}</h2>
        <p className="mb-4 text-sm text-slate-400">{t("settings.language_label")}</p>

        <div className="flex gap-3">
          {languages.map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className={`rounded-lg border px-6 py-3 font-medium transition ${
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
