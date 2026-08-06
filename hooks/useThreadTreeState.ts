import { useCallback, useEffect, useRef, useState } from "react";
import type { Entry } from "@/lib/entry";
import { readThreadState, writeThreadState } from "@/lib/thread-tree-state";

export interface ThreadTreeStateApi {
  expanded: Set<string>;
  setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedPath: string | null;
  setSelectedPath: React.Dispatch<React.SetStateAction<string | null>>;
  treeScrollRef: React.RefObject<HTMLDivElement | null>;
  onTreeScroll: (event: React.UIEvent<HTMLDivElement>) => void;
}

/**
 * Per-thread browsing state: expanded folders, selection, and scroll
 * position, restored on mount and persisted as they change.
 */
export function useThreadTreeState(
  threadId: string,
  childrenByPath: Record<string, Entry[]>,
): ThreadTreeStateApi {
  const [initial] = useState(() => readThreadState(threadId));
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(initial?.expanded ?? []));
  const [selectedPath, setSelectedPath] = useState<string | null>(() => initial?.selected ?? null);
  const treeScrollRef = useRef<HTMLDivElement | null>(null);
  const scrollTopRef = useRef(initial?.scrollTop ?? 0);
  const hasRestoredScroll = useRef(false);

  // A panel mounted for a different thread starts from that thread's own
  // remembered state rather than whatever the previous thread left behind.
  const mountedThreadId = useRef(threadId);
  useEffect(() => {
    if (mountedThreadId.current === threadId) return;
    mountedThreadId.current = threadId;
    const stored = readThreadState(threadId);
    setExpanded(new Set(stored?.expanded ?? []));
    setSelectedPath(stored?.selected ?? null);
    scrollTopRef.current = stored?.scrollTop ?? 0;
    hasRestoredScroll.current = false;
  }, [threadId]);

  // Persist browsing state so returning to this thread lands in the same place.
  const persist = useCallback(() => {
    writeThreadState(threadId, {
      expanded: [...expanded],
      selected: selectedPath,
      scrollTop: scrollTopRef.current,
    });
  }, [expanded, selectedPath, threadId]);

  useEffect(() => {
    persist();
  }, [persist]);

  // Scrolling must not re-render the tree, so it is written on a debounce from
  // a ref — and flushed on unmount, which is exactly when a thread switch would
  // otherwise drop the last scroll.
  const scrollWriteTimer = useRef<number | null>(null);
  const onTreeScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      scrollTopRef.current = event.currentTarget.scrollTop;
      if (scrollWriteTimer.current !== null) {
        window.clearTimeout(scrollWriteTimer.current);
      }
      scrollWriteTimer.current = window.setTimeout(() => {
        scrollWriteTimer.current = null;
        persist();
      }, 400);
    },
    [persist],
  );

  useEffect(
    () => () => {
      if (scrollWriteTimer.current === null) return;
      window.clearTimeout(scrollWriteTimer.current);
      scrollWriteTimer.current = null;
      persist();
    },
    [persist],
  );

  // Restore scroll only once the expanded folders have loaded enough rows for
  // the target offset to exist; otherwise the browser would clamp it.
  useEffect(() => {
    if (hasRestoredScroll.current) return;
    const container = treeScrollRef.current;
    if (container === null) return;
    const target = scrollTopRef.current;
    if (target <= 0) {
      hasRestoredScroll.current = true;
      return;
    }
    if (container.scrollHeight - container.clientHeight < target) return;
    container.scrollTop = target;
    hasRestoredScroll.current = true;
  }, [childrenByPath]);

  return { expanded, setExpanded, selectedPath, setSelectedPath, treeScrollRef, onTreeScroll };
}
