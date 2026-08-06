import { extensionOf } from "@/lib/paths";

export interface Entry {
  kind: "file" | "directory";
  name: string;
  path: string;
}

export const MARKDOWN_EXTENSIONS = new Set(["md", "mdx", "markdown"]);

export function iconFor(entry: Entry, isExpanded: boolean) {
  if (entry.kind === "directory") return isExpanded ? "FolderOpen" : "Folder";
  return MARKDOWN_EXTENSIONS.has(extensionOf(entry.path)) ? "FileText" : "File";
}

/** What a row's own context menu can do. Bound once in the panel. */
export interface EntryActions {
  select(entry: Entry): void;
  toggle(entry: Entry): void;
  addToChat(entry: Entry): void;
  copyPath(entry: Entry): void;
  copyRelativePath(entry: Entry): void;
}
