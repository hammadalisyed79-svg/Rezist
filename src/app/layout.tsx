import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Source_Sans_3({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rezist! — A Dessert Lounge | Order Online",
  description:
    "An Ir-Rezistable Dessert Lounge in Gujrat, Kharian, Jhelum, Sargodha, Daska, Mirpur & Lala Musa. Order cakes and desserts online.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${body.variable} antialiased`}>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
