import { describe, expect, it } from "vitest";
import { baseName, confine, extensionOf, normalizeAbsolute } from "./paths";

describe("baseName", () => {
  it("returns the final segment of a path", () => {
    expect(baseName("/a/b/c.txt")).toBe("c.txt");
  });

  it("returns the input when there is no separator", () => {
    expect(baseName("c.txt")).toBe("c.txt");
  });
});

describe("extensionOf", () => {
  it("returns the lowercase extension without the dot", () => {
    expect(extensionOf("/a/b/Photo.JPG")).toBe("jpg");
  });

  it("returns an empty string for a dotfile", () => {
    expect(extensionOf("/a/b/.gitignore")).toBe("");
  });

  it("returns an empty string for an extensionless name", () => {
    expect(extensionOf("/a/b/README")).toBe("");
  });
});

describe("normalizeAbsolute", () => {
  it("resolves .. segments", () => {
    expect(normalizeAbsolute("/a/b/../c")).toBe("/a/c");
  });

  it("collapses duplicate slashes", () => {
    expect(normalizeAbsolute("/a//b///c")).toBe("/a/b/c");
  });

  it("drops a trailing slash", () => {
    expect(normalizeAbsolute("/a/b/")).toBe("/a/b");
  });
});

describe("confine", () => {
  it("accepts a path inside the root", () => {
    expect(confine("/a/root", "/a/root/sub/file.txt")).toBe(
      "/a/root/sub/file.txt",
    );
  });

  it("accepts the root itself", () => {
    expect(confine("/a/root", "/a/root")).toBe("/a/root");
  });

  it("rejects .. traversal that escapes the root", () => {
    expect(() => confine("/a/root", "/a/root/../evil")).toThrow();
  });

  it("rejects a sibling directory whose name merely shares the root's prefix", () => {
    expect(() => confine("/a/root", "/a/root-evil/x")).toThrow();
  });

  it("accepts duplicate and trailing slashes in the candidate", () => {
    expect(confine("/a/root", "/a//root//sub/")).toBe("/a/root/sub");
  });

  it("accepts duplicate and trailing slashes in the root", () => {
    expect(confine("/a/root/", "/a/root/sub")).toBe("/a/root/sub");
  });
});
