import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Icon } from "@/components/ui/icon";
import { iconFor, type Entry, type EntryActions } from "@/lib/entry";
import { cn } from "@/lib/utils";

/**
 * A row plus its context menu. Without a menu here, right-clicking would fall
 * through to the desktop app's native Copy / Select All menu (bb registers one
 * on the application window), so the trigger's preventDefault is what keeps the
 * native menu away — the same thing BB's own tree rows do. Rows are
 * `select-none` so right-clicking stops selecting the label text.
 */
export function EntryRow({
  entry,
  depth,
  isSelected,
  isExpanded,
  isLoading,
  actions,
}: {
  entry: Entry;
  depth: number;
  isSelected: boolean;
  isExpanded: boolean;
  isLoading: boolean;
  actions: EntryActions;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <button
          type="button"
          title={entry.path}
          onClick={() =>
            entry.kind === "directory" ? actions.toggle(entry) : actions.select(entry)
          }
          onContextMenu={() => {
            // Right-click targets a row, so make that row the selection too.
            if (entry.kind === "file") actions.select(entry);
          }}
          className={cn(
            "flex w-full select-none items-center gap-1.5 rounded-sm py-1 pr-2 text-left text-[13px] leading-tight",
            "hover:bg-muted/60",
            isSelected && "bg-muted text-foreground",
            !isSelected && "text-muted-foreground",
          )}
          style={{ paddingLeft: `${6 + depth * 12}px` }}
        >
          {entry.kind === "directory" ? (
            <Icon
              name={isExpanded ? "ChevronDown" : "ChevronRight"}
              className="size-3.5 shrink-0 opacity-70"
              aria-hidden
            />
          ) : (
            <span className="size-3.5 shrink-0" aria-hidden />
          )}
          <Icon
            name={iconFor(entry, isExpanded)}
            className="size-3.5 shrink-0 opacity-70"
            aria-hidden
          />
          <span className="truncate">{entry.name}</span>
          {isLoading ? (
            <Icon
              name="Spinner"
              className="size-3 shrink-0 animate-spin opacity-60"
              aria-hidden
            />
          ) : null}
        </button>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {entry.kind === "directory" ? (
          <ContextMenuItem onSelect={() => actions.toggle(entry)}>
            {isExpanded ? "Collapse" : "Expand"}
          </ContextMenuItem>
        ) : (
          <ContextMenuItem onSelect={() => actions.select(entry)}>
            Open in preview
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => actions.addToChat(entry)}>
          Add to chat
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.copyRelativePath(entry)}>
          Copy relative path
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.copyPath(entry)}>
          Copy absolute path
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
