"use client"

import { useState, useRef, useEffect, useCallback } from "react"

// ── Types ──────────────────────────────────────────────────────────────────
type Cuenta = { id: string; nombre: string; banco: string; tipo: string; moneda: string }
type ParsedRow = {
  monto: number
  categoria: string
  subcategoria: string
  tipo: string
  moneda: string
  created_at: string
  raw?: string
  dupKey: string
  isDuplicate: boolean
}
type Step = "idle" | "preview" | "importing" | "done"

// ── CSV helpers ─────────────────────────────────────────────────────────────
function detectFormat(headers: string[]): "new" | "legacy" {
  const h = headers.map((s) => s.toLowerCase().trim())
  if (h.includes("monto") || h.includes("fecha")) return "new"
  return "legacy"
}

function parseAmount(s: string): number {
  if (!s) return 0
  const clean = s.replace(/[$ ]/g, "").replace(/\./g, "").replace(",", ".")
  return Math.round(parseFloat(clean)) || 0
}

function parseDate(s: string): string | null {
  s = s.trim()
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
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
  let inQuote = false
  let current = ""
  for (const ch of line) {
    if (ch === '"') { inQuote = !inQuote }
    else if (ch === "," && !inQuote) { fields.push(current.trim()); current = "" }
    else { current += ch }
  }
  fields.push(current.trim())
  return fields.map(unquote)
}

function makeDupKey(date: string, monto: number, categoria: string): string {
  return `${date}_${Math.round(Math.abs(monto))}_${categoria.toLowerCase().trim()}`
}

function buildRows(content: string, existingKeys: Set<string>): ParsedRow[] {
  const text = content.replace(/^﻿/, "")
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error("El archivo está vacío o mal formado.")

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const format = detectFormat(headers)
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? "" })

    if (format === "legacy") {
      const raw = row.raw || row.texto || row.text || row.descripcion || ""
      const tipo = ["Gasto", "Ingreso", "Ahorro"].includes((row.tipo || "").trim()) ? row.tipo.trim() : "Gasto"
      const fecha = (row.fecha || "").trim()
      if (!raw) continue
      const iso = fecha ? parseDate(fecha) : null
      if (fecha && !iso) throw new Error(`Fila ${i + 1}: fecha inválida "${fecha}".`)
      const created_at = iso ? `${iso}T00:00:00.000Z` : new Date().toISOString()
      const dk = makeDupKey(created_at.slice(0, 10), 0, raw.slice(0, 30))
      rows.push({ monto: 0, categoria: raw.slice(0, 40), subcategoria: "", tipo, moneda: "UY", created_at, raw, dupKey: dk, isDuplicate: existingKeys.has(dk) })
    } else {
      const montoRaw = parseAmount(row.monto || "")
      const ingresosRaw = parseAmount(row.ingresos || "")
      const categoria = (row.categoria || "Otro").trim()
      const subcategoria = (row.subcategoria || "").trim()
      const moneda = (row.moneda || "UY").trim()
      const fecha = (row.fecha || "").trim()
      if (!fecha) continue
      const iso = parseDate(fecha)
      if (!iso) continue
      if (!montoRaw && !ingresosRaw) continue

      const tipo = categoria.toLowerCase() === "ahorro" ? "Ahorro" : ingresosRaw > 0 ? "Ingreso" : "Gasto"
      const monto = tipo === "Ingreso" ? ingresosRaw : montoRaw
      const created_at = `${iso}T00:00:00.000Z`
      const dk = makeDupKey(iso, monto, categoria)
      rows.push({ monto, categoria, subcategoria, tipo, moneda, created_at, dupKey: dk, isDuplicate: existingKeys.has(dk) })
    }
  }

  return rows
}

function downloadTemplate() {
  const content = [
    "Fecha,Dia,Monto,Categoria,Subcategoria,Ingresos,Moneda",
    "01/03/2026,Domingo,419,Transporte,Taxi,,UY",
    "01/03/2026,Domingo,,Papá,,100,USD",
    "01/03/2026,Domingo,,Sueldo,,22813,UY",
    "01/03/2026,Domingo,3935,Ahorro,Usd,,UY",
    "02/03/2026,Lunes,210,Supermercado,Disco,,UY",
  ].join("\n")
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "plantilla-finanzas.csv"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const fmt = (n: number) => new Intl.NumberFormat("es-UY", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n)

// ── Component ───────────────────────────────────────────────────────────────
export function StatsClient() {
  const [cuentas, setCuentas]           = useState<Cuenta[]>([])
  const [selectedCuenta, setSelectedCuenta] = useState("")
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set())
  const [preview, setPreview]           = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName]         = useState("")
  const [isDragging, setIsDragging]     = useState(false)
  const [step, setStep]                 = useState<Step>("idle")
  const [skipDupes, setSkipDupes]       = useState(true)
  const [imported, setImported]         = useState(0)
  const [error, setError]               = useState<string | null>(null)
  const [result, setResult]             = useState<{ imported: number; skipped: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/cuentas")
      .then((r) => r.json())
      .then((data: Cuenta[]) => {
        setCuentas(data)
        if (data.length > 0) setSelectedCuenta(data[0].id)
      })
      .catch(() => {})

    fetch("/api/gastos")
      .then((r) => r.json())
      .then((data: Array<{ created_at: string; monto: number; categoria: string }>) => {
        const keys = new Set(data.map((g) => makeDupKey(g.created_at.slice(0, 10), g.monto, g.categoria)))
        setExistingKeys(keys)
      })
      .catch(() => {})
  }, [])

  function processFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Solo se aceptan archivos .csv")
      return
    }
    setError(null)
    setFileName(file.name)
    file.text().then((content) => {
      try {
        const rows = buildRows(content, existingKeys)
        if (rows.length === 0) { setError("No se encontraron filas válidas."); return }
        setPreview(rows)
        setStep("preview")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al procesar el archivo")
      }
    })
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }, [existingKeys]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleImport() {
    if (!preview) return
    const toImport = skipDupes ? preview.filter((r) => !r.isDuplicate) : preview
    if (toImport.length === 0) { setError("No hay filas nuevas para importar."); return }

    setStep("importing")
    setImported(0)

    const dupeSkipped = skipDupes ? preview.filter((r) => r.isDuplicate).length : 0
    const rows = toImport.map((r) => ({
      monto: r.monto,
      categoria: r.categoria,
      subcategoria: r.subcategoria,
      tipo: r.tipo,
      moneda: r.moneda,
      created_at: r.created_at,
      cuenta_id: selectedCuenta,
      ...(r.raw ? { raw: r.raw } : {}),
    }))

    try {
      const res = await fetch("/api/gastos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al importar")
      setImported(data.imported)
      setResult({ imported: data.imported, skipped: dupeSkipped + (toImport.length - data.imported) })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al importar")
      setStep("preview")
      return
    }

    setStep("done")
  }

  function reset() {
    setPreview(null)
    setFileName("")
    setStep("idle")
    setError(null)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function handleClearAll() {
    if (!window.confirm("¿Borrar TODOS los registros? Esta acción no se puede deshacer.")) return
    try {
      const res = await fetch("/api/gastos", { method: "DELETE" })
      if (!res.ok) throw new Error()
      setError(null)
      setExistingKeys(new Set())
      alert("Todos los registros fueron eliminados.")
    } catch {
      setError("No se pudo borrar el historial.")
    }
  }

  const dupeCount  = preview?.filter((r) => r.isDuplicate).length ?? 0
  const newCount   = preview?.filter((r) => !r.isDuplicate).length ?? 0
  const sumIngresos = preview?.filter((r) => r.tipo === "Ingreso").reduce((s, r) => s + r.monto, 0) ?? 0
  const sumGastos   = preview?.filter((r) => r.tipo === "Gasto").reduce((s, r) => s + r.monto, 0) ?? 0

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Importar</h2>
        <p className="mt-1 text-sm text-gray-500">
          {step === "idle"      && "Importá tus movimientos desde Excel o CSV."}
          {step === "preview"   && `${preview?.length} filas detectadas en "${fileName}"`}
          {step === "importing" && "Enviando al servidor…"}
          {step === "done"      && "Importación completada."}
        </p>
      </div>

      {/* ── IDLE: cuenta selector + drop zone + format reference ─────────── */}
      {step === "idle" && (
        <>
          {cuentas.length > 0 && (
            <div className="mac-card p-5">
              <p className="mb-3 text-sm font-semibold text-gray-700">¿A qué cuenta pertenece este archivo?</p>
              <div className="flex flex-wrap gap-2">
                {cuentas.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCuenta(c.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium transition-all border ${
                      selectedCuenta === c.id
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Drag & drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`mac-card transition-all duration-200 ${isDragging ? "border-sage-500/50 shadow-md scale-[1.005]" : ""}`}
          >
            <label className="flex cursor-pointer flex-col items-center justify-center gap-4 p-14 text-center">
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl transition-colors ${isDragging ? "bg-sage-100" : "bg-gray-100"}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={isDragging ? "#4a7d5a" : "#9ca3af"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-gray-800">
                  {isDragging ? "Soltá el archivo aquí" : "Arrastrá un CSV o hacé clic para seleccionar"}
                </p>
                <p className="mt-1 text-sm text-gray-400">Detecta el formato automáticamente · sin límite de filas</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f) }}
                className="hidden"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          {/* Format reference */}
          <div className="mac-card p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="font-semibold text-gray-900">Formato esperado</h3>
                <p className="mt-1 text-sm text-gray-500">Mismo formato que tu planilla mensual.</p>
              </div>
              <button onClick={downloadTemplate} className="shrink-0 rounded-xl border border-black/[0.08] bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                Descargar plantilla
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-black/[0.06] bg-gray-50">
              <table className="w-full text-xs text-gray-600">
                <thead>
                  <tr className="border-b border-black/[0.06]">
                    {["Fecha", "Dia", "Monto", "Categoria", "Subcategoria", "Ingresos", "Moneda"].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["01/03/2026", "Dom", "419", "Transporte", "Taxi", "", "UY"],
                    ["01/03/2026", "Dom", "", "Sueldo", "", "22813", "UY"],
                    ["01/03/2026", "Dom", "3935", "Ahorro", "Usd", "", "UY"],
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-black/[0.04] last:border-0">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5">{cell || <span className="text-gray-300">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-400">
              <p>Monto → Gasto &nbsp;·&nbsp; Ingresos → Ingreso &nbsp;·&nbsp; Categoria "Ahorro" → Ahorro</p>
            </div>
          </div>

          <div className="mac-card p-5">
            <h3 className="text-sm font-semibold text-gray-900">Zona peligrosa</h3>
            <p className="mt-1 mb-4 text-sm text-gray-500">Borra todos los registros de tu cuenta. No se puede deshacer.</p>
            <button onClick={handleClearAll} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors">
              Borrar todos los registros
            </button>
          </div>
        </>
      )}

      {/* ── PREVIEW ─────────────────────────────────────────────────────── */}
      {step === "preview" && preview && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="mac-card p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Total filas</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{preview.length}</p>
            </div>
            <div className="mac-card p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Nuevas</p>
              <p className="mt-2 text-2xl font-bold text-green-600">{newCount}</p>
            </div>
            <div className="mac-card p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Duplicados</p>
              <p className="mt-2 text-2xl font-bold text-amber-500">{dupeCount}</p>
            </div>
            <div className="mac-card p-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Balance del CSV</p>
              <p className={`mt-2 text-2xl font-bold ${sumIngresos - sumGastos >= 0 ? "text-green-600" : "text-red-600"}`}>
                ${fmt(sumIngresos - sumGastos)}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="mac-card p-4 flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-gray-700 select-none">
              <div
                onClick={() => setSkipDupes((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${skipDupes ? "bg-sage-500" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${skipDupes ? "translate-x-4" : ""}`} />
              </div>
              Omitir duplicados detectados
            </label>
            <div className="ml-auto flex gap-2">
              <button onClick={reset} className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={(skipDupes ? newCount : preview.length) === 0}
                className="btn-primary"
              >
                Importar {skipDupes ? newCount : preview.length} movimientos
              </button>
            </div>
          </div>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

          {/* Preview table */}
          <div className="mac-card overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
                  <tr className="border-b border-black/[0.06]">
                    {["Estado", "Fecha", "Categoría", "Subcategoría", "Monto", "Tipo"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04]">
                  {preview.map((row, i) => (
                    <tr key={i} className={`transition-colors hover:bg-gray-50 ${row.isDuplicate ? "opacity-40" : ""}`}>
                      <td className="px-3 py-2">
                        {row.isDuplicate
                          ? <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">Duplicado</span>
                          : <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">Nuevo</span>
                        }
                      </td>
                      <td className="px-3 py-2 text-gray-600 whitespace-nowrap font-mono">{row.created_at.slice(0, 10)}</td>
                      <td className="px-3 py-2 text-gray-800 font-medium">{row.categoria}</td>
                      <td className="px-3 py-2 text-gray-500">{row.subcategoria || "—"}</td>
                      <td className="px-3 py-2 text-right font-semibold text-gray-900 whitespace-nowrap tabular-nums">
                        {row.monto > 0 ? `$${fmt(row.monto)}` : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          row.tipo === "Ingreso" ? "bg-green-50 text-green-700"
                          : row.tipo === "Ahorro" ? "bg-blue-50 text-blue-700"
                          : "bg-red-50 text-red-700"
                        }`}>
                          {row.tipo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── IMPORTING ───────────────────────────────────────────────────── */}
      {step === "importing" && (
        <div className="mac-card flex flex-col items-center gap-5 p-12">
          <div className="h-1.5 w-full max-w-sm rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full w-full rounded-full bg-sage-500 animate-pulse" />
          </div>
          <p className="text-sm text-gray-500">Procesando {preview?.filter((r) => !r.isDuplicate).length ?? 0} movimientos…</p>
        </div>
      )}

      {/* ── DONE ────────────────────────────────────────────────────────── */}
      {step === "done" && result && (
        <div className="mac-card flex flex-col items-center gap-5 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="text-xl font-semibold text-gray-900">
              {result.imported} movimiento{result.imported !== 1 ? "s" : ""} importado{result.imported !== 1 ? "s" : ""}
            </p>
            {result.skipped > 0 && (
              <p className="mt-1 text-sm text-gray-500">{result.skipped} omitido{result.skipped !== 1 ? "s" : ""} (duplicados)</p>
            )}
          </div>
          <button onClick={reset} className="btn-primary">
            Importar otro archivo
          </button>
        </div>
      )}
    </div>
  )
}
