import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";

/** Must be <= query `gcTime` so persisted queries are not garbage-collected first. */
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

const PERSISTED_QUERY_ROOT_KEYS = new Set([
  "banks",
  "financialEntities",
  "categories",
  "categoryGroups",
  "subcategories",
  "list_statements",
  "txns",
]);

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: QUERY_CACHE_MAX_AGE,
      },
    },
  });
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: "@pf_query_cache",
});

export function getPersistOptions(tenantId) {
  return {
    persister: queryPersister,
    maxAge: QUERY_CACHE_MAX_AGE,
    buster: tenantId ?? "",
    dehydrateOptions: {
      shouldDehydrateQuery: (query) => {
        if (
          !defaultShouldDehydrateQuery(query) ||
          !PERSISTED_QUERY_ROOT_KEYS.has(query.queryKey[0])
        ) {
          return false;
        }
        if (
          query.queryKey[0] === "list_statements" &&
          !Array.isArray(query.state.data)
        ) {
          return false;
        }
        if (
          query.queryKey[0] === "txns" &&
          !Array.isArray(query.state.data?.pages)
        ) {
          return false;
        }
        return true;
      },
    },
  };
}
