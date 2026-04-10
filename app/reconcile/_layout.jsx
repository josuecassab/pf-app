import { Stack } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";

export default function ReconcileLayout() {
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
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="reconcile-results" options={{ title: "Conciliación" }} />
    </Stack>
  );
}
