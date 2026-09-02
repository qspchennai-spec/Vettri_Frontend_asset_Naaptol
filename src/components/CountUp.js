import { useEffect, useRef, useState } from "react";

/**
 * Animates a numeric value counting up from 0 (or its previous value) to
 * `value` whenever `value` changes. Falls back to rendering the raw value
 * instantly if it isn't a finite number, so it's safe to drop in anywhere
 * a KPI/stat currently renders `{value}`.
 *
 * Respects prefers-reduced-motion by skipping straight to the end value.
 */
export default function CountUp({ value, duration = 700, format }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef(null);
  const reducedMotion = useRef(
    typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    const target = Number(value);
    if (!Number.isFinite(target)) {
      setDisplay(value);
      return;
    }

    if (reducedMotion.current) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }

    const from = fromRef.current;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      // easeOutCubic — quick start, gentle settle
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (target - from) * eased;
      setDisplay(Math.round(current));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  if (!Number.isFinite(Number(value))) return value ?? 0;
  return format ? format(display) : display;
}
