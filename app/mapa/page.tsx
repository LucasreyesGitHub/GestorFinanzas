"use client";
import { useState, useEffect } from "react";
import { loadState } from "@/lib/store";
import { OPCIONES, RIESGO_COLOR, TAG_COLOR, type OpcionInversion } from "@/lib/inversiones";

function toUSD(monto: number, moneda: "UYU" | "USD", tc: number) {
  return moneda === "USD" ? monto : monto / tc;
}

function fmtUSD(n: number) {
  if (n === 0) return "Sin mínimo";
  if (n < 1000) return `desde $${n} USD`;
  return `desde $${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k USD`;
}

export default function MapaPage() {
  const [totalInvertido, setTotalInvertido] = useState(0);
  const [filtroRiesgo, setFiltroRiesgo] = useState<string>("todos");
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => {
    const state = loadState();
    const ultima = state.historial.sort((a, b) => b.mes.localeCompare(a.mes))[0];
    if (ultima) {
      const tc = state.perfil?.tipoCambio ?? 40;
      setTotalInvertido(toUSD(ultima.inversionAcumulada, ultima.monedaAhorro, tc));
    }
  }, []);

  const opciones = OPCIONES.filter((o) =>
    filtroRiesgo === "todos" ? true : o.riesgo === filtroRiesgo
  );

  const desbloqueadas = opciones.filter((o) => o.umbralUSD <= totalInvertido);
  const bloqueadas = opciones.filter((o) => o.umbralUSD > totalInvertido);

  return (
    <div className="space-y-5 mt-4">
      <div>
        <h1 className="text-xl font-bold">Opciones de inversión</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          Todas las opciones disponibles en Uruguay
          {totalInvertido > 0 && (
            <> · capital: <span className="text-green-600 font-medium">${totalInvertido.toFixed(0)} USD</span></>
          )}
        </p>
      </div>

      {/* Barra de progreso hacia la siguiente opción */}
      {bloqueadas.length > 0 && (
        <div className="card bg-gradient-to-r from-green-50 to-slate-50 border-green-100">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🔓</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-slate-700">
                Próximo desbloqueo: <span className="text-green-700">{bloqueadas[0].nombre}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                Faltan ${Math.max(0, bloqueadas[0].umbralUSD - totalInvertido).toFixed(0)} USD
              </div>
              <div className="mt-2 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-green-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, bloqueadas[0].umbralUSD === 0 ? 100 : (totalInvertido / bloqueadas[0].umbralUSD) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {totalInvertido === 0 && (
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-xs text-blue-700">
            💡 Cargá tu inversión actual en "Este mes" para ver qué opciones tenés disponibles.
          </p>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {["todos", "muy bajo", "bajo", "medio", "alto"].map((r) => (
          <button
            key={r}
            onClick={() => setFiltroRiesgo(r)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filtroRiesgo === r
                ? "bg-green-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {r === "todos" ? "Todos" : `Riesgo ${r}`}
          </button>
        ))}
      </div>

      {/* Opciones desbloqueadas */}
      {desbloqueadas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            ✅ Disponibles para vos ({desbloqueadas.length})
          </h2>
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

      {/* Opciones bloqueadas */}
      {bloqueadas.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
            🔒 Se desbloquean al llegar a más capital ({bloqueadas.length})
          </h2>
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
  opcion,
  desbloqueada,
  expandida,
  onToggle,
}: {
  opcion: OpcionInversion;
  desbloqueada: boolean;
  expandida: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`card cursor-pointer transition-all ${
        desbloqueada ? "hover:border-green-200" : "opacity-60 hover:opacity-80"
      } ${expandida ? "ring-2 ring-green-200" : ""}`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 text-lg flex-shrink-0 ${desbloqueada ? "" : "grayscale"}`}>
          {desbloqueada ? "✅" : "🔒"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{opcion.nombre}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${TAG_COLOR[opcion.tag] ?? "bg-slate-100 text-slate-600"}`}>
              {opcion.tag}
            </span>
          </div>
          <div className="flex gap-3 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full ${RIESGO_COLOR[opcion.riesgo]}`}>
              Riesgo {opcion.riesgo}
            </span>
            <span className="text-xs text-slate-400">
              {opcion.rendimientoEstimado}
            </span>
            <span className={`text-xs font-medium ${desbloqueada ? "text-green-600" : "text-slate-400"}`}>
              {fmtUSD(opcion.umbralUSD)}
            </span>
          </div>
          {expandida && (
            <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-600">{opcion.descripcion}</p>
              <div>
                <span className="text-xs font-semibold text-slate-500">Dónde hacerlo: </span>
                <span className="text-xs text-slate-600">{opcion.donde}</span>
              </div>
              <div className="bg-green-50 rounded-lg p-2">
                <span className="text-xs font-semibold text-green-700">💡 Consejo: </span>
                <span className="text-xs text-green-700">{opcion.consejo}</span>
              </div>
              <div className="flex gap-3 text-xs text-slate-400">
                <span>Moneda: <strong className="text-slate-600">{opcion.moneda === "ambas" ? "UYU o USD" : opcion.moneda}</strong></span>
              </div>
            </div>
          )}
        </div>
        <div className="text-slate-300 text-xs mt-1">{expandida ? "▲" : "▼"}</div>
      </div>
    </div>
  );
}
