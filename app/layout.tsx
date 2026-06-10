import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Inversiones UY",
  description: "Tu brújula de inversión en Uruguay",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0f1e",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <div className="min-h-dvh flex flex-col">
          <NavBar />
          <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 pb-20 pt-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
