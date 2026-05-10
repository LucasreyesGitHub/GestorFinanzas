export interface GastoParsed {
  monto: number | null
  categoria: string
  descripcion: string
  raw: string
}

export const CATEGORIAS_AHORRO = [
  "Plazo Fijo",
  "Caja de Ahorro BROU",
  "Caja de Ahorro Itaú",
  "Efectivo",
  "Criptomonedas",
  "Otro Ahorro",
]

// ── Categorías con palabras clave ──────────────────────────────────────────
const CATEGORIAS: Record<string, string[]> = {
  Supermercado: ["super", "supermercado", "almacén", "almacen", "verdulería", "verduleria", "carnicería", "carniceria", "fiambrería", "feria"],
  Transporte:   ["taxi", "uber", "cabify", "nafta", "combustible", "colectivo", "bus", "tren", "subte", "estacionamiento", "peaje", "remis"],
  Servicios:    ["luz", "agua", "gas", "internet", "teléfono", "telefono", "celular", "electricidad", "factura", "servicio"],
  Salud:        ["farmacia", "médico", "medico", "doctor", "clínica", "clinica", "hospital", "medicamento", "consulta"],
  Restaurante:  ["restaurante", "restaurant", "comida", "almuerzo", "cena", "desayuno", "cafetería", "cafeteria", "café", "cafe", "pizza", "sushi", "delivery"],
  Entretenimiento: ["cine", "teatro", "concierto", "recital", "streaming", "netflix", "spotify", "juego", "deporte", "gym", "gimnasio"],
  Ropa:         ["ropa", "zapatillas", "zapatos", "remera", "pantalón", "pantalon", "camisa", "indumentaria"],
  Educación:    ["libro", "curso", "clase", "escuela", "universidad", "cuota", "educación", "educacion"],
  Hogar:        ["mueble", "electrodoméstico", "electrodomestico", "limpieza", "ferretería", "ferreteria", "decoración", "decoracion"],
  "Plazo Fijo": ["plazo fijo"],
  "Caja de Ahorro BROU": ["brou"],
  "Caja de Ahorro Itaú": ["itau", "itaú"],
  Efectivo:     ["efectivo", "billetera física", "billetera fisica"],
  Criptomonedas: ["crypto", "bitcoin", "btc", "eth", "ethereum", "cripto", "criptomoneda"],
  "Otro Ahorro": ["alcancía", "alcancia", "chanchito"],
}

// ── Extraer monto ──────────────────────────────────────────────────────────
function extraerMonto(texto: string): number | null {
  const patrones = [
    /\$\s*([\d.,]+)/,
    /([\d.,]+)\s*pesos?/i,
    /\b([\d.,]+)\b/,
  ]
  for (const patron of patrones) {
    const match = texto.match(patron)
    if (match) {
      const raw = match[1].replace(/\./g, "").replace(",", ".")
      const num = parseFloat(raw)
      if (!isNaN(num) && num > 0) return num
    }
  }
  return null
}

// ── Detectar categoría ─────────────────────────────────────────────────────
function detectarCategoria(texto: string): string {
  const lower = texto.toLowerCase()
  for (const [categoria, keywords] of Object.entries(CATEGORIAS)) {
    if (keywords.some((kw) => lower.includes(kw))) return categoria
  }
  return "Otro"
}

// ── Función principal ──────────────────────────────────────────────────────
export function parseGasto(input: string): GastoParsed {
  const texto = input.trim()
  return {
    monto:       extraerMonto(texto),
    categoria:   detectarCategoria(texto),
    descripcion: texto,
    raw:         input,
  }
}
