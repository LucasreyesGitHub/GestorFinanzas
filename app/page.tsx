import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { DashboardClient } from "@/components/DashboardClient"

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-0 py-6 lg:px-0">
        <section className="glass-card p-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-ink-400">Bienvenido</p>
              <h1 className="mt-3 text-4xl font-semibold text-ink-100">Hola, {session.user?.email}</h1>
              <p className="mt-4 max-w-2xl text-sm text-ink-400 leading-relaxed">
                Controlá tus ingresos, gastos y tendencias desde un panel claro, rápido y minimalista.
              </p>
            </div>
            <div className="rounded-3xl bg-ink-900/80 p-6 text-sm text-ink-200">
              <p className="text-ink-400">Tu cuenta</p>
              <p className="mt-4 text-lg font-semibold text-ink-100">{session.user?.email}</p>
              <p className="mt-3 text-ink-400">Accedé a métricas en vivo y agrega nuevos movimientos con un solo campo.</p>
            </div>
          </div>
        </section>

        <DashboardClient userEmail={session.user?.email ?? ""} />
      </main>
    </AppShell>
  )
}
