import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, ensureSchema } from "@/lib/db"
import { parseGasto } from "@/lib/parseGasto"

type SessionUser = { id?: string }

type BulkRow = {
  monto?: number
  categoria?: string
  subcategoria?: string
  tipo?: string
  moneda?: string
  created_at?: string
  cuenta_id?: string
  raw?: string
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    const body = await request.json().catch(() => null)
    if (!Array.isArray(body?.rows)) return NextResponse.json({ error: "rows debe ser un array" }, { status: 400 })

    const rows: BulkRow[] = body.rows
    if (rows.length === 0) return NextResponse.json({ imported: 0 })
    if (rows.length > 2000) return NextResponse.json({ error: "Máximo 2000 filas por lote" }, { status: 400 })

    await ensureSchema()

    const tiposValidos = ["Gasto", "Ingreso", "Ahorro"]
    const stmts = []

    for (const row of rows) {
      const id = crypto.randomUUID()
      const tipo = tiposValidos.includes(row.tipo ?? "") ? row.tipo! : "Gasto"
      const subcategoria = typeof row.subcategoria === "string" ? row.subcategoria.trim() : ""
      const moneda = row.moneda === "USD" ? "USD" : "UY"
      const cuenta_id = typeof row.cuenta_id === "string" ? row.cuenta_id.trim() : ""
      const created_at = row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString()

      const directMonto = typeof row.monto === "number" ? row.monto : (parseFloat(String(row.monto ?? "")) || 0)
      const directCategoria = typeof row.categoria === "string" ? row.categoria.trim() : ""

      if (directMonto > 0 && directCategoria) {
        const descripcion = directCategoria + (subcategoria ? ` - ${subcategoria}` : "")
        const raw = tipo === "Ingreso"
          ? `cobré $${directMonto} por ${descripcion}`
          : tipo === "Ahorro"
          ? `deposité $${directMonto} en ${descripcion}`
          : `pagué $${directMonto} de ${descripcion}`

        stmts.push({
          sql: "INSERT INTO gastos (id, user_id, raw, descripcion, categoria, subcategoria, monto, tipo, moneda, created_at, cuenta_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          args: [id, userId, raw, descripcion, directCategoria, subcategoria, directMonto, tipo, moneda, created_at, cuenta_id],
        })
        continue
      }

      const raw = typeof row.raw === "string" ? row.raw.trim() : ""
      if (!raw) continue
      const parsed = parseGasto(raw)
      if (parsed.monto === null) continue

      stmts.push({
        sql: "INSERT INTO gastos (id, user_id, raw, descripcion, categoria, subcategoria, monto, tipo, moneda, created_at, cuenta_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [id, userId, raw, parsed.descripcion, parsed.categoria, subcategoria, parsed.monto, tipo, moneda, created_at, cuenta_id],
      })
    }

    if (stmts.length === 0) return NextResponse.json({ imported: 0 })

    await db.batch(stmts, "write")

    return NextResponse.json({ imported: stmts.length })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
