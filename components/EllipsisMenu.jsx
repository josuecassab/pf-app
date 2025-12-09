import AntDesign from "@expo/vector-icons/AntDesign";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const [visible, setVisible] = useState(false);
  const [visibleColOptions, setVisibleColOptions] = useState(false);
  const insets = useSafeAreaInsets();

  const renderItem = ({ item }) => {
    return (
      <Pressable
        className="active:bg-gray-100 rounded-lg"
        onPress={() => handleColumns(item)}
      >
        <View
          className={`flex-row items-center gap-4 p-4 border-b border-gray-200`}
        >
          {activeColumns.includes(item) ? (
            // <FontAwesome5 name="minus-circle" size={24} color="black" />
            <AntDesign name="minus-circle" size={18} color="black" />
          ) : (
            // <FontAwesome5 name="plus-circle" size={18} color="black" />
            <AntDesign name="plus-circle" size={18} color="black" />
          )}

          <Text className="text-base">{item}</Text>
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
            color="black"
          />
        ) : (
          <Ionicons name="ellipsis-vertical-circle" size={30} color="black" />
        )}
      </Pressable>
      <Modal
        transparent
        animationType="fade"
        visible={visible}
        onRequestClose={() => setVisible(false)}
      >
        <Pressable className="flex-1" onPress={() => setVisible(false)} />
        <View className="absolute left-2 top-[160px] rounded-lg bg-white py-2 elevation-5 shadow-lg">
          <TouchableOpacity
            className="px-4 py-3"
            onPress={() => {
              setVisible(false);
              setVisibleColOptions(true);
            }}
          >
            <Text className="text-base">Editar Columnas</Text>
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
          className="flex-1 bg-white"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          <View className="flex-row items-center justify-between px-4 py-2">
            <Text className="text-2xl font-bold">Editar Columnas</Text>
            <TouchableOpacity onPress={() => setVisibleColOptions(false)}>
              <AntDesign name="close" size={24} color="black" />
            </TouchableOpacity>
          </View>
          <FlatList data={columns} renderItem={renderItem} />
        </View>
      </Modal>
    </>
  );
}
