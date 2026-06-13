"use client";
import { useState, useEffect, useRef } from "react";
import { loadState } from "@/lib/store";
import type { EntradaMensual, GastoFijo, Tarjeta } from "@/lib/types";
import gsap from "gsap";

function toUSD(monto: number, moneda: "UYU" | "USD", tc: number) {
  return moneda === "USD" ? monto : monto / tc;
}

function mesLabel(mes: string) {
  const [y, m] = mes.split("-");
  return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleDateString("es-UY", {
    month: "long",
    year: "numeric",
  });
}

function MiniBar({ valor, max, color }: { valor: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (valor / max) * 100) : 0;
  return (
    <div className="progress-track" style={{ height: 4 }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  );
}

export default function HistorialPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [entradas, setEntradas] = useState<EntradaMensual[]>([]);
  const [tc, setTc] = useState(40);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    const state = loadState();
    setTc(state.perfil?.tipoCambio ?? 40);
    const sorted = [...state.historial].sort((a, b) => b.mes.localeCompare(a.mes));
    setEntradas(sorted);

    const ctx = gsap.context(() => {
      gsap.from(".hist-item", {
        y: 18, opacity: 0, duration: 0.4, stagger: 0.07, ease: "power3.out", clearProps: "all",
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  if (entradas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--text-2)" }}>Sin historial aún</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
            Completá tu primer mes en "Este mes" para ver la evolución aquí.
          </p>
        </div>
        <a href="/" className="btn-primary text-xs py-2 px-4">Ir a este mes →</a>
      </div>
    );
  }

  // Calcular máximos para las barras relativas
  const maxSueldo = Math.max(...entradas.map((e) => toUSD(e.sueldoNeto, e.monedaSueldo, tc)));
  const maxInvertido = Math.max(...entradas.map((e) => toUSD(e.inversionAcumulada, e.monedaAhorro, tc)));

  // Tendencia de disponible
  const disponibles = entradas.map((e) => {
    const sueldoUSD = toUSD(e.sueldoNeto, e.monedaSueldo, tc);
    const fijosUSD = e.gastosFijos.reduce((s: number, g: GastoFijo) => s + toUSD(g.monto, g.moneda, tc), 0);
    const tarjetasUSD = e.tarjetas.reduce((s: number, t: Tarjeta) => s + t.cuotasMensuales, 0);
    const variablesUSD = toUSD(e.gastosVariables, "UYU", tc);
    return sueldoUSD - fijosUSD - tarjetasUSD - variablesUSD;
  });

  return (
    <div ref={containerRef} className="space-y-5">
      {/* Header */}
      <div className="hist-item pt-1">
        <p className="section-label mb-0.5">Historial</p>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
          Evolución mensual
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
          {entradas.length} {entradas.length === 1 ? "registro" : "registros"}
        </p>
      </div>

      {/* Resumen global */}
      <div className="hist-item grid grid-cols-3 gap-2.5">
        <div className="stat-tile">
          <span className="stat-label">Meses</span>
          <span className="stat-value text-lg">{entradas.length}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Capital máx</span>
          <span className="stat-value text-lg" style={{ color: "var(--accent)" }}>
            ${maxInvertido.toFixed(0)}
            <span className="text-xs font-normal ml-0.5" style={{ color: "var(--text-3)" }}>USD</span>
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Último libre</span>
          <span
            className="stat-value text-lg"
            style={{ color: disponibles[0] >= 0 ? "var(--accent)" : "#f87171" }}
          >
            ${disponibles[0]?.toFixed(0) ?? "—"}
            <span className="text-xs font-normal ml-0.5" style={{ color: "var(--text-3)" }}>USD</span>
          </span>
        </div>
      </div>

      {/* Lista de meses */}
      <div className="space-y-2">
        {entradas.map((entrada, i) => {
          const sueldoUSD = toUSD(entrada.sueldoNeto, entrada.monedaSueldo, tc);
          const fijosUSD = entrada.gastosFijos.reduce((s: number, g: GastoFijo) => s + toUSD(g.monto, g.moneda, tc), 0);
          const tarjetasUSD = entrada.tarjetas.reduce((s: number, t: Tarjeta) => s + t.cuotasMensuales, 0);
          const variablesUSD = toUSD(entrada.gastosVariables, "UYU", tc);
          const totalGastosUSD = fijosUSD + tarjetasUSD + variablesUSD;
          const disponible = sueldoUSD - totalGastosUSD;
          const invUSD = toUSD(entrada.inversionAcumulada, entrada.monedaAhorro, tc);
          const tasaAhorro = sueldoUSD > 0 ? (disponible / sueldoUSD) * 100 : 0;
          const open = expandido === entrada.mes;

          return (
            <div
              key={entrada.mes}
              className="hist-item rounded-xl transition-all duration-200 cursor-pointer"
              style={{
                background: "var(--surface-1)",
                border: `1px solid ${open ? "rgba(16,185,129,0.25)" : "var(--border)"}`,
              }}
              onClick={() => setExpandido(open ? null : entrada.mes)}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  {/* Indicador color */}
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
                    style={{ background: disponible >= 0 ? "var(--accent)" : "#f87171" }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold capitalize" style={{ color: "var(--text-1)" }}>
                        {mesLabel(entrada.mes)}
                      </span>
                      <span
                        className="text-xs font-bold"
                        style={{ color: disponible >= 0 ? "var(--accent)" : "#f87171" }}
                      >
                        {disponible >= 0 ? "+" : ""}${disponible.toFixed(0)} libre
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs" style={{ color: "var(--text-3)" }}>
                      <span>
                        Sueldo <strong style={{ color: "var(--text-2)" }}>
                          ${sueldoUSD.toFixed(0)}
                        </strong>
                      </span>
                      <span>
                        Gastos <strong style={{ color: "#f87171" }}>
                          ${totalGastosUSD.toFixed(0)}
                        </strong>
                      </span>
                      <span>
                        Invertido <strong style={{ color: "var(--accent)" }}>
                          ${invUSD.toFixed(0)}
                        </strong>
                      </span>
                    </div>

                    <div className="mt-2">
                      <MiniBar
                        valor={Math.max(0, tasaAhorro)}
                        max={100}
                        color={tasaAhorro >= 20 ? "var(--accent)" : tasaAhorro >= 0 ? "#f59e0b" : "#f87171"}
                      />
                    </div>
                  </div>

                  <svg
                    width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{
                      color: "var(--text-3)", flexShrink: 0, marginTop: 4,
                      transform: open ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>

                {/* Detalle expandido */}
                {open && (
                  <div
                    className="mt-4 pt-4 space-y-3"
                    style={{ borderTop: "1px solid var(--border)" }}
                  >
                    {/* Sueldo */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs" style={{ color: "var(--text-3)" }}>Sueldo neto</span>
                        <span className="text-xs font-semibold" style={{ color: "var(--text-1)" }}>
                          {entrada.monedaSueldo === "USD" ? "$" : ""}{entrada.sueldoNeto.toLocaleString("es-UY")} {entrada.monedaSueldo}
                        </span>
                      </div>
                      <MiniBar valor={sueldoUSD} max={maxSueldo} color="#60a5fa" />
                    </div>

                    {/* Gastos fijos */}
                    {entrada.gastosFijos.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-3)" }}>Gastos fijos</p>
                        <div className="space-y-1">
                          {entrada.gastosFijos.map((g) => (
                            <div key={g.id} className="flex justify-between text-xs">
                              <span style={{ color: "var(--text-2)" }}>{g.nombre || "—"}</span>
                              <span style={{ color: "var(--text-3)" }}>
                                {g.monto.toLocaleString("es-UY")} {g.moneda}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Variables */}
                    <div className="flex justify-between text-xs">
                      <span style={{ color: "var(--text-3)" }}>Gastos variables</span>
                      <span style={{ color: "var(--text-2)" }}>{entrada.gastosVariables.toLocaleString("es-UY")} UYU</span>
                    </div>

                    {/* Tarjetas */}
                    {entrada.tarjetas.filter((t) => t.tipo === "credito").length > 0 && (
                      <div>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--text-3)" }}>Tarjetas de crédito</p>
                        <div className="space-y-1">
                          {entrada.tarjetas.filter((t) => t.tipo === "credito").map((t) => (
                            <div key={t.id} className="flex justify-between text-xs">
                              <span style={{ color: "var(--text-2)" }}>{t.nombre || "—"}</span>
                              <span style={{ color: "#f59e0b" }}>cuota ${t.cuotasMensuales} USD</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Capital */}
                    <div
                      className="rounded-lg p-3 flex justify-between items-center"
                      style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
                    >
                      <div>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>Capital invertido</p>
                        <p className="text-sm font-bold" style={{ color: "var(--accent)" }}>
                          ${invUSD.toFixed(0)} USD
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>Tasa de ahorro</p>
                        <p
                          className="text-sm font-bold"
                          style={{ color: tasaAhorro >= 20 ? "var(--accent)" : "#f59e0b" }}
                        >
                          {Math.max(0, tasaAhorro).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
