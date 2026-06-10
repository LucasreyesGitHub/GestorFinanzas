"use client";
import { useState, useEffect, useRef } from "react";
import { loadState, savePerfil, saveEntrada } from "@/lib/store";
import type { EntradaMensual, GastoFijo, Tarjeta, PerfilUsuario } from "@/lib/types";
import { generarRecomendaciones } from "@/lib/inversiones";
import Recomendacion from "@/components/Recomendacion";
import gsap from "gsap";

const mesActual = new Date().toISOString().slice(0, 7);
const mesLabel = new Date().toLocaleDateString("es-UY", { month: "long", year: "numeric" });
function uid() { return Math.random().toString(36).slice(2, 8); }
function toUSD(monto: number, moneda: "UYU" | "USD", tc: number) {
  return moneda === "USD" ? monto : monto / tc;
}

/* ─── Sección colapsable ─── */
function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button
        className="w-full flex items-center justify-between"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{title}</span>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: "var(--text-3)", transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div className="mt-4 space-y-3">{children}</div>}
    </div>
  );
}

/* ─── Resultado ─── */
function ResultView({
  sueldo, monedaSueldo, gastosVariables, gastosFijos, tarjetas,
  ahorroAcumulado, inversionAcumulada, monedaAhorro, tc, perfil,
  onEdit,
}: {
  sueldo: number; monedaSueldo: "UYU"|"USD"; gastosVariables: number;
  gastosFijos: GastoFijo[]; tarjetas: Tarjeta[];
  ahorroAcumulado: number; inversionAcumulada: number; monedaAhorro: "UYU"|"USD";
  tc: number; perfil: PerfilUsuario; onEdit: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fijosUSD = gastosFijos.reduce((s, g) => s + toUSD(g.monto, g.moneda, tc), 0);
  const tarjetasUSD = tarjetas.reduce((s, t) => s + t.cuotasMensuales, 0);
  const sueldoUSD = toUSD(sueldo, monedaSueldo, tc);
  const variablesUSD = toUSD(gastosVariables, "UYU", tc);
  const totalGastosUSD = variablesUSD + fijosUSD + tarjetasUSD;
  const disponibleUSD = sueldoUSD - totalGastosUSD;
  const invertirUSD = Math.max(0, disponibleUSD * 0.3);
  const totalInvertido = toUSD(inversionAcumulada, monedaAhorro, tc);
  const recs = generarRecomendaciones(invertirUSD, totalInvertido, perfil.riesgo);
  const deudaTarjetas = tarjetas.filter(t => t.tipo === "credito").reduce((s, t) => s + t.deudaActual, 0);
  const tasaAhorro = sueldoUSD > 0 ? ((disponibleUSD / sueldoUSD) * 100) : 0;

  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".result-item", {
        y: 20, opacity: 0, duration: 0.45, stagger: 0.06, ease: "power3.out", clearProps: "all",
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className="space-y-4">
      {/* Header */}
      <div className="result-item flex items-start justify-between pt-1">
        <div>
          <p className="section-label mb-0.5">Análisis</p>
          <h1 className="text-xl font-bold capitalize tracking-tight" style={{ color: "var(--text-1)" }}>
            {mesLabel}
          </h1>
        </div>
        <button onClick={onEdit} className="btn-ghost text-xs py-1.5 px-3">Editar</button>
      </div>

      {/* Estadísticas clave */}
      <div className="result-item grid grid-cols-3 gap-2.5">
        <div className="stat-tile">
          <span className="stat-label">Sueldo</span>
          <span className="stat-value text-lg">
            {monedaSueldo === "USD" ? "$" : ""}{sueldo.toLocaleString("es-UY", { maximumFractionDigits: 0 })}
            <span className="text-xs font-normal ml-1" style={{ color: "var(--text-3)" }}>{monedaSueldo}</span>
          </span>
        </div>
        <div className="stat-tile">
          <span className="stat-label">Gastos</span>
          <span className="stat-value text-lg" style={{ color: "#f87171" }}>
            ${totalGastosUSD.toFixed(0)}
            <span className="text-xs font-normal ml-1" style={{ color: "var(--text-3)" }}>USD</span>
          </span>
        </div>
        <div className="stat-tile" style={{ borderColor: disponibleUSD < 0 ? "rgba(248,113,113,0.3)" : "rgba(16,185,129,0.2)" }}>
          <span className="stat-label">Libre</span>
          <span className="stat-value text-lg" style={{ color: disponibleUSD < 0 ? "#f87171" : "var(--accent)" }}>
            ${disponibleUSD.toFixed(0)}
            <span className="text-xs font-normal ml-1" style={{ color: "var(--text-3)" }}>USD</span>
          </span>
        </div>
      </div>

      {/* Barra de ahorro */}
      {sueldoUSD > 0 && (
        <div className="result-item card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium" style={{ color: "var(--text-2)" }}>Tasa de ahorro</span>
            <span className="text-xs font-bold" style={{ color: tasaAhorro >= 20 ? "var(--accent)" : "#f59e0b" }}>
              {Math.max(0, tasaAhorro).toFixed(1)}%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, tasaAhorro))}%` }} />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
            {tasaAhorro >= 30 ? "Excelente margen para invertir." : tasaAhorro >= 20 ? "Buen margen. Meta ideal: 30%." : tasaAhorro >= 0 ? "Margen ajustado. Revisá gastos variables." : "Los gastos superan el ingreso."}
          </p>
        </div>
      )}

      {/* Alerta deuda */}
      {deudaTarjetas > 0 && (
        <div
          className="result-item rounded-xl p-4"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
        >
          <div className="flex items-center gap-2 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="text-xs font-semibold" style={{ color: "#f59e0b" }}>Deuda en tarjetas: ${deudaTarjetas.toFixed(0)} USD</span>
          </div>
          <p className="text-xs" style={{ color: "#fcd34d" }}>
            Los intereses de tarjetas de crédito en Uruguay superan el 60% anual. Pagá primero la deuda antes de invertir.
          </p>
        </div>
      )}

      {/* Recomendación o error */}
      {disponibleUSD < 0 ? (
        <div
          className="result-item rounded-xl p-4"
          style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)" }}
        >
          <p className="text-sm font-semibold mb-1" style={{ color: "#f87171" }}>Gastos mayores al ingreso</p>
          <p className="text-xs" style={{ color: "#fca5a5" }}>
            Este mes no hay margen para invertir. Revisá tus gastos fijos y variables.
          </p>
        </div>
      ) : (
        <>
          <div
            className="result-item rounded-xl p-4"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.18)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium mb-0.5" style={{ color: "var(--accent)" }}>Inversión sugerida este mes</p>
                <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                  ${invertirUSD.toFixed(0)} <span className="text-sm font-normal" style={{ color: "var(--text-3)" }}>USD</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "var(--text-3)" }}>Total acumulado</p>
                <p className="text-sm font-bold" style={{ color: "var(--text-2)" }}>
                  ${(totalInvertido + invertirUSD).toFixed(0)} USD
                </p>
              </div>
            </div>
          </div>
          <Recomendacion recomendaciones={recs} totalInvertido={totalInvertido} />
        </>
      )}
    </div>
  );
}

/* ─── Formulario ─── */
export default function HomePage() {
  const formRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState(() => loadState());
  const [step, setStep] = useState<"form" | "result">("form");

  const perfil = state.perfil;
  const ultima = state.historial.find((e) => e.mes === mesActual) ?? null;

  const [sueldo, setSueldo] = useState(ultima?.sueldoNeto?.toString() ?? "");
  const [monedaSueldo, setMonedaSueldo] = useState<"UYU"|"USD">(ultima?.monedaSueldo ?? "UYU");
  const [gastosVariables, setGastosVariables] = useState(ultima?.gastosVariables?.toString() ?? "");
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>(ultima?.gastosFijos ?? []);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(ultima?.tarjetas ?? []);
  const [ahorroAcumulado, setAhorroAcumulado] = useState(ultima?.ahorroAcumulado?.toString() ?? "0");
  const [inversionAcumulada, setInversionAcumulada] = useState(ultima?.inversionAcumulada?.toString() ?? "0");
  const [monedaAhorro, setMonedaAhorro] = useState<"UYU"|"USD">(ultima?.monedaAhorro ?? "USD");
  const [tipoCambio, setTipoCambio] = useState(perfil?.tipoCambio?.toString() ?? "40");

  useEffect(() => {
    if (!formRef.current) return;
    const ctx = gsap.context(() => {
      gsap.from(".form-item", {
        y: 20, opacity: 0, duration: 0.4, stagger: 0.07, ease: "power3.out", clearProps: "all",
      });
    }, formRef);
    return () => ctx.revert();
  }, [step]);

  if (!perfil) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-5">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 8px 24px rgba(16,185,129,0.3)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            <polyline points="16 7 22 7 22 13"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-1)" }}>Inversiones UY</h1>
          <p className="text-sm" style={{ color: "var(--text-2)" }}>Tu brújula de inversión en Uruguay.</p>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>Configurá tu perfil para empezar.</p>
        </div>
        <a href="/setup" className="btn-primary">Configurar perfil →</a>
      </div>
    );
  }

  const tc = parseFloat(tipoCambio) || 40;

  function addGasto() { setGastosFijos([...gastosFijos, { id: uid(), nombre: "", monto: 0, moneda: "UYU" }]); }
  function removeGasto(id: string) { setGastosFijos(gastosFijos.filter((g) => g.id !== id)); }
  function updateGasto(id: string, k: keyof GastoFijo, v: string | number) {
    setGastosFijos(gastosFijos.map((g) => g.id === id ? { ...g, [k]: v } : g));
  }
  function addTarjeta() { setTarjetas([...tarjetas, { id: uid(), nombre: "", tipo: "credito", banco: "", deudaActual: 0, cuotasMensuales: 0 }]); }
  function removeTarjeta(id: string) { setTarjetas(tarjetas.filter((t) => t.id !== id)); }
  function updateTarjeta(id: string, k: keyof Tarjeta, v: string | number) {
    setTarjetas(tarjetas.map((t) => t.id === id ? { ...t, [k]: v } : t));
  }

  function calcular() {
    saveEntrada({
      mes: mesActual, sueldoNeto: parseFloat(sueldo) || 0, monedaSueldo,
      gastosVariables: parseFloat(gastosVariables) || 0, gastosFijos, tarjetas,
      ahorroAcumulado: parseFloat(ahorroAcumulado) || 0,
      inversionAcumulada: parseFloat(inversionAcumulada) || 0, monedaAhorro,
    });
    setState(loadState());
    setStep("result");
  }

  if (step === "result") {
    return (
      <ResultView
        sueldo={parseFloat(sueldo) || 0}
        monedaSueldo={monedaSueldo}
        gastosVariables={parseFloat(gastosVariables) || 0}
        gastosFijos={gastosFijos}
        tarjetas={tarjetas}
        ahorroAcumulado={parseFloat(ahorroAcumulado) || 0}
        inversionAcumulada={parseFloat(inversionAcumulada) || 0}
        monedaAhorro={monedaAhorro}
        tc={tc}
        perfil={perfil}
        onEdit={() => setStep("form")}
      />
    );
  }

  return (
    <div ref={formRef} className="space-y-4">
      {/* Header */}
      <div className="form-item pt-1">
        <p className="section-label mb-0.5">Ingreso mensual</p>
        <h1 className="text-xl font-bold capitalize tracking-tight" style={{ color: "var(--text-1)" }}>{mesLabel}</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>Perfil {perfil.nombre} · {perfil.riesgo}</p>
      </div>

      {/* Tipo de cambio */}
      <div className="form-item card">
        <div className="flex items-center gap-2 mb-3">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-3)" }}>
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
          </svg>
          <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Tipo de cambio</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "var(--text-3)" }}>1 USD =</span>
          <input
            type="number"
            className="input"
            value={tipoCambio}
            onChange={(e) => {
              setTipoCambio(e.target.value);
              savePerfil({ ...perfil, tipoCambio: parseFloat(e.target.value) || 40 });
              setState(loadState());
            }}
          />
          <span className="text-sm font-medium" style={{ color: "var(--text-2)" }}>UYU</span>
        </div>
      </div>

      {/* Sueldo */}
      <Section title="💰 Sueldo neto">
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label">Monto</label>
            <input type="number" className="input" value={sueldo} onChange={(e) => setSueldo(e.target.value)} placeholder="60000" />
          </div>
          <div className="w-24">
            <label className="label">Moneda</label>
            <select className="input" value={monedaSueldo} onChange={(e) => setMonedaSueldo(e.target.value as "UYU"|"USD")}>
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Gastos fijos */}
      <Section title="🏠 Gastos fijos" defaultOpen={gastosFijos.length > 0}>
        {gastosFijos.map((g) => (
          <div key={g.id} className="flex gap-2 items-center">
            <input
              className="input flex-1"
              placeholder="Alquiler, OSE, UTE..."
              value={g.nombre}
              onChange={(e) => updateGasto(g.id, "nombre", e.target.value)}
            />
            <input
              type="number"
              className="input w-28"
              placeholder="Monto"
              value={g.monto || ""}
              onChange={(e) => updateGasto(g.id, "monto", parseFloat(e.target.value) || 0)}
            />
            <select
              className="input w-20"
              value={g.moneda}
              onChange={(e) => updateGasto(g.id, "moneda", e.target.value)}
            >
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
            </select>
            <button
              onClick={() => removeGasto(g.id)}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: "var(--text-3)", background: "var(--surface-3)" }}
            >×</button>
          </div>
        ))}
        <button
          onClick={addGasto}
          className="w-full py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "var(--surface-2)", color: "var(--accent)", border: "1px dashed rgba(16,185,129,0.3)" }}
        >
          + Agregar gasto fijo
        </button>
      </Section>

      {/* Gastos variables */}
      <Section title="🛒 Gastos variables del mes">
        <label className="label">Total estimado (UYU)</label>
        <input
          type="number"
          className="input"
          value={gastosVariables}
          onChange={(e) => setGastosVariables(e.target.value)}
          placeholder="Supermercado, salidas, transporte..."
        />
      </Section>

      {/* Tarjetas */}
      <Section title="💳 Tarjetas" defaultOpen={tarjetas.length > 0}>
        {tarjetas.map((t) => (
          <div
            key={t.id}
            className="rounded-xl p-3 space-y-2.5"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div className="flex gap-2 items-center">
              <input
                className="input flex-1"
                placeholder="OCA, VISA Santander..."
                value={t.nombre}
                onChange={(e) => updateTarjeta(t.id, "nombre", e.target.value)}
              />
              <select
                className="input w-28"
                value={t.tipo}
                onChange={(e) => updateTarjeta(t.id, "tipo", e.target.value)}
              >
                <option value="credito">Crédito</option>
                <option value="debito">Débito</option>
              </select>
              <button
                onClick={() => removeTarjeta(t.id)}
                className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: "var(--text-3)", background: "var(--surface-3)" }}
              >×</button>
            </div>
            {t.tipo === "credito" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Deuda actual (USD)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0"
                    value={t.deudaActual || ""}
                    onChange={(e) => updateTarjeta(t.id, "deudaActual", parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="label">Cuota mensual (USD)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="0"
                    value={t.cuotasMensuales || ""}
                    onChange={(e) => updateTarjeta(t.id, "cuotasMensuales", parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
        <button
          onClick={addTarjeta}
          className="w-full py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ background: "var(--surface-2)", color: "var(--accent)", border: "1px dashed rgba(16,185,129,0.3)" }}
        >
          + Agregar tarjeta
        </button>
      </Section>

      {/* Situación actual */}
      <Section title="📈 Tu capital actual">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ahorro líquido</label>
            <input type="number" className="input" value={ahorroAcumulado} onChange={(e) => setAhorroAcumulado(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="label">Ya invertido</label>
            <input type="number" className="input" value={inversionAcumulada} onChange={(e) => setInversionAcumulada(e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <label className="label">Moneda de los montos anteriores</label>
          <select className="input" value={monedaAhorro} onChange={(e) => setMonedaAhorro(e.target.value as "UYU"|"USD")}>
            <option value="USD">USD</option>
            <option value="UYU">UYU</option>
          </select>
        </div>
      </Section>

      <div className="form-item pb-2">
        <button onClick={calcular} className="btn-primary w-full py-3.5">
          Ver recomendación →
        </button>
      </div>
    </div>
  );
}
