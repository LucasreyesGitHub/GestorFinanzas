import type { Metadata } from "next"
import { Playfair_Display, DM_Sans } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/Providers"

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Finanzas Personal",
  description: "Tu gestor financiero inteligente",
  manifest: "/manifest.json",
  themeColor: "#141311",
  appleWebApp: {
    capable: true,
    title: "Finanzas",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-body bg-ink-900 text-ink-50 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
