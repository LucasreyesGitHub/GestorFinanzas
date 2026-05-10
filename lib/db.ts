import { createClient } from "@libsql/client"

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

let schemaInitialized = false

export async function ensureSchema() {
  if (schemaInitialized) return

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS gastos (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      raw TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      categoria TEXT NOT NULL,
      monto REAL NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'Gasto',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_gastos_user_id ON gastos(user_id);
  `)

  schemaInitialized = true
}
