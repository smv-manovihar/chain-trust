import React from "react";
import type { Metadata, Viewport } from "next";
import { Figtree, Noto_Sans } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/sidebar-context";
import { Web3Provider } from "@/contexts/web3-context";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const notoish = Noto_Sans({
  subsets: ["latin"],
  variable: "--font-noto",
  weight: ["300", "400", "500", "600", "700", "800"],
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
  icons: {
    icon: "/chain-trust.png",
    apple: "/chain-trust.png",
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
      className={`${figtree.variable} ${notoish.variable}`}
    >
      <body className="font-sans antialiased relative selection:bg-primary/20">
        {/* Background Grid - z-0 to be above body background but below content */}
        <div className="fixed inset-0 bg-grid-pattern-global pointer-events-none z-0" />

        {/* Content - z-10 to sit above grid */}
        <div className="relative z-10">
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider delayDuration={300}>
                <AuthProvider>
                  <Web3Provider>
                  <SidebarProvider>{children}</SidebarProvider>
                </Web3Provider>
                </AuthProvider>
            </TooltipProvider>
            <Toaster />
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
