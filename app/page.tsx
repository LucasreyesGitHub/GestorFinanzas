import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { DashboardClient } from "@/components/DashboardClient"

export default async function HomePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <AppShell>
      <DashboardClient />
    </AppShell>
  )
}
