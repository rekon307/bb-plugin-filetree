import { useEffect, useState } from "react";
import type { Entry } from "@/lib/entry";
import type { Rpc } from "@/lib/rpc";

export function useFileSearch(rpc: Rpc, threadId: string, showHidden: boolean) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Entry[] | null>(null);
  const trimmedQuery = query.trim();

  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setMatches(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void rpc
        .call("search", {
          threadId,
          query: trimmedQuery,
          includeHidden: showHidden,
        })
        .then((result) => {
          if (cancelled) return;
          if (result.error !== null) {
            setMatches([]);
            return;
          }
          setMatches(
            result.files.map((file) => ({
              kind: "file" as const,
              name: file.name,
              path: file.path,
            })),
          );
        });
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [rpc, showHidden, threadId, trimmedQuery]);

  return { query, setQuery, matches };
}
