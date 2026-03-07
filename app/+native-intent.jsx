import * as Linking from "expo-linking";

/**
 * Rewrites reset deep links to the root path so the router matches "/" instead of "/reset".
 * The Auth screen reads the URL via Linking.useLinkingURL() and parses the token from
 * query params, so we preserve the query string in the rewritten URL.
 * We rewrite for both initial (app cold start) and when the app is already open (e.g. user
 * in resetPassword mode clicks the link from the email).
 */
export function redirectSystemPath({ path }) {
  if (!path) return path;

  try {
    const pathLower = path.toLowerCase();
    const isReset =
      pathLower.includes("/reset") ||
      pathLower.includes("reset?") ||
      pathLower.endsWith("reset");

    if (!isReset) return path;

    // Preserve query string (e.g. ?token=xxx) so Auth can read it
    let search = "";
    if (path.includes("?")) {
      const idx = path.indexOf("?");
      search = path.slice(idx);
    }
    try {
      const url = new URL(path, "zerogasto://");
      if (url.search) search = "?" + url.searchParams.toString();
    } catch (_) {}

    return Linking.createURL("/") + search;
  } catch {
    return path;
  }
}
