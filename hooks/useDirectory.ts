import { useCallback, useMemo, useRef, useState } from "react";
import type { Entry } from "@/lib/entry";
import type { Rpc } from "@/lib/rpc";

/** One directory's children, loaded on first expand and cached per tab. */
export function useDirectory(rpc: Rpc, threadId: string, includeHidden: boolean) {
  const [children, setChildren] = useState<Record<string, Entry[]>>({});
  // Mirrors `children` so `load` can check the cache without depending on it —
  // otherwise `load`'s identity would change after every listing.
  const childrenRef = useRef(children);
  childrenRef.current = children;
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isHiddenAvailable, setIsHiddenAvailable] = useState(true);

  const load = useCallback(
    async (path: string, force = false) => {
      if (!force && childrenRef.current[path] !== undefined) return;
      setLoading((current) => ({ ...current, [path]: true }));
      try {
        const result = await rpc.call("list", { threadId, path, includeHidden });
        if (includeHidden) setIsHiddenAvailable(result.hiddenAvailable);
        const { error } = result;
        if (error !== null) {
          setErrors((current) => ({ ...current, [path]: error }));
          setChildren((current) => ({ ...current, [path]: [] }));
          return;
        }
        setErrors((current) => {
          const next = { ...current };
          delete next[path];
          return next;
        });
        setChildren((current) => ({ ...current, [path]: result.entries }));
      } finally {
        setLoading((current) => ({ ...current, [path]: false }));
      }
    },
    [includeHidden, rpc, threadId],
  );

  const reset = useCallback(() => {
    setChildren({});
    setErrors({});
  }, []);

  return useMemo(
    () => ({ children, loading, errors, isHiddenAvailable, load, reset }),
    [children, loading, errors, isHiddenAvailable, load, reset],
  );
}

export type Directory = ReturnType<typeof useDirectory>;

/** Load `rootPath` plus every already-expanded folder in one place. */
export function reloadTree(
  directory: Directory,
  rootPath: string,
  expandedPaths: Iterable<string>,
  force = false,
) {
  void directory.load(rootPath, force);
  for (const path of expandedPaths) void directory.load(path, force);
}
