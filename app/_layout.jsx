import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-url-polyfill/auto";

import { SafeAreaView } from "react-native-safe-area-context";
import Auth from "../components/Auth";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { PurchasesProvider } from "../contexts/PurchasesContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { createQueryClient, getPersistOptions } from "../lib/queryClient";

function AuthenticatedStack() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerTitleStyle: { color: theme.colors.text },
        headerShadowVisible: theme.isDark ? false : undefined,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="manage-categories"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="manage-banks"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="txn-modals"
        options={{
          presentation: "modal",
          headerShown: false,
        }}
      />
    </Stack>
  );
}

function AuthenticatedApp() {
  const { tenantId } = useAuth();
  const [queryClient] = useState(createQueryClient);
  const persistOptions = useMemo(
    () => getPersistOptions(tenantId),
    [tenantId],
  );

  return (
    <ThemeProvider>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
      >
        <AuthenticatedStack />
      </PersistQueryClientProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) {
    return (
      <ThemeProvider>
        <SafeAreaView style={{ flex: 1 }}>
          <Auth />
        </SafeAreaView>
      </ThemeProvider>
    );
  }

  return <AuthenticatedApp />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <PurchasesProvider>
        <RootNavigator />
      </PurchasesProvider>
    </AuthProvider>
  );
}
