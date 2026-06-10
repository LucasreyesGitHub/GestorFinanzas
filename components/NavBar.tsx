"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/",           label: "Este mes",    icon: "📊" },
  { href: "/mapa",       label: "Opciones",    icon: "🗺️" },
  { href: "/setup",      label: "Mi perfil",   icon: "⚙️" },
];

export default function NavBar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-100">
      <div className="max-w-2xl mx-auto px-4 flex items-center justify-between h-14">
        <span className="font-semibold text-slate-800 text-sm">💵 Inversiones UY</span>
        <nav className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                path === l.href
                  ? "bg-green-50 text-green-700"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span>{l.icon}</span>
              <span className="hidden sm:inline">{l.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
