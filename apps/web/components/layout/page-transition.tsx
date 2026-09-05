"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

const variants = {
  initial: { opacity: 0, y: 8 },
  enter:   { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -4 },
};

const reducedVariants = {
  initial: { opacity: 0 },
  enter:   { opacity: 1 },
  exit:    { opacity: 0 },
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduced  = useReducedMotion();
  const v        = reduced ? reducedVariants : variants;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        variants={v}
        initial="initial"
        animate="enter"
        exit="exit"
        transition={{
          duration: reduced ? 0.12 : 0.22,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
