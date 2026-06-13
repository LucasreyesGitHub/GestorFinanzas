"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const links = [
  { href: "/",         label: "Este mes",  icon: (_active: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  )},
  { href: "/historial", label: "Historial", icon: (_active: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )},
  { href: "/mapa",     label: "Opciones",  icon: (_active: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/>
    </svg>
  )},
  { href: "/setup",    label: "Perfil",    icon: (_active: boolean) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
  )},
];

export default function NavBar() {
  const path = usePathname();
  const barRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!barRef.current) return;
    barRef.current.style.opacity = "0";
    barRef.current.style.transform = "translateY(-8px)";
    requestAnimationFrame(() => {
      if (!barRef.current) return;
      barRef.current.style.transition = "opacity 0.4s ease, transform 0.4s ease";
      barRef.current.style.opacity = "1";
      barRef.current.style.transform = "translateY(0)";
    });
  }, []);

  return (
    <header
      ref={barRef}
      className="sticky top-0 z-50 w-full"
      style={{ background: "rgba(10,15,30,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #10b981, #059669)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--text-1)" }}>
            Inversiones<span style={{ color: "var(--accent)" }}>UY</span>
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = path === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200"
                style={{
                  color:      active ? "var(--accent)" : "var(--text-2)",
                  background: active ? "rgba(16,185,129,0.1)" : "transparent",
                  border:     active ? "1px solid rgba(16,185,129,0.2)" : "1px solid transparent",
                }}
              >
                {l.icon(active)}
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
