export type Moneda = "UYU" | "USD";
export type PerfilRiesgo = "conservador" | "moderado" | "agresivo";

export interface GastoFijo {
  id: string;
  nombre: string;
  monto: number;
  moneda: Moneda;
}

export interface Tarjeta {
  id: string;
  nombre: string;
  tipo: "debito" | "credito";
  banco: string;
  deudaActual: number;
  cuotasMensuales: number;
}

export interface EntradaMensual {
  mes: string; // "2024-06"
  sueldoNeto: number;
  monedaSueldo: Moneda;
  gastosVariables: number;
  gastosFijos: GastoFijo[];
  tarjetas: Tarjeta[];
  ahorroAcumulado: number;
  inversionAcumulada: number;
  monedaAhorro: Moneda;
}

export interface PerfilUsuario {
  nombre: string;
  riesgo: PerfilRiesgo;
  monedaBase: Moneda;
  tipoCambio: number; // 1 USD = X UYU
}

export interface AppState {
  perfil: PerfilUsuario | null;
  historial: EntradaMensual[];
  entradaActual: Partial<EntradaMensual> | null;
}
