import { NavLink } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import logo from "../../assets/DevPilotSinFondo.png";

const linkKeys = [
  { key: "nav.projects", path: "/project" },
  { key: "nav.chat", path: "/chat" },
  { key: "nav.documentation", path: "/documentation" },
  { key: "nav.health", path: "/health" },
  { key: "nav.settings", path: "/settings" },
];

export default function Navbar() {
  const { t } = useLanguage();

  return (
    <header className="relative overflow-hidden border-b border-slate-800 bg-slate-900">
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "150px", opacity: 1 }}
      />
      <div className="relative flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
        </div>
        <span className="hidden text-sm text-slate-400 sm:block">
          {t("navbar.subtitle")}
        </span>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-4 md:px-8">
        {linkKeys.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            aria-label={t(link.key)}
            className={({ isActive }) =>
              `whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`
            }
          >
            {t(link.key)}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
