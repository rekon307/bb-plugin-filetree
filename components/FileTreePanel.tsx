import { useCallback, useMemo } from "react";
import { useComposer, useRpc } from "@bb/plugin-sdk/app";
import { toast } from "sonner";
import { PanelToolbar } from "@/components/PanelToolbar";
import { Preview } from "@/components/Preview";
import { Splitter } from "@/components/Splitter";
import { TreePane } from "@/components/TreePane";
import { useDelayedTrue } from "@/hooks/useDelayedTrue";
import { useDirectory } from "@/hooks/useDirectory";
import { useEnvironmentRoot } from "@/hooks/useEnvironmentRoot";
import { useFileSearch } from "@/hooks/useFileSearch";
import { useHiddenFilesReload } from "@/hooks/useHiddenFilesReload";
import { usePersistedState } from "@/hooks/usePersistedState";
import { useThreadTreeState } from "@/hooks/useThreadTreeState";
import { useTreeWidth } from "@/hooks/useTreeWidth";
import { copyToClipboard } from "@/lib/clipboard";
import type { Entry, EntryActions } from "@/lib/entry";
import { isBoolean } from "@/lib/validators";
import type { rpcContract } from "@/server";

export function FileTreePanel({ threadId }: { threadId: string }) {
  const rpc = useRpc<typeof rpcContract>();
  const composer = useComposer();
  const [showHidden, setShowHidden] = usePersistedState(
    "show-hidden",
    false,
    isBoolean,
  );
  const directory = useDirectory(rpc, threadId, showHidden);
  const root = useEnvironmentRoot(rpc, threadId, directory);
  const { expanded, setExpanded, selectedPath, setSelectedPath, treeScrollRef, onTreeScroll } =
    useThreadTreeState(threadId, directory.children);
  useHiddenFilesReload(directory, root?.rootPath, expanded, showHidden);
  const { query, setQuery, matches } = useFileSearch(rpc, threadId, showHidden);
  const { treeWidth, setTreeWidth, resetTreeWidth, isTreeVisible, setIsTreeVisible, splitRef } =
    useTreeWidth();

  const onToggle = useCallback(
    (entry: Entry) => {
      setExpanded((current) => {
        const next = new Set(current);
        if (next.has(entry.path)) next.delete(entry.path);
        else {
          next.add(entry.path);
          void directory.load(entry.path);
        }
        return next;
      });
    },
    [directory, setExpanded],
  );

  const rootPath = root?.rootPath ?? null;
  const relativeOf = useCallback(
    (path: string) =>
      rootPath !== null && path.startsWith(rootPath)
        ? path.slice(rootPath.length).replace(/^\//, "")
        : path,
    [rootPath],
  );

  const actions = useMemo<EntryActions>(
    () => ({
      select: (entry) => setSelectedPath(entry.path),
      toggle: onToggle,
      addToChat: (entry) => {
        const relative = relativeOf(entry.path);
        composer.updateText((current) =>
          current.trim() === "" ? relative : `${current} ${relative}`,
        );
        toast.success("Path added to the composer");
      },
      copyPath: (entry) => void copyToClipboard(entry.path),
      copyRelativePath: (entry) => void copyToClipboard(relativeOf(entry.path)),
    }),
    [composer, onToggle, relativeOf, setSelectedPath],
  );

  // `undefined` means the listing has not arrived yet; `[]` means the directory
  // really is empty. Collapsing the two is what made "This directory is empty"
  // flash before the rows appeared.
  const rootChildren =
    rootPath === null ? undefined : directory.children[rootPath];
  const rootEntries = useMemo(() => rootChildren ?? [], [rootChildren]);
  const isRootLoading = root === null || rootChildren === undefined;
  const showLoadingPlaceholder = useDelayedTrue(isRootLoading, 300);

  const subtitle =
    root === null
      ? ""
      : [root.hostName, root.branchName].filter(Boolean).join(" · ");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PanelToolbar
        isTreeVisible={isTreeVisible}
        onToggleTreeVisible={() => setIsTreeVisible(!isTreeVisible)}
        query={query}
        onQueryChange={setQuery}
        onReload={() => {
          const path = root?.rootPath;
          if (path === null || path === undefined) return;
          directory.reset();
          setExpanded(new Set());
          void directory.load(path, true);
        }}
        showHidden={showHidden}
        onShowHiddenChange={setShowHidden}
        isHiddenAvailable={directory.isHiddenAvailable}
      />

      <div ref={splitRef} className="flex min-h-0 flex-1">
        <div className="min-h-0 min-w-0 flex-1">
          <Preview
            rpc={rpc}
            threadId={threadId}
            path={selectedPath}
            rootPath={root?.rootPath ?? null}
          />
        </div>

        {isTreeVisible ? (
          <Splitter
            width={treeWidth}
            containerRef={splitRef}
            onResize={setTreeWidth}
            onReset={resetTreeWidth}
          />
        ) : null}

        <TreePane
          treeScrollRef={treeScrollRef}
          onTreeScroll={onTreeScroll}
          isTreeVisible={isTreeVisible}
          treeWidth={treeWidth}
          rootError={root?.error ?? null}
          matches={matches}
          isRootLoading={isRootLoading}
          showLoadingPlaceholder={showLoadingPlaceholder}
          rootEntries={rootEntries}
          selectedPath={selectedPath}
          expanded={expanded}
          directory={directory}
          actions={actions}
          subtitle={subtitle}
        />
      </div>
    </div>
  );
}
