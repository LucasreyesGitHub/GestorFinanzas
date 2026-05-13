import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, ensureSchema } from "@/lib/db"
import { parseGasto } from "@/lib/parseGasto"

type SessionUser = { id?: string; name?: string | null; email?: string | null; image?: string | null }

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    await ensureSchema()

    const result = await db.execute({
      sql: "SELECT id, raw, descripcion, categoria, subcategoria, monto, tipo, moneda, created_at FROM gastos WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId],
    })

    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    const body = await request.json().catch(() => null)
    const tiposValidos = ["Gasto", "Ingreso", "Ahorro"]
    const tipo = tiposValidos.includes(body?.tipo) ? body.tipo : "Gasto"
    const createdAtRaw = typeof body?.created_at === "string" ? body.created_at.trim() : ""
    const subcategoria = typeof body?.subcategoria === "string" ? body.subcategoria.trim() : ""
    const moneda = typeof body?.moneda === "string" ? body.moneda.trim() : "UY"
    const cuenta_id = typeof body?.cuenta_id === "string" ? body.cuenta_id.trim() : ""

    if (createdAtRaw) {
      const parsedDate = new Date(createdAtRaw)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "La fecha enviada no es válida." }, { status: 400 })
      }
    }

    await ensureSchema()

    const id = crypto.randomUUID()
    const created_at = createdAtRaw ? new Date(createdAtRaw).toISOString() : new Date().toISOString()

    // Structured insert: monto + categoria provided directly (from new CSV format)
    const directMonto = typeof body?.monto === "number" ? body.monto : (parseFloat(body?.monto) || 0)
    const directCategoria = typeof body?.categoria === "string" ? body.categoria.trim() : ""

    if (directMonto > 0 && directCategoria) {
      const descripcion = typeof body?.descripcion === "string" && body.descripcion.trim()
        ? body.descripcion.trim()
        : directCategoria + (subcategoria ? ` - ${subcategoria}` : "")
      const raw = tipo === "Ingreso"
        ? `cobré $${directMonto} por ${descripcion}`
        : tipo === "Ahorro"
        ? `deposité $${directMonto} en ${descripcion}`
        : `pagué $${directMonto} de ${descripcion}`

      await db.execute({
        sql: "INSERT INTO gastos (id, user_id, raw, descripcion, categoria, subcategoria, monto, tipo, moneda, created_at, cuenta_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [id, userId, raw, descripcion, directCategoria, subcategoria, directMonto, tipo, moneda, created_at, cuenta_id],
      })
      return NextResponse.json({ id, raw, descripcion, categoria: directCategoria, subcategoria, monto: directMonto, tipo, moneda, created_at, cuenta_id })
    }

    // Natural language insert (existing behavior)
    const raw = typeof body?.raw === "string" ? body.raw.trim() : ""
    if (!raw) return NextResponse.json({ error: "Debe enviar una descripción o texto del gasto." }, { status: 400 })

    const parsed = parseGasto(raw)
    if (parsed.monto === null) return NextResponse.json({ error: "No se pudo detectar el monto en el texto." }, { status: 400 })

    await db.execute({
      sql: "INSERT INTO gastos (id, user_id, raw, descripcion, categoria, subcategoria, monto, tipo, moneda, created_at, cuenta_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, raw, parsed.descripcion, parsed.categoria, subcategoria, parsed.monto, tipo, moneda, created_at, cuenta_id],
    })
    return NextResponse.json({ id, raw, descripcion: parsed.descripcion, categoria: parsed.categoria, subcategoria, monto: parsed.monto, tipo, moneda, created_at, cuenta_id })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    await ensureSchema()
    await db.execute({ sql: "DELETE FROM gastos WHERE user_id = ?", args: [userId] })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
