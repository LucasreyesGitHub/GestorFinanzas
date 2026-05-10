"use client"

import { useEffect, useState } from "react"

export function ThemeToggle() {
  const [theme, setTheme] = useState("dark")

  useEffect(() => {
    const stored = window.localStorage.getItem("theme")
    if (stored) {
      setTheme(stored)
      document.documentElement.classList.toggle("dark", stored === "dark")
      document.documentElement.classList.toggle("light", stored === "light")
    } else {
      document.documentElement.classList.add("dark")
      setTheme("dark")
    }
  }, [])

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
    window.localStorage.setItem("theme", nextTheme)
    document.documentElement.classList.toggle("dark", nextTheme === "dark")
    document.documentElement.classList.toggle("light", nextTheme === "light")
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-ink-50 transition hover:border-sage-400 hover:bg-white/10"
    >
      <span className="text-base">{theme === "dark" ? "🌙" : "☀️"}</span>
      <span>{theme === "dark" ? "Modo oscuro" : "Modo claro"}</span>
    </button>
  )
}
