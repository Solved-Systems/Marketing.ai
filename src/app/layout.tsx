import type { Metadata } from "next"
import { JetBrains_Mono, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import { cn } from "@/lib/utils"
import { SessionProvider } from "@/components/providers/session-provider"
import "./globals.css"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
})

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "MRKTCMD - Marketing Command Center",
  description: "AI-powered marketing content creation platform",
  icons: {
    icon: "/mrktcmd_favicon.png",
    apple: "/mrktcmd_favicon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          jetbrainsMono.variable,
          ibmPlexMono.variable,
          ibmPlexSans.variable,
          "antialiased"
        )}
        suppressHydrationWarning
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
