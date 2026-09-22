import { Button, Divider, Host, Menu } from "@expo/ui/swift-ui";
import {
  controlSize,
  font,
  labelStyle,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const menuModifiers = [
  labelStyle("iconOnly"),
  controlSize("small"),
  font({ size: 20 }),
  padding({ trailing: 10 }),
];

export default function RowActionsMenu({ showEdit, onRename, onDelete }) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrap} collapsable={false}>
      <Host
        matchContents
        ignoreSafeArea="all"
        colorScheme={theme.isDark ? "dark" : "light"}
        style={styles.host}
      >
        {showEdit ? (
          <Menu
            label="Más"
            systemImage="ellipsis"
            modifiers={menuModifiers}
          >
            <Button
              label="Cambiar nombre"
              systemImage="pencil"
              onPress={onRename}
            />
            <Divider />
            <Button
              label="Eliminar"
              role="destructive"
              systemImage="trash"
              onPress={onDelete}
            />
          </Menu>
        ) : (
          <Menu
            label="Más"
            systemImage="ellipsis"
            modifiers={menuModifiers}
          >
            <Button
              label="Eliminar"
              role="destructive"
              systemImage="trash"
              onPress={onDelete}
            />
          </Menu>
        )}
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 44,
    height: 36,
    marginRight: 4,
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
  },
  host: {
    width: 44,
    height: 36,
  },
});
