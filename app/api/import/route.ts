import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, ensureSchema } from "@/lib/db"
import type { ImportRow } from "@/lib/importParser"

type SessionUser = { id?: string }

// ── Account alias resolution ───────────────────────────────────────────────
//
// Alias format: BANCO_CURRENCY
//   BROU_PESOS  → banco=BROU, moneda=UY
//   BROU_USD    → banco=BROU, moneda=USD
//   ITAU_PESOS  → banco=ITAÚ, moneda=UY
//   ITAU_USD    → banco=ITAÚ, moneda=USD
//
// If no cuenta matches → auto-create.

const BANCO_NORM: Record<string, string> = {
  BROU:       "BROU",
  ITAU:       "ITAÚ",
  ITAÚ:       "ITAÚ",
  SANTANDER:  "Santander",
  SCOTIABANK: "Scotiabank",
  OCA:        "OCA",
}

function parseAlias(alias: string): { banco: string; moneda: "UY" | "USD" } {
  const parts  = alias.toUpperCase().split("_")
  const rawBanco = parts[0] ?? ""
  const rest     = parts.slice(1).join("_")

  const banco = BANCO_NORM[rawBanco] ?? rawBanco
  const moneda = ["USD", "DOLARES", "DOLAR", "DOLLARS"].includes(rest) ? "USD" : "UY"
  return { banco, moneda }
}

async function resolveAccount(
  alias: string,
  userId: string,
  cache: Record<string, string>,
  created: Set<string>,
): Promise<string> {
  if (cache[alias]) return cache[alias]

  const { banco, moneda } = parseAlias(alias)

  // Search with accent-insensitive banco variants
  // (DB may store "ITAU" or "ITAÚ" depending on when account was created)
  const bancosToTry = Array.from(new Set([banco, banco.replace(/Ú/g, "U"), banco.replace(/U$/, "Ú")]))
  const placeholders = bancosToTry.map(() => "?").join(", ")

  const found = await db.execute({
    sql: `SELECT id FROM cuentas WHERE user_id = ? AND banco IN (${placeholders}) AND moneda = ? LIMIT 1`,
    args: [userId, ...bancosToTry, moneda],
  })

  if (found.rows.length > 0) {
    const id = String(found.rows[0].id)
    cache[alias] = id
    return id
  }

  // Auto-create account
  const newId     = crypto.randomUUID()
  const monLabel  = moneda === "USD" ? "Dólares" : "Pesos"
  const nombre    = `${banco} · CA ${monLabel}`
  const ordenRes  = await db.execute({ sql: "SELECT COUNT(*) as n FROM cuentas WHERE user_id = ?", args: [userId] })
  const orden     = Number((ordenRes.rows[0] as Record<string, unknown>)?.n ?? 0)

  await db.execute({
    sql: "INSERT INTO cuentas (id, user_id, nombre, banco, tipo, moneda, saldo_inicial, orden) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
    args: [newId, userId, nombre, banco, "Caja de Ahorro", moneda, orden],
  })

  cache[alias] = newId
  created.add(alias)
  return newId
}

// ── POST /api/import ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!Array.isArray(body?.rows)) {
      return NextResponse.json({ error: "rows debe ser un array" }, { status: 400 })
    }

    const rows: ImportRow[] = body.rows
    if (rows.length === 0) return NextResponse.json({ imported: 0, skipped: 0, transfersCreated: 0, accountsCreated: [] })
    if (rows.length > 5000) return NextResponse.json({ error: "Máximo 5000 filas por importación" }, { status: 400 })

    await ensureSchema()

    // ── Load existing external IDs for deduplication ──────────────────────
    const existingRes = await db.execute({
      sql: "SELECT external_id FROM gastos WHERE user_id = ? AND external_id IS NOT NULL",
      args: [userId],
    })
    const existingIds = new Set(existingRes.rows.map(r => String(r.external_id)))

    // ── Process rows ──────────────────────────────────────────────────────
    const accountCache: Record<string, string> = {}
    const accountsCreated = new Set<string>()
    const stmts: { sql: string; args: (string | number)[] }[] = []

    let imported = 0
    let skipped  = 0
    let transfersCreated = 0

    for (const row of rows) {
      // Primary dedup: by external_id
      if (existingIds.has(row.external_id)) {
        skipped++
        continue
      }
      // Secondary dedup: prevent the same import batch from inserting the same ID twice
      existingIds.add(row.external_id)

      const created_at  = `${row.fecha}T12:00:00.000Z`
      const descripcion = (row.descripcion || row.categoria).trim()
      const raw         = `[${row.tipo}] ${descripcion} · ${row.moneda === "USD" ? "U$S" : "$"}${row.monto}`
      const moneda      = row.moneda

      if (row.tipo === "Transferencia") {
        const origenId  = await resolveAccount(row.cuenta_origen,  userId, accountCache, accountsCreated)
        const destinoId = await resolveAccount(row.cuenta_destino, userId, accountCache, accountsCreated)

        // Debit from origin
        stmts.push({
          sql: "INSERT INTO gastos (id, user_id, raw, descripcion, categoria, subcategoria, monto, tipo, moneda, created_at, cuenta_id, es_transferencia, external_id) VALUES (?, ?, ?, ?, 'Transferencia', '', ?, 'Gasto', ?, ?, ?, 1, ?)",
          args: [crypto.randomUUID(), userId, raw, descripcion, row.monto, moneda, created_at, origenId, `${row.external_id}_out`],
        })

        // Credit to destination
        stmts.push({
          sql: "INSERT INTO gastos (id, user_id, raw, descripcion, categoria, subcategoria, monto, tipo, moneda, created_at, cuenta_id, es_transferencia, external_id) VALUES (?, ?, ?, ?, 'Transferencia', '', ?, 'Ingreso', ?, ?, ?, 1, ?)",
          args: [crypto.randomUUID(), userId, raw, descripcion, row.monto, moneda, created_at, destinoId, `${row.external_id}_in`],
        })

        transfersCreated++
        imported++
      } else {
        const cuentaId = await resolveAccount(row.cuenta_origen, userId, accountCache, accountsCreated)
        const tipo     = row.tipo // "Ingreso" | "Gasto"

        stmts.push({
          sql: "INSERT INTO gastos (id, user_id, raw, descripcion, categoria, subcategoria, monto, tipo, moneda, created_at, cuenta_id, es_transferencia, external_id) VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, 0, ?)",
          args: [crypto.randomUUID(), userId, raw, descripcion, row.categoria, row.monto, tipo, moneda, created_at, cuentaId, row.external_id],
        })

        imported++
      }
    }

    // ── Atomic batch insert ───────────────────────────────────────────────
    if (stmts.length > 0) {
      await db.batch(stmts, "write")
    }

    return NextResponse.json({
      imported,
      skipped,
      transfersCreated,
      accountsCreated: Array.from(accountsCreated),
    })
  } catch (error) {
    console.error("[import]", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

// ── GET /api/import — fetch existing external_ids for client-side dedup ────
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    await ensureSchema()

    const res = await db.execute({
      sql: "SELECT external_id FROM gastos WHERE user_id = ? AND external_id IS NOT NULL",
      args: [userId],
    })

    const ids = res.rows.map(r => String(r.external_id))
    return NextResponse.json({ ids })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
