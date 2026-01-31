import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";
import { Navbar } from '@/components/Navbar';

const dmSansMono = DM_Sans({
  subsets: ["latin"],
  weight: "300",
  variable: "--font-dm-sans-mono",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const common = {
  title: "Flying Protocol - Launch Your DeFi Products",
  description: "Launch and manage Flying Vaults",
  image: '/images/logo-wordmark-white.png'
}

export const metadata: Metadata = {
  title: common.title,
  description: common.description,
  metadataBase: new URL("https://www.flying.fund/"),
  applicationName: "Flying",
  alternates: {
    canonical: "https://www.flying.fund/",
  },
  icons: {
    icon: [
      { rel: "icon", url: "/icons/favicon.ico", type: "image/svg+xml" },
      {
        url: "/icons/favicon-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icons/favicon-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        rel: "apple-touch-icon",
        url: "/icons/apple-touch-icon.png",
      }
    ],
  },
  manifest: "/icons/manifest.json",
  openGraph: {
    type: "website",
    url: "https://www.flying.fund/",
    title: common.title,
    description: common.description,
    siteName: "Flying",
    images: common.image,
  },
  twitter: {
    card: "summary_large_image",
    title: common.title,
    description: common.description,
    site: "@flyingico",
    creator: "@flyingico",
    images: common.image,
  },
  appleWebApp: {
    capable: true,
    title: common.title,
    statusBarStyle: "default",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSansMono.variable} ${manrope.variable} antialiased`}>
        <Providers>
          <Navbar />
          {children}
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1F2937',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
