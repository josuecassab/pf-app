import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

const SESSION_STORAGE_KEY = "@auth_session";

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback(async (newSession) => {
    setSessionState(newSession);
    if (newSession) {
      await AsyncStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } else {
      await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, []);

  const signOut = useCallback(async () => {
    setSessionState(null);
    await AsyncStorage.removeItem(SESSION_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const stored = await AsyncStorage.getItem(SESSION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setSessionState(parsed);
        } else {
          setSessionState(null);
        }
      } catch (e) {
        setSessionState(null);
      } finally {
        setLoading(false);
      }
    };
    loadSession();
  }, []);

  const getAuthHeaders = useCallback(() => {
    if (!session?.access_token) return {};
    return { Authorization: `Bearer ${session.access_token}` };
  }, [session?.access_token]);

  const schema = session?.user?.username;

  return (
    <AuthContext.Provider
      value={{
        session,
        setSession,
        signOut,
        loading,
        isAuthenticated: !!session,
        getAuthHeaders,
        schema,
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
