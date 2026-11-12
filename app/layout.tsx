import type React from "react"
import type { Metadata, Viewport } from "next"
import { Fraunces } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { CookieConsent } from "@/components/cookie-consent"
import "./globals.css"

const siteUrl = "https://bower.africa"

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-bower-display",
  display: "swap",
})

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#101512" },
  ],
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bower — property operations",
    template: "%s | Bower",
  },
  description:
    "Bower is a quieter property workspace for landlords and agencies in Africa. Rent, tenants, leases, maintenance, documents and reporting in one place.",
  applicationName: "Bower",
  authors: [{ name: "Brian Kiarie", url: "https://www.linkedin.com/in/brian-kiarie-00b3a3391" }],
  creator: "Brian Kiarie",
  publisher: "Bower",
  keywords: [
    "property management software",
    "rental management software",
    "landlord software",
    "property management Kenya",
    "rent collection software",
    "Bower",
  ],
  generator: "Next.js",
  openGraph: {
    type: "website",
    url: siteUrl,
    title: "Bower — a quieter way to run rentals",
    description:
      "Run your rental portfolio with clarity. M-Pesa paybill + STK Push rent collection, tenant records, quotations, maintenance workflows and live financial reports.",
    siteName: "Bower",
    locale: "en_US",
    images: [{ url: "/og-default.png", width: 1200, height: 630, alt: "Bower — a quieter way to run rentals" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bower — a quieter way to run rentals",
    description:
      "Run your rental portfolio with clarity. M-Pesa paybill + STK Push rent collection, tenant records, quotations, maintenance workflows and live financial reports.",
    images: ["/og-default.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  alternates: {
    canonical: siteUrl,
    types: {
      "application/rss+xml": `${siteUrl}/rss.xml`,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${display.variable} antialiased`} suppressHydrationWarning>
      <body className="font-sans">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <CookieConsent />
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Bower",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: siteUrl,
              description: "The property workspace for landlords and agencies in Africa.",
              publisher: { "@type": "Organization", name: "Bower", url: siteUrl },
            }),
          }}
        />
      </body>
    </html>
  )
}
