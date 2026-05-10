import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { StatsClient } from "@/components/StatsClient"

export default async function EstadisticasPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl space-y-8 px-0 py-6 lg:px-0">
        <StatsClient />
      </main>
    </AppShell>
  )
}
