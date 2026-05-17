"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  parseImportCSV,
  downloadOfficialTemplate,
  makeDupHash,
  type ImportRow,
  type ParseError,
} from "@/lib/importParser"

// ── Types ──────────────────────────────────────────────────────────────────

type Cuenta = { id: string; nombre: string; banco: string; tipo: string; moneda: string }

// Legacy format row (old CSV: Fecha,Monto,Categoria...)
type LegacyRow = {
  monto:      number
  categoria:  string
  subcategoria: string
  tipo:       string
  moneda:     string
  created_at: string
  raw?:       string
  dupKey:     string
  isDuplicate: boolean
}

type Format  = "unknown" | "official" | "legacy"
type Step    = "idle" | "preview" | "importing" | "done"

type ImportResult = {
  imported:        number
  skipped:         number
  transfersCreated: number
  accountsCreated: string[]
}

// ── Formatters ─────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

// ── Legacy CSV helpers (backward compat) ───────────────────────────────────

function parseAmountLegacy(s: string): number {
  if (!s) return 0
  const clean = s.replace(/[$ ]/g, "").replace(/\./g, "").replace(",", ".")
  return Math.round(parseFloat(clean)) || 0
}

function parseDateLegacy(s: string): string | null {
  s = s.trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function unquote(s: string) {
  s = s.trim()
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1)
  return s.trim()
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let inQuote = false, current = ""
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === "," && !inQuote) { fields.push(current.trim()); current = "" }
    else { current += ch }
  }
  fields.push(current.trim())
  return fields.map(unquote)
}

function buildLegacyRows(content: string, existingKeys: Set<string>): LegacyRow[] {
  const text  = content.replace(/^﻿/, "")
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error("El archivo está vacío o mal formado.")

  const headers = parseCsvLine(lines[0]).map(h => h.toLowerCase())
  const rows: LegacyRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? "" })

    const montoRaw   = parseAmountLegacy(row.monto || "")
    const ingresosRaw = parseAmountLegacy(row.ingresos || "")
    const categoria  = (row.categoria || "Otro").trim()
    const subcategoria = (row.subcategoria || "").trim()
    const moneda     = (row.moneda || "UY").trim()
    const fechaStr   = (row.fecha || "").trim()
    if (!fechaStr) continue
    const iso = parseDateLegacy(fechaStr)
    if (!iso) continue
    if (!montoRaw && !ingresosRaw) continue

    const tipo      = categoria.toLowerCase() === "ahorro" ? "Ahorro" : ingresosRaw > 0 ? "Ingreso" : "Gasto"
    const monto     = tipo === "Ingreso" ? ingresosRaw : montoRaw
    const created_at = `${iso}T00:00:00.000Z`
    const dupKey    = makeDupHash(iso, monto, categoria)

    rows.push({ monto, categoria, subcategoria, tipo, moneda, created_at, dupKey, isDuplicate: existingKeys.has(dupKey) })
  }

  return rows
}

function downloadLegacyTemplate() {
  const content = [
    "Fecha,Dia,Monto,Categoria,Subcategoria,Ingresos,Moneda",
    "01/03/2026,Domingo,419,Transporte,Taxi,,UY",
    "01/03/2026,Domingo,,Papá,,100,USD",
    "01/03/2026,Domingo,,Sueldo,,22813,UY",
  ].join("\n")
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href = url; a.download = "plantilla-legado.csv"
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}

// ── Sub-components ─────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: string }) {
  const cfg = {
    Ingreso:       "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400",
    Gasto:         "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400",
    Ahorro:        "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
    Transferencia: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400",
  }[tipo] ?? "bg-gray-100 dark:bg-[#1a1d2e] text-gray-500"
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg}`}>{tipo}</span>
}

function StatCell({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="mac-card p-4">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#4f5769]">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${color ?? "text-gray-900 dark:text-white"}`}>{value}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function StatsClient() {
  const [cuentas, setCuentas]           = useState<Cuenta[]>([])
  const [selectedCuenta, setSelectedCuenta] = useState("")
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set())
  const [existingExtIds, setExistingExtIds] = useState<Set<string>>(new Set())

  // Official format state
  const [officialRows, setOfficialRows] = useState<ImportRow[] | null>(null)
  const [parseErrors, setParseErrors]   = useState<ParseError[]>([])

  // Legacy format state
  const [legacyRows, setLegacyRows]     = useState<LegacyRow[] | null>(null)
  const [skipDupes, setSkipDupes]       = useState(true)

  const [format, setFormat]   = useState<Format>("unknown")
  const [fileName, setFileName] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [step, setStep]       = useState<Step>("idle")
  const [error, setError]     = useState<string | null>(null)
  const [result, setResult]   = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/cuentas")
      .then(r => r.json())
      .then((data: Cuenta[]) => { setCuentas(data); if (data.length > 0) setSelectedCuenta(data[0].id) })
      .catch(() => {})

    // Load existing hashes for legacy dedup
    fetch("/api/gastos")
      .then(r => r.json())
      .then((data: Array<{ created_at: string; monto: number; categoria: string }>) => {
        const keys = new Set(data.map(g => makeDupHash(g.created_at.slice(0, 10), g.monto, g.categoria)))
        setExistingKeys(keys)
      })
      .catch(() => {})

    // Load existing external_ids for official dedup
    fetch("/api/import")
      .then(r => r.json())
      .then((data: { ids?: string[] }) => {
        if (Array.isArray(data.ids)) setExistingExtIds(new Set(data.ids))
      })
      .catch(() => {})
  }, [])

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Solo se aceptan archivos .csv por ahora")
      return
    }
    setError(null)
    setFileName(file.name)

    file.text().then(content => {
      // Try official format first
      const result = parseImportCSV(content)
      if (result.isNewFormat) {
        // Mark which rows are duplicates
        const rows = result.rows.map(r => ({
          ...r,
          isDuplicate: existingExtIds.has(r.external_id),
        }))
        setOfficialRows(rows as ImportRow[])
        setParseErrors(result.errors)
        setLegacyRows(null)
        setFormat("official")
        setStep("preview")
        return
      }

      // Fallback: legacy format
      try {
        const rows = buildLegacyRows(content, existingKeys)
        if (rows.length === 0) { setError("No se encontraron filas válidas."); return }
        setLegacyRows(rows)
        setOfficialRows(null)
        setFormat("legacy")
        setStep("preview")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al procesar el archivo")
      }
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [existingKeys, existingExtIds]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Import: official format ──────────────────────────────────────────────
  async function handleImportOfficial() {
    if (!officialRows) return
    const toImport = officialRows.filter(r => !(r as ImportRow & { isDuplicate?: boolean }).isDuplicate)
    if (toImport.length === 0) { setError("No hay transacciones nuevas para importar."); return }

    setStep("importing"); setError(null)

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: toImport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al importar")
      setResult({
        imported:        data.imported,
        skipped:         officialRows.length - toImport.length,
        transfersCreated: data.transfersCreated,
        accountsCreated: data.accountsCreated ?? [],
      })
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
      setStep("preview")
    }
  }

  // ── Import: legacy format ────────────────────────────────────────────────
  async function handleImportLegacy() {
    if (!legacyRows) return
    const toImport = skipDupes ? legacyRows.filter(r => !r.isDuplicate) : legacyRows
    if (toImport.length === 0) { setError("No hay filas nuevas para importar."); return }

    setStep("importing"); setError(null)

    const dupeSkipped = skipDupes ? legacyRows.filter(r => r.isDuplicate).length : 0
    const rows = toImport.map(r => ({
      monto: r.monto, categoria: r.categoria, subcategoria: r.subcategoria,
      tipo: r.tipo, moneda: r.moneda, created_at: r.created_at,
      cuenta_id: selectedCuenta, ...(r.raw ? { raw: r.raw } : {}),
    }))

    try {
      const res = await fetch("/api/gastos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al importar")
      setResult({
        imported:        data.imported,
        skipped:         dupeSkipped,
        transfersCreated: 0,
        accountsCreated: [],
      })
      setStep("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado")
      setStep("preview")
    }
  }

  function reset() {
    setOfficialRows(null); setLegacyRows(null); setParseErrors([])
    setFileName(""); setFormat("unknown"); setStep("idle")
    setError(null); setResult(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleClearAll() {
    if (!confirm("¿Borrar TODOS los registros? Esta acción no se puede deshacer.")) return
    try {
      await fetch("/api/gastos", { method: "DELETE" })
      setExistingKeys(new Set()); setExistingExtIds(new Set()); setError(null)
    } catch { setError("No se pudo borrar el historial.") }
  }

  // ── Derived counts ─────────────────────────────────────────────────────
  const officialDupes = officialRows?.filter(r => (r as ImportRow & { isDuplicate?: boolean }).isDuplicate).length ?? 0
  const officialNew   = (officialRows?.length ?? 0) - officialDupes
  const officialTransfers = officialRows?.filter(r => r.tipo === "Transferencia").length ?? 0
  const officialAccounts  = Array.from(new Set([
    ...(officialRows?.map(r => r.cuenta_origen) ?? []),
    ...(officialRows?.filter(r => r.cuenta_destino).map(r => r.cuenta_destino) ?? []),
  ]))

  const legacyDupes = legacyRows?.filter(r => r.isDuplicate).length ?? 0
  const legacyNew   = (legacyRows?.length ?? 0) - legacyDupes
  const legacySumIngresos = legacyRows?.filter(r => r.tipo === "Ingreso").reduce((s, r) => s + r.monto, 0) ?? 0
  const legacySumGastos   = legacyRows?.filter(r => r.tipo === "Gasto").reduce((s, r) => s + r.monto, 0) ?? 0

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Importar</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-[#8892a4]">
          {step === "idle"      && "Subí un CSV con el formato oficial o el formato legado."}
          {step === "preview"   && `${(officialRows ?? legacyRows)?.length} filas detectadas — "${fileName}"`}
          {step === "importing" && "Procesando importación…"}
          {step === "done"      && "Importación completada."}
        </p>
      </div>

      {/* ── IDLE ─────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {step === "idle" && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Drag & Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              className={`mac-card transition-all duration-200 ${isDragging ? "ring-2 ring-amber-400/50 scale-[1.005]" : ""}`}
            >
              <label className="flex cursor-pointer flex-col items-center justify-center gap-4 p-14 text-center">
                <motion.div
                  animate={{ scale: isDragging ? 1.1 : 1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${isDragging ? "bg-amber-100 dark:bg-amber-950/30" : "bg-gray-100 dark:bg-[#1a1d2e]"}`}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                    stroke={isDragging ? "#f59e0b" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </motion.div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                    {isDragging ? "Soltá el archivo aquí" : "Arrastrá un CSV o hacé clic para seleccionar"}
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-[#4f5769]">
                    Detecta el formato automáticamente · sin límite de filas
                  </p>
                </div>
                <input ref={fileRef} type="file" accept=".csv"
                  onChange={e => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                  className="hidden"
                />
              </label>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Format reference — 2 columns */}
            <div className="grid gap-4 lg:grid-cols-2">

              {/* Official format */}
              <div className="mac-card p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-600 dark:text-amber-400">Recomendado</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Formato oficial</h3>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-[#4f5769]">Con ID, cuentas y transferencias</p>
                  </div>
                  <button onClick={downloadOfficialTemplate}
                    className="shrink-0 rounded-xl border border-black/[0.07] dark:border-white/[0.06] bg-[#f7f8fa] dark:bg-[#1a1d2e] px-3 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#232840] transition-colors">
                    Descargar plantilla
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-black/[0.05] dark:border-white/[0.05] bg-[#f7f8fa] dark:bg-[#0d0f1a]">
                  <table className="w-full text-[10px] text-gray-500 dark:text-slate-500">
                    <thead>
                      <tr className="border-b border-black/[0.05] dark:border-white/[0.04]">
                        {["id", "fecha", "tipo", "monto", "moneda", "cuenta_origen", "cuenta_destino"].map(h => (
                          <th key={h} className="px-2.5 py-2 text-left font-bold text-[9px] uppercase tracking-widest text-gray-400 dark:text-[#4f5769]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                      {[
                        ["txn_0001", "2026-05-01", "income",   "50000", "UYU", "BROU_PESOS", ""],
                        ["txn_0002", "2026-05-01", "transfer", "500",   "USD", "BROU_USD",   "ITAU_USD"],
                        ["txn_0003", "2026-05-02", "expense",  "350",   "UYU", "ITAU_PESOS", ""],
                      ].map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-2.5 py-1.5 font-mono">
                              {cell || <span className="text-gray-300 dark:text-slate-700">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Legacy format */}
              <div className="mac-card p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-gray-100 dark:bg-[#1a1d2e] px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-gray-400">Legado</span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Formato anterior</h3>
                    <p className="mt-0.5 text-xs text-gray-400 dark:text-[#4f5769]">Compatible con planillas viejas</p>
                  </div>
                  <button onClick={downloadLegacyTemplate}
                    className="shrink-0 rounded-xl border border-black/[0.07] dark:border-white/[0.06] bg-[#f7f8fa] dark:bg-[#1a1d2e] px-3 py-2 text-xs font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-[#232840] transition-colors">
                    Descargar plantilla
                  </button>
                </div>
                <div className="overflow-x-auto rounded-xl border border-black/[0.05] dark:border-white/[0.05] bg-[#f7f8fa] dark:bg-[#0d0f1a]">
                  <table className="w-full text-[10px] text-gray-500 dark:text-slate-500">
                    <thead>
                      <tr className="border-b border-black/[0.05] dark:border-white/[0.04]">
                        {["Fecha", "Monto", "Categoria", "Subcategoria", "Ingresos", "Moneda"].map(h => (
                          <th key={h} className="px-2.5 py-2 text-left font-bold text-[9px] uppercase tracking-widest text-gray-400 dark:text-[#4f5769]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                      {[
                        ["01/03/2026", "419", "Transporte", "Taxi", "", "UY"],
                        ["01/03/2026", "", "Sueldo", "", "22813", "UY"],
                        ["01/03/2026", "3935", "Ahorro", "Usd", "", "UY"],
                      ].map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td key={j} className="px-2.5 py-1.5 font-mono">
                              {cell || <span className="text-gray-300 dark:text-slate-700">—</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="mac-card p-5">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Zona peligrosa</h3>
              <p className="mt-1 mb-4 text-xs text-gray-400 dark:text-[#4f5769]">Elimina todos los registros de tu cuenta. Irreversible.</p>
              <button onClick={handleClearAll}
                className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-2.5 text-sm font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors">
                Borrar todos los registros
              </button>
            </div>
          </motion.div>
        )}

        {/* ── PREVIEW: official format ──────────────────────────────────── */}
        {step === "preview" && format === "official" && officialRows && (
          <motion.div
            key="preview-official"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Summary grid */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCell label="Total filas"   value={officialRows.length} />
              <StatCell label="Nuevas"        value={officialNew}   color="text-emerald-600 dark:text-emerald-400" />
              <StatCell label="Duplicadas"    value={officialDupes} color={officialDupes > 0 ? "text-amber-500" : "text-gray-900 dark:text-white"} />
              <StatCell label="Transferencias" value={officialTransfers} color="text-blue-600 dark:text-blue-400" />
            </div>

            {/* Accounts affected */}
            {officialAccounts.length > 0 && (
              <div className="mac-card px-5 py-4 flex flex-wrap items-center gap-2">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#4f5769] mr-2">Cuentas afectadas</p>
                {officialAccounts.map(alias => (
                  <span key={alias} className="rounded-full bg-slate-100 dark:bg-[#1a1d2e] px-2.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400 font-mono">
                    {alias}
                  </span>
                ))}
              </div>
            )}

            {/* Parse errors */}
            {parseErrors.length > 0 && (
              <div className="mac-card overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-black/[0.04] dark:border-white/[0.04]">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <p className="text-xs font-semibold text-gray-700 dark:text-slate-300">{parseErrors.length} error{parseErrors.length !== 1 ? "es" : ""} detectado{parseErrors.length !== 1 ? "s" : ""}</p>
                </div>
                <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03] max-h-40 overflow-y-auto">
                  {parseErrors.map((e, i) => (
                    <div key={i} className="px-5 py-2.5 flex items-start gap-3">
                      <span className="shrink-0 rounded-md bg-red-50 dark:bg-red-950/40 px-2 py-0.5 text-[9px] font-bold text-red-600 dark:text-red-400 uppercase">Fila {e.row}</span>
                      <div>
                        <p className="text-xs text-gray-700 dark:text-slate-300">{e.message}</p>
                        {e.hint && <p className="text-[10px] text-gray-400 dark:text-[#4f5769] mt-0.5">{e.hint}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="mac-card px-5 py-4 flex items-center gap-3">
              <button onClick={reset}
                className="rounded-xl border border-black/[0.07] dark:border-white/[0.06] px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#1a1d2e] transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleImportOfficial}
                disabled={officialNew === 0}
                className="btn-primary ml-auto"
              >
                Importar {officialNew} transaccion{officialNew !== 1 ? "es" : ""}
              </button>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>
            )}

            {/* Preview table */}
            <div className="mac-card overflow-hidden">
              <div className="max-h-[480px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-white/95 dark:bg-[#11131f]/95 backdrop-blur-sm">
                    <tr className="border-b border-black/[0.05] dark:border-white/[0.05]">
                      {["Estado", "Fecha", "Tipo", "Origen", "Destino", "Monto", "Descripción"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#4f5769]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                    {officialRows.map((row, i) => {
                      const isDupe = (row as ImportRow & { isDuplicate?: boolean }).isDuplicate
                      return (
                        <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors ${isDupe ? "opacity-40" : ""}`}>
                          <td className="px-3 py-2">
                            {isDupe
                              ? <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">Duplicado</span>
                              : <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">Nuevo</span>
                            }
                          </td>
                          <td className="px-3 py-2 font-mono text-gray-500 dark:text-slate-500 whitespace-nowrap">{row.fecha}</td>
                          <td className="px-3 py-2"><TipoBadge tipo={row.tipo} /></td>
                          <td className="px-3 py-2 font-mono text-gray-600 dark:text-slate-400 text-[10px]">{row.cuenta_origen}</td>
                          <td className="px-3 py-2 font-mono text-gray-600 dark:text-slate-400 text-[10px]">{row.cuenta_destino || <span className="text-gray-300 dark:text-slate-700">—</span>}</td>
                          <td className="px-3 py-2 text-right font-bold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                            {row.moneda === "USD" ? "U$S " : "$"}{fmt(row.monto)}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-slate-400 max-w-[160px] truncate">{row.descripcion || row.categoria}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── PREVIEW: legacy format ────────────────────────────────────── */}
        {step === "preview" && format === "legacy" && legacyRows && (
          <motion.div
            key="preview-legacy"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* Format notice */}
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-xs text-amber-700 dark:text-amber-400">Formato legado detectado. Se importará a una sola cuenta. <span className="font-semibold">Considera usar el formato oficial para mayor control.</span></p>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCell label="Total filas" value={legacyRows.length} />
              <StatCell label="Nuevas"      value={legacyNew}   color="text-emerald-600 dark:text-emerald-400" />
              <StatCell label="Duplicadas"  value={legacyDupes} color={legacyDupes > 0 ? "text-amber-500" : "text-gray-900 dark:text-white"} />
              <StatCell label="Balance CSV" value={`$${fmt(legacySumIngresos - legacySumGastos)}`}
                color={legacySumIngresos - legacySumGastos >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600"} />
            </div>

            {/* Cuenta selector */}
            {cuentas.length > 0 && (
              <div className="mac-card p-4">
                <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-3">Importar a cuenta</p>
                <div className="flex flex-wrap gap-1.5">
                  {cuentas.map(c => (
                    <button key={c.id} onClick={() => setSelectedCuenta(c.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
                        selectedCuenta === c.id
                          ? "bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-900 border-slate-900 dark:border-amber-500"
                          : "bg-transparent border-black/[0.07] dark:border-white/[0.06] text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#1a1d2e]"
                      }`}>
                      {c.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mac-card px-5 py-4 flex flex-wrap items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 dark:text-slate-300 select-none">
                <div onClick={() => setSkipDupes(v => !v)}
                  className={`relative h-5 w-9 rounded-full transition-colors ${skipDupes ? "bg-amber-500" : "bg-gray-300 dark:bg-slate-600"}`}>
                  <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${skipDupes ? "translate-x-4" : ""}`} />
                </div>
                Omitir duplicados
              </label>
              <div className="ml-auto flex gap-2">
                <button onClick={reset}
                  className="rounded-xl border border-black/[0.07] dark:border-white/[0.06] px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-[#1a1d2e] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleImportLegacy} disabled={(skipDupes ? legacyNew : legacyRows.length) === 0}
                  className="btn-primary">
                  Importar {skipDupes ? legacyNew : legacyRows.length} movimientos
                </button>
              </div>
            </div>

            {error && <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

            <div className="mac-card overflow-hidden">
              <div className="max-h-[480px] overflow-y-auto overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10 bg-white/95 dark:bg-[#11131f]/95 backdrop-blur-sm">
                    <tr className="border-b border-black/[0.05] dark:border-white/[0.05]">
                      {["Estado", "Fecha", "Categoría", "Subcategoría", "Monto", "Tipo"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-[#4f5769]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                    {legacyRows.map((row, i) => (
                      <tr key={i} className={`hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors ${row.isDuplicate ? "opacity-40" : ""}`}>
                        <td className="px-3 py-2">
                          {row.isDuplicate
                            ? <span className="inline-flex rounded-full bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 text-[9px] font-semibold text-amber-700 dark:text-amber-400">Duplicado</span>
                            : <span className="inline-flex rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400">Nuevo</span>
                          }
                        </td>
                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-slate-500 whitespace-nowrap">{row.created_at.slice(0, 10)}</td>
                        <td className="px-3 py-2 font-medium text-gray-800 dark:text-slate-200">{row.categoria}</td>
                        <td className="px-3 py-2 text-gray-500 dark:text-slate-500">{row.subcategoria || "—"}</td>
                        <td className="px-3 py-2 text-right font-bold tabular-nums text-gray-900 dark:text-white whitespace-nowrap">
                          {row.monto > 0 ? `$${fmt(row.monto)}` : "—"}
                        </td>
                        <td className="px-3 py-2"><TipoBadge tipo={row.tipo} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── IMPORTING ─────────────────────────────────────────────────── */}
        {step === "importing" && (
          <motion.div
            key="importing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mac-card flex flex-col items-center gap-6 p-16"
          >
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-amber-200 dark:border-amber-900/50" />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-500"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-800 dark:text-slate-200">Procesando importación</p>
              <p className="mt-1 text-xs text-gray-400 dark:text-[#4f5769]">Resolviendo cuentas y registrando movimientos…</p>
            </div>
          </motion.div>
        )}

        {/* ── DONE ──────────────────────────────────────────────────────── */}
        {step === "done" && result && (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="mac-card flex flex-col items-center gap-6 p-16 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, delay: 0.1 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40"
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </motion.div>

            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                {result.imported} transaccion{result.imported !== 1 ? "es" : ""} importada{result.imported !== 1 ? "s" : ""}
              </p>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {result.skipped > 0 && (
                  <span className="rounded-full bg-gray-100 dark:bg-[#1a1d2e] px-3 py-1 text-xs font-medium text-gray-500 dark:text-slate-400">
                    {result.skipped} duplicadas omitidas
                  </span>
                )}
                {result.transfersCreated > 0 && (
                  <span className="rounded-full bg-blue-50 dark:bg-blue-950/40 px-3 py-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {result.transfersCreated} transferencia{result.transfersCreated !== 1 ? "s" : ""} detectada{result.transfersCreated !== 1 ? "s" : ""}
                  </span>
                )}
                {result.accountsCreated.length > 0 && (
                  <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {result.accountsCreated.length} cuenta{result.accountsCreated.length !== 1 ? "s" : ""} creada{result.accountsCreated.length !== 1 ? "s" : ""} automáticamente
                  </span>
                )}
              </div>
              {result.accountsCreated.length > 0 && (
                <p className="mt-2 text-xs text-gray-400 dark:text-[#4f5769]">
                  {result.accountsCreated.join(", ")}
                </p>
              )}
            </div>

            <button onClick={reset} className="btn-primary">
              Importar otro archivo
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
