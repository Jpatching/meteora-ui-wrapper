import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/AppProviders";

// Body text - modern, readable, fast loading
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: 'swap',
  weight: ["400", "500", "600", "700"],
});

// Monospace - for addresses, code, and data display
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: 'swap',
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MetaTools - Meteora Protocol Suite",
  description: "Your comprehensive toolkit for Meteora protocols - create and manage DLMM, DAMM, DBC, and Alpha Vault pools",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
