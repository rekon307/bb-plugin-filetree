import { useEffect, useState } from "react";

/**
 * True only once `active` has held for `delayMs`. A listing usually returns in
 * a few milliseconds, and a placeholder that appears and vanishes inside that
 * window reads as a glitch — so the placeholder waits instead.
 */
export function useDelayedTrue(active: boolean, delayMs: number): boolean {
  const [isElapsed, setIsElapsed] = useState(false);

  useEffect(() => {
    if (!active) {
      setIsElapsed(false);
      return;
    }
    const timer = window.setTimeout(() => setIsElapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);

  return active && isElapsed;
}
