"use client"

import { useEffect, useMemo, useState } from "react"

type Gasto = {
  id: string
  raw: string
  descripcion: string
  categoria: string
  monto: number
  tipo: string
  created_at: string
}

const categoryIcons: Record<string, string> = {
  Supermercado: "🛒",
  Transporte: "🚗",
  Servicios: "💡",
  Salud: "🩺",
  Restaurante: "🍽️",
  Entretenimiento: "🎬",
  Ropa: "👟",
  Educación: "📚",
  Hogar: "🏠",
  "Plazo Fijo": "💰",
  "Caja de Ahorro BROU": "🏦",
  "Caja de Ahorro Itaú": "🏛️",
  Efectivo: "💵",
  Criptomonedas: "₿",
  "Otro Ahorro": "🐷",
  Otro: "🧾",
}

const FILTERS = ["Todos", "Ingresos", "Gastos", "Ahorros"] as const
type Filter = typeof FILTERS[number]

export function MovementsClient() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<Filter>("Todos")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchGastos()
  }, [])

  async function fetchGastos() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/gastos")
      if (!res.ok) throw new Error("No se pudieron cargar las transacciones")
      const data = await res.json()
      setGastos(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setLoading(false)
    }
  }

  const filteredGastos = useMemo(() => {
    return gastos
      .filter((gasto) => {
        if (activeFilter === "Ingresos") return gasto.tipo === "Ingreso"
        if (activeFilter === "Gastos")   return gasto.tipo === "Gasto"
        if (activeFilter === "Ahorros")  return gasto.tipo === "Ahorro"
        return true
      })
      .filter((gasto) => {
        const query = search.toLowerCase()
        return (
          gasto.descripcion.toLowerCase().includes(query) ||
          gasto.categoria.toLowerCase().includes(query) ||
          gasto.raw.toLowerCase().includes(query)
        )
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [gastos, activeFilter, search])

  const groups = useMemo(() => {
    const buckets: Record<string, Gasto[]> = {}
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    filteredGastos.forEach((gasto) => {
      const date = new Date(gasto.created_at)
      const key = date.toDateString()
      if (!buckets[key]) buckets[key] = []
      buckets[key].push(gasto)
    })

    return Object.entries(buckets).map(([key, items]) => {
      const date = new Date(key)
      const label =
        date.toDateString() === today.toDateString()
          ? "Hoy"
          : date.toDateString() === yesterday.toDateString()
          ? "Ayer"
          : date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" })
      return { label, items }
    })
  }, [filteredGastos])

  async function handleDelete(id: string) {
    setError(null)
    try {
      const res = await fetch(`/api/gastos/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("No se pudo eliminar la transacción")
      await fetchGastos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    }
  }

  function tipoBadgeStyle(tipo: string): React.CSSProperties {
    if (tipo === "Ingreso") return { backgroundColor: "#2d5438", color: "#f0f4f1" }
    if (tipo === "Ahorro")  return { backgroundColor: "#0c4a6e", color: "#7dd3fc" }
    return { backgroundColor: "#78350f", color: "#fef3c7" }
  }

  return (
    <div className="space-y-8">
      <div className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Movimientos</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink-100">Historial completo</h2>
          </div>
          <p className="text-sm text-ink-400">{filteredGastos.length} registros</p>
        </div>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por categoría, descripción o monto"
            className="input-base flex-1"
          />
          <div className="flex gap-2">
            {FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setActiveFilter(option)}
                className="flex-1 whitespace-nowrap rounded-3xl px-3 py-3 text-sm font-semibold transition md:flex-none md:px-4"
                style={
                  activeFilter === option
                    ? { backgroundColor: "#4a7d5a", color: "#141311" }
                    : { backgroundColor: "rgba(255,255,255,0.05)", color: "#ccc9be" }
                }
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error ? <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}

      <div className="space-y-6">
        {loading ? (
          <div className="skeleton h-96" />
        ) : groups.length === 0 ? (
          <div className="glass-card p-8 text-center text-ink-400">No se encontraron movimientos.</div>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="glass-card p-6">
              <div className="mb-5 flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <h3 className="text-xl font-semibold text-ink-100">{group.label}</h3>
                  <p className="text-sm text-ink-400">{group.items.length} transacción{group.items.length === 1 ? "" : "es"}</p>
                </div>
              </div>
              <div className="space-y-4">
                {group.items.map((gasto) => (
                  <article key={gasto.id} className="group rounded-3xl border border-white/10 bg-ink-900/90 p-5 transition hover:-translate-y-0.5 hover:border-sage-500/30 hover:bg-white/5">
                    <div className="grid gap-4 md:grid-cols-[72px_1fr_auto] md:items-center">
                      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-ink-900 text-2xl">
                        {categoryIcons[gasto.categoria] ?? "🧾"}
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-400">
                          <span className="rounded-full bg-white/5 px-3 py-1">{gasto.categoria}</span>
                          <span
                            className="rounded-full px-3 py-1 text-xs font-semibold"
                            style={tipoBadgeStyle(gasto.tipo)}
                          >
                            {gasto.tipo}
                          </span>
                        </div>
                        <h4 className="text-lg font-semibold text-ink-100">{gasto.descripcion}</h4>
                        <p className="text-sm text-ink-400">{new Date(gasto.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</p>
                        <p className="truncate text-sm text-ink-400">{gasto.raw}</p>
                      </div>
                      <div className="flex flex-col items-end justify-between gap-3 text-right">
                        <span
                          className="rounded-3xl px-3 py-2 text-sm font-semibold"
                          style={tipoBadgeStyle(gasto.tipo)}
                        >
                          {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(gasto.monto)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDelete(gasto.id)}
                          className="rounded-3xl bg-ink-800 px-4 py-2 text-sm text-ink-200 transition hover:bg-ink-700"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  )
}
