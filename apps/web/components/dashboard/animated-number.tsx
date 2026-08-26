"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { formatINR } from "@/lib/format";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(0);
  const first = useRef(true);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const from = first.current ? 0 : fromRef.current;
    first.current = false;
    const controls = animate(from, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    fromRef.current = value;
    return () => controls.stop();
  }, [value, reduced]);

  return <span className={className}>{formatINR(display)}</span>;
}
