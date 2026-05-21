import AntDesign from "@expo/vector-icons/AntDesign";
import { Pressable, StyleSheet } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

export const CLOSE_BUTTON_SIZE = 36;

export default function CloseButton({
  onPress,
  size = CLOSE_BUTTON_SIZE,
  iconSize = 18,
  accessibilityLabel = "Cerrar",
  hitSlop = 8,
  ...props
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      hitSlop={hitSlop}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      {...props}
    >
      <AntDesign name="close" size={iconSize} color={theme.colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
