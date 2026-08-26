"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageTransition } from "@/components/layout/page-transition";
import { ToastProvider } from "@/components/ui/toast";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <ToastProvider>
      <div className="relative flex min-h-screen overflow-hidden">
        <div className="surface-grid pointer-events-none absolute inset-0 opacity-50" />
        <Sidebar />
        <div className="relative flex min-w-0 flex-1 flex-col">
          <Topbar onOpenPalette={() => setPaletteOpen(true)} />
          <main className="flex-1 p-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      </div>
    </ToastProvider>
  );
}
