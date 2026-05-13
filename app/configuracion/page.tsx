import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/AppShell"
import { ConfiguracionClient } from "@/components/ConfiguracionClient"

export default async function ConfiguracionPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <AppShell>
      <ConfiguracionClient
        userName={session.user?.name}
        userEmail={session.user?.email}
      />
    </AppShell>
  )
}
