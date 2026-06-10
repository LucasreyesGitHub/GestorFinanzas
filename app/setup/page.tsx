"use client";
import { useState, useEffect, useRef } from "react";
import { loadState, savePerfil } from "@/lib/store";
import type { PerfilRiesgo, PerfilUsuario } from "@/lib/types";
import { useRouter } from "next/navigation";
import gsap from "gsap";

const perfiles = [
  {
    value: "conservador" as PerfilRiesgo,
    titulo: "Conservador",
    desc: "Priorizás preservar el capital. Instrumentos del Estado y bancarios con baja volatilidad.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
  },
  {
    value: "moderado" as PerfilRiesgo,
    titulo: "Moderado",
    desc: "Aceptás cierta volatilidad a cambio de mayor rendimiento. Combinás renta fija y variable.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
  },
  {
    value: "agresivo" as PerfilRiesgo,
    titulo: "Agresivo",
    desc: "Buscás el máximo retorno a largo plazo. Tolerás volatilidad con exposición a mercados globales.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
        <polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
  },
];

export default function SetupPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [nombre, setNombre] = useState("");
  const [riesgo, setRiesgo] = useState<PerfilRiesgo>("moderado");
  const [tipoCambio, setTipoCambio] = useState("40");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    const { perfil } = loadState();
    if (perfil) {
      setNombre(perfil.nombre);
      setRiesgo(perfil.riesgo);
      setTipoCambio(perfil.tipoCambio.toString());
    }
    const ctx = gsap.context(() => {
      gsap.from(".anim-item", {
        y: 24, opacity: 0, duration: 0.5, stagger: 0.08, ease: "power3.out", clearProps: "all",
      });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  function guardar() {
    const p: PerfilUsuario = { nombre, riesgo, monedaBase: "USD", tipoCambio: parseFloat(tipoCambio) || 40 };
    savePerfil(p);
    setGuardado(true);
    setTimeout(() => router.push("/"), 700);
  }

  return (
    <div ref={containerRef} className="space-y-5 max-w-lg mx-auto">
      {/* Header */}
      <div className="anim-item pt-2">
        <p className="section-label mb-1">Configuración</p>
        <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-1)" }}>Mi perfil</h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-2)" }}>Define cómo se calculan tus recomendaciones.</p>
      </div>

      {/* Nombre */}
      <div className="card anim-item space-y-3">
        <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Identificación</p>
        <div>
          <label className="label">¿Cómo te llamás?</label>
          <input
            className="input"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Lucas"
          />
        </div>
      </div>

      {/* Tipo de cambio */}
      <div className="card anim-item space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Tipo de cambio</p>
          <span className="badge" style={{ background: "rgba(16,185,129,0.1)", color: "var(--accent)" }}>Referencia</span>
        </div>
        <div>
          <label className="label">1 USD equivale a</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              className="input"
              value={tipoCambio}
              onChange={(e) => setTipoCambio(e.target.value)}
              placeholder="40"
            />
            <span className="text-sm font-medium whitespace-nowrap" style={{ color: "var(--text-2)" }}>UYU</span>
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-3)" }}>
            Usado para unificar todos los montos en dólares.
          </p>
        </div>
      </div>

      {/* Perfil de riesgo */}
      <div className="card anim-item space-y-3">
        <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Perfil de inversor</p>
        <div className="space-y-2">
          {perfiles.map((p) => {
            const active = riesgo === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setRiesgo(p.value)}
                className="w-full text-left p-4 rounded-xl transition-all duration-200"
                style={{
                  background: active ? p.bg : "var(--surface-2)",
                  border: `1.5px solid ${active ? p.border : "var(--border)"}`,
                  color: active ? p.color : "var(--text-2)",
                  transform: active ? "scale(1.01)" : "scale(1)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex-shrink-0" style={{ color: active ? p.color : "var(--text-3)" }}>
                    {p.icon}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: active ? p.color : "var(--text-1)" }}>
                      {p.titulo}
                    </div>
                    <div className="text-xs mt-0.5 leading-relaxed" style={{ color: active ? p.color : "var(--text-3)" }}>
                      {p.desc}
                    </div>
                  </div>
                  <div className="ml-auto flex-shrink-0">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all"
                      style={{ borderColor: active ? p.color : "var(--text-3)", background: active ? p.color : "transparent" }}
                    >
                      {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="anim-item pb-2">
        <button
          onClick={guardar}
          disabled={!nombre}
          className="btn-primary w-full py-3.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          {guardado ? "✓ Guardado — redirigiendo..." : "Guardar perfil"}
        </button>
      </div>
    </div>
  );
}
