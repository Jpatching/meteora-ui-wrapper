import type { Metadata } from "next";
import { Syne, Audiowide, Chakra_Petch, Share_Tech_Mono, Exo_2 } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/providers/AppProviders";

// Body text - distinctive geometric sans-serif
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Display/Brand - modern tech display font for hero headings
const audiowide = Audiowide({
  variable: "--font-audiowide",
  subsets: ["latin"],
  weight: "400",
});

// UI elements - sharp, angular font for buttons and UI
const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

// Numbers/Data - futuristic monospace for addresses and stats
const shareTechMono = Share_Tech_Mono({
  variable: "--font-share-tech-mono",
  subsets: ["latin"],
  weight: "400",
});

// Accents - geometric font for tables and cards
const exo2 = Exo_2({
  variable: "--font-exo-2",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "MetaTools - Meteora Protocol Suite",
  description: "Your comprehensive toolkit for Meteora protocols - create and manage DLMM, DAMM, DBC, and Alpha Vault pools",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${audiowide.variable} ${chakraPetch.variable} ${shareTechMono.variable} ${exo2.variable} antialiased`}
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
