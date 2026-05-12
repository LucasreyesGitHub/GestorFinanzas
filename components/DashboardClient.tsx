"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  LineChart, Line,
} from "recharts"

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
}

const fmt = (n: number) =>
  new Intl.NumberFormat("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const CAT_COLORS = ["#4a7d5a", "#6f9971", "#8faf97", "#d4a843", "#e8c97a", "#60a5fa", "#f87171"]

export function DashboardClient() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inputText, setInputText] = useState("")
  const [tipo, setTipo] = useState("Gasto")
  const [inputDate, setInputDate] = useState("")
  const [chartPeriod, setChartPeriod] = useState<"Mes" | "Año">("Mes")
  const [monthOffset, setMonthOffset] = useState(0)

  useEffect(() => { fetchGastos() }, [])

  async function fetchGastos() {
    setLoading(true)
    try {
      const res = await fetch("/api/gastos")
      if (!res.ok) throw new Error()
      setGastos(await res.json())
    } catch {
      setError("No se pudieron cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim()) return
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, string> = { raw: inputText.trim(), tipo }
      if (inputDate) body.created_at = new Date(inputDate).toISOString()
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || "No se pudo guardar")
      }
      setInputText("")
      setInputDate("")
      await fetchGastos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setSubmitting(false)
    }
  }

  // Current month reference
  const refMonth = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  }, [monthOffset])

  const monthLabel = useMemo(
    () => refMonth.toLocaleDateString("es-UY", { month: "long", year: "numeric" }),
    [refMonth]
  )

  const monthGastos = useMemo(() => {
    const from = refMonth
    const to = new Date(refMonth.getFullYear(), refMonth.getMonth() + 1, 1)
    return gastos.filter((g) => {
      const t = new Date(g.created_at).getTime()
      return t >= from.getTime() && t < to.getTime()
    })
  }, [gastos, refMonth])

  const stats = useMemo(() => {
    const ingresos = monthGastos.filter((g) => g.tipo === "Ingreso").reduce((s, g) => s + g.monto, 0)
    const gastosMes = monthGastos.filter((g) => g.tipo === "Gasto").reduce((s, g) => s + g.monto, 0)
    const ahorros = monthGastos.filter((g) => g.tipo === "Ahorro").reduce((s, g) => s + g.monto, 0)
    return { ingresos, gastos: gastosMes, ahorros, balance: ingresos - gastosMes }
  }, [monthGastos])

  // Category bar chart
  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {}
    monthGastos.filter((g) => g.tipo === "Gasto").forEach((g) => {
      const key = g.subcategoria ? `${g.categoria} - ${g.subcategoria}` : g.categoria
      totals[key] = (totals[key] || 0) + g.monto
    })
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [monthGastos])

  // Monthly trend (last 6 months)
  const trendData = useMemo(() => {
    const months: { label: string; gastos: number; ingresos: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setDate(1)
      d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const label = d.toLocaleDateString("es-UY", { month: "short" })
      const slice = gastos.filter((g) => {
        const t = new Date(g.created_at).getTime()
        return t >= from.getTime() && t < to.getTime()
      })
      months.push({
        label,
        gastos: slice.filter((g) => g.tipo === "Gasto").reduce((s, g) => s + g.monto, 0),
        ingresos: slice.filter((g) => g.tipo === "Ingreso").reduce((s, g) => s + g.monto, 0),
      })
    }
    return months
  }, [gastos])

  // Recent transactions (last 8)
  const recent = useMemo(
    () => [...gastos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8),
    [gastos]
  )

  return (
    <div className="space-y-5">
      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Principal</h2>
          <p className="mt-0.5 text-sm text-gray-500 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonthOffset((o) => o - 1)} className="rounded-lg p-2 hover:bg-white border border-transparent hover:border-black/[0.06] text-gray-400 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={() => setMonthOffset(0)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-white border border-transparent hover:border-black/[0.06] transition-all">Hoy</button>
          <button onClick={() => setMonthOffset((o) => o + 1)} className="rounded-lg p-2 hover:bg-white border border-transparent hover:border-black/[0.06] text-gray-400 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* Stats cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="mac-card p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Ingresos</p>
            <p className="mt-2 text-2xl font-semibold text-green-600">${fmt(stats.ingresos)}</p>
          </div>
          <div className="mac-card p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Gastos</p>
            <p className="mt-2 text-2xl font-semibold text-red-600">${fmt(stats.gastos)}</p>
          </div>
          <div className="mac-card p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Ahorros</p>
            <p className="mt-2 text-2xl font-semibold text-blue-600">${fmt(stats.ahorros)}</p>
          </div>
          <div className="mac-card p-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Balance</p>
            <p className={`mt-2 text-2xl font-semibold ${stats.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              ${fmt(stats.balance)}
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Category bar chart */}
        <div className="mac-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Gastos</p>
              <h3 className="text-base font-semibold text-gray-900">Por categoría</h3>
            </div>
            <span className="text-xs text-gray-400 capitalize">{monthLabel}</span>
          </div>
          {categoryData.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">Sin datos</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid stroke="rgba(0,0,0,0.04)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${fmt(v)}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={(v: number) => [`$${fmt(v)}`, "Monto"]} contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Monthly trend */}
        <div className="mac-card p-5">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Tendencia</p>
            <h3 className="text-base font-semibold text-gray-900">Últimos 6 meses</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${fmt(v)}`} />
              <Tooltip formatter={(v: number, name: string) => [`$${fmt(v)}`, name === "gastos" ? "Gastos" : "Ingresos"]} contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="ingresos" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} />
              <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500" />Ingresos</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500" />Gastos</span>
          </div>
        </div>
      </div>

      {/* Quick input + recent */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Input form */}
        <div className="mac-card p-5">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Registrar movimiento</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ej: pagué $419 de taxi, cobré $22813 de sueldo…"
              className="input-base"
              disabled={submitting}
            />
            <div className="flex flex-wrap gap-2">
              {["Gasto", "Ingreso", "Ahorro"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTipo(t)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    tipo === t
                      ? t === "Gasto" ? "bg-red-500 text-white"
                        : t === "Ingreso" ? "bg-green-500 text-white"
                        : "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {t}
                </button>
              ))}
              <input
                type="date"
                value={inputDate}
                onChange={(e) => setInputDate(e.target.value)}
                className="ml-auto rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-sage-500/50"
              />
            </div>
            <button type="submit" disabled={submitting || !inputText.trim()} className="btn-primary w-full">
              {submitting ? "Guardando…" : "Guardar"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>

        {/* Recent transactions */}
        <div className="mac-card p-5">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Recientes</h3>
          {loading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="skeleton h-12" />)}</div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Sin movimientos</p>
          ) : (
            <div className="space-y-1">
              {recent.map((g) => (
                <div key={g.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-800">{g.categoria}{g.subcategoria ? ` · ${g.subcategoria}` : ""}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(g.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                  <span className={`ml-3 shrink-0 text-sm font-semibold ${g.tipo === "Ingreso" ? "text-green-600" : g.tipo === "Ahorro" ? "text-blue-600" : "text-red-600"}`}>
                    {g.tipo === "Ingreso" ? "+" : "-"}${fmt(g.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
