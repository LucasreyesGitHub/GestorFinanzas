import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db, ensureSchema } from "@/lib/db"

type SessionUser = { id?: string }

const DEFAULTS = [
  { banco: "BROU", tipo: "Caja de Ahorro", moneda: "UY",  nombre: "BROU · CA Pesos",   orden: 0 },
  { banco: "BROU", tipo: "Caja de Ahorro", moneda: "USD", nombre: "BROU · CA Dólares", orden: 1 },
  { banco: "ITAU", tipo: "Caja de Ahorro", moneda: "UY",  nombre: "ITAÚ · CA Pesos",   orden: 2 },
  { banco: "ITAU", tipo: "Caja de Ahorro", moneda: "USD", nombre: "ITAÚ · CA Dólares", orden: 3 },
]

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    await ensureSchema()

    const existing = await db.execute({
      sql: "SELECT id FROM cuentas WHERE user_id = ? LIMIT 1",
      args: [userId],
    })

    if (existing.rows.length === 0) {
      for (const d of DEFAULTS) {
        await db.execute({
          sql: "INSERT INTO cuentas (id, user_id, nombre, banco, tipo, moneda, saldo_inicial, orden) VALUES (?, ?, ?, ?, ?, ?, 0, ?)",
          args: [crypto.randomUUID(), userId, d.nombre, d.banco, d.tipo, d.moneda, d.orden],
        })
      }
    }

    const result = await db.execute({
      sql: `SELECT c.id, c.nombre, c.banco, c.tipo, c.moneda, c.saldo_inicial, c.orden,
              ROUND(
                c.saldo_inicial +
                COALESCE((SELECT SUM(g.monto) FROM gastos g WHERE g.cuenta_id = c.id AND g.tipo = 'Ingreso'), 0) -
                COALESCE((SELECT SUM(g.monto) FROM gastos g WHERE g.cuenta_id = c.id AND g.tipo IN ('Gasto','Ahorro')), 0),
              2) AS saldo_actual
            FROM cuentas c WHERE c.user_id = ? ORDER BY c.orden, c.id`,
      args: [userId],
    })

    return NextResponse.json(result.rows)
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    const userId = (session.user as SessionUser)?.id
    if (!userId) return NextResponse.json({ error: "Usuario no identificado" }, { status: 401 })

    await ensureSchema()

    const body = await request.json().catch(() => null)
    const nombre = typeof body?.nombre === "string" && body.nombre.trim() ? body.nombre.trim() : ""
    const banco = typeof body?.banco === "string" ? body.banco.trim() : "Otro"
    const tipo = typeof body?.tipo === "string" ? body.tipo.trim() : "Caja de Ahorro"
    const moneda = body?.moneda === "USD" ? "USD" : "UY"
    const saldo_inicial = typeof body?.saldo_inicial === "number" ? body.saldo_inicial : (parseFloat(body?.saldo_inicial) || 0)

    if (!nombre) return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 })

    const countResult = await db.execute({
      sql: "SELECT COUNT(*) as n FROM cuentas WHERE user_id = ?",
      args: [userId],
    })
    const orden = Number((countResult.rows[0] as Record<string, unknown>)?.n ?? 0)

    const id = crypto.randomUUID()
    await db.execute({
      sql: "INSERT INTO cuentas (id, user_id, nombre, banco, tipo, moneda, saldo_inicial, orden) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      args: [id, userId, nombre, banco, tipo, moneda, saldo_inicial, orden],
    })

    return NextResponse.json({ id, nombre, banco, tipo, moneda, saldo_inicial, saldo_actual: saldo_inicial, orden })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
