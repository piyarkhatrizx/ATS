import type { ApplicationSource, ApplicationStatus } from "@prisma/client";
import { APPLICATION_SOURCES } from "@/lib/application-source";
import { APPLICATION_STATUSES } from "@/lib/application-status";

/**
 * The one contract for list views: ?source=&status=&sort=&dir=&page=
 *
 * Everything here is untrusted input on its way to Prisma, so sort keys are
 * matched against an allowlist per view rather than passed through. An unknown
 * key falls back to the view's default; it never reaches the query.
 */
export type ListSearchParams = Record<string, string | string[] | undefined>;

export const PAGE_SIZE = 50;

/** Sortable columns per view. Keys are the only values `sort=` may take. */
export const SORT_KEYS = {
  applications: {
    appliedAt: { appliedAt: "desc" },
    status: { status: "asc" },
    source: { source: "asc" },
    name: { candidate: { lastName: "asc" } },
  },
  candidates: {
    createdAt: { createdAt: "desc" },
    name: { lastName: "asc" },
    email: { email: "asc" },
  },
} as const;

export type ListView = keyof typeof SORT_KEYS;
export type SortKey<V extends ListView> = keyof (typeof SORT_KEYS)[V] & string;

const DEFAULT_SORT: { [V in ListView]: SortKey<V> } = {
  applications: "appliedAt",
  candidates: "createdAt",
};

export type ParsedListParams<V extends ListView> = {
  source: ApplicationSource | null;
  status: ApplicationStatus | null;
  sort: SortKey<V>;
  dir: "asc" | "desc";
  page: number;
  /** Ready for Prisma: `orderBy`, `skip`, `take`. */
  orderBy: Record<string, unknown>;
  skip: number;
  take: number;
  /** True when the caller sent something we refused. Lets a view say so. */
  rejected: string[];
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

/** Rebuild a query string with one key changed. Keeps filters when sorting. */
export function withParam(
  params: ListSearchParams,
  key: string,
  value: string | null,
) {
  const next = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    const single = first(v);
    if (single && k !== key) next.set(k, single);
  }
  if (value) next.set(key, value);
  // Any filter or sort change invalidates the current offset.
  if (key !== "page") next.delete("page");
  const query = next.toString();
  return query ? `?${query}` : "";
}

export function parseListParams<V extends ListView>(
  view: V,
  params: ListSearchParams,
): ParsedListParams<V> {
  const rejected: string[] = [];

  const rawSource = first(params.source);
  const source = APPLICATION_SOURCES.includes(rawSource as ApplicationSource)
    ? (rawSource as ApplicationSource)
    : null;
  if (rawSource && !source) rejected.push("source");

  const rawStatus = first(params.status);
  const status = APPLICATION_STATUSES.includes(rawStatus as ApplicationStatus)
    ? (rawStatus as ApplicationStatus)
    : null;
  if (rawStatus && !status) rejected.push("status");

  const allowed = SORT_KEYS[view] as Record<string, Record<string, unknown>>;
  const rawSort = first(params.sort);
  const sort = (rawSort && rawSort in allowed ? rawSort : DEFAULT_SORT[view]) as SortKey<V>;
  if (rawSort && rawSort !== sort) rejected.push("sort");

  const rawDir = first(params.dir);
  const dir = rawDir === "asc" || rawDir === "desc" ? rawDir : null;
  if (rawDir && !dir) rejected.push("dir");

  const rawPage = first(params.page);
  const parsedPage = Number(rawPage);
  const page = Number.isInteger(parsedPage) && parsedPage >= 1 ? parsedPage : 1;
  if (rawPage && page === 1 && rawPage !== "1") rejected.push("page");

  // The allowlist entry carries the natural direction; `dir` overrides it.
  const base = allowed[sort];
  const [field, fallback] = Object.entries(base)[0];
  const direction = dir ?? (typeof fallback === "string" ? (fallback as "asc" | "desc") : "asc");
  const orderBy =
    typeof fallback === "string"
      ? { [field]: direction }
      : { [field]: Object.fromEntries(Object.entries(fallback as object).map(([k]) => [k, direction])) };

  return {
    source,
    status,
    sort,
    dir: direction,
    page,
    orderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    rejected,
  };
}
