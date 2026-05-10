"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

type Gasto = {
  id: string
  raw: string
  descripcion: string
  categoria: string
  monto: number
  tipo: string
  created_at: string
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(value)

const filters = ["Día", "Semana", "Mes"]

export function StatsClient() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [selectedFilter, setSelectedFilter] = useState("Semana")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch("/api/gastos")
      const data = await res.json()
      setGastos(data)
      setLoading(false)
    }
    load()
  }, [])

  const days = useMemo(() => {
    if (selectedFilter === "Día") return 1
    if (selectedFilter === "Mes") return 30
    return 7
  }, [selectedFilter])

  const filteredGastos = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - (days - 1))
    cutoff.setHours(0, 0, 0, 0)
    return gastos.filter((g) => new Date(g.created_at) >= cutoff)
  }, [gastos, days])

  const chartData = useMemo(() => {
    const today = new Date()
    return Array.from({ length: days }, (_, index) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (days - 1 - index))
      const label =
        selectedFilter === "Mes"
          ? date.toLocaleDateString("es-AR", { day: "numeric" })
          : date.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "")
      const amount = filteredGastos
        .filter((g) => new Date(g.created_at).toDateString() === date.toDateString())
        .reduce((sum, g) => sum + (g.tipo === "Ingreso" ? g.monto : -g.monto), 0)
      return { label, amount }
    })
  }, [filteredGastos, days, selectedFilter])

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {}
    filteredGastos
      .filter((g) => g.tipo === "Gasto")
      .forEach((g) => {
        totals[g.categoria] = (totals[g.categoria] || 0) + g.monto
      })
    return Object.entries(totals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  }, [filteredGastos])

  const totalBalance = useMemo(
    () => filteredGastos.reduce((sum, g) => sum + (g.tipo === "Ingreso" ? g.monto : -g.monto), 0),
    [filteredGastos],
  )

  const totalSpent = useMemo(
    () => filteredGastos.filter((g) => g.tipo === "Gasto").reduce((sum, g) => sum + g.monto, 0),
    [filteredGastos],
  )

  const totalEarned = useMemo(
    () => filteredGastos.filter((g) => g.tipo === "Ingreso").reduce((sum, g) => sum + g.monto, 0),
    [filteredGastos],
  )

  const totalSaved = useMemo(
    () => filteredGastos.filter((g) => g.tipo === "Ahorro").reduce((sum, g) => sum + g.monto, 0),
    [filteredGastos],
  )

  const insights = useMemo(() => {
    const expenses = filteredGastos.filter((g) => g.tipo === "Gasto")
    const avg = expenses.length ? expenses.reduce((sum, g) => sum + g.monto, 0) / expenses.length : 0
    const topCategory = categoryData[0]?.name || "Otro"
    return [
      `Tu mayor gasto es en ${topCategory}.`,
      `Tu gasto promedio por movimiento es ${formatCurrency(avg)}.`,
      totalSaved > 0
        ? `Ahorraste ${formatCurrency(totalSaved)} en este período. ¡Bien hecho!`
        : "Empezá a registrar tus ahorros para seguirlos acá.",
    ]
  }, [filteredGastos, categoryData, totalSaved])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-24" />
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="skeleton h-40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Resumen</p>
              <h2 className="mt-2 text-3xl font-semibold text-ink-100">Análisis financiero</h2>
              <p className="mt-3 max-w-2xl text-sm text-ink-400">Visualiza cómo evoluciona tu flujo de caja y recibe ideas inteligentes para optimizar tus ahorros.</p>
            </div>
            <div className="rounded-3xl bg-ink-900/80 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Periodo activo</p>
              <p className="mt-2 text-xl font-semibold text-ink-100">{selectedFilter}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-ink-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Balance</p>
              <p className="mt-3 text-2xl font-semibold text-ink-100">{formatCurrency(totalBalance)}</p>
            </div>
            <div className="rounded-3xl bg-ink-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Ingresos</p>
              <p className="mt-3 text-2xl font-semibold text-sage-300">{formatCurrency(totalEarned)}</p>
            </div>
            <div className="rounded-3xl bg-ink-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Gastos</p>
              <p className="mt-3 text-2xl font-semibold text-gold-300">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="rounded-3xl bg-ink-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Ahorros</p>
              <p className="mt-3 text-2xl font-semibold" style={{ color: "#7dd3fc" }}>{formatCurrency(totalSaved)}</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Filtro de tiempo</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSelectedFilter(item)}
                className={`rounded-3xl px-4 py-3 text-sm font-semibold transition ${
                  selectedFilter === item
                    ? "bg-sage-500 text-ink-950"
                    : "bg-white/5 text-ink-200 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-ink-900/80 p-5">
            <p className="text-sm text-ink-400">Insights</p>
            <ul className="mt-4 space-y-3 text-sm text-ink-200">
              {insights.map((insight, index) => (
                <li key={index} className="rounded-3xl bg-white/5 p-4">{insight}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Balance</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-100">Evolución del balance</h3>
            </div>
            <p className="text-sm text-ink-400">Últimos {days} días</p>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#c4c2b9", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#c4c2b9", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: "#111317", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }} />
                <Line type="monotone" dataKey="amount" stroke="#4a7d5a" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Gastos por categoría</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-100">Distribución</h3>
            </div>
            <p className="text-sm text-ink-400">Top 5 categorías</p>
          </div>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: "#111317", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }} />
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={4} stroke="rgba(255,255,255,0.08)">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={["#4a7d5a", "#d4a843", "#8faf97", "#f0b94e", "#7b8f68"][index % 5]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Gastos</p>
            <h3 className="mt-2 text-2xl font-semibold text-ink-100">Gastos por día</h3>
          </div>
          <p className="text-sm text-ink-400">Últimos {days} días</p>
        </div>
        <div className="mt-6 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#c4c2b9", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#c4c2b9", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ background: "#111317", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }} />
              <Bar dataKey="amount" fill="#d4a843" radius={[12, 12, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
