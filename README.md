# bb-plugin-filetree

A browsable file tree for the [bb](https://github.com/ymichael/bb) thread side
panel.

bb's right panel ships an Info tab, a Diff tab, open file tabs, and a fuzzy
"Search files" quick-open — but no tree. You can jump to a file whose name you
already know; you cannot look around. This plugin adds the tree, with a preview
pane next to it.

Open it from a thread's right panel: **New tab → Actions → Files**.

## What it does

- **Lazy tree** of the thread environment's directory, read one level per
  expand, so a large repo costs nothing until you open a folder.
- **Preview pane** — Markdown through bb's own renderer, other text as
  monospace (capped at 512 KB), images through a confined, expiring preview
  URL. Binary files say so instead of dumping bytes.
- **Filter box** that searches the whole tree.
- **Resizable divider** (double-click resets, arrow keys nudge it when focused)
  and a button that hides the tree for a document-only view.
- **Context menu** on each row: open in preview, expand/collapse, add the path
  to the chat composer, copy the relative or absolute path.
- **Per-thread memory** — expanded folders, selection, and scroll position come
  back when you return to a thread. The last 25 threads are remembered.
- **Optional hidden files**, in the `…` menu. See the caveat below.

Multi-host safe: every read goes through `bb.sdk.files` / `bb.sdk.hosts` with
the environment's `hostId`, never `node:fs` — with one deliberate exception.

## The hidden-files caveat

bb's daemon filters dotfiles out of both listing primitives
(`hosts.directory` and the recursive `files.list`) with no option to keep them,
so there is no host-routed way to ask for them.

When you enable **Show hidden files**, the plugin reads the directory on the
machine running the bb server with `node:fs`, and merges the dotted entries in
**only after** the server's visible entries provably match the entries the host
reported for that same directory. If the environment lives on a remote machine
the two sets disagree, nothing is merged, and the menu says the option is
unavailable — rather than showing you a different machine's files.

Consequences worth knowing:

- Hidden files work for environments on the bb server's own machine.
- `node_modules` stays hidden either way; that is bb's behavior, and it is not
  what "hidden files" means.
- The filter box uses its own walker for hidden matches, which does not descend
  into `.git` or `node_modules`. `.git/config` is reachable in the tree but not
  through the filter.

## Install

`dist/` is not committed, so build it once after cloning:

```sh
git clone https://github.com/rekon307/bb-plugin-filetree.git
cd bb-plugin-filetree
npm install
bb plugin install .
```

Plugins are full-trust code running inside the bb server. Read the source
before installing this or any other one.

## Development

```sh
npm run typecheck   # tsc --noEmit
npm test            # vitest: path confinement + the hidden-file walker
bb plugin dev       # watch, rebuild, reload
```

`bb plugin dev` reloads the backend and rebuilds the frontend on save, but an
already-open **Files** tab keeps the previous bundle — close and reopen it.

Layout: `app.tsx` is only the `definePluginApp` registration. Code lives in
`lib/`, `hooks/`, and `components/`. `components/ui/` is vendored shadcn source
from bb's component registry — edit it freely, it never updates underneath you.
`lib/paths.ts` is shared by the backend and the frontend bundle; its
`confine()` is a security boundary (paths arrive from the frontend and
round-trip through persisted panel state) and is covered by tests.

`types/bb-plugin-sdk*.d.ts` are the bb plugin API declarations emitted by
`bb plugin new`. They are vendored so `tsc` works without a bb checkout.

## Compatibility

bb `>= 0.35`, plugin SDK `^0.4.1`. Built and tested against bb 0.35.1 on macOS.

## License

MIT
