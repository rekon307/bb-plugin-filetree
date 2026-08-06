import { useEffect, useRef } from "react";
import { reloadTree, type Directory } from "@/hooks/useDirectory";

// Toggling hidden files changes every listing, so drop the cache and reload
// the root plus whatever was expanded. The ref keeps this from firing on the
// identity churn of `directory`.
export function useHiddenFilesReload(
  directory: Directory,
  rootPath: string | null | undefined,
  expanded: Set<string>,
  showHidden: boolean,
) {
  const previousShowHidden = useRef(showHidden);
  useEffect(() => {
    if (previousShowHidden.current === showHidden) return;
    previousShowHidden.current = showHidden;
    if (rootPath === null || rootPath === undefined) return;
    directory.reset();
    reloadTree(directory, rootPath, expanded, true);
  }, [directory, expanded, rootPath, showHidden]);
}
