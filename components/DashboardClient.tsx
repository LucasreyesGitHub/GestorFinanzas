"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Bar, BarChart, CartesianGrid, Cell,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
  LineChart, Line,
} from "recharts"
import { motion, AnimatePresence } from "framer-motion"
import { useSession } from "next-auth/react"
import { parseGasto } from "@/lib/parseGasto"

// ── Types ────────────────────────────────────────────────────────────────────

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

// ── Formatters ───────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

const fmtDec = (n: number) =>
  new Intl.NumberFormat("es-UY", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

// ── Constants ─────────────────────────────────────────────────────────────────

const CAT_COLORS = ["#4a7d5a", "#6f9971", "#8faf97", "#d4a843", "#e8c97a", "#60a5fa", "#f87171"]

const BANCO_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  BROU:       { bg: "bg-blue-50",   border: "border-blue-200",   label: "text-blue-700" },
  ITAU:       { bg: "bg-orange-50", border: "border-orange-200", label: "text-orange-700" },
  ITAÚ:       { bg: "bg-orange-50", border: "border-orange-200", label: "text-orange-700" },
  Santander:  { bg: "bg-red-50",    border: "border-red-200",    label: "text-red-700" },
  Scotiabank: { bg: "bg-red-50",    border: "border-red-200",    label: "text-red-700" },
}
const bancoColor = (banco: string) =>
  BANCO_COLORS[banco] ?? { bg: "bg-gray-50", border: "border-gray-200", label: "text-gray-700" }

const BANCOS    = ["BROU", "ITAÚ", "Santander", "Scotiabank", "OCA", "Otro"]
const TIPOS_CA  = ["Caja de Ahorro", "Cuenta Corriente", "Caja de Ahorro Joven", "Depósito"]
const EMPTY_FORM = { banco: "BROU", tipo: "Caja de Ahorro", moneda: "UY", saldo_inicial: "", nombre: "" }

const BANK_ACCENTS: Record<string, string> = {
  BROU: "#3b82f6", ITAU: "#f97316", ITAÚ: "#f97316",
  Santander: "#ef4444", Scotiabank: "#ef4444", OCA: "#8b5cf6",
}

const BANK_GRADIENTS: Record<string, [string, string]> = {
  BROU:       ["#1e3a8a", "#2563eb"],
  ITAU:       ["#7c2d12", "#ea580c"],
  ITAÚ:       ["#7c2d12", "#ea580c"],
  Santander:  ["#7f1d1d", "#dc2626"],
  Scotiabank: ["#7f1d1d", "#b91c1c"],
  OCA:        ["#3b0764", "#7c3aed"],
}
const bankGradient = (banco: string): [string, string] =>
  BANK_GRADIENTS[banco] ?? ["#1e293b", "#334155"]

// ── Helpers ──────────────────────────────────────────────────────────────────

function norm(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function BankMark({ banco }: { banco: string }) {
  return (
    <div
      className="flex h-7 w-7 items-center justify-center rounded-lg"
      style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
    >
      <span className="text-xs font-black text-white/80 leading-none select-none">
        {banco.charAt(0)}
      </span>
    </div>
  )
}

function catEmoji(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("super") || n.includes("almac") || n.includes("verdule") || n.includes("carnicer")) return "🛒"
  if (n.includes("transport") || n.includes("taxi") || n.includes("uber") || n.includes("nafta") || n.includes("colectivo")) return "🚗"
  if (n.includes("servicio") || n.includes("luz") || n.includes("agua") || n.includes("gas") || n.includes("internet")) return "⚡"
  if (n.includes("salud") || n.includes("médico") || n.includes("medico") || n.includes("farmacia")) return "💊"
  if (n.includes("restaurante") || n.includes("comida") || n.includes("caf") || n.includes("almuerzo") || n.includes("delivery")) return "🍽"
  if (n.includes("netflix") || n.includes("spotify") || n.includes("streaming") || n.includes("cine") || n.includes("entretenimiento")) return "🎬"
  if (n.includes("gym") || n.includes("gimnasio") || n.includes("deporte")) return "💪"
  if (n.includes("ropa") || n.includes("indumentaria")) return "👕"
  if (n.includes("educac") || n.includes("libro") || n.includes("curso")) return "📚"
  if (n.includes("ahorro") || n.includes("plazo") || n.includes("invers")) return "💰"
  return "📋"
}

// ── Dark mode hook ────────────────────────────────────────────────────────────

function useDarkMode() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains("dark"))
    update()
    const obs = new MutationObserver(update)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])
  return dark
}

// ── ScoreRing — dark mode aware ───────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const r = 36, c = 2 * Math.PI * r
  const color =
    score >= 80 ? "#22c55e" : score >= 65 ? "#4a7d5a" : score >= 45 ? "#d4a843" : "#ef4444"
  const label =
    score >= 80 ? "Excelente" : score >= 65 ? "Bueno" : score >= 45 ? "Regular" :
    score >= 25 ? "A mejorar" : "Crítico"
  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg width="88" height="88" viewBox="0 0 88 88" className="text-slate-900 dark:text-white">
        <circle cx="44" cy="44" r={r} fill="none"
          className="stroke-black/[0.06] dark:stroke-white/[0.07]" strokeWidth="7" />
        <circle cx="44" cy="44" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={c} strokeDashoffset={c - (score / 100) * c}
          strokeLinecap="round" transform="rotate(-90 44 44)"
          style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        <text x="44" y="50" textAnchor="middle" fill="currentColor" fontSize="22" fontWeight="700">
          {score}
        </text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  )
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100)
  return (
    <div className="h-1.5 w-full rounded-full bg-black/[0.05] dark:bg-white/[0.05]">
      <div className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

// ── Custom recharts tooltip ───────────────────────────────────────────────────

function ChartTooltip({
  active, payload, label,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-white dark:bg-[#16192a] px-3 py-2.5 shadow-lg text-xs space-y-0.5">
      {label && (
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#4f5769]">
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="tabular-nums font-semibold" style={{ color: p.color }}>
          {p.name === "gastos" ? "Gastos" : p.name === "ingresos" ? "Ingresos" : p.name}
          {" — "}${fmt(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── SmartInput ────────────────────────────────────────────────────────────────

interface SmartInputProps {
  cuentas: Cuenta[]
  selectedCuenta: string
  setSelectedCuenta: (id: string) => void
  onSubmit: (text: string, tipo: string, cuentaId: string, date?: string) => Promise<void>
}

function SmartInput({ cuentas, selectedCuenta, setSelectedCuenta, onSubmit }: SmartInputProps) {
  const [text, setText]         = useState("")
  const [manualTipo, setManualTipo] = useState("Gasto")
  const [date, setDate]         = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const parsed = useMemo(() => parseGasto(text), [text])

  // Infer tipo from natural language
  const inferredTipo = useMemo(() => {
    if (!text.trim()) return null
    if (/(cobr[eéí]|recibi|recib[íi]|sueldo|salario|ingres[oó]|me\s+pag[ao])/i.test(text)) return "Ingreso"
    if (/(ahorr[eéo]|invert[íi]|plazo\s*fijo)/i.test(text)) return "Ahorro"
    return null
  }, [text])

  const effectiveTipo = inferredTipo ?? manualTipo

  // Infer cuenta from bank name in text
  const inferredCuenta = useMemo(() => {
    if (!text.trim()) return null
    const n = norm(text)
    return cuentas.find(c => n.includes(norm(c.banco))) ?? null
  }, [text, cuentas])

  const effectiveCuentaId = inferredCuenta?.id ?? selectedCuenta

  // Build NLP preview chips
  type Chip = { key: string; label: string; bg: string; fg: string; auto: boolean }
  const chips = useMemo((): Chip[] => {
    if (!text.trim()) return []
    const result: Chip[] = []

    const tipoStyles: Record<string, [string, string]> = {
      Gasto:   ["bg-red-50 dark:bg-red-950/40",        "text-red-600 dark:text-red-400"],
      Ingreso: ["bg-emerald-50 dark:bg-emerald-950/40", "text-emerald-700 dark:text-emerald-400"],
      Ahorro:  ["bg-blue-50 dark:bg-blue-950/40",       "text-blue-600 dark:text-blue-400"],
    }
    const [tipoBg, tipoFg] = tipoStyles[effectiveTipo] ?? tipoStyles.Gasto
    result.push({ key: "tipo", label: effectiveTipo, bg: tipoBg, fg: tipoFg, auto: !!inferredTipo })

    if (parsed.monto !== null) {
      result.push({
        key: "monto",
        label: `${parsed.moneda === "USD" ? "U$S " : "$"}${fmt(parsed.monto)}`,
        bg: "bg-slate-100 dark:bg-[#1a1d2e]",
        fg: "text-slate-700 dark:text-slate-300",
        auto: true,
      })
    }

    const cuenta = cuentas.find(c => c.id === effectiveCuentaId)
    if (cuenta) {
      result.push({
        key: "cuenta",
        label: `${cuenta.banco} ${cuenta.moneda === "USD" ? "USD" : "$"}`,
        bg: "bg-slate-100 dark:bg-[#1a1d2e]",
        fg: "text-slate-600 dark:text-slate-400",
        auto: !!inferredCuenta,
      })
    }

    if (parsed.categoria !== "Otro") {
      result.push({
        key: "cat",
        label: `${catEmoji(parsed.categoria)} ${parsed.categoria}`,
        bg: "bg-slate-100 dark:bg-[#1a1d2e]",
        fg: "text-slate-500 dark:text-slate-500",
        auto: true,
      })
    }

    return result
  }, [text, effectiveTipo, inferredTipo, parsed, effectiveCuentaId, inferredCuenta, cuentas])

  const canSubmit = text.trim().length > 0 && !!effectiveCuentaId && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true); setError(null)
    try {
      await onSubmit(text, effectiveTipo, effectiveCuentaId, date || undefined)
      setText(""); setDate("")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="mac-card overflow-hidden"
    >
      <form onSubmit={handleSubmit}>
        {/* ── Header bar ── */}
        <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-[#4f5769]">
              Registrar movimiento
            </p>
          </div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="rounded-lg border border-black/[0.07] dark:border-white/[0.06] bg-transparent px-2.5 py-1 text-[11px] text-slate-400 dark:text-slate-500 focus:outline-none focus:border-amber-400/60 transition-colors"
          />
        </div>

        {/* ── Text input ── */}
        <div className="px-5 py-4">
          <textarea
            value={text}
            onChange={e => {
              setText(e.target.value)
              e.target.style.height = "auto"
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
            }}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e as unknown as React.FormEvent)
              }
            }}
            placeholder="Ej: gasté $500 del BROU en taxi · cobré sueldo $22813 en ITAÚ…"
            className="w-full resize-none overflow-hidden bg-transparent text-base leading-relaxed text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-[#2a2f48] focus:outline-none"
            style={{ minHeight: "44px" }}
            disabled={submitting}
            rows={1}
          />

          {/* NLP preview chips */}
          <AnimatePresence>
            {chips.length > 0 && (
              <motion.div
                key="chips"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="mt-3 flex flex-wrap gap-1.5"
              >
                {chips.map((chip, i) => (
                  <motion.span
                    key={chip.key}
                    initial={{ opacity: 0, scale: 0.8, x: -6 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ delay: i * 0.05, duration: 0.18, ease: "easeOut" }}
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${chip.bg} ${chip.fg}`}
                  >
                    {chip.auto && (
                      <span className="opacity-40">
                        <svg width="5" height="5" viewBox="0 0 8 8">
                          <circle cx="4" cy="4" r="4" fill="currentColor" />
                        </svg>
                      </span>
                    )}
                    {chip.label}
                  </motion.span>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Footer: accounts + tipo + submit ── */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-black/[0.04] dark:border-white/[0.04] px-5 py-3">
          {/* Account selector */}
          {cuentas.map(c => {
            const accent  = BANK_ACCENTS[c.banco] ?? "#64748b"
            const isActive = c.id === effectiveCuentaId
            const isAuto   = isActive && !!inferredCuenta && !!text.trim()
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCuenta(c.id)}
                className="rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all border"
                style={isActive
                  ? { background: `${accent}18`, borderColor: `${accent}45`, color: accent }
                  : { background: "transparent", borderColor: "rgba(0,0,0,0.07)", color: "#9ca3af" }
                }
              >
                {isAuto && <span className="mr-1 opacity-50 text-[8px]">●</span>}
                {c.banco}·{c.moneda === "USD" ? "USD" : "$"}
              </button>
            )
          })}

          <div className="flex-1 min-w-0" />

          {/* Tipo toggle */}
          {[
            { t: "Gasto",   dot: "bg-red-500" },
            { t: "Ingreso", dot: "bg-emerald-500" },
            { t: "Ahorro",  dot: "bg-blue-500" },
          ].map(({ t, dot }) => (
            <button
              key={t}
              type="button"
              onClick={() => setManualTipo(t)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all border ${
                effectiveTipo === t
                  ? "border-black/[0.07] dark:border-white/[0.07] bg-black/[0.03] dark:bg-white/[0.04] text-slate-800 dark:text-slate-200"
                  : "border-transparent text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400"
              } ${inferredTipo ? "opacity-50 cursor-default" : ""}`}
              title={inferredTipo ? "Tipo detectado automáticamente del texto" : undefined}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
              {t}
            </button>
          ))}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary py-2 px-4 text-xs"
          >
            {submitting ? (
              <span className="flex items-center gap-1.5">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                  className="inline-block h-3 w-3 rounded-full border-2 border-current border-t-transparent"
                />
                Guardando
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                Guardar
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </span>
            )}
          </button>
        </div>

        {error && (
          <div className="px-5 pb-3 text-xs text-red-500 dark:text-red-400">{error}</div>
        )}
      </form>
    </motion.div>
  )
}

// ── DashboardClient ───────────────────────────────────────────────────────────

export function DashboardClient() {
  const [gastos, setGastos]               = useState<Gasto[]>([])
  const [cuentas, setCuentas]             = useState<Cuenta[]>([])
  const [loading, setLoading]             = useState(false)
  const [monthOffset, setMonthOffset]     = useState(0)
  const [selectedCuenta, setSelectedCuenta] = useState("")
  const [error, setError]                 = useState<string | null>(null)

  const [modal, setModal]                 = useState<"none" | "add" | "edit">("none")
  const [editingCuenta, setEditingCuenta] = useState<Cuenta | null>(null)
  const [cuentaForm, setCuentaForm]       = useState(EMPTY_FORM)
  const [savingCuenta, setSavingCuenta]   = useState(false)
  const [cuentaError, setCuentaError]     = useState<string | null>(null)
  const [markingTransfer, setMarkingTransfer] = useState<string | null>(null)

  const isDark    = useDarkMode()
  const tickColor = isDark ? "#4f5769" : "#9ca3af"
  const gridColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"

  const { data: session } = useSession()
  const userName = session?.user?.name?.split(" ")[0] ?? "Lucas"

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

  // Called by SmartInput when user submits
  async function handleSubmitTransaction(
    text: string, tipo: string, cuentaId: string, date?: string,
  ): Promise<void> {
    setError(null)
    const body: Record<string, string> = { raw: text, tipo, cuenta_id: cuentaId }
    if (date) body.created_at = new Date(date).toISOString()
    const res = await fetch("/api/gastos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "No se pudo guardar")
    await Promise.all([fetchAll(), fetchCuentas()])
  }

  async function markTransfer(gastoId: string, ingresoId: string) {
    setMarkingTransfer(gastoId)
    try {
      await Promise.all([
        fetch(`/api/gastos/${gastoId}`,  { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ es_transferencia: 1 }) }),
        fetch(`/api/gastos/${ingresoId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ es_transferencia: 1 }) }),
      ])
      await fetchAll()
    } finally { setMarkingTransfer(null) }
  }

  function openAdd()     { setCuentaForm(EMPTY_FORM); setCuentaError(null); setModal("add") }
  function openEdit(c: Cuenta) {
    setCuentaForm({ banco: c.banco, tipo: c.tipo, moneda: c.moneda, saldo_inicial: String(c.saldo_inicial), nombre: c.nombre })
    setCuentaError(null); setEditingCuenta(c); setModal("edit")
  }
  function closeModal()  { setModal("none"); setEditingCuenta(null) }

  function autoNombre(f: typeof EMPTY_FORM) {
    if (f.nombre.trim()) return f.nombre.trim()
    return `${f.banco} · ${f.tipo === "Caja de Ahorro" ? "CA" : f.tipo} ${f.moneda === "USD" ? "Dólares" : "Pesos"}`
  }

  async function handleSaveCuenta() {
    setSavingCuenta(true); setCuentaError(null)
    try {
      const saldo  = parseFloat(cuentaForm.saldo_inicial) || 0
      const nombre = autoNombre(cuentaForm)
      if (modal === "add") {
        const res = await fetch("/api/cuentas", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...cuentaForm, nombre, saldo_inicial: saldo }),
        })
        if (!res.ok) throw new Error((await res.json()).error || "Error al crear")
      } else if (modal === "edit" && editingCuenta) {
        const res = await fetch(`/api/cuentas/${editingCuenta.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...cuentaForm, nombre, saldo_inicial: saldo }),
        })
        if (!res.ok) throw new Error((await res.json()).error || "Error al guardar")
      }
      await fetchCuentas(); closeModal()
    } catch (err) {
      setCuentaError(err instanceof Error ? err.message : "Error inesperado")
    } finally { setSavingCuenta(false) }
  }

  async function handleDeleteCuenta() {
    if (!editingCuenta) return
    if (!confirm(`¿Eliminar "${editingCuenta.nombre}"?`)) return
    setSavingCuenta(true)
    try {
      await fetch(`/api/cuentas/${editingCuenta.id}`, { method: "DELETE" })
      if (selectedCuenta === editingCuenta.id)
        setSelectedCuenta(cuentas.find(c => c.id !== editingCuenta.id)?.id ?? "")
      await fetchCuentas(); closeModal()
    } finally { setSavingCuenta(false) }
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const realGastos = gastos.filter(g => !g.es_transferencia)

  const refMonth = useMemo(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  }, [monthOffset])

  const monthLabel = useMemo(
    () => refMonth.toLocaleDateString("es-UY", { month: "long", year: "numeric" }),
    [refMonth],
  )

  const monthGastos = useMemo(() => {
    const from = refMonth
    const to   = new Date(refMonth.getFullYear(), refMonth.getMonth() + 1, 1)
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

  const health = useMemo(() => {
    const now = new Date()
    const last3 = realGastos.filter(
      g => new Date(g.created_at) >= new Date(now.getFullYear(), now.getMonth() - 2, 1),
    )
    const last3Gastos   = last3.filter(g => g.tipo === "Gasto").reduce((s, g) => s + g.monto, 0)
    const last3Ingresos = last3.filter(g => g.tipo === "Ingreso").reduce((s, g) => s + g.monto, 0)
    if (last3.length === 0) return null

    const savingsRate  = last3Ingresos > 0 ? (last3Ingresos - last3Gastos) / last3Ingresos : -1
    const savingsScore = savingsRate >= 0.30 ? 40 : savingsRate >= 0.20 ? 32 : savingsRate >= 0.10 ? 22 : savingsRate >= 0.05 ? 12 : savingsRate >= 0 ? 5 : 0
    const balanceScore = last3Ingresos > last3Gastos ? 30 : last3Gastos / last3Ingresos < 1.05 ? 15 : last3Gastos / last3Ingresos < 1.15 ? 8 : 0

    const catTotals: Record<string, number> = {}
    last3.filter(g => g.tipo === "Gasto").forEach(g => { catTotals[g.categoria] = (catTotals[g.categoria] || 0) + g.monto })
    const topPct    = last3Gastos > 0 ? Math.max(...Object.values(catTotals)) / last3Gastos : 0
    const catScore  = topPct < 0.30 ? 20 : topPct < 0.50 ? 14 : topPct < 0.70 ? 7 : 2
    const months    = new Set(realGastos.map(g => g.created_at.slice(0, 7))).size
    const dataScore = months >= 3 ? 10 : months === 2 ? 7 : months === 1 ? 4 : 1
    const score     = savingsScore + balanceScore + catScore + dataScore

    const recs: string[] = []
    if (savingsRate < 0.10) recs.push("Intentá ahorrar al menos el 10% de tus ingresos cada mes.")
    if (topPct > 0.50) {
      const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0]?.[0]
      if (topCat) recs.push(`${topCat} representa más del 50% de tus gastos. Considerá reducirlo.`)
    }
    if (last3Ingresos < last3Gastos) recs.push("Tus gastos superan tus ingresos en los últimos meses.")
    if (recs.length === 0) recs.push("Vas muy bien. Mantené el ritmo de ahorro.")

    return {
      score, savingsScore, savingsMax: 40, balanceScore, balanceMax: 30,
      catScore, catMax: 20, dataScore, dataMax: 10,
      savingsRate: Math.round(savingsRate * 100), rec: recs[0],
    }
  }, [realGastos])

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
      const sorted  = [...items].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const amounts = sorted.map(i => i.monto)
      const avg     = amounts.reduce((s, a) => s + a, 0) / amounts.length
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

  const suspectedTransfers = useMemo(() => {
    if (cuentas.length < 2) return []
    const outgoing = gastos.filter(g => g.tipo === "Gasto"   && g.cuenta_id && !g.es_transferencia)
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
    const seen = new Set<string>()
    return pairs.filter(p => { if (seen.has(p.gasto.id)) return false; seen.add(p.gasto.id); return true }).slice(0, 5)
  }, [gastos, cuentas])

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
    () => [...gastos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 10),
    [gastos],
  )

  const totalUY  = cuentas.filter(c => c.moneda === "UY").reduce((s, c) => s + c.saldo_actual, 0)
  const totalUSD = cuentas.filter(c => c.moneda === "USD").reduce((s, c) => s + c.saldo_actual, 0)

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches"
  }, [])

  // month-vs-prev insight (for hero badge)
  const vsAnterior = useMemo(() => {
    const now = new Date()
    const prevFrom = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const prevTo   = new Date(now.getFullYear(), now.getMonth(), 1)
    const prevTotal = realGastos
      .filter(g => g.tipo === "Gasto" && new Date(g.created_at) >= prevFrom && new Date(g.created_at) < prevTo)
      .reduce((s, g) => s + g.monto, 0)
    if (prevTotal === 0 || stats.gastos === 0) return null
    const pct = Math.round(((stats.gastos - prevTotal) / prevTotal) * 100)
    return { pct, positive: pct <= 0 }
  }, [realGastos, stats.gastos])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── HERO ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mac-card overflow-hidden"
      >
        <div className="p-5 lg:p-7">
          {/* Top row: balance + health indicator */}
          <div className="flex items-start justify-between mb-5">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {greeting}, {userName}
              </p>
              <div className="flex flex-wrap items-baseline gap-3">
                {loading ? (
                  <div className="skeleton h-11 w-48" />
                ) : (
                  <span className="text-4xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                    ${fmtDec(totalUY)}
                  </span>
                )}
                {!loading && vsAnterior !== null && (
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    vsAnterior.positive
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400"
                      : "bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400"
                  }`}>
                    {vsAnterior.pct > 0 ? "+" : ""}{vsAnterior.pct}% vs mes anterior
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Balance pesos · <span className="capitalize">{monthLabel}</span>
                {totalUSD !== 0 && (
                  <span className="ml-2 opacity-60">· U$S {fmtDec(Math.abs(totalUSD))}</span>
                )}
              </p>
            </div>

            {/* Health score compact */}
            {!loading && health && (
              <div className="ml-5 hidden shrink-0 items-center gap-3 sm:flex">
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums text-slate-900 dark:text-white leading-none">{health.score}</p>
                  <p className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">/100 salud</p>
                </div>
                <div className="h-10 w-1 rounded-full" style={{
                  background: health.score >= 80 ? "#22c55e" : health.score >= 65 ? "#4a7d5a" : health.score >= 45 ? "#d4a843" : "#ef4444"
                }} />
              </div>
            )}
          </div>

          {/* Metrics strip + month nav */}
          {!loading && (stats.ingresos > 0 || stats.gastos > 0) && (
            <div className="border-t border-black/[0.05] dark:border-white/[0.05] pt-4">
              <div className="flex flex-wrap items-center gap-0">
                {/* Ingresos */}
                <div className="flex items-center gap-2.5 pb-3 sm:pb-0 sm:pr-6">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: "rgba(34,197,94,0.12)" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15"/></svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#4f5769]">Ingresos</p>
                    <p className="tabular-nums text-sm font-bold text-slate-700 dark:text-slate-200">${fmt(stats.ingresos)}</p>
                  </div>
                </div>

                <div className="hidden sm:block h-8 w-px bg-black/[0.05] dark:bg-white/[0.05] mx-0" />

                {/* Gastos */}
                <div className="flex items-center gap-2.5 pb-3 sm:pb-0 sm:px-6">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: "rgba(239,68,68,0.12)" }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9"/></svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#4f5769]">Gastos</p>
                    <p className="tabular-nums text-sm font-bold text-slate-700 dark:text-slate-200">${fmt(stats.gastos)}</p>
                  </div>
                </div>

                {stats.ahorros > 0 && (
                  <>
                    <div className="hidden sm:block h-8 w-px bg-black/[0.05] dark:bg-white/[0.05] mx-0" />
                    <div className="flex items-center gap-2.5 pb-3 sm:pb-0 sm:px-6">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: "rgba(59,130,246,0.12)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#4f5769]">Ahorros</p>
                        <p className="tabular-nums text-sm font-bold text-slate-700 dark:text-slate-200">${fmt(stats.ahorros)}</p>
                      </div>
                    </div>
                  </>
                )}

                {stats.ingresos > 0 && (
                  <>
                    <div className="hidden sm:block h-8 w-px bg-black/[0.05] dark:bg-white/[0.05] mx-0" />
                    <div className="flex items-center gap-2.5 sm:pl-6">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                        style={{ background: stats.balance >= 0 ? "rgba(100,116,139,0.10)" : "rgba(239,68,68,0.10)" }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                          stroke={stats.balance >= 0 ? "#64748b" : "#ef4444"}
                          strokeWidth="2.5" strokeLinecap="round">
                          <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
                          <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-[#4f5769]">Cashflow</p>
                        <p className={`tabular-nums text-sm font-bold ${
                          stats.balance >= 0 ? "text-slate-700 dark:text-slate-200" : "text-red-500"
                        }`}>
                          {stats.balance >= 0 ? "+" : ""}{fmt(stats.balance)}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Month nav pushed to end */}
                <div className="ml-auto flex items-center gap-1 pl-4">
                  <button onClick={() => setMonthOffset(o => o - 1)}
                    className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                  </button>
                  <button onClick={() => setMonthOffset(0)}
                    className="rounded-lg px-2.5 py-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors capitalize">
                    {monthOffset === 0 ? "Hoy" : monthLabel.split(" ")[0]}
                  </button>
                  <button onClick={() => setMonthOffset(o => o + 1)}
                    className="rounded-lg p-1.5 text-slate-400 dark:text-slate-500 hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Account cards ── */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Cuentas</h3>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-[#1a1d2e] border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.06] transition-all">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Agregar
          </button>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <div key={i} className="skeleton h-36" />)}
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
            className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          >
            {cuentas.map(c => {
              const [gradFrom, gradTo] = bankGradient(c.banco)
              const isNeg = c.saldo_actual < 0
              return (
                <motion.button
                  key={c.id}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    show:   { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
                  }}
                  whileHover={{ scale: 1.02, y: -3, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => openEdit(c)}
                  className="group relative overflow-hidden rounded-[20px] text-left"
                  style={{
                    background: `linear-gradient(145deg, ${gradFrom} 0%, ${gradTo} 100%)`,
                    minHeight: "148px",
                    boxShadow: `0 8px 24px -4px ${gradTo}55, 0 2px 6px rgba(0,0,0,0.15)`,
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-white/[0.14] to-transparent pointer-events-none" />
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")" }}
                  />
                  <div className="absolute top-4 right-4"><BankMark banco={c.banco} /></div>
                  <div className="absolute top-4 left-5 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <span className="text-[9px] font-semibold text-white/40 uppercase tracking-[0.15em]">editar</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40 mb-1.5">
                      {c.banco} · {c.moneda === "USD" ? "USD" : "Pesos"}
                    </p>
                    <p className={`text-2xl font-bold tabular-nums tracking-tight leading-none ${isNeg ? "text-red-300/90" : "text-white"}`}>
                      {c.moneda === "USD" ? "U$S " : "$"}{fmtDec(Math.abs(c.saldo_actual))}
                    </p>
                    <p className="text-[10px] text-white/30 mt-1.5 truncate">
                      {c.tipo === "Caja de Ahorro" ? "Caja de Ahorro" : c.tipo}
                    </p>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* ── Smart Input ── */}
      <SmartInput
        cuentas={cuentas}
        selectedCuenta={selectedCuenta}
        setSelectedCuenta={setSelectedCuenta}
        onSubmit={handleSubmitTransaction}
      />

      {/* ── Recent feed + Health (2-col) ── */}
      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">

        {/* Recent transactions */}
        <div className="mac-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-[#4f5769]">
              Movimientos recientes
            </p>
            <span className="rounded-full bg-slate-100 dark:bg-[#1a1d2e] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              {recent.length}
            </span>
          </div>

          {loading ? (
            <div className="space-y-0 p-2">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-12 mb-1" />)}
            </div>
          ) : recent.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#1a1d2e]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
              </div>
              <p className="text-xs text-slate-400 dark:text-[#4f5769]">Sin movimientos registrados</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
              {recent.map((g, i) => {
                const cuenta   = cuentas.find(c => c.id === g.cuenta_id)
                const emoji    = catEmoji(g.categoria)
                const isIncome = g.tipo === "Ingreso"
                const isSaving = g.tipo === "Ahorro"
                const isTransfer = !!g.es_transferencia
                const dotColor  = isIncome ? "#22c55e" : isSaving ? "#3b82f6" : "#ef4444"
                const amtColor  = isIncome ? "text-emerald-600 dark:text-emerald-400"
                  : isSaving ? "text-blue-600 dark:text-blue-400"
                  : "text-red-500 dark:text-red-400"

                return (
                  <motion.div
                    key={g.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25, ease: "easeOut" }}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-black/[0.015] dark:hover:bg-white/[0.02] transition-colors ${isTransfer ? "opacity-40" : ""}`}
                  >
                    {/* Emoji icon */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                      style={{ background: `${dotColor}14` }}>
                      <span className="text-sm leading-none select-none">{isTransfer ? "⇄" : emoji}</span>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200 leading-tight">
                        {g.categoria}{g.subcategoria ? ` · ${g.subcategoria}` : ""}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-[#4f5769] mt-0.5 flex items-center gap-1.5">
                        {new Date(g.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })}
                        {cuenta && (
                          <>
                            <span className="opacity-30">·</span>
                            <span>{cuenta.banco}</span>
                          </>
                        )}
                        {isTransfer && (
                          <>
                            <span className="opacity-30">·</span>
                            <span className="rounded-sm bg-amber-50 dark:bg-amber-950/40 px-1 text-[8px] font-bold text-amber-600 dark:text-amber-400 uppercase">transf.</span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Amount */}
                    <span className={`shrink-0 text-sm font-bold tabular-nums ${amtColor}`}>
                      {isIncome ? "+" : "−"}{g.moneda === "USD" ? "U$S " : "$"}{fmt(g.monto)}
                    </span>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>

        {/* Health score */}
        {!loading && health && (
          <div className="mac-card p-5">
            <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-[#4f5769]">
              Salud financiera
            </p>
            <div className="flex gap-5">
              <ScoreRing score={health.score} />
              <div className="flex-1 space-y-2.5">
                {[
                  { label: "Ahorro",        score: health.savingsScore, max: health.savingsMax },
                  { label: "Balance",       score: health.balanceScore, max: health.balanceMax },
                  { label: "Concentración", score: health.catScore,     max: health.catMax },
                  { label: "Historial",     score: health.dataScore,    max: health.dataMax },
                ].map(m => (
                  <div key={m.label}>
                    <div className="mb-1 flex justify-between text-[10px] text-slate-500 dark:text-slate-500">
                      <span>{m.label}</span>
                      <span className="tabular-nums text-slate-400 dark:text-[#4f5769]">{m.score}/{m.max}</span>
                    </div>
                    <MiniBar value={m.score} max={m.max}
                      color={m.score / m.max >= 0.75 ? "#22c55e" : m.score / m.max >= 0.5 ? "#4a7d5a" : m.score / m.max >= 0.25 ? "#d4a843" : "#ef4444"}
                    />
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-slate-50 dark:bg-[#0d0f1a] px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {health.rec}
            </p>
          </div>
        )}
      </div>

      {/* ── Internal transfer alerts ── */}
      {!loading && suspectedTransfers.length > 0 && (
        <div className="mac-card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-black/[0.04] dark:border-white/[0.04] px-5 py-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-950/30">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                {suspectedTransfers.length} posible{suspectedTransfers.length > 1 ? "s" : ""} transferencia{suspectedTransfers.length > 1 ? "s" : ""} interna{suspectedTransfers.length > 1 ? "s" : ""}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-[#4f5769]">Confirmalas para excluirlas de tus gastos reales</p>
            </div>
          </div>
          <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
            {suspectedTransfers.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium truncate">{p.fromCuenta.nombre}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-300 dark:text-slate-600 shrink-0"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  <span className="font-medium truncate">{p.toCuenta.nombre}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white tabular-nums">${fmt(p.gasto.monto)}</span>
                <span className="text-[11px] text-slate-400 dark:text-[#4f5769]">
                  {new Date(p.gasto.created_at).toLocaleDateString("es-UY", { day: "2-digit", month: "2-digit" })}
                </span>
                <button
                  onClick={() => markTransfer(p.gasto.id, p.ingreso.id)}
                  disabled={markingTransfer === p.gasto.id}
                  className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-3 py-1.5 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors disabled:opacity-50"
                >
                  {markingTransfer === p.gasto.id ? "Marcando…" : "Confirmar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Subscriptions ── */}
      {!loading && subscriptions.length > 0 && (
        <div className="mac-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-black/[0.04] dark:border-white/[0.04] px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-[#4f5769]">
              Gastos recurrentes
            </p>
            <span className="rounded-full bg-slate-100 dark:bg-[#1a1d2e] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
              {subscriptions.length}
            </span>
          </div>

          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 border-b border-black/[0.03] dark:border-white/[0.03] px-5 py-2">
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 dark:text-[#2d3347]">Concepto</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 dark:text-[#2d3347] text-center pr-2">Frec.</p>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 dark:text-[#2d3347] text-right">Monto</p>
          </div>

          <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
            {subscriptions.map((s, i) => {
              const nextDate  = new Date(s.nextDate)
              const daysLeft  = Math.ceil((nextDate.getTime() - Date.now()) / 86400000)
              const isUrgent  = daysLeft > 0 && daysLeft <= 7
              const isSoon    = daysLeft > 7 && daysLeft <= 15
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.04, duration: 0.3 }}
                  className="grid grid-cols-[1fr_auto_auto] gap-x-4 items-center px-5 py-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base select-none leading-none">{catEmoji(s.name)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate leading-tight">{s.name}</p>
                      {isUrgent && <p className="text-[9px] font-semibold text-red-500 mt-0.5">{daysLeft}d restantes</p>}
                      {isSoon   && <p className="text-[9px] text-amber-500 mt-0.5">{daysLeft}d restantes</p>}
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-[#1a1d2e] px-2.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                      {s.freq}
                    </span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300 text-right">
                    ~${fmt(s.avgMonto)}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Charts ── */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="mac-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-[#4f5769]">Por categoría</p>
              <h3 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white capitalize">{monthLabel}</h3>
            </div>
          </div>
          {categoryData.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400 dark:text-[#4f5769]">Sin datos este mes</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${fmt(v)}`} />
                <YAxis type="category" dataKey="name" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="mac-card p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 dark:text-[#4f5769]">Tendencia</p>
            <h3 className="mt-0.5 text-base font-semibold text-slate-900 dark:text-white">Últimos 6 meses</h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${fmt(v)}`} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="ingresos" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} />
              <Line type="monotone" dataKey="gastos"   stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-500">
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500"/>Ingresos</span>
            <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-red-500"/>Gastos</span>
          </div>
        </div>
      </div>

      {/* ── Account Modal ── */}
      {modal !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" onClick={closeModal} />
          <div className="relative w-full max-w-sm glass-panel p-6">
            <h3 className="mb-5 text-base font-semibold text-slate-900 dark:text-white">
              {modal === "add" ? "Agregar cuenta" : "Editar cuenta"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Banco / Institución</label>
                <div className="flex flex-wrap gap-2">
                  {BANCOS.map(b => (
                    <button key={b} type="button" onClick={() => setCuentaForm(f => ({ ...f, banco: b, nombre: "" }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                        cuentaForm.banco === b
                          ? `${bancoColor(b).bg} ${bancoColor(b).border} ${bancoColor(b).label}`
                          : "bg-slate-50 dark:bg-[#1a1d2e] border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-100"
                      }`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Tipo de producto</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_CA.map(t => (
                    <button key={t} type="button" onClick={() => setCuentaForm(f => ({ ...f, tipo: t, nombre: "" }))}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all border ${
                        cuentaForm.tipo === t
                          ? "bg-slate-900 dark:bg-amber-500 border-slate-900 dark:border-amber-500 text-white dark:text-slate-900"
                          : "bg-slate-50 dark:bg-[#1a1d2e] border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-100"
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Moneda</label>
                <div className="flex gap-2">
                  {[{ v: "UY", label: "$ Pesos" }, { v: "USD", label: "U$S Dólares" }].map(({ v, label }) => (
                    <button key={v} type="button" onClick={() => setCuentaForm(f => ({ ...f, moneda: v, nombre: "" }))}
                      className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all border ${
                        cuentaForm.moneda === v
                          ? "bg-slate-900 dark:bg-amber-500 border-slate-900 dark:border-amber-500 text-white dark:text-slate-900"
                          : "bg-slate-50 dark:bg-[#1a1d2e] border-slate-200 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 hover:bg-slate-100"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">
                  {modal === "edit" ? "Saldo base" : "Saldo actual"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 pointer-events-none">
                    {cuentaForm.moneda === "USD" ? "U$S" : "$"}
                  </span>
                  <input type="number" step="0.01" min="0" value={cuentaForm.saldo_inicial}
                    onChange={e => setCuentaForm(f => ({ ...f, saldo_inicial: e.target.value }))}
                    className="input-base pl-9" placeholder="0" />
                </div>
                <p className="mt-1 text-[11px] text-slate-400 dark:text-[#4f5769]">
                  {modal === "add"
                    ? "Ingresá el saldo actual. Se actualiza con cada movimiento."
                    : "Ajusta el punto de partida. Los movimientos ya actualizan el saldo."}
                </p>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">Nombre (opcional)</label>
                <input className="input-base" placeholder={autoNombre(cuentaForm)}
                  value={cuentaForm.nombre} onChange={e => setCuentaForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
            </div>
            {cuentaError && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{cuentaError}</p>}
            <div className="mt-5 flex gap-2">
              {modal === "edit" && (
                <button onClick={handleDeleteCuenta} disabled={savingCuenta}
                  className="rounded-lg border border-red-200 dark:border-red-900/50 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                  Eliminar
                </button>
              )}
              <button onClick={closeModal} disabled={savingCuenta}
                className="flex-1 rounded-lg bg-slate-100 dark:bg-[#1a1d2e] px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-[#232840] transition-all">
                Cancelar
              </button>
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
