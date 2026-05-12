import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { StatsClient } from "@/components/StatsClient"

export default async function SubirDatosPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <AppShell>
      <StatsClient />
    </AppShell>
  )
}
