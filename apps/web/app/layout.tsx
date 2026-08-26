import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayPilot AI",
  description: "Autonomous Revenue Recovery Infrastructure",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`} suppressHydrationWarning>
      <body className="bg-base-50 text-ink-0 antialiased min-h-screen">{children}</body>
    </html>
  );
}
