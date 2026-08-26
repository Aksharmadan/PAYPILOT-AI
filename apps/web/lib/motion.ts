/**
 * Shared motion vocabulary — use these presets everywhere.
 * Motion communicates feedback (loaded / changed / interactive / success), not decoration.
 */

export const spring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 28,
  mass: 0.8,
};

export const ease = {
  duration: 0.45,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export const easeFast = {
  duration: 0.28,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

/** Stagger between list/grid children on entrance (ms between items via delay children). */
export const STAGGER = 0.06;

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 6 },
};

export const fadeOnly = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const paletteMotion = {
  initial: { opacity: 0, scale: 0.96, y: 8 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: 4 },
};

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
