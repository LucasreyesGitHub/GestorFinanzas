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
    if (!userId) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })
    }

    await ensureSchema()

    const result = await db.execute({
      sql: "SELECT id, raw, descripcion, categoria, monto, tipo, created_at FROM gastos WHERE user_id = ? ORDER BY created_at DESC",
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
    if (!userId) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const raw = typeof body?.raw === "string" ? body.raw.trim() : ""
    const tiposValidos = ["Gasto", "Ingreso", "Ahorro"]
    const tipo = tiposValidos.includes(body?.tipo) ? body.tipo : "Gasto"

    if (!raw) {
      return NextResponse.json({ error: "Debe enviar una descripción o texto del gasto." }, { status: 400 })
    }

    const parsed = parseGasto(raw)
    if (parsed.monto === null) {
      return NextResponse.json({ error: "No se pudo detectar el monto en el texto." }, { status: 400 })
    }

    await ensureSchema()

    const id = crypto.randomUUID()
    const created_at = new Date().toISOString()

    await db.execute({
      sql: "INSERT INTO gastos (id, user_id, raw, descripcion, categoria, monto, tipo, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, raw, parsed.descripcion, parsed.categoria, parsed.monto, tipo, created_at],
    })

    return NextResponse.json({ id, raw, descripcion: parsed.descripcion, categoria: parsed.categoria, monto: parsed.monto, tipo, created_at })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const userId = (session.user as SessionUser)?.id
    if (!userId) {
      return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })
    }

    await ensureSchema()

    await db.execute({
      sql: "DELETE FROM gastos WHERE user_id = ?",
      args: [userId],
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
