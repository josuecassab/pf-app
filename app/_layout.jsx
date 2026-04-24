import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import "react-native-url-polyfill/auto";

import { SafeAreaView } from "react-native-safe-area-context";
import Auth from "../components/Auth";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { PurchasesProvider } from "../contexts/PurchasesContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";

const queryClient = new QueryClient();

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
    </Stack>
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

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthenticatedStack />
      </QueryClientProvider>
    </ThemeProvider>
  );
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
