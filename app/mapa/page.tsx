"use client";
import { useState, useEffect, useRef } from "react";
import { loadState } from "@/lib/store";
import { OPCIONES, type OpcionInversion } from "@/lib/inversiones";
import gsap from "gsap";

function toUSD(monto: number, moneda: "UYU"|"USD", tc: number) {
  return moneda === "USD" ? monto : monto / tc;
}

const RIESGO_STYLE: Record<string, { color: string; bg: string }> = {
  "muy bajo": { color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
  "bajo":     { color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  "medio":    { color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
  "alto":     { color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

const TAG_STYLE: Record<string, { color: string; bg: string }> = {
  "Base":          { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  "Gobierno":      { color: "#60a5fa", bg: "rgba(96,165,250,0.1)"  },
  "Banco":         { color: "#818cf8", bg: "rgba(129,140,248,0.1)" },
  "Fondo":         { color: "#c084fc", bg: "rgba(192,132,252,0.1)" },
  "Jubilación":    { color: "#fb923c", bg: "rgba(251,146,60,0.1)"  },
  "Empresa":       { color: "#2dd4bf", bg: "rgba(45,212,191,0.1)"  },
  "Bolsa Local":   { color: "#22d3ee", bg: "rgba(34,211,238,0.1)"  },
  "Internacional": { color: "#34d399", bg: "rgba(52,211,153,0.1)"  },
  "Inmobiliario":  { color: "#fbbf24", bg: "rgba(251,191,36,0.1)"  },
  "Avanzado":      { color: "#f87171", bg: "rgba(248,113,113,0.1)" },
};

function fmtUSD(n: number) {
  if (n === 0) return "Sin mínimo";
  if (n < 1000) return `$${n}`;
  return `$${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
}

export default function MapaPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [totalInvertido, setTotalInvertido] = useState(0);
  const [filtroRiesgo, setFiltroRiesgo] = useState("todos");
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    const state = loadState();
    const ultima = state.historial.sort((a, b) => b.mes.localeCompare(a.mes))[0];
    if (ultima) {
      const tc = state.perfil?.tipoCambio ?? 40;
      setTotalInvertido(toUSD(ultima.inversionAcumulada, ultima.monedaAhorro, tc));
    }

    const ctx = gsap.context(() => {
      gsap.from(".page-item", {
        y: 20, opacity: 0, duration: 0.45, stagger: 0.06, ease: "power3.out", clearProps: "all",
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const filtradas = OPCIONES.filter((o) => filtroRiesgo === "todos" ? true : o.riesgo === filtroRiesgo);
  const desbloqueadas = filtradas.filter((o) => o.umbralUSD <= totalInvertido);
  const bloqueadas = filtradas.filter((o) => o.umbralUSD > totalInvertido);

  const proximaLocked = OPCIONES.filter((o) => o.umbralUSD > totalInvertido)
    .sort((a, b) => a.umbralUSD - b.umbralUSD)[0];
  const progreso = proximaLocked ? Math.min(100, (totalInvertido / proximaLocked.umbralUSD) * 100) : 100;

  return (
    <div ref={containerRef} className="space-y-5">
      {/* Header */}
      <div className="page-item pt-1">
        <p className="section-label mb-0.5">Uruguay</p>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--text-1)" }}>
          Opciones de inversión
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-3)" }}>
          {totalInvertido > 0
            ? <>Capital actual: <span style={{ color: "var(--accent)", fontWeight: 600 }}>${totalInvertido.toFixed(0)} USD</span></>
            : 'Ingresá tu capital en "Este mes" para ver qué tenés disponible.'}
        </p>
      </div>

      {/* Próximo desbloqueo */}
      {proximaLocked && (
        <div
          className="page-item rounded-xl p-4"
          style={{ background: "var(--surface-1)", border: "1px solid rgba(16,185,129,0.15)" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(16,185,129,0.1)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>Próximo desbloqueo</span>
                <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                  Faltan ${Math.max(0, proximaLocked.umbralUSD - totalInvertido).toFixed(0)} USD
                </span>
              </div>
              <p className="text-sm font-semibold mt-0.5 truncate" style={{ color: "var(--text-1)" }}>
                {proximaLocked.nombre}
              </p>
              <div className="progress-track mt-2">
                <div className="progress-fill" style={{ width: `${progreso}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="page-item flex gap-2 flex-wrap">
        {["todos", "muy bajo", "bajo", "medio"].map((r) => (
          <button
            key={r}
            onClick={() => setFiltroRiesgo(r)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{
              background: filtroRiesgo === r ? "rgba(16,185,129,0.15)" : "var(--surface-2)",
              color: filtroRiesgo === r ? "var(--accent)" : "var(--text-3)",
              border: `1px solid ${filtroRiesgo === r ? "rgba(16,185,129,0.3)" : "var(--border)"}`,
            }}
          >
            {r === "todos" ? "Todos" : `Riesgo ${r}`}
          </button>
        ))}
      </div>

      {/* Desbloqueadas */}
      {desbloqueadas.length > 0 && (
        <section className="space-y-2">
          <p className="section-label page-item">
            Disponibles para vos · {desbloqueadas.length}
          </p>
          {desbloqueadas.map((o) => (
            <OpcionCard
              key={o.id}
              opcion={o}
              desbloqueada={true}
              expandida={expandido === o.id}
              onToggle={() => setExpandido(expandido === o.id ? null : o.id)}
            />
          ))}
        </section>
      )}

      {/* Bloqueadas */}
      {bloqueadas.length > 0 && (
        <section className="space-y-2">
          <p className="section-label page-item" style={{ marginTop: desbloqueadas.length ? "0.5rem" : 0 }}>
            Se desbloquean al crecer · {bloqueadas.length}
          </p>
          {bloqueadas.map((o) => (
            <OpcionCard
              key={o.id}
              opcion={o}
              desbloqueada={false}
              expandida={expandido === o.id}
              onToggle={() => setExpandido(expandido === o.id ? null : o.id)}
            />
          ))}
        </section>
      )}
    </div>
  );
}

function OpcionCard({
  opcion, desbloqueada, expandida, onToggle,
}: {
  opcion: OpcionInversion; desbloqueada: boolean; expandida: boolean; onToggle: () => void;
}) {
  const r = RIESGO_STYLE[opcion.riesgo] ?? { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };
  const t = TAG_STYLE[opcion.tag] ?? { color: "#94a3b8", bg: "rgba(148,163,184,0.1)" };

  return (
    <div
      className="page-item rounded-xl transition-all duration-200 cursor-pointer"
      style={{
        background: "var(--surface-1)",
        border: `1px solid ${expandida ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
        opacity: desbloqueada ? 1 : 0.75,
        boxShadow: expandida ? "0 0 0 1px rgba(16,185,129,0.1)" : "none",
      }}
      onClick={onToggle}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Estado icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ background: desbloqueada ? "rgba(16,185,129,0.1)" : "var(--surface-3)" }}
          >
            {desbloqueada ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Nombre + tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
                {opcion.nombre}
              </span>
              <span
                className="badge"
                style={{ background: t.bg, color: t.color }}
              >
                {opcion.tag}
              </span>
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span
                className="badge"
                style={{ background: r.bg, color: r.color }}
              >
                {opcion.riesgo}
              </span>
              <span className="text-xs" style={{ color: desbloqueada ? "var(--text-3)" : "var(--text-2)" }}>
                {opcion.rendimientoEstimado}
              </span>
              <span
                className="text-xs font-semibold ml-auto"
                style={{ color: desbloqueada ? "var(--accent)" : "var(--text-3)" }}
              >
                {fmtUSD(opcion.umbralUSD)} USD
              </span>
            </div>
          </div>

          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ color: "var(--text-3)", flexShrink: 0, marginTop: 4, transform: expandida ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>

        {/* Expandido */}
        {expandida && (
          <div className="mt-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--border)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>
              {opcion.descripcion}
            </p>
            <div>
              <span className="text-xs font-semibold" style={{ color: "var(--text-3)" }}>Dónde: </span>
              <span className="text-xs" style={{ color: "var(--text-2)" }}>{opcion.donde}</span>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ background: desbloqueada ? "rgba(16,185,129,0.06)" : "var(--surface-2)", border: `1px solid ${desbloqueada ? "rgba(16,185,129,0.15)" : "var(--border)"}` }}
            >
              <span className="text-xs font-semibold" style={{ color: desbloqueada ? "var(--accent)" : "var(--text-3)" }}>
                💡 {opcion.consejo}
              </span>
            </div>
            <div className="flex gap-4 text-xs" style={{ color: "var(--text-3)" }}>
              <span>Moneda: <strong style={{ color: "var(--text-2)" }}>{opcion.moneda === "ambas" ? "UYU / USD" : opcion.moneda}</strong></span>
              <span>Mínimo: <strong style={{ color: "var(--text-2)" }}>{fmtUSD(opcion.umbralUSD)} USD</strong></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
