"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { translations, type Language } from "./translations"

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: typeof translations.en
}

const LanguageContext = createContext<LanguageContextType | null>(null)

const LANGUAGE_KEY = "stayalone_lang"

function detectBrowserLanguage(): Language {
  if (typeof window === "undefined") return "en"
  
  const browserLang = navigator.language || (navigator as { userLanguage?: string }).userLanguage || ""
  if (browserLang.startsWith("zh")) return "zh"
  return "en"
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Check stored preference first, then browser language
    const stored = localStorage.getItem(LANGUAGE_KEY)
    if (stored === "en" || stored === "zh") {
      setLanguageState(stored)
    } else {
      setLanguageState(detectBrowserLanguage())
    }
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(LANGUAGE_KEY, lang)
  }

  const t = translations[language]

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <LanguageContext.Provider value={{ language: "en", setLanguage, t: translations.en }}>
        {children}
      </LanguageContext.Provider>
    )
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}
