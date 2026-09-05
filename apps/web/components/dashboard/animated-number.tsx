"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { formatINR } from "@/lib/format";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface AnimatedNumberProps {
  value: number;
  className?: string;
  /** When true, renders just a raw number (no INR formatting) */
  raw?: boolean;
  /** Duration override in seconds */
  duration?: number;
}

export function AnimatedNumber({ value, className, raw = false, duration = 1.2 }: AnimatedNumberProps) {
  const reduced  = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const fromRef  = useRef(0);
  const firstRef = useRef(true);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const from = firstRef.current ? 0 : fromRef.current;
    firstRef.current = false;

    const controls = animate(from, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    fromRef.current = value;

    return () => controls.stop();
  }, [value, reduced, duration]);

  const text = raw
    ? Math.round(display).toLocaleString("en-IN")
    : formatINR(display);

  return <span className={className}>{text}</span>;
}
