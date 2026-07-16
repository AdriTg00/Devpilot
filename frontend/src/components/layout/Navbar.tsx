import { NavLink, type NavLinkRenderProps } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Sun, Moon } from "lucide-react";
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
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className="relative overflow-hidden border-b backdrop-blur-md"
      style={{ borderColor: "var(--border-color)", backgroundColor: "var(--bg-nav)" }}
    >
      <div className="pointer-events-none absolute inset-0 tech-grid" />
      <img
        src={logo}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: "150px", opacity: 0.6 }}
      />
      <div className="relative flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-[6px] p-2 transition hover:bg-hover"
            style={{ color: "var(--text-secondary)" }}
            aria-label={t("theme.toggle")}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        <span className="hidden text-sm sm:block" style={{ color: "var(--text-muted)" }}>
          {t("navbar.subtitle")}
        </span>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-4 md:px-8">
        {linkKeys.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            aria-label={t(link.key)}
            className={({ isActive }: NavLinkRenderProps) =>
              `whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "border-emerald-400"
                  : "border-transparent hover:border-emerald-700/50"
              }`
            }
            style={({ isActive }: NavLinkRenderProps) => ({
              color: isActive ? "var(--text-accent)" : "var(--text-muted)",
            })}
            data-cuelume-hover="tick"
          >
            {t(link.key)}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
