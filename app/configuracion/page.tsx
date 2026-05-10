import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-8 px-0 py-6 lg:px-0">
        <section className="glass-card p-8">
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Configuración</p>
              <h1 className="text-3xl font-semibold text-ink-100">Ajustes de tu experiencia</h1>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-ink-900/80 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Tema</p>
                <h2 className="mt-3 text-xl font-semibold text-ink-100">Modo claro / oscuro</h2>
                <p className="mt-3 text-sm text-ink-400">Guarda tu preferencia para el próximo inicio de sesión.</p>
              </div>
              <div className="rounded-3xl bg-ink-900/80 p-6">
                <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Datos</p>
                <h2 className="mt-3 text-xl font-semibold text-ink-100">Persistencia segura</h2>
                <p className="mt-3 text-sm text-ink-400">Tus transacciones se guardan en la base de datos y se muestran de forma sincronizada.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </AppShell>
  )
}
