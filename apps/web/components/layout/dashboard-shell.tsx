"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { PageTransition } from "@/components/layout/page-transition";
import { ToastProvider } from "@/components/ui/toast";
import { DetailDrawer } from "@/components/dashboard/detail-drawer";

function DrawerListener() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pathname     = usePathname();

  const drawerId   = searchParams.get("drawerId");
  const drawerType = searchParams.get("drawerType") as
    | "customer" | "payment" | "subscription" | "opportunity"
    | null;

  const closeDrawer = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("drawerId");
    params.delete("drawerType");
    router.push(`${pathname}?${params.toString()}`);
  };

  if (!drawerId || !drawerType) return null;

  return (
    <AnimatePresence>
      <DetailDrawer id={drawerId} type={drawerType} onClose={closeDrawer} />
    </AnimatePresence>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);

  return (
    <ToastProvider>
      {/* Root container */}
      <div className="relative flex h-screen w-screen overflow-hidden bg-base-0">

        {/* Subtle grid overlay — only at the top */}
        <div
          aria-hidden
          className="surface-grid pointer-events-none absolute inset-0 opacity-25"
        />

        {/* Sidebar */}
        <Sidebar />

        {/* Main content column */}
        <div className="relative flex min-w-0 flex-1 flex-col h-full overflow-hidden">
          <Topbar onOpenPalette={() => setPaletteOpen(true)} />

          <main className="flex-1 overflow-y-auto scroll-smooth">
            {/* Inner padding wrapper — all pages get consistent spacing */}
            <div className="min-h-full px-6 py-5 lg:px-8 lg:py-6">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>

        {/* ⌘K command palette */}
        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

        {/* URL-driven detail drawer */}
        <Suspense fallback={null}>
          <DrawerListener />
        </Suspense>
      </div>
    </ToastProvider>
  );
}
