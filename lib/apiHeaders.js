/** JSON + Supabase Bearer for FastAPI routes that use require_supabase_user. */
export function authJsonHeaders(getAuthHeaders) {
  return {
    ...getAuthHeaders(),
    "Content-Type": "application/json",
  };
}
