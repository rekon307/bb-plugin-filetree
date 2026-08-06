import { useEffect, useState } from "react";
import { Markdown, useComposer } from "@bb/plugin-sdk/app";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useDelayedTrue } from "@/hooks/useDelayedTrue";
import { copyToClipboard } from "@/lib/clipboard";
import { MARKDOWN_EXTENSIONS } from "@/lib/entry";
import { extensionOf } from "@/lib/paths";
import type { Rpc } from "@/lib/rpc";

export function Preview({
  rpc,
  threadId,
  path,
  rootPath,
}: {
  rpc: Rpc;
  threadId: string;
  path: string | null;
  rootPath: string | null;
}) {
  const composer = useComposer();
  const [state, setState] = useState<{
    kind: "text" | "image" | "binary";
    text: string | null;
    imageUrl: string | null;
    truncated: boolean;
    error: string | null;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // Same rule as the tree: a read that returns in milliseconds should not blink
  // a placeholder over the previous file.
  const showLoadingPlaceholder = useDelayedTrue(isLoading, 300);

  useEffect(() => {
    if (path === null) {
      setState(null);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    void rpc
      .call("read", { threadId, path })
      .then((result) => {
        if (cancelled) return;
        setState(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [path, rpc, threadId]);

  if (path === null) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-[13px] text-muted-foreground">
        Select a file to preview it.
      </div>
    );
  }

  const relative =
    rootPath !== null && path.startsWith(rootPath)
      ? path.slice(rootPath.length).replace(/^\//, "")
      : path;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
        <span className="truncate text-[12px] text-muted-foreground" title={path}>
          {relative}
        </span>
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[12px]"
            onClick={() => {
              composer.updateText((current) =>
                current.trim() === "" ? relative : `${current} ${relative}`,
              );
              toast.success("Path added to the composer");
            }}
          >
            Add to chat
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[12px]"
            onClick={() => void copyToClipboard(path)}
          >
            Copy path
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-3">
        {isLoading ? (
          showLoadingPlaceholder ? (
            <p className="text-[13px] text-muted-foreground">Loading…</p>
          ) : null
        ) : state === null ? null : state.error !== null ? (
          <p className="text-[13px] text-destructive">{state.error}</p>
        ) : state.kind === "image" && state.imageUrl !== null ? (
          <img
            src={state.imageUrl}
            alt={relative}
            className="max-h-full max-w-full rounded-md"
          />
        ) : state.kind === "binary" ? (
          <p className="text-[13px] text-muted-foreground">
            Binary file — no text preview.
          </p>
        ) : MARKDOWN_EXTENSIONS.has(extensionOf(path)) ? (
          <Markdown content={state.text ?? ""} />
        ) : (
          <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground">
            {state.text ?? ""}
          </pre>
        )}
        {state?.truncated === true ? (
          <p className="mt-3 text-[12px] text-muted-foreground">
            Preview truncated at 512KB.
          </p>
        ) : null}
      </div>
    </div>
  );
}
