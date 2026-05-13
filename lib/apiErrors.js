/**
 * Human-readable message from a parsed API error JSON body (FastAPI, etc.).
 * @param {unknown} data
 */
export function formatApiError(data) {
  if (data == null || typeof data !== "object") return String(data ?? "");
  const msg = data.detail ?? data.message;
  if (msg == null) return JSON.stringify(data);
  if (typeof msg === "string") return msg;
  if (Array.isArray(msg)) {
    return msg
      .map((item) =>
        typeof item === "object" && item != null && "msg" in item
          ? String(item.msg)
          : String(item),
      )
      .join(" ");
  }
  return JSON.stringify(msg);
}
