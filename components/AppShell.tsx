"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"

// ── Dark mode hook ─────────────────────────────────────────────────────────
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "dark" : "light")
  }, [])

  function toggle() {
    setTheme(prev => {
      const next = prev === "light" ? "dark" : "light"
      localStorage.setItem("theme", next)
      document.documentElement.classList.toggle("dark", next === "dark")
      document.documentElement.classList.toggle("light", next === "light")
      return next
    })
  }

  return { theme, toggle }
}

// ── Icons ──────────────────────────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  )
}

function IconHistory() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="12" y2="16" />
    </svg>
  )
}

function IconUpload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconSun() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function IconMoon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function IconChevronRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

// ── Nav items ──────────────────────────────────────────────────────────────
const navItems = [
  { label: "Principal",     href: "/",              icon: <IconDashboard /> },
  { label: "Historial",     href: "/movimientos",   icon: <IconHistory /> },
  { label: "Importar",      href: "/estadisticas",  icon: <IconUpload /> },
  { label: "Configuración", href: "/configuracion", icon: <IconSettings /> },
]

// ── Theme toggle button ────────────────────────────────────────────────────
function ThemeButton({ theme, toggle }: { theme: "light" | "dark"; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
    >
      {theme === "dark" ? <IconSun /> : <IconMoon />}
    </button>
  )
}

// ── AppShell ───────────────────────────────────────────────────────────────
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const { data: session } = useSession()

  const userName = session?.user?.name?.split(" ")[0] ?? "Lucas"
  const userInitial = (session?.user?.name ?? userName)[0].toUpperCase()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">

      {/* ── Sidebar desktop ── */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 lg:flex z-40">

        {/* Logo + toggle */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
              <span className="text-sm font-bold text-white dark:text-slate-900">F</span>
            </div>
            <div className="leading-none">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Finanzas</p>
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Gestor personal</p>
            </div>
          </div>
          <ThemeButton theme={theme} toggle={toggle} />
        </div>

        {/* Separator */}
        <div className="mx-5 h-px bg-slate-100 dark:bg-slate-800" />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map(item => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <span className={`shrink-0 transition-colors ${
                  active
                    ? "text-slate-700 dark:text-slate-200"
                    : "text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                }`}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {active && (
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-slate-900 dark:bg-white" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Separator */}
        <div className="mx-5 h-px bg-slate-100 dark:bg-slate-800" />

        {/* User section */}
        <div className="px-3 py-4">
          <Link
            href="/configuracion"
            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 dark:bg-slate-100">
              <span className="text-xs font-bold text-white dark:text-slate-900">{userInitial}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">{userName}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">Cuenta personal</p>
            </div>
            <span className="text-slate-300 dark:text-slate-600 opacity-0 transition-opacity group-hover:opacity-100">
              <IconChevronRight />
            </span>
          </Link>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="lg:pl-64">
        <main className="min-h-screen px-4 pb-24 pt-5 sm:px-6 lg:pb-10 lg:pt-8">
          <div className="mx-auto max-w-5xl">

            {/* Mobile header */}
            <div className="mb-6 flex items-center justify-between lg:hidden">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
                  <span className="text-sm font-bold text-white dark:text-slate-900">F</span>
                </div>
                <span className="font-semibold text-slate-900 dark:text-white">Finanzas</span>
              </div>
              <ThemeButton theme={theme} toggle={toggle} />
            </div>

            {children}
          </div>
        </main>
      </div>

      {/* ── Bottom nav mobile ── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl">
          <div className="flex items-center justify-around px-2 py-1.5">
            {navItems.map(item => {
              const active = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all ${
                    active
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <span className={active ? "text-slate-900 dark:text-white" : "text-slate-400 dark:text-slate-500"}>
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-medium">{item.label}</span>
                  {active && (
                    <span className="h-1 w-1 rounded-full bg-slate-900 dark:bg-white" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </div>
  )
}
