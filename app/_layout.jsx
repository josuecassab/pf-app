import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import HomeScreen from "./Home";
import Input from "./Input";
import Txns from "./Txns";
import "./global.css";

// const Tab = createNativeBottomTabNavigator();
const Tab = createBottomTabNavigator();

export default function MyTabs() {
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
    </Tab.Navigator>
  );
}
