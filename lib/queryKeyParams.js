const UNDEF = "__QUERY_KEY_UNDEFINED__";

/** Serialize a React Query key for expo-router params (preserves `undefined`). */
export function stringifyQueryKeyForParams(queryKey) {
  if (!Array.isArray(queryKey)) {
    return JSON.stringify(queryKey ?? []);
  }
  return JSON.stringify(queryKey.map((x) => (x === undefined ? UNDEF : x)));
}

export function parseQueryKeyParam(s) {
  try {
    const arr = JSON.parse(String(s ?? ""));
    if (!Array.isArray(arr)) return null;
    return arr.map((x) => (x === UNDEF ? undefined : x));
  } catch {
    return null;
  }
}
