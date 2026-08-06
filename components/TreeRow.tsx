import { EntryRow } from "@/components/EntryRow";
import type { Directory } from "@/hooks/useDirectory";
import type { Entry, EntryActions } from "@/lib/entry";

interface RowProps {
  entry: Entry;
  depth: number;
  selectedPath: string | null;
  expanded: Set<string>;
  directory: Directory;
  actions: EntryActions;
}

export function TreeRow({
  entry,
  depth,
  selectedPath,
  expanded,
  directory,
  actions,
}: RowProps) {
  const isExpanded = expanded.has(entry.path);
  const childEntries = directory.children[entry.path];
  const error = directory.errors[entry.path];

  return (
    <>
      <EntryRow
        entry={entry}
        depth={depth}
        isSelected={selectedPath === entry.path}
        isExpanded={isExpanded}
        isLoading={directory.loading[entry.path] === true}
        actions={actions}
      />

      {isExpanded && error !== undefined ? (
        <p
          className="py-1 pr-2 text-[12px] text-destructive"
          style={{ paddingLeft: `${24 + depth * 12}px` }}
        >
          {error}
        </p>
      ) : null}

      {isExpanded && childEntries !== undefined
        ? childEntries.map((child) => (
            <TreeRow
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              expanded={expanded}
              directory={directory}
              actions={actions}
            />
          ))
        : null}
    </>
  );
}
