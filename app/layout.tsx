import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const vazir = localFont({
  src: [
    {
      path: "../font/Vazir-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../font/Vazir-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../font/Vazir.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../font/Vazir-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../font/Vazir-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../font/Vazir-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  title: "کیوسک - نانوایی ستاره سرخ",
  description: "سیستم مدیریت کیوسک فروش",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={`${vazir.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
