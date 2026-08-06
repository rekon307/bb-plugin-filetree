import { EntryRow } from "@/components/EntryRow";
import { TreeRow } from "@/components/TreeRow";
import type { Directory } from "@/hooks/useDirectory";
import type { Entry, EntryActions } from "@/lib/entry";

export function TreePane({
  treeScrollRef,
  onTreeScroll,
  isTreeVisible,
  treeWidth,
  rootError,
  matches,
  isRootLoading,
  showLoadingPlaceholder,
  rootEntries,
  selectedPath,
  expanded,
  directory,
  actions,
  subtitle,
}: {
  treeScrollRef: React.RefObject<HTMLDivElement | null>;
  onTreeScroll: (event: React.UIEvent<HTMLDivElement>) => void;
  isTreeVisible: boolean;
  treeWidth: number;
  rootError: string | null;
  matches: Entry[] | null;
  isRootLoading: boolean;
  showLoadingPlaceholder: boolean;
  rootEntries: Entry[];
  selectedPath: string | null;
  expanded: Set<string>;
  directory: Directory;
  actions: EntryActions;
  subtitle: string;
}) {
  return (
    <div
      ref={treeScrollRef}
      onScroll={onTreeScroll}
      hidden={!isTreeVisible}
      style={{ width: `${treeWidth}px` }}
      className="min-h-0 shrink-0 overflow-auto py-1"
    >
      {rootError !== null ? (
        <p className="px-2 py-2 text-[13px] text-destructive">{rootError}</p>
      ) : matches !== null ? (
        matches.length === 0 ? (
          <p className="px-2 py-2 text-[13px] text-muted-foreground">
            No files match.
          </p>
        ) : (
          matches.map((entry) => (
            <EntryRow
              key={entry.path}
              entry={entry}
              depth={0}
              isSelected={selectedPath === entry.path}
              isExpanded={false}
              isLoading={false}
              actions={actions}
            />
          ))
        )
      ) : isRootLoading ? (
        showLoadingPlaceholder ? (
          <p className="px-2 py-2 text-[13px] text-muted-foreground">
            Loading…
          </p>
        ) : null
      ) : rootEntries.length === 0 ? (
        <p className="px-2 py-2 text-[13px] text-muted-foreground">
          This directory is empty.
        </p>
      ) : (
        rootEntries.map((entry) => (
          <TreeRow
            key={entry.path}
            entry={entry}
            depth={0}
            selectedPath={selectedPath}
            expanded={expanded}
            directory={directory}
            actions={actions}
          />
        ))
      )}
      {subtitle !== "" ? (
        <p className="px-2 pb-1 pt-2 text-[11px] text-muted-foreground">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}
