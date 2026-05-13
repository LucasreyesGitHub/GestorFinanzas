"use client"

import { useEffect, useMemo, useState } from "react"

type Gasto = {
  id: string
  raw: string
  descripcion: string
  categoria: string
  subcategoria: string
  monto: number
  tipo: string
  moneda: string
  created_at: string
  es_transferencia: number
}

type DateFilter = "Todos" | "Día" | "Semana" | "Mes" | "Año"
type TipoFilter = "Todos" | "Gastos" | "Ingresos" | "Ahorros"

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function formatFecha(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function getDia(iso: string) {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "-"
  return d.toLocaleDateString("es-UY", { weekday: "long" })
}

function startOf(unit: "day" | "week" | "month" | "year", ref = new Date()) {
  const d = new Date(ref)
  if (unit === "day") { d.setHours(0, 0, 0, 0); return d }
  if (unit === "week") { const day = d.getDay(); d.setDate(d.getDate() - day); d.setHours(0, 0, 0, 0); return d }
  if (unit === "month") { d.setDate(1); d.setHours(0, 0, 0, 0); return d }
  d.setMonth(0, 1); d.setHours(0, 0, 0, 0); return d
}

export function MovementsClient() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [search, setSearch] = useState("")
  const [dateFilter, setDateFilter] = useState<DateFilter>("Mes")
  const [tipoFilter, setTipoFilter] = useState<TipoFilter>("Todos")
  const [monthOffset, setMonthOffset] = useState(0) // 0 = current month
  const [yearOffset, setYearOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchGastos() }, [])

  async function fetchGastos() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/gastos")
      if (!res.ok) throw new Error("No se pudieron cargar los movimientos")
      const data = await res.json()
      setGastos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/gastos/${id}`, { method: "DELETE" })
      setGastos((prev) => prev.filter((g) => g.id !== id))
    } catch {
      setError("No se pudo eliminar")
    }
  }

  const refDate = useMemo(() => {
    const now = new Date()
    if (dateFilter === "Mes") {
      const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
      return d
    }
    if (dateFilter === "Año") {
      return new Date(now.getFullYear() + yearOffset, 0, 1)
    }
    return now
  }, [dateFilter, monthOffset, yearOffset])

  const periodLabel = useMemo(() => {
    if (dateFilter === "Mes") {
      return refDate.toLocaleDateString("es-UY", { month: "long", year: "numeric" })
    }
    if (dateFilter === "Año") return refDate.getFullYear().toString()
    return ""
  }, [dateFilter, refDate])

  const filtered = useMemo(() => {
    let list = gastos

    // Date filter
    if (dateFilter !== "Todos") {
      let from: Date
      let to: Date

      if (dateFilter === "Día") {
        from = startOf("day")
        to = new Date(from.getTime() + 86400000)
      } else if (dateFilter === "Semana") {
        from = startOf("week")
        to = new Date(from.getTime() + 7 * 86400000)
      } else if (dateFilter === "Mes") {
        from = new Date(refDate.getFullYear(), refDate.getMonth(), 1)
        to = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 1)
      } else {
        from = new Date(refDate.getFullYear(), 0, 1)
        to = new Date(refDate.getFullYear() + 1, 0, 1)
      }

      list = list.filter((g) => {
        const t = new Date(g.created_at).getTime()
        return t >= from.getTime() && t < to.getTime()
      })
    }

    // Tipo filter
    if (tipoFilter === "Gastos") list = list.filter((g) => g.tipo === "Gasto")
    else if (tipoFilter === "Ingresos") list = list.filter((g) => g.tipo === "Ingreso")
    else if (tipoFilter === "Ahorros") list = list.filter((g) => g.tipo === "Ahorro")

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((g) =>
        g.categoria?.toLowerCase().includes(q) ||
        g.subcategoria?.toLowerCase().includes(q) ||
        g.descripcion?.toLowerCase().includes(q)
      )
    }

    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [gastos, dateFilter, tipoFilter, search, refDate])

  const totals = useMemo(() => ({
    ingresos: filtered.filter((g) => g.tipo === "Ingreso").reduce((s, g) => s + g.monto, 0),
    gastos: filtered.filter((g) => g.tipo === "Gasto").reduce((s, g) => s + g.monto, 0),
    ahorros: filtered.filter((g) => g.tipo === "Ahorro").reduce((s, g) => s + g.monto, 0),
  }), [filtered])

  const fmt = (n: number) => new Intl.NumberFormat("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Historial</h2>
        <p className="mt-1 text-sm text-gray-500">{filtered.length} movimientos</p>
      </div>

      {/* Filters */}
      <div className="mac-card p-4 space-y-4">
        {/* Date filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {(["Todos", "Día", "Semana", "Mes", "Año"] as DateFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => { setDateFilter(f); setMonthOffset(0); setYearOffset(0) }}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                dateFilter === f
                  ? "bg-sage-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}

          {/* Month navigator */}
          {dateFilter === "Mes" && (
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setMonthOffset((o) => o - 1)} className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="min-w-[120px] text-center text-sm font-medium text-gray-700 capitalize">{periodLabel}</span>
              <button onClick={() => setMonthOffset((o) => o + 1)} className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}

          {/* Year navigator */}
          {dateFilter === "Año" && (
            <div className="ml-auto flex items-center gap-1">
              <button onClick={() => setYearOffset((o) => o - 1)} className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
              </button>
              <span className="min-w-[60px] text-center text-sm font-medium text-gray-700">{periodLabel}</span>
              <button onClick={() => setYearOffset((o) => o + 1)} className="rounded-lg p-1.5 hover:bg-gray-100 text-gray-500">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* Tipo + search */}
        <div className="flex flex-wrap gap-2">
          {(["Todos", "Gastos", "Ingresos", "Ahorros"] as TipoFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setTipoFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                tipoFilter === f
                  ? f === "Gastos" ? "bg-red-500 text-white"
                  : f === "Ingresos" ? "bg-green-500 text-white"
                  : f === "Ahorros" ? "bg-blue-500 text-white"
                  : "bg-gray-800 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoría o descripción…"
            className="ml-auto flex-1 min-w-[180px] rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-1.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-sage-500/50 focus:ring-1 focus:ring-sage-500/20"
          />
        </div>

        {/* Totals row */}
        <div className="flex flex-wrap gap-4 border-t border-black/[0.06] pt-3 text-sm">
          <span className="text-gray-500">Ingresos: <strong className="text-green-600">${fmt(totals.ingresos)}</strong></span>
          <span className="text-gray-500">Gastos: <strong className="text-red-600">${fmt(totals.gastos)}</strong></span>
          <span className="text-gray-500">Ahorros: <strong className="text-blue-600">${fmt(totals.ahorros)}</strong></span>
          <span className="text-gray-500">Balance: <strong className={totals.ingresos - totals.gastos >= 0 ? "text-green-600" : "text-red-600"}>${fmt(totals.ingresos - totals.gastos)}</strong></span>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      <div className="mac-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-400">Cargando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-sm text-gray-400">No hay movimientos para el período seleccionado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] bg-gray-50/80">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Día</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Subcategoría</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Ingresos</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Moneda</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Tipo</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04]">
                {filtered.map((g) => (
                  <tr key={g.id} className="group hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatFecha(g.created_at)}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize whitespace-nowrap">{getDia(g.created_at)}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                      {g.tipo !== "Ingreso" ? `$${fmt(g.monto)}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{g.categoria}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{g.subcategoria || "-"}</td>
                    <td className="px-4 py-3 text-right font-medium text-green-700 whitespace-nowrap">
                      {g.tipo === "Ingreso" ? `$${fmt(g.monto)}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{g.moneda || "UY"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {g.es_transferencia
                        ? <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">Transferencia</span>
                        : g.tipo === "Ingreso" ? <span className="badge-ingreso">Ingreso</span>
                        : g.tipo === "Ahorro"  ? <span className="badge-ahorro">Ahorro</span>
                        : <span className="badge-gasto">Gasto</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(g.id)}
                        className="hidden group-hover:inline-flex items-center justify-center rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        title="Eliminar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
