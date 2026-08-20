import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
import { buildRootMetadata } from "@/lib/site/metadata";
import {
  LOCAL_BUSINESS_STRUCTURED_DATA,
  serializeStructuredData,
} from "@/lib/site/structured-data";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr" className={`${manrope.variable} ${playfair.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeStructuredData(LOCAL_BUSINESS_STRUCTURED_DATA),
          }}
        />
        {children}
      </body>
    </html>
  );
}
