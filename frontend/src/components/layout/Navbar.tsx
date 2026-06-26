import { useLanguage } from "../../contexts/LanguageContext";

export default function Navbar() {
  const { t } = useLanguage();

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-900 px-8">

      <h1 className="text-2xl font-bold text-emerald-400">
        {t("app.name")} AI
      </h1>

      <span className="text-sm text-slate-400">
        {t("navbar.subtitle")}
      </span>

    </header>
  );
}