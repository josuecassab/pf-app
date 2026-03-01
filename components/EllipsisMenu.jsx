import AntDesign from "@expo/vector-icons/AntDesign";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../contexts/ThemeContext";

const columns = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

export default function EllipsisMenu({
  handleColumns,
  activeColumns,
  activeRows,
  handleRows,
  columnOptions = columns,
  rowOptions = [],
}) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [visibleOptions, setVisibleOptions] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        menuItem: {
          borderRadius: 8,
        },
        menuItemPressed: {
          backgroundColor: theme.colors.inputBackground,
        },
        menuItemSelected: {
          backgroundColor: theme.isDark
            ? "rgba(10, 132, 255, 0.18)"
            : "rgba(10, 132, 255, 0.08)",
        },
        menuItemContent: {
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          padding: 16,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.borderLight,
        },
        menuItemText: {
          fontSize: 16,
          color: theme.colors.text,
        },
        modalBackdrop: {
          flex: 1,
        },
        menuContainer: {
          position: "absolute",
          left: 8,
          top: 160,
          borderRadius: 8,
          backgroundColor: theme.colors.modalBackground,
          paddingVertical: 8,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5,
        },
        menuOption: {
          paddingHorizontal: 16,
          paddingVertical: 12,
        },
        menuOptionText: {
          fontSize: 16,
          color: theme.colors.text,
        },
        columnsModal: {
          flex: 1,
          backgroundColor: theme.colors.modalBackground,
        },
        columnsHeader: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 8,
        },
        columnsTitle: {
          fontSize: 24,
          fontWeight: "bold",
          color: theme.colors.text,
        },
      }),
    [theme],
  );

  const iconColor = theme.colors.text;

  const renderOptionItem = ({ item }) => {
    const isColumns = editMode === "columns";
    const isSelected = isColumns
      ? activeColumns.includes(item)
      : activeRows.includes(item);
    const onPress = isColumns ? () => handleColumns(item) : () => handleRows(item);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.menuItem,
          isSelected && styles.menuItemSelected,
          pressed && styles.menuItemPressed,
        ]}
        onPress={onPress}
      >
        <View style={styles.menuItemContent}>
          {isSelected ? (
            <Ionicons
              name="checkmark-circle"
              size={24}
              color={theme.colors.primary}
            />
          ) : (
            <Ionicons
              name="ellipse-outline"
              size={24}
              color={theme.colors.textSecondary}
            />
          )}

          <Text
            style={[
              styles.menuItemText,
              isSelected && { color: theme.colors.primary, fontWeight: "600" },
            ]}
          >
            {item}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <>
      <Pressable onPress={() => setVisible(true)}>
        {!visible ? (
          <Ionicons
            name="ellipsis-horizontal-circle-outline"
            size={30}
            color={iconColor}
          />
        ) : (
          <Ionicons
            name="ellipsis-vertical-circle"
            size={30}
            color={iconColor}
          />
        )}
      </Pressable>
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setVisible(false)}
        />
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuOption}
            onPress={() => {
              setVisible(false);
              setEditMode("columns");
              setVisibleOptions(true);
            }}
          >
            <Text style={styles.menuOptionText}>Editar Columnas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuOption}
            onPress={() => {
              setVisible(false);
              setEditMode("rows");
              setVisibleOptions(true);
            }}
          >
            <Text style={styles.menuOptionText}>Editar Filas</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal
        transparent
        animationType="fade"
        visible={visibleOptions}
        onRequestClose={() => setVisibleOptions(false)}
      >
        <View
          style={[
            styles.columnsModal,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.columnsHeader}>
            <Text style={styles.columnsTitle}>
              {editMode === "columns" ? "Editar Columnas" : "Editar Filas"}
            </Text>
            <TouchableOpacity onPress={() => setVisibleOptions(false)}>
              <AntDesign name="close" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={editMode === "columns" ? columnOptions : rowOptions}
            renderItem={renderOptionItem}
          />
        </View>
      </Modal>
    </>
  );
}
