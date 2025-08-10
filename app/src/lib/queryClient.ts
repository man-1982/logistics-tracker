import { QueryClient } from "@tanstack/react-query";

/**
 * An instance of `QueryClient` from `@tanstack/react-query`.
 * This client is configured with default options for all queries.
 *
 * @property {object} defaultOptions - Default options for all queries.
 * @property {object} defaultOptions.queries - Default options for queries.
 * @property {number} defaultOptions.queries.retry - The number of times a failed query will be retried. Set to 1.
 * @property {boolean} defaultOptions.queries.refetchOnWindowFocus - If `true`, queries will refetch on window focus. Set to `false` to prevent excessive refetching.
 * @property {number} defaultOptions.queries.staleTime - The time in milliseconds that data is considered fresh. After this time, it becomes stale. Set to 5 seconds.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5_000,
    },
  },
});
