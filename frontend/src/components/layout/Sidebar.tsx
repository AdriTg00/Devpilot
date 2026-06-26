import { NavLink } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

const linkKeys = [
  { key: "nav.dashboard", path: "/" },
  { key: "nav.projects", path: "/project" },
  { key: "nav.chat", path: "/chat" },
  { key: "nav.documentation", path: "/documentation" },
  { key: "nav.settings", path: "/settings" },
];

export default function Sidebar() {
  const { t } = useLanguage();

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900">

      <div className="border-b border-slate-800 p-6">
        <h2 className="text-xl font-bold text-emerald-400">
          {t("app.name")}
        </h2>
      </div>

      <nav className="flex flex-col gap-2 p-4">

        {linkKeys.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className="rounded-lg px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            {t(link.key)}
          </NavLink>
        ))}

      </nav>

    </aside>
  );
}