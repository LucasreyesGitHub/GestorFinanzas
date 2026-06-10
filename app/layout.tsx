import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Inversiones UY",
  description: "Tu brújula de inversión en Uruguay",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <NavBar />
        <main className="max-w-2xl mx-auto px-4 pb-16 pt-4">
          {children}
        </main>
      </body>
    </html>
  );
}
