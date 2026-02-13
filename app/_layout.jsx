import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-url-polyfill/auto";

import { SafeAreaView } from "react-native-safe-area-context";
import Auth from "../components/Auth";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { useCategories } from "../hooks/useCategories";
import { supabase } from "../lib/supabase";
import HomeScreen from "./index";
import Reconcile from "./reconcile";
import Settings from "./settings";
import Summary from "./summary";
import Txns from "./txns";

const Tab = createBottomTabNavigator();
const queryClient = new QueryClient();

function TabNavigator() {
  const { theme } = useTheme();
  // Prefetch global categories so they're cached for reconcile, txns, input
  useCategories();

  return (
    <Tab.Navigator
      initialRouteName="Agregar"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Inicio") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Resumen") {
            iconName = focused ? "grid" : "grid-outline";
          } else if (route.name === "Transaccion") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Agregar") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Conciliar") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Configuracion") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            iconName = "ellipse";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
        },
      })}
    >
      <Tab.Screen name="Agregar" component={HomeScreen} />
      <Tab.Screen name="Resumen" component={Summary} />
      <Tab.Screen name="Transaccion" component={Txns} />
      <Tab.Screen name="Conciliar" component={Reconcile} />
      <Tab.Screen name="Configuracion" component={Settings} />
    </Tab.Navigator>
  );
}

export default function MyTabs() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

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
