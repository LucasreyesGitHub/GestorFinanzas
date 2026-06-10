"use client";
import type { Recomendacion as R } from "@/lib/inversiones";
import { OPCIONES } from "@/lib/inversiones";
import Link from "next/link";

interface Props {
  recomendaciones: R[];
  totalInvertido: number;
}

const COLORS = [
  "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-orange-400", "bg-teal-500",
];

export default function Recomendacion({ recomendaciones, totalInvertido }: Props) {
  if (!recomendaciones.length) return null;

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="text-sm font-semibold mb-4">📌 ¿Dónde invertir este mes?</div>
        {/* Barra visual */}
        <div className="flex rounded-full overflow-hidden h-3 mb-4 gap-px">
          {recomendaciones.map((r, i) => (
            <div
              key={r.opcionId}
              className={`${COLORS[i % COLORS.length]} transition-all`}
              style={{ width: `${r.porcentaje}%` }}
            />
          ))}
        </div>
        <div className="space-y-3">
          {recomendaciones.map((r, i) => {
            const opcion = OPCIONES.find((o) => o.id === r.opcionId);
            return (
              <div key={r.opcionId} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${COLORS[i % COLORS.length]}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{r.titulo}</div>
                  <div className="text-xs text-slate-400 truncate">{r.descripcion}</div>
                  {opcion && (
                    <div className="text-xs text-slate-400">{opcion.donde}</div>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-green-600">${r.montoSugerido.toFixed(0)}</div>
                  <div className="text-xs text-slate-400">{r.porcentaje}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {recomendaciones.map((r) => {
        const opcion = OPCIONES.find((o) => o.id === r.opcionId);
        if (!opcion?.consejo) return null;
        return (
          <div key={r.opcionId} className="card bg-slate-50 border-slate-100">
            <div className="text-xs font-semibold text-slate-500 mb-1">💡 {opcion.nombre}</div>
            <p className="text-xs text-slate-600">{opcion.consejo}</p>
          </div>
        );
      })}

      <div className="text-center pt-2">
        <Link href="/mapa" className="text-sm text-green-600 font-medium hover:underline">
          Ver todas las opciones de inversión →
        </Link>
      </div>
    </div>
  );
}
