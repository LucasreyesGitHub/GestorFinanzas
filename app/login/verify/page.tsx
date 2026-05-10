import Link from "next/link"

export default function VerifyPage() {
  return (
    <main className="grain min-h-screen bg-ink-900 flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sage-900 opacity-30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm text-center animate-fade-up">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-sage-900 border border-sage-700 mb-6">
          <svg className="w-8 h-8 text-sage-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1 className="font-display text-2xl text-ink-100 mb-3">
          Enlace enviado
        </h1>
        <p className="text-ink-400 text-sm font-body leading-relaxed mb-6">
          Abrí el correo que te enviamos y hacé clic en el enlace para ingresar.
          Podés cerrar esta pestaña.
        </p>

        <Link
          href="/login"
          className="text-sage-300 hover:text-sage-100 text-sm font-body transition-colors"
        >
          ← Volver al inicio
        </Link>
      </div>
    </main>
  )
}
