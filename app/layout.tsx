import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";
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

export const metadata: Metadata = {
  title: {
    default: "K'nails Beauty Institut",
    template: "%s | K'nails Beauty Institut",
  },
  description:
    "Institut de beauté et onglerie : manucure, soins du corps et soins du visage.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="fr" className={`${manrope.variable} ${playfair.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
