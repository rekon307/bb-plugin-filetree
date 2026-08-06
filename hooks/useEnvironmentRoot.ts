import { useEffect, useState } from "react";
import { reloadTree, type Directory } from "@/hooks/useDirectory";
import { readThreadState } from "@/lib/thread-tree-state";
import type { Rpc } from "@/lib/rpc";

export interface EnvironmentRoot {
  rootPath: string | null;
  hostName: string | null;
  branchName: string | null;
  error: string | null;
}

/** Resolves the thread's environment root, then loads it plus any folders remembered as expanded. */
export function useEnvironmentRoot(
  rpc: Rpc,
  threadId: string,
  directory: Directory,
): EnvironmentRoot | null {
  const [root, setRoot] = useState<EnvironmentRoot | null>(null);

  useEffect(() => {
    let cancelled = false;
    void rpc.call("root", { threadId }).then((result) => {
      if (cancelled) return;
      setRoot(result);
      if (result.rootPath === null) return;
      // Re-read rather than close over `expanded`: this effect is keyed on the
      // thread, and the restored set is exactly what needs fetching.
      reloadTree(directory, result.rootPath, readThreadState(threadId)?.expanded ?? []);
    });
    return () => {
      cancelled = true;
    };
    // Root resolution depends only on the thread.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rpc, threadId]);

  return root;
}
