import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PanelToolbar({
  isTreeVisible,
  onToggleTreeVisible,
  query,
  onQueryChange,
  onReload,
  showHidden,
  onShowHiddenChange,
  isHiddenAvailable,
}: {
  isTreeVisible: boolean;
  onToggleTreeVisible: () => void;
  query: string;
  onQueryChange: (value: string) => void;
  onReload: () => void;
  showHidden: boolean;
  onShowHiddenChange: (checked: boolean) => void;
  isHiddenAvailable: boolean;
}) {
  return (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border px-2">
      {isTreeVisible ? (
        <>
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Filter files…"
            className="h-6 flex-1 text-[12px]"
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[12px]"
            aria-label="Reload the tree"
            onClick={onReload}
          >
            <Icon name="RotateCcw" className="size-3.5" aria-hidden />
          </Button>
        </>
      ) : (
        <span className="flex-1" />
      )}
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-2 text-[12px]"
        aria-pressed={isTreeVisible}
        aria-label={isTreeVisible ? "Hide the file list" : "Show the file list"}
        onClick={onToggleTreeVisible}
      >
        <Icon
          name="PanelRight"
          className={cn("size-3.5", !isTreeVisible && "opacity-50")}
          aria-hidden
        />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[12px]"
            aria-label="File list options"
          >
            <Icon name="MoreHorizontal" className="size-3.5" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuCheckboxItem
            checked={showHidden}
            onCheckedChange={(checked) => onShowHiddenChange(checked === true)}
          >
            Show hidden files
          </DropdownMenuCheckboxItem>
          {showHidden && !isHiddenAvailable ? (
            <p className="px-2 pb-1.5 pt-1 text-[11px] text-muted-foreground">
              Unavailable: this environment is not on the machine running the
              BB server.
            </p>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
