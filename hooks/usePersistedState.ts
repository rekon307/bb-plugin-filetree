import { useCallback, useState } from "react";

/**
 * A layout preference, remembered per client. localStorage is ordinary
 * same-origin page state here; a private-mode failure just falls back to the
 * default rather than breaking the panel.
 */
export function usePersistedState<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): [T, (next: T) => void] {
  const storageKey = `bb-plugin-filetree:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === null) return fallback;
      const parsed: unknown = JSON.parse(stored);
      return isValid(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  });

  const store = useCallback(
    (next: T) => {
      setValue(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Preference is not persisted; the session still works.
      }
    },
    [storageKey],
  );

  return [value, store];
}
