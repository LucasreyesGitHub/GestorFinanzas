export interface GastoParsed {
  monto:       number | null
  moneda:      "UY" | "USD"
  categoria:   string
  subcategoria: string
  descripcion: string
  raw:         string
}

export const CATEGORIAS_AHORRO = [
  "Plazo Fijo",
  "Caja de Ahorro BROU",
  "Caja de Ahorro Itaú",
  "Efectivo",
  "Criptomonedas",
  "Otro Ahorro",
]

// ── Keyword → category map ─────────────────────────────────────────────────
const CATEGORIAS: Record<string, string[]> = {
  Supermercado:    ["super", "supermercado", "almacén", "almacen", "verdulería", "verduleria", "carnicería", "carniceria", "fiambrería", "feria"],
  Transporte:      ["taxi", "uber", "cabify", "nafta", "combustible", "colectivo", "bus", "tren", "subte", "estacionamiento", "peaje", "remis", "bicicleta", "moto"],
  Servicios:       ["luz", "agua", "gas", "internet", "teléfono", "telefono", "celular", "electricidad", "factura", "servicio", "antel", "ute", "ose"],
  Salud:           ["farmacia", "médico", "medico", "doctor", "clínica", "clinica", "hospital", "medicamento", "consulta", "odontólogo", "odontologo", "dentista"],
  Restaurante:     ["restaurante", "restaurant", "comida", "almuerzo", "cena", "desayuno", "cafetería", "cafeteria", "café", "cafe", "pizza", "sushi", "delivery", "pedidosya", "rappi"],
  Entretenimiento: ["cine", "teatro", "concierto", "recital", "streaming", "netflix", "spotify", "disney", "hbo", "juego", "deporte", "gym", "gimnasio", "videojuego"],
  Ropa:            ["ropa", "zapatillas", "zapatos", "remera", "pantalón", "pantalon", "camisa", "indumentaria", "calzado"],
  Educación:       ["libro", "curso", "clase", "escuela", "universidad", "cuota", "educación", "educacion", "taller", "seminario"],
  Hogar:           ["mueble", "electrodoméstico", "electrodomestico", "limpieza", "ferretería", "ferreteria", "decoración", "decoracion", "herramienta"],
  "Plazo Fijo":          ["plazo fijo"],
  "Caja de Ahorro BROU": ["brou"],
  "Caja de Ahorro Itaú": ["itau", "itaú"],
  Efectivo:              ["efectivo", "billetera física", "billetera fisica"],
  Criptomonedas:         ["crypto", "bitcoin", "btc", "eth", "ethereum", "cripto", "criptomoneda"],
  "Otro Ahorro":         ["alcancía", "alcancia", "chanchito"],
}

// ── Currency detection ────────────────────────────────────────────────────
function detectarMoneda(texto: string): "UY" | "USD" {
  const lower = texto.toLowerCase()
  if (
    /u\$s/i.test(texto) ||
    /usd/i.test(texto) ||
    /dólares?/i.test(texto) ||
    /dolares?/i.test(texto) ||
    /\bu\s*\$/.test(texto)
  ) return "USD"
  return "UY"
}

// ── Amount extraction ─────────────────────────────────────────────────────
function extraerMonto(texto: string): number | null {
  const patrones = [
    /u\$s\s*([\d.,]+)/i,
    /usd\s*([\d.,]+)/i,
    /\$\s*([\d.,]+)/,
    /([\d.,]+)\s*(?:dólares?|dolares?|pesos?|usd)/i,
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

// ── Category detection ────────────────────────────────────────────────────
function detectarCategoria(texto: string): string {
  const lower = texto.toLowerCase()
  for (const [categoria, keywords] of Object.entries(CATEGORIAS)) {
    if (keywords.some(kw => lower.includes(kw))) return categoria
  }
  return "Otro"
}

// ── Main parser ───────────────────────────────────────────────────────────
export function parseGasto(input: string): GastoParsed {
  const texto = input.trim()
  return {
    monto:        extraerMonto(texto),
    moneda:       detectarMoneda(texto),
    categoria:    detectarCategoria(texto),
    subcategoria: "",
    descripcion:  texto,
    raw:          input,
  }
}
