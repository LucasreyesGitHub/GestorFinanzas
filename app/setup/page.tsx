"use client";
import { useState, useEffect } from "react";
import { loadState, savePerfil } from "@/lib/store";
import type { PerfilUsuario, PerfilRiesgo } from "@/lib/types";
import { useRouter } from "next/navigation";

const perfiles = [
  {
    value: "conservador" as PerfilRiesgo,
    emoji: "🛡️",
    titulo: "Conservador",
    desc: "Priorizás no perder dinero. Preferís instrumentos del Estado o bancarios con baja volatilidad.",
  },
  {
    value: "moderado" as PerfilRiesgo,
    emoji: "⚖️",
    titulo: "Moderado",
    desc: "Aceptás algo de riesgo a cambio de mejor rendimiento. Combinás seguridad con algo de bolsa.",
  },
  {
    value: "agresivo" as PerfilRiesgo,
    emoji: "🚀",
    titulo: "Agresivo",
    desc: "Buscás el máximo retorno a largo plazo. Tolerás volatilidad y apostás a mercados globales.",
  },
];

export default function SetupPage() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [riesgo, setRiesgo] = useState<PerfilRiesgo>("moderado");
  const [monedaBase, setMonedaBase] = useState<"UYU" | "USD">("USD");
  const [tipoCambio, setTipoCambio] = useState("40");
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    const { perfil } = loadState();
    if (perfil) {
      setNombre(perfil.nombre);
      setRiesgo(perfil.riesgo);
      setMonedaBase(perfil.monedaBase);
      setTipoCambio(perfil.tipoCambio.toString());
    }
  }, []);

  function guardar() {
    const p: PerfilUsuario = {
      nombre,
      riesgo,
      monedaBase,
      tipoCambio: parseFloat(tipoCambio) || 40,
    };
    savePerfil(p);
    setGuardado(true);
    setTimeout(() => router.push("/"), 800);
  }

  return (
    <div className="space-y-5 mt-4">
      <div>
        <h1 className="text-xl font-bold">Mi perfil</h1>
        <p className="text-slate-400 text-sm">Esto personaliza tus recomendaciones.</p>
      </div>

      <div className="card">
        <label className="label">¿Cómo te llamás?</label>
        <input
          className="input"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Lucas"
        />
      </div>

      <div className="card">
        <div className="text-sm font-semibold mb-3">¿Cuál es tu perfil de inversor?</div>
        <div className="space-y-2">
          {perfiles.map((p) => (
            <button
              key={p.value}
              onClick={() => setRiesgo(p.value)}
              className={`w-full text-left p-3.5 rounded-xl border-2 transition-all ${
                riesgo === p.value
                  ? "border-green-500 bg-green-50"
                  : "border-slate-100 hover:border-slate-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{p.emoji}</span>
                <div>
                  <div className="font-semibold text-sm">{p.titulo}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{p.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="text-sm font-semibold mb-3">💱 Tipo de cambio referencia</div>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-slate-400">1 USD =</span>
          <input
            type="number"
            className="input"
            value={tipoCambio}
            onChange={(e) => setTipoCambio(e.target.value)}
            placeholder="40"
          />
          <span className="text-sm text-slate-400">UYU</span>
        </div>
        <p className="text-xs text-slate-400 mt-2">Usalo para comparar todo en la misma moneda.</p>
      </div>

      <button
        onClick={guardar}
        className={`btn-primary w-full text-base py-3 transition-all ${guardado ? "bg-green-500" : ""}`}
        disabled={!nombre}
      >
        {guardado ? "✓ Guardado" : "Guardar perfil →"}
      </button>
    </div>
  );
}
