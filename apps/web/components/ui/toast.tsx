"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { spring, ease } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: ToastTone; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, string> = {
  success: "border-jade-500/30 bg-base-100 text-jade-400",
  error: "border-coral-500/30 bg-base-100 text-coral-400",
  info: "border-base-border bg-base-100 text-ink-0",
};

const toneBar: Record<ToastTone, string> = {
  success: "bg-jade-500",
  error: "bg-coral-500",
  info: "bg-ink-500",
};

const icons = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: { title: string; description?: string; tone?: ToastTone; duration?: number }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const item: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? "info",
        duration: input.duration ?? 4200,
      };
      setItems((prev) => [...prev, item].slice(-4));
      window.setTimeout(() => dismiss(id), item.duration);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ toast }), [toast]);
  const reduced = useReducedMotion();

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[80] flex w-[min(100vw-2rem,22rem)] flex-col gap-2">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const Icon = icons[item.tone];
            return (
              <motion.div
                key={item.id}
                layout
                initial={reduced ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.96 }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, x: 0, scale: 1 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, x: 16, scale: 0.98 }}
                transition={reduced ? ease : spring}
                className={cn(
                  "pointer-events-auto overflow-hidden rounded-xl border shadow-card backdrop-blur-xl",
                  toneStyles[item.tone]
                )}
              >
                <div className="flex gap-3 px-4 py-3">
                  <Icon size={16} className="mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-0">{item.title}</p>
                    {item.description ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-ink-300">{item.description}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(item.id)}
                    className="text-xs text-ink-500 transition hover:text-ink-0"
                  >
                    Close
                  </button>
                </div>
                <div className="h-0.5 bg-base-200">
                  <motion.div
                    className={cn("h-full origin-left", toneBar[item.tone])}
                    initial={{ scaleX: 1 }}
                    animate={{ scaleX: 0 }}
                    transition={{ duration: item.duration / 1000, ease: "linear" }}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
