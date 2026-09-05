import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayPilot AI",
  description: "Autonomous Revenue Recovery Infrastructure",
};

// Blocking script prevents flash of wrong theme on load
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('paypilot-theme');
      var isDark = stored ? stored === 'dark' : true;
      document.documentElement.classList.toggle('dark', isDark);
    } catch(e) {
      document.documentElement.classList.add('dark');
    }
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Runs before paint — sets dark/light class from localStorage, defaults to dark */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-base-50 text-ink-0 antialiased min-h-screen">{children}</body>
    </html>
  );
}
