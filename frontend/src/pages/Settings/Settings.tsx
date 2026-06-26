import { useLanguage } from "../../contexts/LanguageContext";
import Card from "../../components/ui/Card";

const languages = ["en", "es"] as const;

export default function Settings() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-bold">{t("settings.title")}</h1>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">{t("settings.language")}</h2>

        <p className="mb-4 text-sm text-slate-400">
          {t("settings.language_label")}
        </p>

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

    </div>
  );
}
