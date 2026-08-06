/**
 * Path helpers shared by the backend and the frontend bundle.
 *
 * Pure and dependency-free on purpose: the backend confines every path the
 * frontend sends, and that check is worth testing without a BB server.
 */

/** The final segment of a path, or the path itself when it has no separator. */
export function baseName(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1) || path;
}

/** Lowercase extension without the dot; "" for dotfiles and extensionless names. */
export function extensionOf(path: string): string {
  const name = baseName(path);
  const dot = name.lastIndexOf(".");
  return dot <= 0 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Resolve `.` and `..` segments and drop duplicate/trailing slashes. */
export function normalizeAbsolute(input: string): string {
  const segments: string[] = [];
  for (const segment of input.split("/")) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return `/${segments.join("/")}`;
}

/**
 * Reject anything outside `root`, returning the normalized path when it is
 * inside. Paths reaching the backend round-trip through the frontend and its
 * persisted panel state, so they are untrusted input.
 */
export function confine(root: string, candidate: string): string {
  const normalizedRoot = normalizeAbsolute(root);
  const normalized = normalizeAbsolute(candidate);
  if (
    normalized !== normalizedRoot &&
    !normalized.startsWith(`${normalizedRoot}/`)
  ) {
    throw new Error("Path is outside the thread's environment directory.");
  }
  return normalized;
}
