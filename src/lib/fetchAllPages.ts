/**
 * Fetch all pages of a paginated endpoint WITHOUT bursting the API rate limiter.
 *
 * The API enforces 100 requests/minute per IP. Firing every page in parallel
 * (`Promise.all(pages.map(fetchPage))`) instantly trips that limit and 429s
 * cascade across the whole app (including checkout). This helper fetches page 1,
 * then the remaining pages in small sequential chunks (default 3 at a time),
 * hard-capped at `maxPages` so an unexpectedly huge dataset can never fire
 * hundreds of simultaneous requests.
 *
 * Prefer a server-side aggregate/stats endpoint over this when you only need
 * totals — this is for cases that genuinely need the rows.
 */
type PageResult<T> = { data?: T[]; meta?: { totalPages?: number } } | T[];

export async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<PageResult<T>>,
  opts: { concurrency?: number; maxPages?: number } = {},
): Promise<T[]> {
  const { concurrency = 3, maxPages = 30 } = opts;

  const normalize = (r: PageResult<T>): { data: T[]; totalPages: number } => {
    if (Array.isArray(r)) return { data: r, totalPages: 1 };
    return { data: r?.data ?? [], totalPages: r?.meta?.totalPages ?? 1 };
  };

  const first = normalize(await fetchPage(1));
  const all: T[] = [...first.data];
  const totalPages = Math.min(first.totalPages, maxPages);
  if (totalPages <= 1) return all;

  const pages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
  for (let i = 0; i < pages.length; i += concurrency) {
    const chunk = pages.slice(i, i + concurrency);
    const results = await Promise.all(chunk.map((p) => fetchPage(p).then(normalize)));
    for (const r of results) all.push(...r.data);
  }
  return all;
}
