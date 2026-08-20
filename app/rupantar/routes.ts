export type AppRoute =
  | { kind: "home" }
  | { kind: "about" }
  | { kind: "works"; category: string }
  | { kind: "work-detail"; category: string; slug: string }
  | { kind: "admin" };

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function parseRoute(pathname: string): AppRoute {
  const segments = pathname
    .split("/")
    .filter(Boolean)
    .map(decodeSegment);

  if (segments.length === 0) return { kind: "home" };
  if (segments.length === 1 && segments[0] === "about") return { kind: "about" };
  if (segments.length === 1 && segments[0] === "admin") return { kind: "admin" };
  if (segments[0] === "works") {
    if (segments.length === 1) return { kind: "works", category: "all" };
    if (segments.length === 2 && segments[1]) return { kind: "works", category: segments[1] };
    if (segments.length === 3 && segments[1] && segments[2]) {
      return { kind: "work-detail", category: segments[1], slug: segments[2] };
    }
  }

  return { kind: "home" };
}

export function pagePath(page: string): string {
  if (page.startsWith("admin-")) return "/admin";
  if (page === "about") return "/about";
  if (page === "works") return "/works";
  return "/";
}

export function categoryPath(category: string): string {
  return category === "all" ? "/works" : `/works/${encodeURIComponent(category)}`;
}

export function workPath(work: { category: string; slug: string }): string {
  return `/works/${encodeURIComponent(work.category)}/${encodeURIComponent(work.slug)}`;
}
