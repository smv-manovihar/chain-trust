import React from "react";
import type { Metadata, Viewport } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { GoogleOAuthProvider } from "@react-oauth/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "PharmaSecure - Trust in Every Dose",
  description:
    "Blockchain-powered pharmaceutical verification system for authentic product tracking and counterfeit detection",
  keywords:
    "pharmacy, blockchain, verification, counterfeit, medicine, pharmaceutical",
  creator: "PharmaSecure",
  openGraph: {
    title: "PharmaSecure",
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
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <GoogleOAuthProvider
            clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}
          >
            <AuthProvider>{children}</AuthProvider>
          </GoogleOAuthProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
