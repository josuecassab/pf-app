import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

export default function Settings() {
  const { theme } = useTheme();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.settingRow,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
            Modo Oscuro
          </Text>
          <Switch
            value={theme.isDark}
            onValueChange={theme.toggleTheme}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.isDark ? "#ffffff" : "#f4f3f4"}
          />
        </View>
        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.colors.primary },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Salir</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
