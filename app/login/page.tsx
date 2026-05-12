"use client"

import { signIn } from "next-auth/react"
import { IconLeaf } from "@/components/Icons"

export default function LoginPage() {
  return (
    <main className="grain min-h-screen bg-ink-900 flex items-center justify-center p-4 overflow-hidden">

      {/* Fondo decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-72 h-72 rounded-full bg-sage-900 opacity-30 blur-3xl sm:w-96 sm:h-96" />
        <div className="absolute -bottom-48 -right-24 w-72 h-72 rounded-full bg-sage-700 opacity-10 blur-3xl sm:w-[500px] sm:h-[500px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-gold-500 opacity-5 blur-3xl sm:w-72 sm:h-72" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Logo + nombre */}
        <div className="animate-fade-up mb-10 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sage-900 border border-sage-700 mb-5">
            <IconLeaf className="w-7 h-7 text-sage-300" />
          </div>
          <h1 className="font-display text-3xl text-ink-50 leading-tight">
            Finanzas<br />
            <span className="text-sage-300">Personal</span>
          </h1>
          <p className="mt-2 text-ink-400 text-sm font-body">
            Tu dinero, claro y ordenado.
          </p>
        </div>

        {/* Tarjeta */}
        <div className="animate-fade-up delay-200 bg-ink-800 border border-ink-600 rounded-2xl p-6 shadow-2xl">
          <div className="mb-5">
            <h2 className="font-display text-xl text-ink-100">Ingresá</h2>
            <p className="text-ink-400 text-xs mt-1 font-body">
              Accedé con tu cuenta de Google.
            </p>
          </div>

          <button
            onClick={() => signIn("google", { callbackUrl: "/" })}
            className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium rounded-xl px-4 py-3 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            {/* Logo oficial de Google */}
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continuar con Google
          </button>

          <p className="mt-4 text-center text-ink-600 text-xs font-body">
            Solo vos podés acceder a tus datos.
          </p>
        </div>

        {/* Footer */}
        <p className="animate-fade-up delay-400 mt-6 text-center text-ink-600 text-xs font-body">
          ¿Primera vez?{" "}
          <span className="text-ink-400">
            Si no tenés cuenta, se crea automáticamente.
          </span>
        </p>
      </div>
    </main>
  )
}
