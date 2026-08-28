import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";

/** Must be <= query `gcTime` so persisted banks are not garbage-collected first. */
export const QUERY_CACHE_MAX_AGE = 1000 * 60 * 60 * 24; // 24 hours

const PERSISTED_QUERY_ROOT_KEYS = new Set(["banks", "financialEntities"]);

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
      shouldDehydrateQuery: (query) =>
        defaultShouldDehydrateQuery(query) &&
        PERSISTED_QUERY_ROOT_KEYS.has(query.queryKey[0]),
    },
  };
}
