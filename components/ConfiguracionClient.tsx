"use client"

import { signOut } from "next-auth/react"
import { useEffect, useState } from "react"

type Cuenta = { id: string; nombre: string; banco: string; tipo: string; moneda: string; saldo_actual: number }
type Stats  = { total: number; gastos: number; ingresos: number; ahorros: number; desde: string | null }

type Props = { userName: string | null | undefined; userEmail: string | null | undefined }

const fmt = (n: number) => new Intl.NumberFormat("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)
const fmtDec = (n: number) => new Intl.NumberFormat("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const BANCO_COLORS: Record<string, string> = {
  BROU: "bg-blue-100 text-blue-700",
  ITAU: "bg-orange-100 text-orange-700",
  ITAÚ: "bg-orange-100 text-orange-700",
  Santander: "bg-red-100 text-red-700",
}

export function ConfiguracionClient({ userName, userEmail }: Props) {
  const [cuentas, setCuentas] = useState<Cuenta[]>([])
  const [stats, setStats]     = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/cuentas").then(r => r.ok ? r.json() : []),
      fetch("/api/gastos").then(r => r.ok ? r.json() : []),
    ]).then(([cData, gData]: [Cuenta[], Array<{ tipo: string; monto: number; created_at: string }>]) => {
      setCuentas(cData)
      if (gData.length > 0) {
        const dates = gData.map(g => g.created_at).sort()
        setStats({
          total:    gData.length,
          gastos:   gData.filter(g => g.tipo === "Gasto").reduce((s, g) => s + g.monto, 0),
          ingresos: gData.filter(g => g.tipo === "Ingreso").reduce((s, g) => s + g.monto, 0),
          ahorros:  gData.filter(g => g.tipo === "Ahorro").reduce((s, g) => s + g.monto, 0),
          desde:    dates[0]?.slice(0, 10) ?? null,
        })
      } else {
        setStats({ total: 0, gastos: 0, ingresos: 0, ahorros: 0, desde: null })
      }
    }).finally(() => setLoading(false))
  }, [])

  async function handleClearAll() {
    if (!confirm("¿Borrar TODOS los registros financieros? Esta acción no se puede deshacer.")) return
    await fetch("/api/gastos", { method: "DELETE" })
    setStats({ total: 0, gastos: 0, ingresos: 0, ahorros: 0, desde: null })
  }

  const initials = (userName ?? userEmail ?? "?").slice(0, 2).toUpperCase()

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Configuración</h2>
        <p className="mt-0.5 text-sm text-gray-500">Tu perfil y ajustes de la aplicación.</p>
      </div>

      {/* ── Perfil ── */}
      <div className="mac-card p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Perfil</p>
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-500 text-lg font-bold text-white">
            {initials}
          </div>
          <div>
            {userName && <p className="font-semibold text-gray-900">{userName}</p>}
            <p className="text-sm text-gray-500">{userEmail}</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>

      {/* ── Estadísticas de datos ── */}
      <div className="mac-card p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Resumen de datos</p>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="skeleton h-16"/>)}</div>
        ) : stats && stats.total > 0 ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-400">Movimientos</p>
                <p className="mt-1 text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="rounded-xl bg-green-50 p-3">
                <p className="text-xs text-gray-400">Total ingresos</p>
                <p className="mt-1 text-xl font-bold text-green-700">${fmt(stats.ingresos)}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3">
                <p className="text-xs text-gray-400">Total gastos</p>
                <p className="mt-1 text-xl font-bold text-red-700">${fmt(stats.gastos)}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3">
                <p className="text-xs text-gray-400">Total ahorros</p>
                <p className="mt-1 text-xl font-bold text-blue-700">${fmt(stats.ahorros)}</p>
              </div>
            </div>
            {stats.desde && (
              <p className="mt-3 text-xs text-gray-400">Historial desde {new Date(stats.desde).toLocaleDateString("es-UY", { day: "2-digit", month: "long", year: "numeric" })}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-400">Sin movimientos registrados aún.</p>
        )}
      </div>

      {/* ── Cuentas ── */}
      <div className="mac-card p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Cuentas configuradas</p>
        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <div key={i} className="skeleton h-14"/>)}</div>
        ) : cuentas.length === 0 ? (
          <p className="text-sm text-gray-400">No hay cuentas. Agregá una desde el dashboard.</p>
        ) : (
          <div className="space-y-2">
            {cuentas.map(c => {
              const colorClass = BANCO_COLORS[c.banco] ?? "bg-gray-100 text-gray-700"
              const isNeg = c.saldo_actual < 0
              return (
                <div key={c.id} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-bold uppercase ${colorClass}`}>{c.banco}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.nombre}</p>
                      <p className="text-xs text-gray-400">{c.tipo} · {c.moneda}</p>
                    </div>
                  </div>
                  <p className={`text-sm font-semibold tabular-nums ${isNeg ? "text-red-600" : "text-gray-900"}`}>
                    {c.moneda === "USD" ? "U$S " : "$"}{fmtDec(Math.abs(c.saldo_actual))}
                  </p>
                </div>
              )
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-gray-400">Para editar cuentas y saldos, usá las tarjetas en el dashboard principal.</p>
      </div>

      {/* ── Sobre la app ── */}
      <div className="mac-card p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Sobre la app</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Almacenamiento", value: "Turso (libSQL)", desc: "Base de datos serverless" },
            { label: "Autenticación", value: "NextAuth.js", desc: "Sesión segura" },
            { label: "Versión", value: "2.0", desc: "Multi-cuenta + Analytics" },
          ].map(item => (
            <div key={item.label} className="rounded-xl bg-gray-50 p-3">
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{item.value}</p>
              <p className="text-xs text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Zona peligrosa ── */}
      <div className="mac-card border-red-100 p-5">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-400">Zona peligrosa</p>
        <p className="mb-4 text-sm text-gray-500">Estas acciones son irreversibles. Procedé con cuidado.</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleClearAll}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            Borrar todos los movimientos
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}
