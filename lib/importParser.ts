// Pure parser for the official import format.
// No I/O — safe to import in both client and server components.
//
// Expected columns:
//   id | fecha | tipo | monto | moneda | cuenta_origen | cuenta_destino | categoria | descripcion | notas

// ── Types ─────────────────────────────────────────────────────────────────

export type MonedaNorm = "UY" | "USD"
export type TipoNorm   = "Ingreso" | "Gasto" | "Transferencia"

export interface ImportRow {
  external_id:    string
  fecha:          string        // YYYY-MM-DD
  tipo:           TipoNorm
  monto:          number
  moneda:         MonedaNorm
  cuenta_origen:  string        // alias e.g. BROU_PESOS
  cuenta_destino: string        // alias (empty for non-transfers)
  categoria:      string
  descripcion:    string
  notas:          string
  rowIndex:       number        // 1-based original CSV line for error messages
}

export interface ParseError {
  row:    number
  field:  string
  message: string
  hint?:  string
}

export interface ParseResult {
  rows:         ImportRow[]
  errors:       ParseError[]
  totalLines:   number          // data lines (excluding header)
  isNewFormat:  boolean
}

// ── Normalization maps ─────────────────────────────────────────────────────

const TIPO_MAP: Record<string, TipoNorm> = {
  income:        "Ingreso",
  ingreso:       "Ingreso",
  expense:       "Gasto",
  gasto:         "Gasto",
  transfer:      "Transferencia",
  transferencia: "Transferencia",
}

const MONEDA_MAP: Record<string, MonedaNorm> = {
  uyu:     "UY",
  uy:      "UY",
  pesos:   "UY",
  usd:     "USD",
  dollars: "USD",
  dolares: "USD",
  dólar:   "USD",
}

// Required columns that signal the new format
const REQUIRED_HEADERS = ["id", "fecha", "tipo", "monto", "moneda", "cuenta_origen"] as const

// ── Helpers ────────────────────────────────────────────────────────────────

function normTipo(s: string): TipoNorm | null {
  return TIPO_MAP[s.toLowerCase().trim()] ?? null
}

function normMoneda(s: string): MonedaNorm | null {
  return MONEDA_MAP[s.toLowerCase().trim()] ?? null
}

function parseDate(s: string): string | null {
  s = s.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

function parseAmount(s: string): number | null {
  const clean = s.replace(/[$\s]/g, "").replace(/\./g, "").replace(",", ".")
  const n = parseFloat(clean)
  return isNaN(n) || n < 0 ? null : n
}

function stripQuotes(s: string): string {
  s = s.trim()
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
  }
  return s
}

// Handles comma and tab delimiters, respects quoted fields
function parseLine(line: string): string[] {
  const fields: string[] = []
  let inQuote = false
  let cur = ""
  for (const ch of line) {
    if (ch === '"') {
      inQuote = !inQuote
    } else if ((ch === "," || ch === "\t") && !inQuote) {
      fields.push(stripQuotes(cur))
      cur = ""
    } else {
      cur += ch
    }
  }
  fields.push(stripQuotes(cur))
  return fields
}

export function detectNewFormat(headers: string[]): boolean {
  const normalized = headers.map(h => h.toLowerCase().trim())
  return REQUIRED_HEADERS.every(req => normalized.includes(req))
}

// ── Main parser ────────────────────────────────────────────────────────────

export function parseImportCSV(content: string): ParseResult {
  // Strip BOM
  const text = content.replace(/^﻿/, "")
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)

  if (lines.length < 2) {
    return {
      rows: [],
      errors: [{ row: 0, field: "file", message: "Archivo vacío o sin filas de datos" }],
      totalLines: 0,
      isNewFormat: false,
    }
  }

  const headers = parseLine(lines[0]).map(h => h.toLowerCase().trim())

  if (!detectNewFormat(headers)) {
    return {
      rows: [],
      errors: [{
        row: 0,
        field: "headers",
        message: "El archivo no tiene el formato oficial requerido.",
        hint: `Columnas requeridas: ${REQUIRED_HEADERS.join(", ")}`,
      }],
      totalLines: lines.length - 1,
      isNewFormat: false,
    }
  }

  const idx = (col: string) => headers.indexOf(col)

  const rows: ImportRow[] = []
  const errors: ParseError[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i])
    const get = (col: string) => (values[idx(col)] ?? "").trim()

    const external_id    = get("id")
    const fechaRaw       = get("fecha")
    const tipoRaw        = get("tipo")
    const montoRaw       = get("monto")
    const monedaRaw      = get("moneda")
    const cuenta_origen  = get("cuenta_origen").toUpperCase()
    const cuenta_destino = get("cuenta_destino").toUpperCase()
    const categoria      = get("categoria") || "Otro"
    const descripcion    = get("descripcion")
    const notas          = get("notas")

    // ── Validation ──────────────────────────────────────────────────────
    if (!external_id) {
      errors.push({ row: i + 1, field: "id", message: "ID de transacción requerido" })
      continue
    }

    const fecha = parseDate(fechaRaw)
    if (!fecha) {
      errors.push({ row: i + 1, field: "fecha", message: `Fecha inválida: "${fechaRaw}"`, hint: "Formato esperado: YYYY-MM-DD o DD/MM/YYYY" })
      continue
    }

    const tipo = normTipo(tipoRaw)
    if (!tipo) {
      errors.push({ row: i + 1, field: "tipo", message: `Tipo inválido: "${tipoRaw}"`, hint: "Valores válidos: income, expense, transfer" })
      continue
    }

    const monto = parseAmount(montoRaw)
    if (monto === null || monto === 0) {
      errors.push({ row: i + 1, field: "monto", message: `Monto inválido: "${montoRaw}"` })
      continue
    }

    const moneda = normMoneda(monedaRaw)
    if (!moneda) {
      errors.push({ row: i + 1, field: "moneda", message: `Moneda inválida: "${monedaRaw}"`, hint: "Valores válidos: UYU, USD" })
      continue
    }

    if (!cuenta_origen) {
      errors.push({ row: i + 1, field: "cuenta_origen", message: "cuenta_origen es requerida" })
      continue
    }

    if (tipo === "Transferencia" && !cuenta_destino) {
      errors.push({ row: i + 1, field: "cuenta_destino", message: "Las transferencias requieren cuenta_destino" })
      continue
    }

    rows.push({
      external_id,
      fecha,
      tipo,
      monto,
      moneda,
      cuenta_origen,
      cuenta_destino,
      categoria,
      descripcion,
      notas,
      rowIndex: i + 1,
    })
  }

  return {
    rows,
    errors,
    totalLines: lines.length - 1,
    isNewFormat: true,
  }
}

// ── Deduplication hash (secondary key) ────────────────────────────────────
// Used as fallback when external_id is not available (old format compat)
export function makeDupHash(fecha: string, monto: number, descripcion: string): string {
  return `${fecha}_${Math.round(Math.abs(monto))}_${descripcion.toLowerCase().trim().slice(0, 40)}`
}

// ── Download official template ─────────────────────────────────────────────
export function downloadOfficialTemplate(): void {
  const rows = [
    "id,fecha,tipo,monto,moneda,cuenta_origen,cuenta_destino,categoria,descripcion,notas",
    "txn_0001,2026-05-01,income,50000,UYU,BROU_PESOS,,sueldo,sueldo mayo,",
    "txn_0002,2026-05-01,transfer,500,USD,BROU_USD,ITAU_USD,transferencia,ahorro itau,",
    "txn_0003,2026-05-02,expense,350,UYU,ITAU_PESOS,,comida,almuerzo trabajo,",
    "txn_0004,2026-05-02,expense,45,UYU,BROU_PESOS,,transporte,stm,",
    "txn_0005,2026-05-03,expense,1200,UYU,ITAU_PESOS,,suscripciones,spotify/netflix,",
  ].join("\n")

  const blob = new Blob(["﻿" + rows], { type: "text/csv;charset=utf-8;" })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement("a")
  a.href     = url
  a.download = "plantilla-oficial-finanzas.csv"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
