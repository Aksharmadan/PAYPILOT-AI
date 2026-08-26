"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ease, fadeOnly, fadeUp } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const variants = reduced ? fadeOnly : fadeUp;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={variants.initial}
        animate={variants.animate}
        exit={variants.exit}
        transition={ease}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
