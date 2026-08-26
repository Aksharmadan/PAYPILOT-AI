"use client";

import { motion } from "framer-motion";
import { STAGGER, ease, fadeOnly, fadeUp } from "@/lib/motion";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";

export function Stagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: reduced ? { staggerChildren: 0 } : { staggerChildren: STAGGER },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const variants = reduced ? fadeOnly : fadeUp;
  return (
    <motion.div
      className={cn(className)}
      variants={{
        hidden: variants.initial,
        show: { ...variants.animate, transition: ease },
      }}
    >
      {children}
    </motion.div>
  );
}
