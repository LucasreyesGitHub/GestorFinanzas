"use client";
import { useEffect, useRef } from "react";
import type { Recomendacion as R } from "@/lib/inversiones";
import { OPCIONES } from "@/lib/inversiones";
import Link from "next/link";
import gsap from "gsap";

interface Props {
  recomendaciones: R[];
  totalInvertido: number;
}

const SEGMENT_COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#06b6d4"];

export default function Recomendacion({ recomendaciones, totalInvertido }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !recomendaciones.length) return;
    const ctx = gsap.context(() => {
      gsap.from(".rec-item", {
        x: -16, opacity: 0, duration: 0.4, stagger: 0.07, ease: "power2.out", clearProps: "all",
      });
      gsap.from(".bar-segment", {
        scaleX: 0, duration: 0.6, stagger: 0.08, ease: "power3.out", transformOrigin: "left center",
      });
    }, ref);
    return () => ctx.revert();
  }, [recomendaciones]);

  if (!recomendaciones.length) return null;

  return (
    <div ref={ref} className="space-y-4">
      {/* Distribución visual */}
      <div className="card">
        <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-1)" }}>
          Distribución sugerida
        </p>

        {/* Barra de progreso segmentada */}
        <div className="flex rounded-lg overflow-hidden h-2 mb-5 gap-px">
          {recomendaciones.map((r, i) => (
            <div
              key={r.opcionId}
              className="bar-segment h-full"
              style={{ width: `${r.porcentaje}%`, background: SEGMENT_COLORS[i % SEGMENT_COLORS.length] }}
            />
          ))}
        </div>

        <div className="space-y-3">
          {recomendaciones.map((r, i) => {
            const opcion = OPCIONES.find((o) => o.id === r.opcionId);
            const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
            return (
              <div key={r.opcionId} className="rec-item flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{r.titulo}</div>
                  <div className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>
                    {opcion?.donde}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold" style={{ color }}>
                    ${r.montoSugerido.toFixed(0)}
                    <span className="text-xs font-normal ml-0.5" style={{ color: "var(--text-3)" }}>USD</span>
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-3)" }}>{r.porcentaje}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Consejos por opción */}
      {recomendaciones.map((r, i) => {
        const opcion = OPCIONES.find((o) => o.id === r.opcionId);
        if (!opcion?.consejo) return null;
        const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
        return (
          <div
            key={r.opcionId}
            className="rec-item rounded-xl p-4"
            style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              <span className="text-xs font-semibold" style={{ color }}>
                {opcion.nombre}
              </span>
              <span className="badge ml-auto" style={{ background: "var(--surface-3)", color: "var(--text-3)" }}>
                {opcion.rendimientoEstimado}
              </span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-2)" }}>{opcion.consejo}</p>
          </div>
        );
      })}

      <div className="text-center pt-1">
        <Link
          href="/mapa"
          className="text-xs font-medium transition-colors"
          style={{ color: "var(--accent)" }}
        >
          Ver todas las opciones disponibles →
        </Link>
      </div>
    </div>
  );
}
