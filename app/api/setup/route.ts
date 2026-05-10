import { NextResponse } from "next/server"
import { createClient } from "@libsql/client"

export async function GET() {
  const databaseUrl = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!databaseUrl) {
    return NextResponse.json({ ok: false, error: "TURSO_DATABASE_URL no está configurada." }, { status: 500 })
  }

  const db = createClient({
    url: databaseUrl,
    authToken: authToken,
  })

  try {
    await db.executeMultiple(`
      CREATE TABLE IF NOT EXISTS gastos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        descripcion TEXT,
        monto REAL NOT NULL,
        tipo TEXT NOT NULL,
        categoria TEXT,
        fecha TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `)

    return NextResponse.json({ ok: true, message: "Tabla creada" })
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  } finally {
    db.close()
  }
}
