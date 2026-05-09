import { router } from "expo-router";

export const TXN_FILTER_NULL_VALUE = "__txn_filter_null__";
export const TXN_FILTER_NULL_OPTION = {
  label: "null",
  value: TXN_FILTER_NULL_VALUE,
};

export function paramOne(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw);
}

export function parseJsonParam(raw, fallback = null) {
  const s = paramOne(raw);
  if (!s) return fallback;
  try {
    return JSON.parse(s);
  } catch {
    return fallback;
  }
}

export function submitTxnFilterApply(params, payload) {
  const path = paramOne(params.returnPathname);
  const tableKey = paramOne(params.table);
  const base = parseJsonParam(params.returnParamsJson, {}) ?? {};
  const body = {
    ...payload,
    table: tableKey,
    _ts: Date.now(),
  };
  if (!path) {
    router.back();
    return;
  }
  // dismissTo pops the modal stack; navigate() could stack another txns screen.
  router.dismissTo({
    pathname: path,
    params: {
      ...base,
      txnFilterApplyJson: JSON.stringify(body),
    },
  });
}
