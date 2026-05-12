"use client"

import { useState } from "react"

// Parses: Fecha,Dia,Monto,Categoria,Subcategoria,Ingresos,Moneda  (new format)
//     or: raw,tipo,fecha  (legacy format)
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
  // D/M/YYYY or DD/MM/YYYY
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  // YYYY-MM-DD already
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

type ImportRow =
  | { raw: string; tipo: string; created_at: string }
  | { monto: number; categoria: string; subcategoria: string; tipo: string; moneda: string; created_at: string }

function buildPayloads(content: string): ImportRow[] {
  const text = content.replace(/^﻿/, "")
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) throw new Error("El archivo está vacío o mal formado.")

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase())
  const format = detectFormat(headers)
  const payloads: ImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] ?? "" })

    if (format === "legacy") {
      const raw = row.raw || row.texto || row.text || row.descripcion || ""
      const tipo = ["Gasto", "Ingreso", "Ahorro"].includes((row.tipo || "").trim()) ? row.tipo.trim() : "Gasto"
      const fecha = (row.fecha || "").trim()
      if (!raw) throw new Error(`Fila ${i + 1}: falta la descripción.`)
      const iso = fecha ? parseDate(fecha) : null
      if (fecha && !iso) throw new Error(`Fila ${i + 1}: fecha inválida "${fecha}".`)
      payloads.push({ raw, tipo, created_at: iso ? `${iso}T00:00:00.000Z` : new Date().toISOString() })
    } else {
      const montoRaw = parseAmount(row.monto || "")
      const ingresosRaw = parseAmount(row.ingresos || "")
      const categoria = (row.categoria || "Otro").trim()
      const subcategoria = (row.subcategoria || "").trim()
      const moneda = (row.moneda || "UY").trim()
      const fecha = (row.fecha || "").trim()

      if (!fecha) throw new Error(`Fila ${i + 1}: falta la fecha.`)
      const iso = parseDate(fecha)
      if (!iso) throw new Error(`Fila ${i + 1}: fecha inválida "${fecha}".`)
      if (!montoRaw && !ingresosRaw) continue // skip empty rows

      const tipo = categoria.toLowerCase() === "ahorro"
        ? "Ahorro"
        : ingresosRaw > 0 ? "Ingreso" : "Gasto"
      const monto = tipo === "Ingreso" ? ingresosRaw : montoRaw

      payloads.push({ monto, categoria, subcategoria, tipo, moneda, created_at: `${iso}T00:00:00.000Z` })
    }
  }

  return payloads
}

export function StatsClient() {
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSuccess, setImportSuccess] = useState<string | null>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null)
    setImportSuccess(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setImportError("Solo se aceptan archivos .csv")
      return
    }

    let payloads: ImportRow[]
    try {
      const content = await file.text()
      payloads = buildPayloads(content)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Error al leer el archivo")
      e.target.value = ""
      return
    }

    if (payloads.length === 0) {
      setImportError("No se encontraron filas válidas.")
      e.target.value = ""
      return
    }

    setImporting(true)
    try {
      let ok = 0
      for (const payload of payloads) {
        const res = await fetch("/api/gastos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => null)
          throw new Error(body?.error || "Error en el servidor")
        }
        ok++
      }
      setImportSuccess(`Se importaron ${ok} movimientos correctamente.`)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Error al importar")
    } finally {
      setImporting(false)
      e.target.value = ""
    }
  }

  async function handleClearAll() {
    if (!window.confirm("¿Borrar TODOS los registros? Esta acción no se puede deshacer.")) return
    try {
      const res = await fetch("/api/gastos", { method: "DELETE" })
      if (!res.ok) throw new Error()
      setImportSuccess("Todos los registros fueron eliminados.")
      setImportError(null)
    } catch {
      setImportError("No se pudo borrar el historial.")
    }
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Subir datos</h2>
        <p className="mt-1 text-sm text-gray-500">Importá tus registros desde Excel o CSV.</p>
      </div>

      {/* New format */}
      <div className="mac-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-gray-900">Formato Excel (nuevo)</h3>
            <p className="mt-1 text-sm text-gray-500">El mismo formato de tu planilla mensual.</p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="shrink-0 rounded-xl border border-black/[0.08] bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Descargar plantilla
          </button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-black/[0.06] bg-gray-50">
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
                ["01/03/2026", "Domingo", "419", "Transporte", "Taxi", "", "UY"],
                ["01/03/2026", "Domingo", "", "Papá", "", "100", "USD"],
                ["01/03/2026", "Domingo", "", "Sueldo", "", "22813", "UY"],
                ["01/03/2026", "Domingo", "3935", "Ahorro", "Usd", "", "UY"],
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

        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <p>• Si <strong>Monto</strong> tiene valor → Gasto</p>
          <p>• Si <strong>Ingresos</strong> tiene valor → Ingreso</p>
          <p>• Si <strong>Categoria</strong> es "Ahorro" → Ahorro</p>
          <p>• Fecha en formato <code className="rounded bg-gray-100 px-1">DD/MM/YYYY</code></p>
        </div>
      </div>

      {/* Legacy format */}
      <div className="mac-card p-6">
        <h3 className="font-semibold text-gray-900">Formato anterior (raw,tipo,fecha)</h3>
        <p className="mt-1 text-sm text-gray-500">Compatible con archivos generados por el conversor <code className="rounded bg-gray-100 px-1 text-xs">convertir-csv.js</code>.</p>
        <div className="mt-3 rounded-xl border border-black/[0.06] bg-gray-50 p-3 font-mono text-xs text-gray-600">
          <p>raw,tipo,fecha</p>
          <p>pagué $419 de Transporte - Taxi,Gasto,2026-03-01</p>
          <p>cobré $22813 por Sueldo,Ingreso,2026-03-01</p>
        </div>
      </div>

      {/* Upload area */}
      <div className="mac-card p-6">
        <h3 className="mb-4 font-semibold text-gray-900">Seleccionar archivo</h3>
        <label className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-black/[0.1] bg-gray-50 p-10 text-center transition-colors hover:border-sage-500/40 hover:bg-sage-50/30 ${importing ? "opacity-50 pointer-events-none" : ""}`}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-700">
              {importing ? "Importando…" : "Hacé clic para seleccionar un CSV"}
            </p>
            <p className="mt-1 text-xs text-gray-400">Detecta automáticamente el formato</p>
          </div>
          <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" disabled={importing} />
        </label>

        {importError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{importError}</div>
        )}
        {importSuccess && (
          <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{importSuccess}</div>
        )}
      </div>

      {/* Danger zone */}
      <div className="mac-card p-6">
        <h3 className="font-semibold text-gray-900">Zona peligrosa</h3>
        <p className="mt-1 mb-4 text-sm text-gray-500">Borra todos los registros de tu cuenta. No se puede deshacer.</p>
        <button
          type="button"
          onClick={handleClearAll}
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
        >
          Borrar todos los registros
        </button>
      </div>
    </div>
  )
}
