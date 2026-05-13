import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, ensureSchema } from "@/lib/db"

type SessionUser = { id?: string }

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    await ensureSchema()

    const body = await request.json().catch(() => null)
    const fields: string[] = []
    const args: (string | number)[] = []

    if (typeof body?.nombre === "string" && body.nombre.trim()) {
      fields.push("nombre = ?")
      args.push(body.nombre.trim())
    }
    if (typeof body?.saldo_inicial === "number" || typeof body?.saldo_inicial === "string") {
      const v = parseFloat(body.saldo_inicial)
      if (!isNaN(v)) { fields.push("saldo_inicial = ?"); args.push(v) }
    }
    if (typeof body?.banco === "string" && body.banco.trim()) {
      fields.push("banco = ?")
      args.push(body.banco.trim())
    }
    if (typeof body?.tipo === "string" && body.tipo.trim()) {
      fields.push("tipo = ?")
      args.push(body.tipo.trim())
    }
    if (typeof body?.moneda === "string") {
      fields.push("moneda = ?")
      args.push(body.moneda === "USD" ? "USD" : "UY")
    }

    if (fields.length === 0) return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 })

    args.push(params.id, userId)
    await db.execute({
      sql: `UPDATE cuentas SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
      args,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    await ensureSchema()
    await db.execute({ sql: "DELETE FROM cuentas WHERE id = ? AND user_id = ?", args: [params.id, userId] })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
