"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ThemeToggle } from "./ThemeToggle"

const navItems = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Estadísticas", href: "/estadisticas", icon: "📊" },
  { label: "Movimientos", href: "/movimientos", icon: "📜" },
  { label: "Configuración", href: "/configuracion", icon: "⚙️" },
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(74,125,90,0.18),transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(255,173,73,0.12),transparent_25%),#090b0f] text-ink-50">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:flex-row lg:px-8">
        <aside className="hidden w-72 shrink-0 flex-col gap-6 rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_40px_120px_-80px_rgba(0,0,0,0.6)] backdrop-blur-xl lg:flex">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Fintech</p>
            <h1 className="text-3xl font-semibold text-ink-100">Finanzas</h1>
            <p className="text-sm text-ink-400">
              Controla tu dinero con claridad, sin ruido y en segundos.
            </p>
          </div>

          <div className="space-y-3 rounded-[28px] bg-ink-900/80 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Navegación</p>
            <div className="space-y-2">
              {navItems.map((item) => {
                const active = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                      active
                        ? "bg-sage-500 text-ink-950"
                        : "text-ink-200 hover:bg-white/5 hover:text-ink-50"
                    }`}
                  >
                    <span>{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="mt-auto">
            <ThemeToggle />
          </div>
        </aside>

        <main className="flex-1">
          <div className="flex items-center justify-between gap-4 rounded-[32px] border border-white/10 bg-white/5 p-5 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.45)] backdrop-blur-xl lg:hidden">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Fintech</p>
              <h2 className="text-xl font-semibold text-ink-100">Finanzas</h2>
            </div>
            <ThemeToggle />
          </div>

          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex gap-2 border-t border-white/10 bg-ink-900/95 px-4 py-3 backdrop-blur-xl lg:hidden">
        {navItems.map((item) => {
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center justify-center rounded-3xl px-3 py-2 text-[11px] transition ${
                active ? "bg-sage-500 text-ink-950" : "text-ink-300 hover:bg-white/5 hover:text-ink-100"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
