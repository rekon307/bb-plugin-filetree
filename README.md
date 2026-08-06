# bb-plugin-filetree

A browsable file tree for the side panel of a bb thread.

The right panel of [bb](https://github.com/get-bb/bb) has an Info tab, a Diff
tab, file tabs, and a fuzzy file search. It has no tree. You can open a file
when you know its name. You cannot look through the directory. This plugin adds
the tree, with a preview pane next to it.

To open the tree, click **New tab**, then **Actions**, then **Files**.

## Functions

- **Lazy tree.** The plugin reads one directory level each time you open a
  folder. A large repository costs nothing until you open it.
- **Preview pane.** The pane shows Markdown with the renderer of bb, and other
  text as monospace to a limit of 512 KB. It shows an image through a temporary
  URL that is confined to the environment directory. For a binary file, the
  pane shows a message.
- **Filter box.** The box searches the full tree.
- **Divider.** Drag the divider to change the width of the tree. Double-click
  the divider to reset the width. When the divider has focus, the arrow keys
  move it.
- **Hide button.** Click the button in the toolbar to hide the tree and show
  only the document.
- **Context menu.** Right-click a row to open a file, to expand a folder, to
  add the path to the chat, or to copy the relative or absolute path.
- **Memory for each thread.** The plugin stores the open folders, the selected
  file, and the scroll position. It keeps the last 25 threads.
- **Hidden files.** The `…` menu has an option to show hidden files. Read the
  next section for its limit.

The plugin reads files with `bb.sdk.files` and `bb.sdk.hosts`, and always sends
the `hostId` of the environment. The plugin is therefore correct when the
environment is on a different machine. There is one exception.

## The limit on hidden files

The daemon of bb removes all dotfiles from both list operations,
`hosts.directory` and `files.list`. It has no option to keep them. The host
cannot supply hidden files.

If you enable **Show hidden files**, the plugin reads the directory with
`node:fs` on the machine that runs the bb server. The plugin then compares its
own list of visible entries with the list from the host. If the two lists are
equal, the plugin adds the hidden entries. If the two lists are different, the
environment is on a different machine. The plugin then adds no entries, and the
menu shows that the option is not available.

Three results follow from this design:

- Hidden files are available only for an environment on the machine that runs
  the bb server.
- `node_modules` stays hidden. This is the behavior of bb, and `node_modules`
  is not a hidden file.
- The filter box uses its own directory walk for hidden matches. This walk does
  not go into `.git` or `node_modules`. You can open `.git/config` in the tree,
  but the filter does not find it.

## Install

CAUTION: Read the source code before you install this plugin. A bb plugin runs
with full trust inside the bb server and can read all local bb data.

The branch `release` holds the built plugin. Install it with one command:

```sh
bb plugin install git:https://github.com/rekon307/bb-plugin-filetree.git@release --yes
```

To install from source, clone the repository and build it. The branch `main`
does not include `dist/`.

```sh
git clone https://github.com/rekon307/bb-plugin-filetree.git
cd bb-plugin-filetree
npm install
bb plugin install .
```

## Development

```sh
npm run typecheck   # tsc --noEmit
npm test            # vitest: path confinement and the hidden-file walk
bb plugin dev       # watch, build, reload
```

`bb plugin dev` reloads the backend and builds the frontend again after each
save. An open **Files** tab keeps the old bundle. Close the tab and open it
again.

`app.tsx` contains only the `definePluginApp` registration. The code is in
`lib/`, `hooks/`, and `components/`. The directory `components/ui/` holds
vendored shadcn source from the component registry of bb. You can edit these
files, and they never change without your action.

`lib/paths.ts` is common to the backend and the frontend. Its function
`confine()` is a security boundary, because paths come from the frontend and
pass through stored panel state. Tests cover this function.

The files `types/bb-plugin-sdk*.d.ts` are the API declarations that
`bb plugin new` writes. They are in the repository so that `tsc` operates
without a checkout of bb.

## Compatibility

This plugin needs bb `>= 0.35` and plugin SDK `^0.4.1`. It was built and tested
with bb 0.35.1 on macOS.

## License

MIT
