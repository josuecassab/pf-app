import Octicons from "@expo/vector-icons/Octicons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import RowActionsMenu from "./RowActionsMenu";

export default function CategoryListItem({
  parentId = null,
  cat,
  parent,
  onPress,
  onDelete,
  onEdit,
  showEdit = true,
  isLoading = false,
  emptyNameMessage = "El nombre de la categoría no puede estar vacío.",
  renameConfirmTitle = "Cambiar nombre",
  renameConfirmMessage = "Está seguro que desea cambiar el nombre de la categoría?",
  deleteConfirmTitle = "Eliminar",
  deleteConfirmMessage,
}) {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [categoryLabel, setCategoryLabel] = useState("");

  const backgroundColor =
    parentId != null ? theme.colors.card : theme.colors.surface;

  const startEditing = () => {
    setCategoryLabel(cat.label ?? "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setCategoryLabel("");
  };

  const confirmRename = () => {
    if (categoryLabel.trim() === "") {
      Alert.alert("Error", emptyNameMessage);
      return;
    }
    Alert.alert(renameConfirmTitle, renameConfirmMessage, [
      { text: "No" },
      {
        text: "Si",
        onPress: () => {
          onEdit(cat.value, categoryLabel, parentId);
          setIsEditing(false);
          setCategoryLabel("");
        },
      },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert(
      deleteConfirmTitle,
      deleteConfirmMessage ??
        `Está seguro que desea eliminar ${cat.label}?`,
      [
        { text: "No" },
        {
          text: "Si",
          style: "destructive",
          onPress: () => onDelete(cat.value),
        },
      ],
    );
  };

  const toggleExpanded = () => {
    setIsExpanded((prev) => !prev);
    onPress?.();
  };

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor,
          borderBottomColor: theme.colors.borderLight,
        },
        parentId != null && { paddingLeft: 40 },
      ]}
    >
      {parent && (
        <Pressable
          onPress={() => {
            if (isEditing) return;
            toggleExpanded();
          }}
          accessibilityRole="button"
          accessibilityLabel={
            isExpanded ? "Ocultar subcategorías" : "Mostrar subcategorías"
          }
          hitSlop={8}
          style={styles.expandButton}
        >
          <Octicons
            name={isExpanded ? "triangle-down" : "triangle-right"}
            size={24}
            color={theme.colors.text}
          />
        </Pressable>
      )}
      {isEditing ? (
        <View style={styles.editingContainer}>
          <TextInput
            style={[
              styles.editingInput,
              {
                color: theme.colors.text,
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.inputBackground,
              },
            ]}
            placeholder="Nuevo nombre..."
            placeholderTextColor={theme.colors.placeholder}
            inputMode="text"
            value={categoryLabel}
            onChangeText={setCategoryLabel}
            editable={!isLoading}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={confirmRename}
          />
          {isLoading && (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          )}
        </View>
      ) : (
        <Pressable
          style={styles.pressableContent}
          onPress={() => {
            if (!parent) return;
            toggleExpanded();
          }}
        >
          <View style={styles.labelContainer}>
            <Text
              style={[styles.labelText, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {cat.label}
            </Text>
            {isLoading && (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>
        </Pressable>
      )}
      {isEditing ? (
        <View style={styles.editActions}>
          <Pressable
            onPress={cancelEditing}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Cancelar"
            hitSlop={8}
            style={({ pressed }) => [
              styles.rowIconButton,
              pressed && styles.pressed,
            ]}
          >
            <Octicons name="x" size={20} color={theme.colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={confirmRename}
            disabled={isLoading}
            accessibilityRole="button"
            accessibilityLabel="Guardar nombre"
            hitSlop={8}
            style={({ pressed }) => [
              styles.rowIconButton,
              pressed && styles.pressed,
            ]}
          >
            <Octicons name="check" size={20} color={theme.colors.primary} />
          </Pressable>
        </View>
      ) : (
        <RowActionsMenu
          showEdit={showEdit}
          onRename={startEditing}
          onDelete={confirmDelete}
          disabled={isLoading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    gap: 4,
    overflow: "visible",
  },
  expandButton: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  pressableContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  rowIconButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  editActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  pressed: {
    opacity: 0.7,
  },
  editingContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  editingInput: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    height: 32,
  },
  labelContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    height: 32,
    minWidth: 0,
  },
  labelText: {
    flexShrink: 1,
    fontSize: 14,
  },
});
