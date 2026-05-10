import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions, type AuthUser } from "@/lib/auth"
import { db, ensureSchema } from "@/lib/db"
import { parseGasto } from "@/lib/parseGasto"

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  await ensureSchema()

  const result = await db.execute({
    sql: "DELETE FROM gastos WHERE id = ? AND user_id = ?",
    args: [params.id, (session.user as AuthUser)?.id],
  })

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No se encontró la transacción." }, { status: 404 })
  }

  return new NextResponse(null, { status: 204 })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const raw = typeof body?.raw === "string" ? body.raw.trim() : ""
  const tiposValidos = ["Gasto", "Ingreso", "Ahorro"]
  const tipo = tiposValidos.includes(body?.tipo) ? body.tipo : "Gasto"

  if (!raw) {
    return NextResponse.json({ error: "Debe enviar una nueva descripción o texto." }, { status: 400 })
  }

  const parsed = parseGasto(raw)
  if (parsed.monto === null) {
    return NextResponse.json({ error: "No se pudo detectar el monto en el texto." }, { status: 400 })
  }

  await ensureSchema()

  const result = await db.execute({
    sql: "UPDATE gastos SET raw = ?, descripcion = ?, categoria = ?, monto = ?, tipo = ? WHERE id = ? AND user_id = ?",
    args: [raw, parsed.descripcion, parsed.categoria, parsed.monto, tipo, params.id, (session.user as AuthUser)?.id],
  })

  if (result.rowsAffected === 0) {
    return NextResponse.json({ error: "No se encontró la transacción." }, { status: 404 })
  }

  return NextResponse.json({
    id: params.id,
    raw,
    descripcion: parsed.descripcion,
    categoria: parsed.categoria,
    monto: parsed.monto,
    tipo,
  })
}
