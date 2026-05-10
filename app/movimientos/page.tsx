import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { MovementsClient } from "@/components/MovementsClient"

export default async function MovimientosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <AppShell>
      <main className="mx-auto max-w-6xl px-0 py-6 lg:px-0">
        <MovementsClient />
      </main>
    </AppShell>
  )
}
