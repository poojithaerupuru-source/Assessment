/**
 * The UI runs on the Next.js dev server (`next dev`), which compiles each route on
 * first visit, and login redirects with a full page load. The BFF itself answers in
 * well under a second, so these waits cover UI start-up, not slow APIs.
 */
export const PAGE_LOAD_TIMEOUT_MS = 30_000;
