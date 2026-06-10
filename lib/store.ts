"use client";
import type { AppState, EntradaMensual, PerfilUsuario } from "./types";

const KEY = "inversiones-uy-v1";

export function loadState(): AppState {
  if (typeof window === "undefined") return defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return JSON.parse(raw) as AppState;
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function savePerfil(perfil: PerfilUsuario): void {
  const state = loadState();
  saveState({ ...state, perfil });
}

export function saveEntrada(entrada: EntradaMensual): void {
  const state = loadState();
  const historial = state.historial.filter((e) => e.mes !== entrada.mes);
  saveState({ ...state, historial: [...historial, entrada] });
}

export function getUltimaEntrada(): EntradaMensual | null {
  const { historial } = loadState();
  if (!historial.length) return null;
  return historial.sort((a, b) => b.mes.localeCompare(a.mes))[0];
}

function defaultState(): AppState {
  return { perfil: null, historial: [], entradaActual: null };
}
