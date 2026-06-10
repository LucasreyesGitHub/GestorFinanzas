"use client";
import { useState, useEffect } from "react";
import { loadState, savePerfil, saveEntrada } from "@/lib/store";
import type { EntradaMensual, GastoFijo, Tarjeta, PerfilUsuario } from "@/lib/types";
import { generarRecomendaciones, OPCIONES } from "@/lib/inversiones";
import Recomendacion from "@/components/Recomendacion";

const mesActual = new Date().toISOString().slice(0, 7);

function uid() { return Math.random().toString(36).slice(2, 8); }

function toUSD(monto: number, moneda: "UYU" | "USD", tc: number) {
  return moneda === "USD" ? monto : monto / tc;
}

export default function HomePage() {
  const [state, setState] = useState(() => loadState());
  const [step, setStep] = useState<"form" | "result">("form");

  const perfil = state.perfil;
  const ultima = state.historial.find((e) => e.mes === mesActual) ?? null;

  const [sueldo, setSueldo] = useState(ultima?.sueldoNeto?.toString() ?? "");
  const [monedaSueldo, setMonedaSueldo] = useState<"UYU" | "USD">(ultima?.monedaSueldo ?? "UYU");
  const [gastosVariables, setGastosVariables] = useState(ultima?.gastosVariables?.toString() ?? "");
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>(ultima?.gastosFijos ?? []);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>(ultima?.tarjetas ?? []);
  const [ahorroAcumulado, setAhorroAcumulado] = useState(ultima?.ahorroAcumulado?.toString() ?? "0");
  const [inversionAcumulada, setInversionAcumulada] = useState(ultima?.inversionAcumulada?.toString() ?? "0");
  const [monedaAhorro, setMonedaAhorro] = useState<"UYU" | "USD">(ultima?.monedaAhorro ?? "USD");
  const [tipoCambio, setTipoCambio] = useState(perfil?.tipoCambio?.toString() ?? "40");

  const tc = parseFloat(tipoCambio) || 40;

  if (!perfil) {
    return (
      <div className="mt-10 text-center">
        <div className="text-5xl mb-4">👋</div>
        <h1 className="text-2xl font-bold mb-2">Bienvenido a Inversiones UY</h1>
        <p className="text-slate-500 mb-6 text-sm">Primero configurá tu perfil para empezar.</p>
        <a href="/setup" className="btn-primary inline-block">Configurar mi perfil →</a>
      </div>
    );
  }

  function addGasto() {
    setGastosFijos([...gastosFijos, { id: uid(), nombre: "", monto: 0, moneda: "UYU" }]);
  }
  function removeGasto(id: string) { setGastosFijos(gastosFijos.filter((g) => g.id !== id)); }
  function updateGasto(id: string, key: keyof GastoFijo, val: string | number) {
    setGastosFijos(gastosFijos.map((g) => g.id === id ? { ...g, [key]: val } : g));
  }

  function addTarjeta() {
    setTarjetas([...tarjetas, { id: uid(), nombre: "", tipo: "credito", banco: "", deudaActual: 0, cuotasMensuales: 0 }]);
  }
  function removeTarjeta(id: string) { setTarjetas(tarjetas.filter((t) => t.id !== id)); }
  function updateTarjeta(id: string, key: keyof Tarjeta, val: string | number) {
    setTarjetas(tarjetas.map((t) => t.id === id ? { ...t, [key]: val } : t));
  }

  function calcular() {
    const sueldoNum = parseFloat(sueldo) || 0;
    const variablesNum = parseFloat(gastosVariables) || 0;
    const fijosTotal = gastosFijos.reduce((s, g) => s + toUSD(g.monto, g.moneda, tc), 0);
    const tarjetasTotal = tarjetas.reduce((s, t) => s + t.cuotasMensuales, 0);

    const sueldoUSD = toUSD(sueldoNum, monedaSueldo, tc);
    const totalGastosUSD = toUSD(variablesNum, "UYU", tc) + fijosTotal + tarjetasTotal;
    const disponibleUSD = sueldoUSD - totalGastosUSD;
    const ahorro30 = disponibleUSD * 0.3;

    const entrada: EntradaMensual = {
      mes: mesActual,
      sueldoNeto: sueldoNum,
      monedaSueldo,
      gastosVariables: variablesNum,
      gastosFijos,
      tarjetas,
      ahorroAcumulado: parseFloat(ahorroAcumulado) || 0,
      inversionAcumulada: parseFloat(inversionAcumulada) || 0,
      monedaAhorro,
    };
    saveEntrada(entrada);
    setState(loadState());
    setStep("result");
  }

  if (step === "result") {
    const sueldoNum = parseFloat(sueldo) || 0;
    const variablesNum = parseFloat(gastosVariables) || 0;
    const fijosTotal = gastosFijos.reduce((s, g) => s + toUSD(g.monto, g.moneda, tc), 0);
    const tarjetasTotal = tarjetas.reduce((s, t) => s + t.cuotasMensuales, 0);
    const sueldoUSD = toUSD(sueldoNum, monedaSueldo, tc);
    const totalGastosUSD = toUSD(variablesNum, "UYU", tc) + fijosTotal + tarjetasTotal;
    const disponibleUSD = sueldoUSD - totalGastosUSD;
    const invertirEsteMes = Math.max(0, disponibleUSD * 0.3);
    const totalInvertido = toUSD(parseFloat(inversionAcumulada) || 0, monedaAhorro, tc);
    const recs = generarRecomendaciones(invertirEsteMes, totalInvertido, perfil.riesgo);
    const deudaTarjetas = tarjetas.reduce((s, t) => s + t.deudaActual, 0);

    return (
      <div className="space-y-5 mt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Resumen de {mesActual.replace("-", "/")}</h1>
          <button onClick={() => setStep("form")} className="btn-secondary text-sm py-1.5 px-3">Editar</button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">Sueldo neto</div>
            <div className="text-lg font-bold text-slate-800">
              {monedaSueldo === "USD" ? "$" : ""}
              {sueldoNum.toLocaleString("es-UY")}
              {monedaSueldo === "UYU" ? " UYU" : " USD"}
            </div>
          </div>
          <div className="card text-center">
            <div className="text-xs text-slate-400 mb-1">Total gastos</div>
            <div className="text-lg font-bold text-red-500">
              ${(totalGastosUSD * tc).toLocaleString("es-UY", { maximumFractionDigits: 0 })} UYU
            </div>
          </div>
          <div className={`card text-center ${disponibleUSD < 0 ? "border-red-200" : "border-green-200"}`}>
            <div className="text-xs text-slate-400 mb-1">Disponible</div>
            <div className={`text-lg font-bold ${disponibleUSD < 0 ? "text-red-500" : "text-green-600"}`}>
              ${disponibleUSD.toFixed(0)} USD
            </div>
          </div>
        </div>

        {deudaTarjetas > 0 && (
          <div className="card border-orange-200 bg-orange-50">
            <div className="flex items-center gap-2 mb-1">
              <span>⚠️</span>
              <span className="font-semibold text-orange-800 text-sm">Deuda en tarjetas</span>
            </div>
            <p className="text-xs text-orange-700">
              Tenés ${deudaTarjetas.toFixed(0)} USD en deuda. Antes de invertir, priorizá pagar tarjetas de crédito (intereses del 60–100% anual en UYU).
            </p>
          </div>
        )}

        {disponibleUSD < 0 ? (
          <div className="card border-red-200 bg-red-50">
            <div className="font-semibold text-red-700 mb-1">Los gastos superan el sueldo</div>
            <p className="text-xs text-red-600">Revisá tus gastos fijos. Este mes no hay margen para invertir.</p>
          </div>
        ) : (
          <>
            <div className="card">
              <div className="text-xs text-slate-400 mb-1">Sugerencia de inversión este mes (30%)</div>
              <div className="text-2xl font-bold text-green-600">${invertirEsteMes.toFixed(0)} USD</div>
              <div className="text-xs text-slate-400 mt-1">
                Total invertido acumulado: <span className="font-semibold text-slate-600">${(totalInvertido + invertirEsteMes).toFixed(0)} USD</span>
              </div>
            </div>
            <Recomendacion recomendaciones={recs} totalInvertido={totalInvertido} />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 mt-4">
      <div>
        <h1 className="text-xl font-bold">¿Cómo te fue este mes?</h1>
        <p className="text-slate-400 text-sm mt-0.5">{mesActual.replace("-", "/")} · Perfil {perfil.riesgo}</p>
      </div>

      {/* Tipo de cambio */}
      <div className="card">
        <div className="text-sm font-semibold mb-3">💱 Tipo de cambio</div>
        <div>
          <label className="label">1 USD =</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              className="input"
              value={tipoCambio}
              onChange={(e) => {
                setTipoCambio(e.target.value);
                const p: PerfilUsuario = { ...perfil!, tipoCambio: parseFloat(e.target.value) || 40 };
                savePerfil(p);
                setState(loadState());
              }}
              placeholder="40"
            />
            <span className="text-slate-400 text-sm whitespace-nowrap">UYU</span>
          </div>
        </div>
      </div>

      {/* Sueldo */}
      <div className="card">
        <div className="text-sm font-semibold mb-3">💰 Sueldo neto</div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="label">Monto</label>
            <input type="number" className="input" value={sueldo} onChange={(e) => setSueldo(e.target.value)} placeholder="60000" />
          </div>
          <div className="w-28">
            <label className="label">Moneda</label>
            <select className="input" value={monedaSueldo} onChange={(e) => setMonedaSueldo(e.target.value as "UYU" | "USD")}>
              <option value="UYU">UYU</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>
      </div>

      {/* Gastos fijos */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">🏠 Gastos fijos</div>
          <button onClick={addGasto} className="text-xs text-green-600 font-medium hover:text-green-700">+ Agregar</button>
        </div>
        <div className="space-y-2">
          {gastosFijos.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Sin gastos fijos cargados</p>
          )}
          {gastosFijos.map((g) => (
            <div key={g.id} className="flex gap-2 items-center">
              <input
                className="input flex-1"
                placeholder="Alquiler, OSE, ANTEL..."
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
              <button onClick={() => removeGasto(g.id)} className="text-slate-300 hover:text-red-400 text-lg leading-none">×</button>
            </div>
          ))}
        </div>
      </div>

      {/* Gastos variables */}
      <div className="card">
        <div className="text-sm font-semibold mb-3">🛒 Gastos variables del mes</div>
        <label className="label">Total estimado (UYU)</label>
        <input
          type="number"
          className="input"
          value={gastosVariables}
          onChange={(e) => setGastosVariables(e.target.value)}
          placeholder="Supermercado, salidas, ropa..."
        />
      </div>

      {/* Tarjetas */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">💳 Tarjetas</div>
          <button onClick={addTarjeta} className="text-xs text-green-600 font-medium hover:text-green-700">+ Agregar</button>
        </div>
        <div className="space-y-3">
          {tarjetas.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Sin tarjetas cargadas</p>
          )}
          {tarjetas.map((t) => (
            <div key={t.id} className="bg-slate-50 rounded-xl p-3 space-y-2">
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
                <button onClick={() => removeTarjeta(t.id)} className="text-slate-300 hover:text-red-400 text-lg leading-none">×</button>
              </div>
              {t.tipo === "credito" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="label">Deuda actual (USD)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0"
                      value={t.deudaActual || ""}
                      onChange={(e) => updateTarjeta(t.id, "deudaActual", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="flex-1">
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
        </div>
      </div>

      {/* Situación actual */}
      <div className="card">
        <div className="text-sm font-semibold mb-3">📈 Tu situación actual</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Ahorro líquido</label>
            <input
              type="number"
              className="input"
              value={ahorroAcumulado}
              onChange={(e) => setAhorroAcumulado(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <label className="label">Ya invertido</label>
            <input
              type="number"
              className="input"
              value={inversionAcumulada}
              onChange={(e) => setInversionAcumulada(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="col-span-2">
            <label className="label">Moneda de los montos anteriores</label>
            <select className="input" value={monedaAhorro} onChange={(e) => setMonedaAhorro(e.target.value as "UYU" | "USD")}>
              <option value="USD">USD</option>
              <option value="UYU">UYU</option>
            </select>
          </div>
        </div>
      </div>

      <button onClick={calcular} className="btn-primary w-full text-base py-3">
        Ver recomendación →
      </button>
    </div>
  );
}
