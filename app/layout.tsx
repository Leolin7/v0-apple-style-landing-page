import type { Metadata, Viewport } from "next"
import { Inter, IBM_Plex_Mono, Instrument_Serif, Noto_Serif_SC } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { LanguageProvider } from "@/lib/language-context"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["300", "400"],
  subsets: ["latin"],
  variable: "--font-mono",
})

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
})

const notoSerifSC = Noto_Serif_SC({
  weight: ["300", "400"],
  subsets: ["latin"],
  variable: "--font-serif-zh",
})

export const metadata: Metadata = {
  title: "Stay Alone",
  description: "The world keeps going. You don't have to.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
  openGraph: {
    title: "Stay Alone",
    description: "The world keeps going. You don't have to.",
    images: ["/og-image.svg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stay Alone",
    description: "The world keeps going. You don't have to.",
    images: ["/og-image.svg"],
  },
}

export const viewport: Viewport = {
  themeColor: "#F7F5F2",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-[#F7F5F2]">
      <body className={`${inter.variable} ${ibmPlexMono.variable} ${instrumentSerif.variable} ${notoSerifSC.variable} font-sans antialiased`}>
        <LanguageProvider>{children}</LanguageProvider>
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
