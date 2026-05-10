"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { parseGasto } from "@/lib/parseGasto"

type Gasto = {
  id: string
  raw: string
  descripcion: string
  categoria: string
  monto: number
  tipo: string
  created_at: string
}

const formatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
})

const examples = [
  "pagué $1200 de luz",
  "cobré 4500 por sueldo",
  "deposité $5000 en plazo fijo",
  "guardé 3000 en BROU",
]

function detectTipo(text: string): string {
  const normalized = text.toLowerCase()
  if (/\b(plazo fijo|brou|itau|itaú|cripto|bitcoin|btc|ethereum|alcancía|alcancia)\b/.test(normalized)) {
    return "Ahorro"
  }
  if (/\b(ahorro|ahorré|ahorre|guardé en|guarde en|deposité en|deposite en)\b/.test(normalized)) {
    return "Ahorro"
  }
  if (/\b(cobré|cobro|cobrar|recibí|recibi|ingreso|recibo|sueldo|salario)\b/.test(normalized)) {
    return "Ingreso"
  }
  if (/\b(pagué|pague|pagado|gast[eé]|compr[ée]|servicio|factura|pago)\b/.test(normalized)) {
    return "Gasto"
  }
  return "Gasto"
}

export function DashboardClient({ userEmail }: { userEmail: string }) {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [rawInput, setRawInput] = useState("")
  const [tipo, setTipo] = useState("Gasto")
  const [tipoManual, setTipoManual] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const parsedInput = useMemo(() => parseGasto(rawInput), [rawInput])

  const totalBalance = useMemo(
    () => gastos.reduce((total, g) => (g.tipo === "Ingreso" ? total + g.monto : total - g.monto), 0),
    [gastos],
  )

  const totalGastos = useMemo(
    () => gastos.filter((g) => g.tipo === "Gasto").reduce((sum, g) => sum + g.monto, 0),
    [gastos],
  )

  const totalIngresos = useMemo(
    () => gastos.filter((g) => g.tipo === "Ingreso").reduce((sum, g) => sum + g.monto, 0),
    [gastos],
  )

  const totalAhorros = useMemo(
    () => gastos.filter((g) => g.tipo === "Ahorro").reduce((sum, g) => sum + g.monto, 0),
    [gastos],
  )

  const weeklyData = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, offset) => {
      const day = new Date(today)
      day.setDate(today.getDate() - (6 - offset))
      const label = day.toLocaleDateString("es-AR", { weekday: "short" }).replace(".", "")
      const amount = gastos
        .filter((g) => new Date(g.created_at).toDateString() === day.toDateString())
        .reduce((sum, g) => sum + (g.tipo === "Ingreso" ? g.monto : -g.monto), 0)
      return { label, amount }
    })
  }, [gastos])

  const weeklyMax = useMemo(
    () => Math.max(...weeklyData.map((item) => Math.abs(item.amount)), 1),
    [weeklyData],
  )

  const trendLabel = useMemo(
    () => (totalBalance >= 0 ? "Tendencia positiva" : "Tendencia decreciente"),
    [totalBalance],
  )

  useEffect(() => {
    if (!rawInput.trim()) {
      setTipo("Gasto")
      setTipoManual(false)
      return
    }
    if (!tipoManual) {
      setTipo(detectTipo(rawInput))
    }
  }, [rawInput, tipoManual])

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

  function handleTipoClick(nuevoTipo: string) {
    setTipo(nuevoTipo)
    setTipoManual(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (!rawInput.trim()) {
      setError("Ingresá una descripción o texto del movimiento.")
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw: rawInput.trim(), tipo }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "No se pudo guardar la transacción")
      }
      setRawInput("")
      setTipoManual(false)
      await fetchGastos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setSubmitting(false)
    }
  }

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

  async function handleClearAll() {
    setError(null)
    const confirmed = window.confirm("¿Estás seguro que querés borrar todos los registros? Esta acción no se puede deshacer.")
    if (!confirmed) return
    try {
      const res = await fetch("/api/gastos", { method: "DELETE" })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.error || "No se pudo borrar el historial")
      }
      await fetchGastos()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="glass-card p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Balance total</p>
              <h2 className="mt-3 text-4xl font-semibold text-ink-100">{formatter.format(totalBalance)}</h2>
              <p className="mt-3 max-w-xl text-sm text-ink-400 leading-relaxed">
                Tu estado financiero actualizado en tiempo real. Guarda movimientos, monitorea ingresos y controla gastos sin fricciones.
              </p>
            </div>
            <div className="rounded-3xl bg-ink-900/90 p-4 text-center">
              <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Tendencia</p>
              <p className="mt-3 text-2xl font-semibold text-sage-300">{trendLabel}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-3xl bg-ink-900/70 p-5">
              <p className="text-sm text-ink-400">Ingresos</p>
              <p className="mt-2 text-2xl font-semibold text-sage-300">{formatter.format(totalIngresos)}</p>
            </div>
            <div className="rounded-3xl bg-ink-900/70 p-5">
              <p className="text-sm text-ink-400">Gastos</p>
              <p className="mt-2 text-2xl font-semibold text-gold-300">{formatter.format(totalGastos)}</p>
            </div>
            <div className="rounded-3xl bg-ink-900/70 p-5">
              <p className="text-sm text-ink-400">Ahorros</p>
              <p className="mt-2 text-2xl font-semibold" style={{ color: "#7dd3fc" }}>{formatter.format(totalAhorros)}</p>
            </div>
            <div className="rounded-3xl bg-ink-900/70 p-5">
              <p className="text-sm text-ink-400">Movimientos</p>
              <p className="mt-2 text-2xl font-semibold text-ink-100">{gastos.length}</p>
            </div>
          </div>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-ink-900/80 p-5">
            <p className="text-sm text-ink-400">Resumen semanal</p>
            <div className="mt-4 grid gap-3 md:grid-cols-7">
              {weeklyData.map((item) => {
                const width = Math.max(12, Math.min(100, (Math.abs(item.amount) / weeklyMax) * 100))
                const positive = item.amount >= 0
                return (
                  <div key={item.label} className="flex flex-col items-center gap-2 text-center">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                      <div
                        className={`h-full rounded-full ${positive ? "bg-sage-400" : "bg-gold-400"}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-ink-400">{item.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Entrada rápida</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink-100">Registrar movimiento</h3>
            </div>
            <div className="rounded-3xl bg-ink-900/80 px-4 py-3 text-sm text-ink-200">
              <p className="font-semibold text-sage-300">Autodetecta</p>
              <p className="text-ink-400">tipo y categoría</p>
            </div>
          </div>

          <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
            <input
              type="text"
              value={rawInput}
              onChange={(event) => setRawInput(event.target.value)}
              placeholder="Ej: pagué $1200 de luz · cobré sueldo · deposité en BROU"
              className="input-base"
            />

            <div className="flex gap-2">
              {["Gasto", "Ingreso", "Ahorro"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTipoClick(t)}
                  className="flex-1 rounded-3xl px-4 py-3 text-sm font-semibold transition"
                  style={
                    tipo === t
                      ? t === "Ahorro"
                        ? { backgroundColor: "#0369a1", color: "#f0f9ff" }
                        : t === "Ingreso"
                        ? { backgroundColor: "#4a7d5a", color: "#f0f4f1" }
                        : { backgroundColor: "#b8891e", color: "#fefce8" }
                      : { backgroundColor: "rgba(255,255,255,0.05)", color: "#ccc9be" }
                  }
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-3xl bg-ink-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Monto</p>
                <p className="mt-2 text-lg font-semibold text-ink-100">
                  {parsedInput.monto ? formatter.format(parsedInput.monto) : "—"}
                </p>
              </div>
              <div className="rounded-3xl bg-ink-900/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-ink-400">Categoría</p>
                <p className="mt-2 text-lg font-semibold text-ink-100">{parsedInput.categoria}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => { setRawInput(example); setTipoManual(false) }}
                  className="rounded-3xl border border-white/10 bg-ink-900/80 px-4 py-3 text-left text-sm text-ink-200 transition hover:border-sage-400 hover:bg-white/5"
                >
                  {example}
                </button>
              ))}
            </div>

            {error ? <p className="text-sm text-gold-300">{error}</p> : null}

            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Guardando…" : "Guardar movimiento"}
            </button>
          </form>
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-display text-xl text-ink-100">Historial rápido</h3>
            <p className="mt-2 text-ink-400 text-sm">Tus transacciones recientes, agrupadas y listas para analizar.</p>
          </div>
          <Link
            href="/movimientos"
            className="rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-ink-100 transition hover:bg-white/10"
          >
            Ver todos
          </Link>
        </div>

        <div className="mt-6 grid gap-4">
          {loading ? (
            <div className="skeleton h-24" />
          ) : gastos.length === 0 ? (
            <div className="rounded-3xl border border-ink-700 bg-ink-900 px-4 py-6 text-center text-ink-400">No hay movimientos para mostrar.</div>
          ) : (
            gastos.slice(0, 3).map((gasto) => (
              <article key={gasto.id} className="group rounded-3xl border border-white/10 bg-ink-900/80 p-5 transition hover:-translate-y-0.5 hover:border-sage-500/30 hover:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-ink-400">{gasto.categoria}</p>
                    <h4 className="mt-2 text-lg font-semibold text-ink-100">{gasto.descripcion}</h4>
                    <p className="mt-2 text-sm text-ink-400">{new Date(gasto.created_at).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</p>
                  </div>
                  <div
                    className="rounded-3xl px-3 py-2 text-sm font-semibold"
                    style={
                      gasto.tipo === "Ingreso"
                        ? { backgroundColor: "#2d5438", color: "#f0f4f1" }
                        : gasto.tipo === "Ahorro"
                        ? { backgroundColor: "#0c4a6e", color: "#7dd3fc" }
                        : { backgroundColor: "#78350f", color: "#fef3c7" }
                    }
                  >
                    {formatter.format(gasto.monto)}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  )
}
