// bb-plugin-filetree — backend.
//
// Serves a lazy, single-level directory listing for the thread's environment
// directory, plus file reads for the preview pane. Every path the frontend
// sends round-trips through persistence, so it is treated as untrusted and
// re-confined beneath the environment root on every call.
import { defineRpcContract, type BbPluginApi } from "@bb/plugin-sdk";
import { readdir, realpath, stat } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { confine, extensionOf } from "./lib/paths";

const MAX_TEXT_BYTES = 512 * 1024;
const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "avif",
  "bmp",
  "ico",
]);

const entrySchema = z.object({
  kind: z.enum(["file", "directory"]),
  name: z.string(),
  path: z.string(),
});

/**
 * `bb.sdk.hosts.directory` — the only single-level listing BB exposes — drops
 * every dotfile and `node_modules` in the daemon, with no option to keep them.
 * So "show hidden files" is served by reading the directory on the server
 * itself, which is only the same filesystem when the environment lives on the
 * server's own host.
 *
 * Rather than assume that, the two listings are compared: the server's visible
 * entries must match the daemon's exactly. If a remote host is in play the sets
 * disagree, and hidden entries are reported as unavailable instead of showing a
 * different machine's files. `node_modules` stays hidden either way — BB's own
 * behavior, and not what "hidden files" means.
 */
export async function hiddenEntriesFor(
  directory: string,
  visibleFromHost: readonly string[],
): Promise<{ kind: "file" | "directory"; name: string; path: string }[] | null> {
  const resolved = await realpath(directory);
  const dirents = await readdir(resolved, { withFileTypes: true });
  const visibleLocally: string[] = [];
  const hidden: { kind: "file" | "directory"; name: string; path: string }[] = [];

  for (const dirent of dirents) {
    const isHidden = dirent.name.startsWith(".");
    if (!isHidden && dirent.name === "node_modules") continue;

    const path = join(resolved, dirent.name);
    let kind: "file" | "directory";
    if (dirent.isSymbolicLink()) {
      try {
        kind = (await stat(path)).isDirectory() ? "directory" : "file";
      } catch {
        continue; // Broken link; the daemon skips these too.
      }
    } else if (dirent.isDirectory()) {
      kind = "directory";
    } else if (dirent.isFile()) {
      kind = "file";
    } else {
      continue;
    }

    if (isHidden) hidden.push({ kind, name: dirent.name, path });
    else visibleLocally.push(dirent.name);
  }

  const hostNames = new Set(visibleFromHost);
  if (
    visibleLocally.length !== hostNames.size ||
    visibleLocally.some((name) => !hostNames.has(name))
  ) {
    return null;
  }
  return hidden;
}

const threadInput = z.object({ threadId: z.string().min(1) }).strict();
const pathInput = z
  .object({ threadId: z.string().min(1), path: z.string().min(1) })
  .strict();

export const rpcContract = defineRpcContract({
  root: {
    input: threadInput,
    output: z.object({
      rootPath: z.string().nullable(),
      hostName: z.string().nullable(),
      branchName: z.string().nullable(),
      error: z.string().nullable(),
    }),
  },
  list: {
    input: z
      .object({
        threadId: z.string().min(1),
        // Absolute path on the host; omitted means the environment root.
        path: z.string().optional(),
        includeHidden: z.boolean().optional(),
      })
      .strict(),
    output: z.object({
      directory: z.string(),
      entries: z.array(entrySchema),
      /** False when hidden entries were requested but could not be resolved. */
      hiddenAvailable: z.boolean(),
      error: z.string().nullable(),
    }),
  },
  read: {
    input: pathInput,
    output: z.object({
      kind: z.enum(["text", "image", "binary"]),
      text: z.string().nullable(),
      imageUrl: z.string().nullable(),
      sizeBytes: z.number().int(),
      truncated: z.boolean(),
      error: z.string().nullable(),
    }),
  },
  search: {
    input: z
      .object({
        threadId: z.string().min(1),
        query: z.string().min(1),
        includeHidden: z.boolean().optional(),
      })
      .strict(),
    output: z.object({
      files: z.array(z.object({ name: z.string(), path: z.string() })),
      truncated: z.boolean(),
      /** False when hidden matches were requested but could not be resolved. */
      hiddenAvailable: z.boolean(),
      error: z.string().nullable(),
    }),
  },
});

interface Root {
  hostId: string;
  rootPath: string;
}

/** Directories never descended into while looking for hidden matches. */
const SEARCH_PRUNED = new Set([".git", "node_modules"]);
const SEARCH_VISIT_BUDGET = 40_000;
/**
 * Rows reserved for hidden matches at the top of a search result. Kept small on
 * purpose: a broad query like "md" would otherwise spend the whole first screen
 * on dotted directories before showing an ordinary file.
 */
const HIDDEN_SEARCH_LIMIT = 20;

/**
 * BB's own recursive search skips every dotted path, so hidden matches are
 * collected here instead. Only entries whose relative path contains a dotted
 * segment are returned — the visible universe stays BB's job, ranked by its
 * matcher.
 */
async function hiddenMatches(
  rootPath: string,
  query: string,
  limit: number,
): Promise<{ files: { name: string; path: string }[]; truncated: boolean }> {
  const needle = query.toLowerCase();
  const files: { name: string; path: string }[] = [];
  const queue: { absolute: string; relative: string; isHiddenBranch: boolean }[] = [
    { absolute: rootPath, relative: "", isHiddenBranch: false },
  ];
  let visited = 0;
  let truncated = false;

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) break;

    let dirents;
    try {
      dirents = await readdir(current.absolute, { withFileTypes: true });
    } catch {
      continue; // Unreadable directory; skip it rather than fail the search.
    }

    for (const dirent of dirents) {
      if (++visited > SEARCH_VISIT_BUDGET) {
        truncated = true;
        return { files, truncated };
      }
      if (dirent.isSymbolicLink()) continue;

      const isHiddenName = dirent.name.startsWith(".");
      const relative =
        current.relative === "" ? dirent.name : `${current.relative}/${dirent.name}`;
      const absolute = join(current.absolute, dirent.name);
      const isHiddenBranch = current.isHiddenBranch || isHiddenName;

      if (dirent.isDirectory()) {
        if (SEARCH_PRUNED.has(dirent.name)) continue;
        queue.push({ absolute, relative, isHiddenBranch });
        continue;
      }
      if (!dirent.isFile() || !isHiddenBranch) continue;
      if (!relative.toLowerCase().includes(needle)) continue;

      files.push({ name: dirent.name, path: absolute });
      if (files.length >= limit) return { files, truncated: true };
    }
  }

  return { files, truncated };
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default async function plugin(bb: BbPluginApi) {
  // Preview URLs are per (host, root) and expire, so they are cached only for
  // as long as they are valid.
  const previewCache = new Map<string, { baseUrl: string; expiresAtMs: number }>();

  async function resolveRoot(threadId: string): Promise<Root> {
    const thread = await bb.sdk.threads.get({ threadId });
    if (thread.environmentId === null) {
      throw new Error("This thread has no environment.");
    }
    const environment = await bb.sdk.environments.get({
      environmentId: thread.environmentId,
    });
    if (environment.path === null) {
      throw new Error("This thread's environment has no directory yet.");
    }
    return { hostId: environment.hostId, rootPath: environment.path };
  }

  async function previewBaseUrl(root: Root): Promise<string> {
    const key = `${root.hostId}:${root.rootPath}`;
    const cached = previewCache.get(key);
    if (cached && cached.expiresAtMs - Date.now() > 30_000) return cached.baseUrl;
    const preview = await bb.sdk.files.createPreview({
      hostId: root.hostId,
      rootPath: root.rootPath,
    });
    previewCache.set(key, preview);
    return preview.baseUrl;
  }

  bb.rpc.register(rpcContract, {
    async root({ threadId }) {
      try {
        const thread = await bb.sdk.threads.get({ threadId });
        if (thread.environmentId === null) {
          return {
            rootPath: null,
            hostName: null,
            branchName: null,
            error: "This thread has no environment.",
          };
        }
        const environment = await bb.sdk.environments.get({
          environmentId: thread.environmentId,
        });
        const host = await bb.sdk.hosts.get({ hostId: environment.hostId });
        return {
          rootPath: environment.path,
          hostName: host.name,
          branchName: environment.branchName,
          error:
            environment.path === null
              ? "This thread's environment has no directory yet."
              : null,
        };
      } catch (error) {
        return {
          rootPath: null,
          hostName: null,
          branchName: null,
          error: messageOf(error),
        };
      }
    },

    async list({ threadId, path, includeHidden }) {
      try {
        const root = await resolveRoot(threadId);
        // `hosts.directory` has no symlink-safe confinement option of its own
        // (unlike `files.read` below, which also gets `rootPath`), so this
        // check is the only guard here.
        const directory = confine(root.rootPath, path ?? root.rootPath);
        const listing = await bb.sdk.hosts.directory({
          hostId: root.hostId,
          path: directory,
        });
        const entries = listing.entries.map((entry) => ({
          kind: entry.kind,
          name: entry.name,
          path: entry.path,
        }));

        let hiddenAvailable = true;
        if (includeHidden === true) {
          let hidden = null;
          try {
            hidden = await hiddenEntriesFor(
              listing.directory,
              entries.map((entry) => entry.name),
            );
          } catch (error) {
            bb.log.debug(`hidden entries unavailable: ${messageOf(error)}`);
          }
          if (hidden === null) hiddenAvailable = false;
          else entries.push(...hidden);
        }

        entries.sort((a, b) => {
          if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
        return {
          directory: listing.directory,
          entries,
          hiddenAvailable,
          error: null,
        };
      } catch (error) {
        return {
          directory: path ?? "",
          entries: [],
          hiddenAvailable: true,
          error: messageOf(error),
        };
      }
    },

    async read({ threadId, path }) {
      try {
        const root = await resolveRoot(threadId);
        const target = confine(root.rootPath, path);
        const extension = extensionOf(target);

        if (IMAGE_EXTENSIONS.has(extension)) {
          const baseUrl = await previewBaseUrl(root);
          const relative = target.slice(root.rootPath.length).replace(/^\//, "");
          const url = `${baseUrl.replace(/\/$/, "")}/${relative
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/")}`;
          return {
            kind: "image" as const,
            text: null,
            imageUrl: url,
            sizeBytes: 0,
            truncated: false,
            error: null,
          };
        }

        const file = await bb.sdk.files.read({
          hostId: root.hostId,
          path: target,
          rootPath: root.rootPath,
        });
        if (file.contentEncoding !== "utf8") {
          return {
            kind: "binary" as const,
            text: null,
            imageUrl: null,
            sizeBytes: file.sizeBytes,
            truncated: false,
            error: null,
          };
        }
        const truncated = file.content.length > MAX_TEXT_BYTES;
        return {
          kind: "text" as const,
          text: truncated ? file.content.slice(0, MAX_TEXT_BYTES) : file.content,
          imageUrl: null,
          sizeBytes: file.sizeBytes,
          truncated,
          error: null,
        };
      } catch (error) {
        return {
          kind: "text" as const,
          text: null,
          imageUrl: null,
          sizeBytes: 0,
          truncated: false,
          error: messageOf(error),
        };
      }
    },

    async search({ threadId, query, includeHidden }) {
      try {
        const root = await resolveRoot(threadId);
        const result = await bb.sdk.files.list({
          hostId: root.hostId,
          path: root.rootPath,
          query,
          limit: 200,
        });
        // The daemon may report either relative or absolute paths; the tree
        // works in absolute paths, so normalize here.
        const files = result.files.map((file) => ({
          name: file.name,
          path: file.path.startsWith("/")
            ? file.path
            : `${root.rootPath.replace(/\/$/, "")}/${file.path}`,
        }));
        let truncated = result.truncated;

        let hiddenAvailable = true;
        if (includeHidden === true) {
          // Same guard as `list`: only trust the server's filesystem once it
          // provably matches the host's own view of the root.
          const listing = await bb.sdk.hosts.directory({
            hostId: root.hostId,
            path: root.rootPath,
          });
          let verified = false;
          try {
            verified =
              (await hiddenEntriesFor(
                listing.directory,
                listing.entries.map((entry) => entry.name),
              )) !== null;
          } catch (error) {
            bb.log.debug(`hidden search unavailable: ${messageOf(error)}`);
          }

          if (!verified) hiddenAvailable = false;
          else {
            // BB's matcher is a loose subsequence match, so it happily fills all
            // 200 slots with near-misses. Hidden hits are exact substring
            // matches and were explicitly asked for, so they get their own
            // budget at the top of the list rather than being appended behind
            // 200 rows nobody scrolls to.
            const hidden = await hiddenMatches(
              listing.directory,
              query,
              HIDDEN_SEARCH_LIMIT,
            );
            const hiddenPaths = new Set(hidden.files.map((file) => file.path));
            const visible = files.filter((file) => !hiddenPaths.has(file.path));
            files.length = 0;
            files.push(
              ...hidden.files,
              ...visible.slice(0, Math.max(0, 200 - hidden.files.length)),
            );
            truncated =
              truncated || hidden.truncated || visible.length > 200 - hidden.files.length;
          }
        }

        return { files, truncated, hiddenAvailable, error: null };
      } catch (error) {
        return {
          files: [],
          truncated: false,
          hiddenAvailable: true,
          error: messageOf(error),
        };
      }
    },
  });

  bb.onDispose(() => {
    previewCache.clear();
  });
}
