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

  for (const sql of [
    "ALTER TABLE gastos ADD COLUMN subcategoria TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE gastos ADD COLUMN moneda TEXT NOT NULL DEFAULT 'UY'",
    "ALTER TABLE gastos ADD COLUMN cuenta_id TEXT NOT NULL DEFAULT ''",
    "ALTER TABLE gastos ADD COLUMN es_transferencia INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE gastos ADD COLUMN external_id TEXT",
    `CREATE TABLE IF NOT EXISTS cuentas (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      nombre TEXT NOT NULL,
      banco TEXT NOT NULL,
      tipo TEXT NOT NULL DEFAULT 'Caja de Ahorro',
      moneda TEXT NOT NULL DEFAULT 'UY',
      saldo_inicial REAL NOT NULL DEFAULT 0,
      orden INTEGER NOT NULL DEFAULT 0
    )`,
    "CREATE INDEX IF NOT EXISTS idx_cuentas_user_id ON cuentas(user_id)",
  ]) {
    try { await db.execute(sql) } catch { /* already exists */ }
  }

  schemaInitialized = true
}
