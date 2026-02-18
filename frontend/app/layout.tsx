import React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "ChainTrust - Trust in Every Dose",
  description:
    "Blockchain-powered pharmaceutical verification system for authentic product tracking and counterfeit detection",
  keywords:
    "pharmacy, blockchain, verification, counterfeit, medicine, pharmaceutical",
  creator: "ChainTrust",
  openGraph: {
    title: "ChainTrust",
    description: "Blockchain-powered pharmaceutical verification system",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020817" },
  ],
  userScalable: true,
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${jetBrainsMono.variable}`}
    >
      <body className="font-sans antialiased relative">
        {/* Background Grid - z-0 to be above body background but below content */}
        <div className="fixed inset-0 bg-grid-pattern-global pointer-events-none z-0" />

        {/* Content - z-10 to sit above grid */}
        <div className="relative z-10">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <AuthProvider>{children}</AuthProvider>
            <Toaster />
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
