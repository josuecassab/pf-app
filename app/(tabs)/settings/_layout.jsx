import { Stack } from "expo-router";

import { useTheme } from "../../../contexts/ThemeContext";

export default function SettingsLayout() {
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
      <Stack.Screen name="index" options={{ title: "Configuración" }} />
    </Stack>
  );
}
