import { useCallback, useState } from "react";
import { MAX_TREE_WIDTH, MIN_PREVIEW_WIDTH, MIN_TREE_WIDTH } from "@/lib/layout";
import { cn } from "@/lib/utils";

/**
 * Drag handle between the preview and the tree. The tree sits on the right, so
 * its width is measured from the container's right edge.
 */
export function Splitter({
  width,
  containerRef,
  onResize,
  onReset,
}: {
  width: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onResize: (next: number) => void;
  onReset: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);

  const clamp = useCallback(
    (next: number) => {
      const container = containerRef.current;
      const available =
        container === null
          ? MAX_TREE_WIDTH
          : Math.max(MIN_TREE_WIDTH, container.clientWidth - MIN_PREVIEW_WIDTH);
      return Math.round(
        Math.min(Math.min(MAX_TREE_WIDTH, available), Math.max(MIN_TREE_WIDTH, next)),
      );
    },
    [containerRef],
  );

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the file list"
      aria-valuenow={width}
      aria-valuemin={MIN_TREE_WIDTH}
      aria-valuemax={MAX_TREE_WIDTH}
      tabIndex={0}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsDragging(true);
      }}
      onPointerMove={(event) => {
        if (!isDragging) return;
        const container = containerRef.current;
        if (container === null) return;
        onResize(clamp(container.getBoundingClientRect().right - event.clientX));
      }}
      onPointerUp={(event) => {
        event.currentTarget.releasePointerCapture(event.pointerId);
        setIsDragging(false);
      }}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          onResize(clamp(width + 16));
        } else if (event.key === "ArrowRight") {
          event.preventDefault();
          onResize(clamp(width - 16));
        }
      }}
      className={cn(
        "w-1 shrink-0 cursor-col-resize border-l border-border transition-colors",
        "hover:bg-primary/40 focus-visible:bg-primary/40 focus-visible:outline-none",
        isDragging && "bg-primary/60",
      )}
    />
  );
}
