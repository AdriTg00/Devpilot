import { NavLink } from "react-router-dom";

const links = [
  { name: "Dashboard", path: "/" },
  { name: "Projects", path: "/project" },
  { name: "Chat", path: "/chat" },
  { name: "Documentation", path: "/documentation" },
  { name: "Settings", path: "/settings" },
];

export default function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-800 bg-slate-900">

      <div className="border-b border-slate-800 p-6">
        <h2 className="text-xl font-bold text-emerald-400">
          DevPilot
        </h2>
      </div>

      <nav className="flex flex-col gap-2 p-4">

        {links.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            className="rounded-lg px-4 py-3 text-slate-300 transition hover:bg-slate-800 hover:text-white"
          >
            {link.name}
          </NavLink>
        ))}

      </nav>

    </aside>
  );
}