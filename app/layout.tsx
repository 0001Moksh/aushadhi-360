import type React from "react"
import type { Metadata, Viewport } from "next"

import { Geist } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { UserProvider } from "@/lib/contexts/user-context"

const geist = Geist({ subsets: ["latin"] })

export const metadata: Metadata = {
  metadataBase: new URL("https://aushadhi-360.vercel.app"),

  referrer: "origin-when-cross-origin",

  title: {
    default: "Aushadhi 360 – Smart Medical Store Management Software",
    template: "%s | Aushadhi 360",
  },

  description:
    "Aushadhi 360 is an AI-powered medical store management software for pharmacies. Manage billing, inventory, GST, expiry tracking, analytics, and smart medicine recommendations in one platform.",

  keywords: [
    "medical store software",
    "pharmacy management system",
    "pharmacy billing software",
    "medical billing software India",
    "medicine expiry tracking software",
    "AI pharmacy software",
    "medical inventory management",
    "pharmacy POS system",
    "drug store software",
    "chemist shop billing software",
    "gst pharmacy billing",
    "pharmacy analytics dashboard",
    "Aushadhi 360",
  ],

  authors: [{ name: "NexYug Tech" }],
  creator: "NexYug Tech",
  publisher: "NexYug Tech",

  applicationName: "Aushadhi 360",
  category: "Medical Software",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },

  alternates: {
    canonical: "https://aushadhi-360.vercel.app",
    languages: {
      "en-IN": "https://aushadhi-360.vercel.app",
    },
  },

  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://aushadhi-360.vercel.app",
    title: "Aushadhi 360 – AI Medical Store Management Software",
    description:
      "Run your pharmacy smarter with AI-driven billing, inventory, analytics, and medicine intelligence.",
    siteName: "Aushadhi 360",
    images: [
      {
        url: "/logo_card.png",
        width: 1200,
        height: 630,
        alt: "Aushadhi 360 Medical Store Software",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Aushadhi 360 – Smart Pharmacy Software",
    description:
      "AI-powered pharmacy software for billing, inventory, analytics & medicine intelligence.",
    images: ["/logo_card.png"],
  },

  verification: {
    google: "VfUl1tBglIOLkUBtUbpThY0LOYK37wtaf9dtuaV2lWQ",
  },

  icons: {
    icon: "/logo1.png",
    apple: "/logo2.png",
    shortcut: "/logo_card.png",
  },

  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fbff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: "Aushadhi 360",
      operatingSystem: "Web",
      applicationCategory: "MedicalApplication",
      description:
        "AI-powered medical store management software for billing, inventory, expiry tracking and analytics.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "INR",
      },
      publisher: {
        "@type": "Organization",
        name: "NexYug Tech",
        url: "https://aushadhi-360.vercel.app",
      },
      url: "https://aushadhi-360.vercel.app",
      image: "https://aushadhi-360.vercel.app/logo_card.png",
    },
    {
      "@type": "WebSite",
      name: "Aushadhi 360",
      url: "https://aushadhi-360.vercel.app",
      inLanguage: "en-IN",
      description:
        "AI-powered medical store management software for pharmacies with billing, inventory, GST, expiry tracking, analytics, and smart medicine recommendations.",
    },
    {
      "@type": "Organization",
      name: "NexYug Tech",
      url: "https://aushadhi-360.vercel.app",
      logo: "https://aushadhi-360.vercel.app/logo3.png",
      sameAs: [],
    },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Structured Data for Google SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </head>

      <body className={`${geist.className} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <UserProvider>
            {children}
          </UserProvider>
        </ThemeProvider>

        <Analytics />
      </body>
    </html>
  )
}
