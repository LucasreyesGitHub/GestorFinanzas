export interface OpcionInversion {
  id: string;
  nombre: string;
  descripcion: string;
  donde: string;
  umbralUSD: number;
  rendimientoEstimado: string;
  riesgo: "muy bajo" | "bajo" | "medio" | "alto";
  moneda: "UYU" | "USD" | "ambas";
  tag: string;
  consejo: string;
}

export const OPCIONES: OpcionInversion[] = [
  {
    id: "caja-ahorro-usd",
    nombre: "Caja de ahorro en dólares",
    descripcion: "Abrir una caja de ahorro en USD en cualquier banco uruguayo. Mínimo riesgo, liquidez inmediata.",
    donde: "BROU, Santander, Itaú, BBVA, Scotiabank",
    umbralUSD: 0,
    rendimientoEstimado: "0.5–1% anual",
    riesgo: "muy bajo",
    moneda: "USD",
    tag: "Base",
    consejo: "El primer paso. Tener los dólares en banco da seguridad y acceso a otros productos.",
  },
  {
    id: "lrm",
    nombre: "Letras de Regulación Monetaria (LRM)",
    descripcion: "Títulos de deuda emitidos por el BCU en pesos uruguayos. Se compran por plataforma del BCU o bancos.",
    donde: "BCU (www.bcu.gub.uy), BROU, bancos privados",
    umbralUSD: 300,
    rendimientoEstimado: "8–12% anual en UYU",
    riesgo: "muy bajo",
    moneda: "UYU",
    tag: "Gobierno",
    consejo: "Ideal para el ahorro en pesos. Mejor rendimiento que plazo fijo bancario.",
  },
  {
    id: "dpf",
    nombre: "Depósito a plazo fijo (DPF)",
    descripcion: "Dejás dinero inmovilizado por 30, 60 o 90 días a cambio de una tasa fija.",
    donde: "BROU, Santander, Itaú, BBVA, OCA Blue",
    umbralUSD: 500,
    rendimientoEstimado: "4–8% anual en UYU / 2–4% en USD",
    riesgo: "muy bajo",
    moneda: "ambas",
    tag: "Banco",
    consejo: "Simple y seguro. BROU suele tener las mejores tasas. No hay liquidez hasta el vencimiento.",
  },
  {
    id: "letras-tesoro-usd",
    nombre: "Letras del Tesoro en USD",
    descripcion: "Títulos soberanos en dólares del Estado uruguayo con vencimientos cortos.",
    donde: "BCU, brokers locales (Nobilis, Puente)",
    umbralUSD: 1000,
    rendimientoEstimado: "3–5% anual en USD",
    riesgo: "bajo",
    moneda: "USD",
    tag: "Gobierno",
    consejo: "Riesgo soberano, en dólares. Muy recomendable para conservar valor en USD.",
  },
  {
    id: "fondos-locales",
    nombre: "Fondos de inversión locales",
    descripcion: "Fondos administrados profesionalmente que invierten en activos uruguayos e internacionales.",
    donde: "Nobilis, Sura, Compass Group, Puente",
    umbralUSD: 2000,
    rendimientoEstimado: "5–10% anual según fondo",
    riesgo: "bajo",
    moneda: "ambas",
    tag: "Fondo",
    consejo: "Nobilis y Compass son los más conocidos. Permiten diversificar sin saber de bolsa.",
  },
  {
    id: "afap-voluntario",
    nombre: "AFAP voluntario",
    descripcion: "Aportes adicionales voluntarios a tu AFAP para aumentar la jubilación futura.",
    donde: "República AFAP, Unión Capital, Integración, Sura",
    umbralUSD: 2000,
    rendimientoEstimado: "4–7% anual + beneficio fiscal",
    riesgo: "bajo",
    moneda: "UYU",
    tag: "Jubilación",
    consejo: "Tiene deducción de IRPF. Conveniente si tenés ingresos gravados. Baja liquidez.",
  },
  {
    id: "on-corporativas",
    nombre: "Obligaciones negociables (ON)",
    descripcion: "Bonos emitidos por empresas uruguayas como Ancap, UTE, Cutcsa o privadas.",
    donde: "Bolsa de Valores de Montevideo (BVM), Nobilis, Puente",
    umbralUSD: 5000,
    rendimientoEstimado: "5–9% anual en USD",
    riesgo: "medio",
    moneda: "USD",
    tag: "Empresa",
    consejo: "Mayor rendimiento que el Estado, con algo más de riesgo. Ancap y UTE son las más seguras.",
  },
  {
    id: "bvm-acciones",
    nombre: "Acciones en la Bolsa de Valores de Montevideo",
    descripcion: "Comprar acciones de empresas uruguayas que cotizan en la BVM.",
    donde: "Bolsa de Valores de Montevideo, agentes de bolsa",
    umbralUSD: 5000,
    rendimientoEstimado: "Variable, históricamente 6–15% anual",
    riesgo: "medio",
    moneda: "UYU",
    tag: "Bolsa Local",
    consejo: "Mercado pequeño y poco líquido. Mejor para el largo plazo. Requiere cuenta en agente de bolsa.",
  },
  {
    id: "etfs-internacionales",
    nombre: "ETFs internacionales (S&P500, global)",
    descripcion: "Fondos indexados que replican mercados mundiales. Acceso al mercado de EE.UU. y global.",
    donde: "Interactive Brokers, Charles Schwab (desde Uruguay)",
    umbralUSD: 5000,
    rendimientoEstimado: "8–12% anual histórico (S&P500)",
    riesgo: "medio",
    moneda: "USD",
    tag: "Internacional",
    consejo: "La mejor opción para largo plazo. Interactive Brokers no tiene mínimo. VOO, VTI son populares.",
  },
  {
    id: "bonos-soberanos-usd",
    nombre: "Bonos soberanos Uruguay en USD",
    descripcion: "Bonos del Estado uruguayo a largo plazo en dólares, cotizados internacionalmente.",
    donde: "Interactive Brokers, Nobilis, Puente, brokers internacionales",
    umbralUSD: 10000,
    rendimientoEstimado: "4–6% anual en USD",
    riesgo: "bajo",
    moneda: "USD",
    tag: "Gobierno",
    consejo: "Riesgo país bajo, en dólares. Uruguay tiene investment grade. Ideal para preservar capital.",
  },
  {
    id: "crowdfunding-inmobiliario",
    nombre: "Crowdfunding inmobiliario",
    descripcion: "Invertir en proyectos inmobiliarios uruguayos junto a otros inversores.",
    donde: "Inversor.uy, RedCapital Uruguay, desarrolladoras locales",
    umbralUSD: 10000,
    rendimientoEstimado: "6–12% anual en USD",
    riesgo: "medio",
    moneda: "USD",
    tag: "Inmobiliario",
    consejo: "Relativamente nuevo en Uruguay. Revisar bien el proyecto y la desarrolladora antes de invertir.",
  },
  {
    id: "inmueble-renta",
    nombre: "Inmueble para renta",
    descripcion: "Comprar un apartamento o local para alquilar. Ingreso pasivo en UYU o USD.",
    donde: "Uruguay todo, especialmente Montevideo y Punta del Este",
    umbralUSD: 50000,
    rendimientoEstimado: "3–6% anual en USD (renta bruta)",
    riesgo: "bajo",
    moneda: "USD",
    tag: "Inmobiliario",
    consejo: "Alta seguridad, baja liquidez. El mercado inmobiliario uruguayo es estable. Considerar IRNR.",
  },
  {
    id: "fideicomiso",
    nombre: "Fideicomiso financiero",
    descripcion: "Estructura legal para invertir en proyectos grandes con gestión profesional.",
    donde: "Estudio Mezzera, CPA Ferrere, KPMG Uruguay, bancos privados",
    umbralUSD: 100000,
    rendimientoEstimado: "Variable, 6–15%",
    riesgo: "medio",
    moneda: "USD",
    tag: "Avanzado",
    consejo: "Para inversores sofisticados. Requiere asesor financiero. Acceso a proyectos exclusivos.",
  },
];

export const RIESGO_COLOR: Record<string, string> = {
  "muy bajo": "text-green-600 bg-green-50",
  "bajo":     "text-blue-600 bg-blue-50",
  "medio":    "text-yellow-600 bg-yellow-50",
  "alto":     "text-red-600 bg-red-50",
};

export const TAG_COLOR: Record<string, string> = {
  "Base":          "bg-slate-100 text-slate-700",
  "Gobierno":      "bg-blue-100 text-blue-700",
  "Banco":         "bg-indigo-100 text-indigo-700",
  "Fondo":         "bg-purple-100 text-purple-700",
  "Jubilación":    "bg-orange-100 text-orange-700",
  "Empresa":       "bg-teal-100 text-teal-700",
  "Bolsa Local":   "bg-cyan-100 text-cyan-700",
  "Internacional": "bg-green-100 text-green-700",
  "Inmobiliario":  "bg-amber-100 text-amber-700",
  "Avanzado":      "bg-rose-100 text-rose-700",
};

export interface Recomendacion {
  titulo: string;
  descripcion: string;
  porcentaje: number;
  opcionId: string;
  montoSugerido: number;
}

export function generarRecomendaciones(
  capitalDisponibleUSD: number,
  totalInvertidoUSD: number,
  riesgo: "conservador" | "moderado" | "agresivo"
): Recomendacion[] {
  const total = capitalDisponibleUSD;
  if (total <= 0) return [];

  const recs: Recomendacion[] = [];

  if (riesgo === "conservador") {
    if (totalInvertidoUSD < 1000) {
      recs.push({ titulo: "Letras BCU (UYU)", descripcion: "Máxima seguridad, buen rendimiento en pesos", porcentaje: 60, opcionId: "lrm", montoSugerido: total * 0.6 });
      recs.push({ titulo: "Caja ahorro USD", descripcion: "Reserva líquida en dólares", porcentaje: 40, opcionId: "caja-ahorro-usd", montoSugerido: total * 0.4 });
    } else if (totalInvertidoUSD < 5000) {
      recs.push({ titulo: "Letras Tesoro USD", descripcion: "Soberano uruguayo en dólares", porcentaje: 50, opcionId: "letras-tesoro-usd", montoSugerido: total * 0.5 });
      recs.push({ titulo: "Letras BCU (UYU)", descripcion: "Rendimiento en pesos", porcentaje: 30, opcionId: "lrm", montoSugerido: total * 0.3 });
      recs.push({ titulo: "DPF 90 días", descripcion: "Plazo fijo como colchón", porcentaje: 20, opcionId: "dpf", montoSugerido: total * 0.2 });
    } else {
      recs.push({ titulo: "Bonos soberanos UY", descripcion: "Estado uruguayo en USD", porcentaje: 50, opcionId: "bonos-soberanos-usd", montoSugerido: total * 0.5 });
      recs.push({ titulo: "Letras Tesoro USD", descripcion: "Corto plazo soberano", porcentaje: 30, opcionId: "letras-tesoro-usd", montoSugerido: total * 0.3 });
      recs.push({ titulo: "Fondos Nobilis/Sura", descripcion: "Diversificación profesional", porcentaje: 20, opcionId: "fondos-locales", montoSugerido: total * 0.2 });
    }
  } else if (riesgo === "moderado") {
    if (totalInvertidoUSD < 2000) {
      recs.push({ titulo: "ETFs S&P500", descripcion: "Mercado americano indexado", porcentaje: 40, opcionId: "etfs-internacionales", montoSugerido: total * 0.4 });
      recs.push({ titulo: "Letras Tesoro USD", descripcion: "Base segura en USD", porcentaje: 40, opcionId: "letras-tesoro-usd", montoSugerido: total * 0.4 });
      recs.push({ titulo: "Letras BCU", descripcion: "Rendimiento en UYU", porcentaje: 20, opcionId: "lrm", montoSugerido: total * 0.2 });
    } else if (totalInvertidoUSD < 10000) {
      recs.push({ titulo: "ETFs globales", descripcion: "VTI / VOO en Interactive Brokers", porcentaje: 50, opcionId: "etfs-internacionales", montoSugerido: total * 0.5 });
      recs.push({ titulo: "ON corporativas", descripcion: "Ancap, UTE u otras", porcentaje: 25, opcionId: "on-corporativas", montoSugerido: total * 0.25 });
      recs.push({ titulo: "Fondos locales", descripcion: "Nobilis o Compass", porcentaje: 25, opcionId: "fondos-locales", montoSugerido: total * 0.25 });
    } else {
      recs.push({ titulo: "ETFs globales", descripcion: "Base principal internacional", porcentaje: 50, opcionId: "etfs-internacionales", montoSugerido: total * 0.5 });
      recs.push({ titulo: "Bonos soberanos UY", descripcion: "Renta fija segura", porcentaje: 20, opcionId: "bonos-soberanos-usd", montoSugerido: total * 0.2 });
      recs.push({ titulo: "ON corporativas", descripcion: "Rendimiento extra", porcentaje: 15, opcionId: "on-corporativas", montoSugerido: total * 0.15 });
      recs.push({ titulo: "Crowdfunding inmob.", descripcion: "Exposición inmobiliaria", porcentaje: 15, opcionId: "crowdfunding-inmobiliario", montoSugerido: total * 0.15 });
    }
  } else {
    // agresivo
    recs.push({ titulo: "ETFs globales (VTI/QQQ)", descripcion: "Mayor exposición a mercado global", porcentaje: 60, opcionId: "etfs-internacionales", montoSugerido: total * 0.6 });
    if (totalInvertidoUSD >= 5000) {
      recs.push({ titulo: "Acciones BVM", descripcion: "Mercado local, alto potencial", porcentaje: 20, opcionId: "bvm-acciones", montoSugerido: total * 0.2 });
      recs.push({ titulo: "ON corporativas", descripcion: "Renta fija corporativa", porcentaje: 20, opcionId: "on-corporativas", montoSugerido: total * 0.2 });
    } else {
      recs.push({ titulo: "Letras Tesoro USD", descripcion: "Colchón seguro", porcentaje: 40, opcionId: "letras-tesoro-usd", montoSugerido: total * 0.4 });
    }
  }

  return recs;
}
