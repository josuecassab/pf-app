import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import "react-native-url-polyfill/auto";

import { SafeAreaView } from "react-native-safe-area-context";
import Auth from "../components/Auth";
import { supabase } from "../lib/supabase";
import "./global.css";
import HomeScreen from "./Home";
import Input from "./Input";
import Settings from "./Setting";
import Txns from "./Txns";

const Tab = createBottomTabNavigator();

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
      <SafeAreaView className="flex-1">
        <Auth />
      </SafeAreaView>
    );
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Inicio") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Transaccion") {
            iconName = focused ? "list" : "list-outline";
          } else if (route.name === "Agregar") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Configuracion") {
            iconName = focused ? "settings" : "settings-outline";
          } else {
            iconName = "ellipse";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#0a84ff",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Inicio" component={HomeScreen} />
      <Tab.Screen name="Transaccion" component={Txns} />
      <Tab.Screen name="Agregar" component={Input} />
      <Tab.Screen name="Configuracion" component={Settings} />
    </Tab.Navigator>
  );
}
