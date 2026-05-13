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
  cuenta_id: string
  es_transferencia: number
}

type Cuenta = {
  id: string
  nombre: string
  banco: string
  tipo: string
  moneda: string
  saldo_inicial: number
  saldo_actual: number
  orden: number
}

// ── Formatters ──────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const fmtDec = (n: number) =>
  new Intl.NumberFormat("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const CAT_COLORS = ["#4a7d5a", "#6f9971", "#8faf97", "#d4a843", "#e8c97a", "#60a5fa", "#f87171"]

const BANCO_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  BROU:      { bg: "bg-blue-50",   border: "border-blue-200",   label: "text-blue-700" },
  ITAU:      { bg: "bg-orange-50", border: "border-orange-200", label: "text-orange-700" },
  ITAÚ:      { bg: "bg-orange-50", border: "border-orange-200", label: "text-orange-700" },
  Santander: { bg: "bg-red-50",    border: "border-red-200",    label: "text-red-700" },
  Scotiabank:{ bg: "bg-red-50",    border: "border-red-200",    label: "text-red-700" },
}
const bancoColor = (banco: string) =>
  BANCO_COLORS[banco] ?? { bg: "bg-gray-50", border: "border-gray-200", label: "text-gray-700" }

const BANCOS = ["BROU", "ITAÚ", "Santander", "Scotiabank", "OCA", "Otro"]
const TIPOS  = ["Caja de Ahorro", "Cuenta Corriente", "Caja de Ahorro Joven", "Depósito"]
const EMPTY_FORM = { banco: "BROU", tipo: "Caja de Ahorro", moneda: "UY", saldo_inicial: "", nombre: "" }

// ── Health score ring ───────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 36, c = 2 * Math.PI * r
  const color = score >= 80 ? "#22c55e" : score >= 65 ? "#4a7d5a" : score >= 45 ? "#d4a843" : "#ef4444"
  const label = score >= 80 ? "Excelente" : score >= 65 ? "Bueno" : score >= 45 ? "Regular" : score >= 25 ? "A mejorar" : "Crítico"
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="#f3f4f6" strokeWidth="7" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
          strokeLinecap="round" transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text x="44" y="50" textAnchor="middle" fill="#111827" fontSize="22" fontWeight="700">{score}</text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-1.5 w-full rounded-full bg-gray-100">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Component ───────────────────────────────────────────────────────────────
export function DashboardClient() {
  const [gastos, setGastos]           = useState<Gasto[]>([])
  const [cuentas, setCuentas]         = useState<Cuenta[]>([])
  const [loading, setLoading]         = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [inputText, setInputText]     = useState("")
  const [tipo, setTipo]               = useState("Gasto")
  const [inputDate, setInputDate]     = useState("")
  const [monthOffset, setMonthOffset] = useState(0)
  const [selectedCuenta, setSelectedCuenta] = useState("")

  const [modal, setModal]             = useState<"none" | "add" | "edit">("none")
  const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null)
  const [cuentaForm, setCuentaForm]   = useState(EMPTY_FORM)
  const [savingCuenta, setSavingCuenta] = useState(false)
  const [cuentaError, setCuentaError] = useState<string | null>(null)

  const [markingTransfer, setMarkingTransfer] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [gRes, cRes] = await Promise.all([fetch("/api/gastos"), fetch("/api/cuentas")])
      if (gRes.ok) setGastos(await gRes.json())
      if (cRes.ok) {
        const data: Cuenta[] = await cRes.json()
        setCuentas(data)
        if (data.length > 0 && !selectedCuenta) setSelectedCuenta(data[0].id)
      }
    } catch {
      setError("No se pudieron cargar los datos")
    } finally {
      setLoading(false)
    }
  }

  async function fetchCuentas() {
    const res = await fetch("/api/cuentas")
    if (res.ok) setCuentas(await res.json())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim() || !selectedCuenta) return
    setSubmitting(true); setError(null)
    try {
      const body: Record<string, string> = { raw: inputText.trim(), tipo, cuenta_id: selectedCuenta }
      if (inputDate) body.created_at = new Date(inputDate).toISOString()
      const res = await fetch("/api/gastos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "No se pudo guardar")
      setInputText(""); setInputDate("")
      await Promise.all([fetchAll(), fetchCuentas()])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally { setSubmitting(false) }
  }

  async function markTransfer(gastoId: string, ingresoId: string) {
    setMarkingTransfer(gastoId)
    try {
      await Promise.all([
        fetch(`/api/gastos/${gastoId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ es_transferencia: 1 }) }),
        fetch(`/api/gastos/${ingresoId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ es_transferencia: 1 }) }),
      ])
      await fetchAll()
    } finally { setMarkingTransfer(null) }
  }

  function openAdd() { setCuentaForm(EMPTY_FORM); setCuentaError(null); setModal("add") }
  function openEdit(c: Cuenta) { setCuentaForm({ banco: c.banco, tipo: c.tipo, moneda: c.moneda, saldo_inicial: String(c.saldo_inicial), nombre: c.nombre }); setCuentaError(null); setEditingCuenta(c); setModal("edit") }
  function closeModal() { setModal("none"); setEditingCuenta(null) }

  function autoNombre(f: typeof EMPTY_FORM) {
    if (f.nombre.trim()) return f.nombre.trim()
    return `${f.banco} · ${f.tipo === "Caja de Ahorro" ? "CA" : f.tipo} ${f.moneda === "USD" ? "Dólares" : "Pesos"}`
  }

  async function handleSaveCuenta() {
    setSavingCuenta(true); setCuentaError(null)
    try {
      const saldo = parseFloat(cuentaForm.saldo_inicial) || 0
      const nombre = autoNombre(cuentaForm)
      if (modal === "add") {
        const res = await fetch("/api/cuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cuentaForm, nombre, saldo_inicial: saldo }) })
        if (!res.ok) throw new Error((await res.json()).error || "Error al crear")
      } else if (modal === "edit" && editingCuenta) {
        const res = await fetch(`/api/cuentas/${editingCuenta.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...cuentaForm, nombre, saldo_inicial: saldo }) })
        if (!res.ok) throw new Error((await res.json()).error || "Error al guardar")
      }
      await fetchCuentas(); closeModal()
    } catch (err) { setCuentaError(err instanceof Error ? err.message : "Error inesperado")
    } finally { setSavingCuenta(false) }
  }

  async function handleDeleteCuenta() {
    if (!editingCuenta) return
    if (!confirm(`¿Eliminar "${editingCuenta.nombre}"?`)) return
    setSavingCuenta(true)
    try {
      await fetch(`/api/cuentas/${editingCuenta.id}`, { method: "DELETE" })
      if (selectedCuenta === editingCuenta.id) setSelectedCuenta(cuentas.find(c => c.id !== editingCuenta.id)?.id ?? "")
      await fetchCuentas(); closeModal()
    } finally { setSavingCuenta(false) }
  }

  // ── Derived data ──────────────────────────────────────────────────────────
  const realGastos = useMemo(() => gastos.filter(g => !g.es_transferencia), [gastos])

  const refMonth = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  }, [monthOffset])

  const monthLabel = useMemo(
    () => refMonth.toLocaleDateString("es-UY", { month: "long", year: "numeric" }),
    [refMonth]
  )

  const monthGastos = useMemo(() => {
    const from = refMonth, to = new Date(refMonth.getFullYear(), refMonth.getMonth() + 1, 1)
    return realGastos.filter(g => {
      const t = new Date(g.created_at).getTime()
      return t >= from.getTime() && t < to.getTime()
    })
  }, [realGastos, refMonth])

  const stats = useMemo(() => {
    const ingresos  = monthGastos.filter(g => g.tipo === "Ingreso").reduce((s, g) => s + g.monto, 0)
    const gastosMes = monthGastos.filter(g => g.tipo === "Gasto").reduce((s, g) => s + g.monto, 0)
    const ahorros   = monthGastos.filter(g => g.tipo === "Ahorro").reduce((s, g) => s + g.monto, 0)
    return { ingresos, gastos: gastosMes, ahorros, balance: ingresos - gastosMes }
  }, [monthGastos])

  // ── Health score ──────────────────────────────────────────────────────────
  const health = useMemo(() => {
    const now = new Date()
    const last3 = realGastos.filter(g => new Date(g.created_at) >= new Date(now.getFullYear(), now.getMonth() - 2, 1))
    const last3Gastos   = last3.filter(g => g.tipo === "Gasto").reduce((s, g) => s + g.monto, 0)
    const last3Ingresos = last3.filter(g => g.tipo === "Ingreso").reduce((s, g) => s + g.monto, 0)

    if (last3.length === 0) return null

    // 1. Savings rate (0-40)
    const savingsRate = last3Ingresos > 0 ? (last3Ingresos - last3Gastos) / last3Ingresos : -1
    const savingsScore =
      savingsRate >= 0.30 ? 40 : savingsRate >= 0.20 ? 32 : savingsRate >= 0.10 ? 22 :
      savingsRate >= 0.05 ? 12 : savingsRate >= 0 ? 5 : 0

    // 2. Balance (0-30)
    const balanceScore =
      last3Ingresos > last3Gastos ? 30 :
      last3Gastos / last3Ingresos < 1.05 ? 15 :
      last3Gastos / last3Ingresos < 1.15 ? 8 : 0

    // 3. Category concentration (0-20)
    const catTotals: Record<string, number> = {}
    last3.filter(g => g.tipo === "Gasto").forEach(g => { catTotals[g.categoria] = (catTotals[g.categoria] || 0) + g.monto })
    const topPct = last3Gastos > 0 ? Math.max(...Object.values(catTotals)) / last3Gastos : 0
    const catScore = topPct < 0.30 ? 20 : topPct < 0.50 ? 14 : topPct < 0.70 ? 7 : 2

    // 4. Data coverage (0-10)
    const months = new Set(realGastos.map(g => g.created_at.slice(0, 7))).size
    const dataScore = months >= 3 ? 10 : months === 2 ? 7 : months === 1 ? 4 : 1

    const score = savingsScore + balanceScore + catScore + dataScore

    const recs: string[] = []
    if (savingsRate < 0.10) recs.push("Intentá ahorrar al menos el 10% de tus ingresos cada mes.")
    if (topPct > 0.50) {
      const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (topCat) recs.push(`${topCat} representa más del 50% de tus gastos. Considerá reducirlo.`)
    }
    if (last3Ingresos < last3Gastos) recs.push("Tus gastos superan tus ingresos en los últimos meses.")
    if (recs.length === 0) recs.push("Vas muy bien. Mantené el ritmo de ahorro.")

    return {
      score,
      savingsScore, savingsMax: 40,
      balanceScore, balanceMax: 30,
      catScore,    catMax: 20,
      dataScore,   dataMax: 10,
      savingsRate: Math.round(savingsRate * 100),
      rec: recs[0],
    }
  }, [realGastos])

  // ── Subscriptions detection ───────────────────────────────────────────────
  const subscriptions = useMemo(() => {
    const gastoItems = realGastos.filter(g => g.tipo === "Gasto")
    const groups: Record<string, Gasto[]> = {}
    gastoItems.forEach(g => {
      const key = g.subcategoria ? `${g.categoria} · ${g.subcategoria}` : g.categoria
      if (!groups[key]) groups[key] = []
      groups[key].push(g)
    })

    const subs: { name: string; avgMonto: number; freq: string; lastDate: string; nextDate: string; count: number }[] = []

    for (const [name, items] of Object.entries(groups)) {
      if (items.length < 2) continue
      const sorted = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const amounts = sorted.map(i => i.monto)
      const avg = amounts.reduce((s, a) => s + a, 0) / amounts.length
      if (!amounts.every(a => Math.abs(a - avg) / avg < 0.30)) continue

      const intervals: number[] = []
      for (let i = 1; i < sorted.length; i++) {
        intervals.push((new Date(sorted[i].created_at).getTime() - new Date(sorted[i - 1].created_at).getTime()) / 86400000)
      }
      const avgInterval = intervals.reduce((s, i) => s + i, 0) / intervals.length
      const freq = avgInterval >= 25 && avgInterval <= 40 ? "Mensual"
        : avgInterval >= 5 && avgInterval <= 9 ? "Semanal"
        : avgInterval >= 55 && avgInterval <= 70 ? "Bimestral" : null
      if (!freq) continue

      const last = sorted[sorted.length - 1]
      const next = new Date(new Date(last.created_at).getTime() + avgInterval * 86400000)
      subs.push({ name, avgMonto: avg, freq, lastDate: last.created_at, nextDate: next.toISOString(), count: items.length })
    }

    return subs.sort((a, b) => b.avgMonto - a.avgMonto).slice(0, 6)
  }, [realGastos])

  // ── Internal transfer detection ───────────────────────────────────────────
  const suspectedTransfers = useMemo(() => {
    if (cuentas.length < 2) return []
    const outgoing = gastos.filter(g => g.tipo === "Gasto" && g.cuenta_id && !g.es_transferencia)
    const incoming = gastos.filter(g => g.tipo === "Ingreso" && g.cuenta_id && !g.es_transferencia)
    const pairs: { gasto: Gasto; ingreso: Gasto; fromCuenta: Cuenta; toCuenta: Cuenta }[] = []

    for (const gasto of outgoing) {
      for (const ingreso of incoming) {
        if (gasto.cuenta_id === ingreso.cuenta_id) continue
        const days = Math.abs(new Date(gasto.created_at).getTime() - new Date(ingreso.created_at).getTime()) / 86400000
        if (days > 3) continue
        if (gasto.monto === 0 || Math.abs(gasto.monto - ingreso.monto) / gasto.monto > 0.01) continue
        const from = cuentas.find(c => c.id === gasto.cuenta_id)
        const to   = cuentas.find(c => c.id === ingreso.cuenta_id)
        if (from && to) pairs.push({ gasto, ingreso, fromCuenta: from, toCuenta: to })
      }
    }

    // Deduplicate: one pair per gasto ID
    const seen = new Set<string>()
    return pairs.filter(p => { if (seen.has(p.gasto.id)) return false; seen.add(p.gasto.id); return true }).slice(0, 5)
  }, [gastos, cuentas])

  // ── Insights ──────────────────────────────────────────────────────────────
  const insights = useMemo(() => {
    const now = new Date()
    const list: { label: string; value: string; sub?: string; positive?: boolean }[] = []
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevTo   = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevTotal = realGastos
      .filter(g => g.tipo === "Gasto" && new Date(g.created_at) >= prevFrom && new Date(g.created_at) < prevTo)
      .reduce((s, g) => s + g.monto, 0)

    if (prevTotal > 0 && stats.gastos > 0) {
      const pct = Math.round(((stats.gastos - prevTotal) / prevTotal) * 100)
      list.push({ label: "vs. mes anterior", value: `${pct > 0 ? "+" : ""}${pct}% en gastos`, positive: pct <= 0 })
    }
    const catTotals: Record<string, number> = {}
    monthGastos.filter(g => g.tipo === "Gasto").forEach(g => { catTotals[g.categoria] = (catTotals[g.categoria] || 0) + g.monto })
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]
    if (topCat && stats.gastos > 0)
      list.push({ label: "Categoría principal", value: topCat[0], sub: `${Math.round((topCat[1] / stats.gastos) * 100)}% del total`, positive: true })
    if (stats.ingresos > 0) {
      const rate = Math.round(((stats.ingresos - stats.gastos) / stats.ingresos) * 100)
      list.push({ label: "Tasa de ahorro", value: `${Math.max(0, rate)}%`, sub: "del ingreso mensual", positive: rate >= 20 })
    }
    return list
  }, [realGastos, monthGastos, stats])

  // ── Other computed ────────────────────────────────────────────────────────
  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {}
    monthGastos.filter(g => g.tipo === "Gasto").forEach(g => {
      const key = g.subcategoria ? `${g.categoria} - ${g.subcategoria}` : g.categoria
      totals[key] = (totals[key] || 0) + g.monto
    })
    return Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))
  }, [monthGastos])

  const trendData = useMemo(() => {
    const months: { label: string; gastos: number; ingresos: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
      const from = new Date(d.getFullYear(), d.getMonth(), 1)
      const to   = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const label = d.toLocaleDateString("es-UY", { month: "short" })
      const slice = realGastos.filter(g => { const t = new Date(g.created_at).getTime(); return t >= from.getTime() && t < to.getTime() })
      months.push({
        label,
        gastos:   slice.filter(g => g.tipo === "Gasto").reduce((s, g) => s + g.monto, 0),
        ingresos: slice.filter(g => g.tipo === "Ingreso").reduce((s, g) => s + g.monto, 0),
      })
    }
    return months
  }, [realGastos])

  const recent = useMemo(
    () => [...gastos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 8),
    [gastos]
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header + month nav */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Principal</h2>
          <p className="mt-0.5 text-sm text-gray-500 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonthOffset(o => o - 1)} className="rounded-lg p-2 hover:bg-white border border-transparent hover:border-black/[0.06] text-gray-400 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button onClick={() => setMonthOffset(0)} className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 hover:bg-white border border-transparent hover:border-black/[0.06] transition-all">Hoy</button>
          <button onClick={() => setMonthOffset(o => o + 1)} className="rounded-lg p-2 hover:bg-white border border-transparent hover:border-black/[0.06] text-gray-400 transition-all">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </div>

      {/* ── Mis Cuentas ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Mis Cuentas</h3>
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-white border border-transparent hover:border-black/[0.08] transition-all">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar producto
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24"/>)}</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cuentas.map(c => {
              const col = bancoColor(c.banco)
              const isNeg = c.saldo_actual < 0
              return (
                <button key={c.id} onClick={() => openEdit(c)}
                  className={`text-left rounded-2xl border p-4 transition-all hover:shadow-sm hover:scale-[1.01] ${col.bg} ${col.border}`}>
                  <div className="flex items-start justify-between">
                    <span className={`text-xs font-bold uppercase tracking-wider ${col.label}`}>{c.banco}</span>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 mt-0.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{c.tipo} · {c.moneda === "USD" ? "USD" : "$"}</p>
                  <p className={`mt-2 text-xl font-bold tabular-nums ${isNeg ? "text-red-600" : "text-gray-900"}`}>
                    {c.moneda === "USD" ? "U$S " : "$"}{fmtDec(Math.abs(c.saldo_actual))}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Stats + Health Score ── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[1,2,3,4].map(i => <div key={i} className="skeleton h-24"/>)}</div>
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
            <p className={`mt-2 text-2xl font-semibold ${stats.balance >= 0 ? "text-green-600" : "text-red-600"}`}>${fmt(stats.balance)}</p>
          </div>
        </div>
      )}

      {/* ── Insights ── */}
      {!loading && insights.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {insights.map((ins, i) => (
            <div key={i} className="mac-card flex items-center gap-4 px-4 py-3.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${ins.positive ? "bg-green-100" : "bg-red-100"}`}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ins.positive ? "#16a34a" : "#dc2626"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {ins.positive ? <polyline points="20 6 9 17 4 12"/> : <path d="M12 5v14M5 12h14"/>}
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">{ins.label}</p>
                <p className={`mt-0.5 text-sm font-semibold truncate ${ins.positive ? "text-green-700" : "text-red-700"}`}>{ins.value}</p>
                {ins.sub && <p className="text-xs text-gray-400">{ins.sub}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Health Score + Subscriptions ── */}
      {!loading && (health || subscriptions.length > 0) && (
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Health score */}
          {health && (
            <div className="mac-card p-5">
              <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-400">Salud Financiera</p>
              <div className="flex gap-5">
                <ScoreRing score={health.score} />
                <div className="flex-1 space-y-2.5">
                  {[
                    { label: "Ahorro", score: health.savingsScore, max: health.savingsMax },
                    { label: "Balance", score: health.balanceScore, max: health.balanceMax },
                    { label: "Concentración", score: health.catScore, max: health.catMax },
                    { label: "Historial", score: health.dataScore, max: health.dataMax },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="mb-1 flex justify-between text-xs text-gray-500">
                        <span>{m.label}</span>
                        <span className="tabular-nums text-gray-400">{m.score}/{m.max}</span>
                      </div>
                      <MiniBar value={m.score} max={m.max}
                        color={m.score / m.max >= 0.75 ? "#22c55e" : m.score / m.max >= 0.5 ? "#4a7d5a" : m.score / m.max >= 0.25 ? "#d4a843" : "#ef4444"}
                      />
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-4 rounded-xl bg-gray-50 px-3 py-2.5 text-xs text-gray-600 leading-relaxed">{health.rec}</p>
            </div>
          )}

          {/* Subscriptions */}
          {subscriptions.length > 0 && (
            <div className="mac-card p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Gastos Recurrentes</p>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">{subscriptions.length} detectados</span>
              </div>
              <div className="space-y-1">
                {subscriptions.map((s, i) => {
                  const nextDate = new Date(s.nextDate)
                  const daysLeft = Math.ceil((nextDate.getTime() - Date.now()) / 86400000)
                  return (
                    <div key={i} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-400">
                          {s.freq} · {s.count} ocurrencias
                          {daysLeft > 0 && daysLeft <= 15 && <span className="ml-1 text-amber-600">· vence en {daysLeft}d</span>}
                        </p>
                      </div>
                      <span className="ml-3 shrink-0 text-sm font-semibold text-gray-700 tabular-nums">~${fmt(s.avgMonto)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Internal transfer alerts ── */}
      {!loading && suspectedTransfers.length > 0 && (
        <div className="mac-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-black/[0.06] px-5 py-3.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">
              {suspectedTransfers.length} posible{suspectedTransfers.length > 1 ? "s" : ""} transferencia{suspectedTransfers.length > 1 ? "s" : ""} interna{suspectedTransfers.length > 1 ? "s" : ""}
            </p>
            <p className="text-xs text-gray-400">Confirmalas para excluirlas de tus gastos reales</p>
          </div>
          <div className="divide-y divide-black/[0.04]">
            {suspectedTransfers.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-gray-700">
                  <span className="font-medium truncate">{p.fromCuenta.nombre}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <span className="font-medium truncate">{p.toCuenta.nombre}</span>
                </div>
                <span className="text-sm font-semibold text-gray-900 tabular-nums">${fmt(p.gasto.monto)}</span>
                <span className="text-xs text-gray-400">{new Date(p.gasto.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })}</span>
                <button
                  onClick={() => markTransfer(p.gasto.id, p.ingreso.id)}
                  disabled={markingTransfer === p.gasto.id}
                  className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  {markingTransfer === p.gasto.id ? "Marcando…" : "Confirmar transferencia"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid gap-5 lg:grid-cols-2">
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
                <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${fmt(v)}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip formatter={(v: number) => [`$${fmt(v)}`, "Monto"]} contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mac-card p-5">
          <div className="mb-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Tendencia</p>
            <h3 className="text-base font-semibold text-gray-900">Últimos 6 meses</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid stroke="rgba(0,0,0,0.04)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${fmt(v)}`} />
              <Tooltip formatter={(v: number, name: string) => [`$${fmt(v)}`, name === "gastos" ? "Gastos" : "Ingresos"]} contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 8, fontSize: 12 }} />
              <Line type="monotone" dataKey="ingresos" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} />
              <Line type="monotone" dataKey="gastos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-green-500"/>Ingresos</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-red-500"/>Gastos</span>
          </div>
        </div>
      </div>

      {/* ── Quick input + Recent ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="mac-card p-5">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Registrar movimiento</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-500">Cuenta</label>
              <div className="flex flex-wrap gap-2">
                {cuentas.map(c => {
                  const col = bancoColor(c.banco)
                  return (
                    <button key={c.id} type="button" onClick={() => setSelectedCuenta(c.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${selectedCuenta === c.id ? `${col.bg} ${col.border} ${col.label}` : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                      {c.nombre}
                    </button>
                  )
                })}
              </div>
            </div>
            <input value={inputText} onChange={e => setInputText(e.target.value)} placeholder="Ej: pagué $419 de taxi, cobré $22813 de sueldo…" className="input-base" disabled={submitting} />
            <div className="flex flex-wrap gap-2">
              {["Gasto", "Ingreso", "Ahorro"].map(t => (
                <button key={t} type="button" onClick={() => setTipo(t)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${tipo === t ? t === "Gasto" ? "bg-red-500 text-white" : t === "Ingreso" ? "bg-green-500 text-white" : "bg-blue-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {t}
                </button>
              ))}
              <input type="date" value={inputDate} onChange={e => setInputDate(e.target.value)} className="ml-auto rounded-lg border border-black/[0.08] bg-gray-50 px-3 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-sage-500/50" />
            </div>
            <button type="submit" disabled={submitting || !inputText.trim() || !selectedCuenta} className="btn-primary w-full">
              {submitting ? "Guardando…" : "Guardar"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </form>
        </div>

        <div className="mac-card p-5">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Recientes</h3>
          {loading ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="skeleton h-12"/>)}</div>
          ) : recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Sin movimientos</p>
          ) : (
            <div className="space-y-1">
              {recent.map(g => {
                const cuenta = cuentas.find(c => c.id === g.cuenta_id)
                return (
                  <div key={g.id} className={`flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-gray-50 transition-colors ${g.es_transferencia ? "opacity-50" : ""}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-800">
                        {g.es_transferencia && <span className="mr-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600">TRANSF.</span>}
                        {g.categoria}{g.subcategoria ? ` · ${g.subcategoria}` : ""}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(g.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })}
                        {cuenta && <span className="ml-1 text-gray-300">· {cuenta.banco}</span>}
                      </p>
                    </div>
                    <span className={`ml-3 shrink-0 text-sm font-semibold ${g.tipo === "Ingreso" ? "text-green-600" : g.tipo === "Ahorro" ? "text-blue-600" : "text-red-600"}`}>
                      {g.tipo === "Ingreso" ? "+" : "-"}${fmt(g.monto)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Account Modal ── */}
      {modal !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-5 text-base font-semibold text-gray-900">{modal === "add" ? "Agregar producto" : "Editar cuenta"}</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">Banco / Institución</label>
                <div className="flex flex-wrap gap-2">
                  {BANCOS.map(b => (
                    <button key={b} type="button" onClick={() => setCuentaForm(f => ({ ...f, banco: b, nombre: "" }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${cuentaForm.banco === b ? `${bancoColor(b).bg} ${bancoColor(b).border} ${bancoColor(b).label}` : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">Tipo de producto</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map(t => (
                    <button key={t} type="button" onClick={() => setCuentaForm(f => ({ ...f, tipo: t, nombre: "" }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${cuentaForm.tipo === t ? "bg-gray-900 border-gray-900 text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">Moneda</label>
                <div className="flex gap-2">
                  {[{ v: "UY", label: "$ Pesos" }, { v: "USD", label: "U$S Dólares" }].map(({ v, label }) => (
                    <button key={v} type="button" onClick={() => setCuentaForm(f => ({ ...f, moneda: v, nombre: "" }))}
                      className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all border ${cuentaForm.moneda === v ? "bg-gray-900 border-gray-900 text-white" : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">
                  {modal === "edit" ? "Saldo base" : "Saldo actual"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400 pointer-events-none">{cuentaForm.moneda === "USD" ? "U$S" : "$"}</span>
                  <input type="number" step="0.01" min="0" value={cuentaForm.saldo_inicial} onChange={e => setCuentaForm(f => ({ ...f, saldo_inicial: e.target.value }))} className="input-base pl-9" placeholder="0" />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {modal === "add" ? "Ingresá el saldo que tenés hoy. Se actualiza con cada movimiento que registrés." : "Ajusta el punto de partida. Los movimientos vinculados ya actualizan el saldo."}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-gray-500">Nombre (opcional)</label>
                <input className="input-base" placeholder={autoNombre(cuentaForm)} value={cuentaForm.nombre} onChange={e => setCuentaForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
            </div>
            {cuentaError && <p className="mt-3 text-sm text-red-600">{cuentaError}</p>}
            <div className="mt-5 flex gap-2">
              {modal === "edit" && (
                <button onClick={handleDeleteCuenta} disabled={savingCuenta} className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 border border-red-200 transition-all">Eliminar</button>
              )}
              <button onClick={closeModal} disabled={savingCuenta} className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all">Cancelar</button>
              <button onClick={handleSaveCuenta} disabled={savingCuenta} className="flex-1 btn-primary">
                {savingCuenta ? "Guardando…" : modal === "add" ? "Agregar" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
