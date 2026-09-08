import type { Metadata, Viewport } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { CartProvider } from "@/components/CartProvider";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rezist! — A Dessert Lounge | Order Online",
  description:
    "An Ir-Rezistable Dessert Lounge in Gujrat, Kharian, Jhelum, Sargodha, Daska, Mirpur & Lala Musa. Order cakes and desserts online.",
  appleWebApp: { capable: true, title: "Rezist" },
};

export const viewport: Viewport = {
  themeColor: "#f8f6f0",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
