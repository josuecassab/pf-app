import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = "@auth_session";

function persistSessionPayload(sessionPayload) {
  return AsyncStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify(sessionPayload),
  );
}

/** Merge custom fields we keep on `user` (e.g. username) with Supabase user updates. */
function mergeSessionUser(storedUser, supabaseUser) {
  if (!supabaseUser) return storedUser ?? null;
  const prev = storedUser && typeof storedUser === "object" ? storedUser : {};
  return { ...prev, ...supabaseUser };
}

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null);
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef(null);
  sessionRef.current = session;

  const applySupabaseSession = useCallback(
    async (supabaseSession, storedUser) => {
      if (!supabaseSession?.access_token) return;
      const next = {
        access_token: supabaseSession.access_token,
        refresh_token: supabaseSession.refresh_token,
        user: mergeSessionUser(storedUser, supabaseSession.user),
      };
      setSessionState(next);
      await persistSessionPayload(next);
    },
    [],
  );

  const setSession = useCallback(
    async (newSession) => {
      setSessionState(newSession);
      if (newSession) {
        await persistSessionPayload(newSession);
        if (newSession.access_token && newSession.refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: newSession.access_token,
            refresh_token: newSession.refresh_token,
          });
          if (!error && data.session) {
            await applySupabaseSession(data.session, newSession.user);
          }
        }
      } else {
        await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
        await supabase.auth.signOut();
      }
    },
    [applySupabaseSession],
  );

  const signOut = useCallback(async () => {
    setSessionState(null);
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    await supabase.auth.signOut();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (!stored) {
          if (!cancelled) setSessionState(null);
          return;
        }
        const parsed = JSON.parse(stored);
        if (parsed?.access_token && parsed?.refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token: parsed.access_token,
            refresh_token: parsed.refresh_token,
          });
          if (cancelled) return;
          if (error || !data.session) {
            setSessionState(null);
            await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
            await supabase.auth.signOut();
            return;
          }
          await applySupabaseSession(data.session, parsed.user);
          return;
        }
        if (!cancelled) setSessionState(parsed);
      } catch (e) {
        if (!cancelled) setSessionState(null);
      }
    };

    (async () => {
      await loadSession();
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [applySupabaseSession]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, supabaseSession) => {
      if (
        event !== "TOKEN_REFRESHED" &&
        event !== "SIGNED_IN" &&
        event !== "USER_UPDATED"
      ) {
        return;
      }
      if (!supabaseSession?.access_token) return;
      await applySupabaseSession(supabaseSession, sessionRef.current?.user);
    });

    return () => subscription.unsubscribe();
  }, [applySupabaseSession]);

  const getAuthHeaders = useCallback(() => {
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
  }, [session?.access_token]);

  /**
   * Cached Supabase user id (for React Query keys). The API resolves the tenant
   * from Authorization: Bearer via require_supabase_user — do not send this in URLs.
   */
  const tenantId = session?.user?.id ?? null;

  return (
    <AuthContext.Provider
      value={{
        session,
        setSession,
        signOut,
        loading,
        isAuthenticated: !!session,
        getAuthHeaders,
        tenantId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
