import { isNumber } from "@/lib/validators";

/**
 * Per-thread browsing state. Switching threads unmounts the panel, so without
 * this every trip to another thread would drop the expanded folders, the
 * selected file, and the scroll position.
 */
export interface ThreadTreeState {
  expanded: string[];
  selected: string | null;
  scrollTop: number;
  at: number;
}

const THREAD_STATE_PREFIX = "bb-plugin-filetree:thread:";
/** Threads remembered before the least recently used ones are dropped. */
const MAX_REMEMBERED_THREADS = 25;

export function readThreadState(threadId: string): ThreadTreeState | null {
  try {
    const stored = window.localStorage.getItem(`${THREAD_STATE_PREFIX}${threadId}`);
    if (stored === null) return null;
    const parsed: unknown = JSON.parse(stored);
    if (typeof parsed !== "object" || parsed === null) return null;
    const value = parsed as Partial<ThreadTreeState>;
    return {
      expanded: Array.isArray(value.expanded)
        ? value.expanded.filter((path): path is string => typeof path === "string")
        : [],
      selected: typeof value.selected === "string" ? value.selected : null,
      scrollTop: isNumber(value.scrollTop) ? value.scrollTop : 0,
      at: isNumber(value.at) ? value.at : 0,
    };
  } catch {
    return null;
  }
}

export function writeThreadState(threadId: string, state: Omit<ThreadTreeState, "at">) {
  try {
    window.localStorage.setItem(
      `${THREAD_STATE_PREFIX}${threadId}`,
      JSON.stringify({ ...state, at: Date.now() }),
    );

    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key !== null && key.startsWith(THREAD_STATE_PREFIX)) keys.push(key);
    }
    if (keys.length <= MAX_REMEMBERED_THREADS) return;
    const aged = keys
      .map((key) => ({
        key,
        at: readThreadState(key.slice(THREAD_STATE_PREFIX.length))?.at ?? 0,
      }))
      .sort((a, b) => a.at - b.at);
    for (const entry of aged.slice(0, keys.length - MAX_REMEMBERED_THREADS)) {
      window.localStorage.removeItem(entry.key);
    }
  } catch {
    // Storage full or unavailable; the session still works.
  }
}
