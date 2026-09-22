import Feather from "@expo/vector-icons/Feather";
import { Alert, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export default function RowActionsMenu({
  showEdit,
  onRename,
  onDelete,
  disabled,
}) {
  const { theme } = useTheme();

  const openMenu = () => {
    const buttons = [
      showEdit && { text: "Cambiar nombre", onPress: onRename },
      { text: "Eliminar", style: "destructive", onPress: onDelete },
      { text: "Cancelar", style: "cancel" },
    ].filter(Boolean);
    Alert.alert("Acciones", undefined, buttons);
  };

  return (
    <Pressable
      onPress={openMenu}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Más acciones"
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Feather
        name="more-horizontal"
        size={22}
        color={theme.colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
});
