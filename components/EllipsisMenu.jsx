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

export default function EllipsisMenu({ handleColumns, activeColumns }) {
  const { theme } = useTheme();
  const [visible, setVisible] = useState(false);
  const [visibleColOptions, setVisibleColOptions] = useState(false);
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
    [theme]
  );

  const iconColor = theme.colors.text;

  const renderItem = ({ item }) => {
    return (
      <Pressable
        style={({ pressed }) => [
          styles.menuItem,
          pressed && styles.menuItemPressed,
        ]}
        onPress={() => handleColumns(item)}
      >
        <View style={styles.menuItemContent}>
          {activeColumns.includes(item) ? (
            <AntDesign name="minus-circle" size={18} color={iconColor} />
          ) : (
            <AntDesign name="plus-circle" size={18} color={iconColor} />
          )}

          <Text style={styles.menuItemText}>{item}</Text>
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
          <Ionicons name="ellipsis-vertical-circle" size={30} color={iconColor} />
        )}
      </Pressable>
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setVisible(false)} />
        <View style={styles.menuContainer}>
          <TouchableOpacity
            style={styles.menuOption}
            onPress={() => {
              setVisible(false);
              setVisibleColOptions(true);
            }}
          >
            <Text style={styles.menuOptionText}>Editar Columnas</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      <Modal
        transparent
        animationType="fade"
        visible={visibleColOptions}
        onRequestClose={() => setVisibleColOptions(false)}
      >
        <View
          style={[
            styles.columnsModal,
            { paddingTop: insets.top, paddingBottom: insets.bottom },
          ]}
        >
          <View style={styles.columnsHeader}>
            <Text style={styles.columnsTitle}>Editar Columnas</Text>
            <TouchableOpacity onPress={() => setVisibleColOptions(false)}>
              <AntDesign name="close" size={24} color={iconColor} />
            </TouchableOpacity>
          </View>
          <FlatList data={columns} renderItem={renderItem} />
        </View>
      </Modal>
    </>
  );
}
