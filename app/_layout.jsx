import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { ActivityIndicator, View } from "react-native";
import "react-native-url-polyfill/auto";

import { SafeAreaView } from "react-native-safe-area-context";
import Auth from "../components/Auth";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { useBanks } from "../hooks/useBanks";
import { useCategories } from "../hooks/useCategories";

const queryClient = new QueryClient();

function TabNavigator() {
  const { theme } = useTheme();
  useCategories();
  useBanks();

  return (
    <NativeTabs
      initialRouteName="index"
      backgroundColor={theme.colors.surface}
      tintColor={theme.colors.tabBarActive}
      iconColor={{
        default: theme.colors.tabBarInactive,
        selected: theme.colors.tabBarActive,
      }}
    >
      <NativeTabs.Trigger name="summary">
        <NativeTabs.Trigger.Label>Resumen</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }}
          md="grid_view"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="txns">
        <NativeTabs.Trigger.Label>Transacción</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.bullet" md="list" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Agregar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "plus.circle", selected: "plus.circle.fill" }}
          md="add_circle_outline"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reconcile">
        <NativeTabs.Trigger.Label>Conciliar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "doc.text", selected: "doc.text.fill" }}
          md="receipt_long"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Configuración</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: "gearshape", selected: "gearshape.fill" }}
          md="settings"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
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
        <TabNavigator />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
