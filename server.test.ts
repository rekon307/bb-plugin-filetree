import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hiddenEntriesFor } from "./server";

let dir: string | null = null;

afterEach(async () => {
  if (dir !== null) {
    await rm(dir, { recursive: true, force: true });
    dir = null;
  }
});

async function makeTempDir(): Promise<string> {
  dir = await mkdtemp(join(tmpdir(), "bb-plugin-filetree-"));
  return dir;
}

describe("hiddenEntriesFor", () => {
  it("returns hidden entries with correct kind when the visible sets match", async () => {
    const root = await makeTempDir();
    await writeFile(join(root, "visible.txt"), "content");
    await mkdir(join(root, "visible-dir"));
    await writeFile(join(root, ".hidden-file"), "secret");
    await mkdir(join(root, ".hidden-dir"));

    const result = await hiddenEntriesFor(root, ["visible.txt", "visible-dir"]);

    expect(result).not.toBeNull();
    const byName = new Map(result!.map((entry) => [entry.name, entry]));
    expect(byName.get(".hidden-file")?.kind).toBe("file");
    expect(byName.get(".hidden-dir")?.kind).toBe("directory");
    expect(byName.size).toBe(2);
  });

  it("returns null when the host is missing an entry the server sees", async () => {
    const root = await makeTempDir();
    await writeFile(join(root, "visible.txt"), "content");
    await writeFile(join(root, ".hidden-file"), "secret");

    const result = await hiddenEntriesFor(root, []);

    expect(result).toBeNull();
  });

  it("returns null when the host reports an entry the server does not see", async () => {
    const root = await makeTempDir();
    await writeFile(join(root, "visible.txt"), "content");

    const result = await hiddenEntriesFor(root, ["visible.txt", "phantom.txt"]);

    expect(result).toBeNull();
  });

  it("excludes node_modules from the hidden result and from the comparison", async () => {
    const root = await makeTempDir();
    await writeFile(join(root, "visible.txt"), "content");
    await mkdir(join(root, "node_modules"));
    await writeFile(join(root, "node_modules", "pkg.js"), "");

    const result = await hiddenEntriesFor(root, ["visible.txt"]);

    expect(result).toEqual([]);
  });

  it("reports a symlink to a directory as kind directory", async () => {
    const root = await makeTempDir();
    await writeFile(join(root, "visible.txt"), "content");
    const targetDir = join(root, "target-dir");
    await mkdir(targetDir);
    await symlink(targetDir, join(root, ".link-to-dir"));

    const result = await hiddenEntriesFor(root, ["visible.txt", "target-dir"]);

    expect(result).not.toBeNull();
    const link = result!.find((entry) => entry.name === ".link-to-dir");
    expect(link?.kind).toBe("directory");
  });

  it("skips a broken symlink rather than throwing", async () => {
    const root = await makeTempDir();
    await writeFile(join(root, "visible.txt"), "content");
    await symlink(join(root, "does-not-exist"), join(root, ".broken-link"));

    const result = await hiddenEntriesFor(root, ["visible.txt"]);

    expect(result).toEqual([]);
  });
});
