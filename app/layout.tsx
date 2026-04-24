import { Inter, JetBrains_Mono } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Providers } from "@/app/providers"
import { cn } from "@/lib/utils";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '----font-mono' })

export const metadata: Metadata = {
  title: "LogiXQ — Smart Supply Chain Command Center",
  description: "Real-time AI-powered supply chain monitoring, disruption prediction, and dynamic route optimization. Built for resilient logistics.",
  keywords: ["supply chain", "logistics", "AI", "route optimization", "disruption prediction"],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontSans.variable, jetbrainsMono.variable)}
    >
      <body className="font-sans">
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  )
}
