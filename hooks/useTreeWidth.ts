import { useCallback, useEffect, useRef } from "react";
import { usePersistedState } from "@/hooks/usePersistedState";
import { DEFAULT_TREE_WIDTH, MIN_PREVIEW_WIDTH, MIN_TREE_WIDTH } from "@/lib/layout";
import { isBoolean, isNumber } from "@/lib/validators";

export function useTreeWidth() {
  const [treeWidth, setTreeWidth] = usePersistedState(
    "tree-width",
    DEFAULT_TREE_WIDTH,
    isNumber,
  );
  const [isTreeVisible, setIsTreeVisible] = usePersistedState(
    "tree-visible",
    true,
    isBoolean,
  );
  const splitRef = useRef<HTMLDivElement | null>(null);

  // The host panel itself is resizable, so a tree that was dragged wide must
  // give width back rather than squeezing the preview out of existence.
  useEffect(() => {
    const container = splitRef.current;
    if (container === null || !isTreeVisible) return;
    const observer = new ResizeObserver(() => {
      const available = Math.max(
        MIN_TREE_WIDTH,
        container.clientWidth - MIN_PREVIEW_WIDTH,
      );
      if (treeWidth > available) setTreeWidth(Math.round(available));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [isTreeVisible, setTreeWidth, treeWidth]);

  const resetTreeWidth = useCallback(() => setTreeWidth(DEFAULT_TREE_WIDTH), [setTreeWidth]);

  return { treeWidth, setTreeWidth, resetTreeWidth, isTreeVisible, setIsTreeVisible, splitRef };
}
