import { useLanguage } from "../../contexts/LanguageContext";

export default function Dashboard() {
  const { t } = useLanguage();
  return <h1 className="text-white">{t("dashboard.title")}</h1>;
}