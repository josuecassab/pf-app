import AntDesign from "@expo/vector-icons/AntDesign";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";

export default function MyCustomModal({
  labels,
  value,
  onChange,
  containerStyle,
  SetModalFunc,
  onAccept,
  ...rest
}) {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        Alert.alert("Modal has been closed.");
        setModalVisible(!modalVisible);
      }}
      {...rest}
    >
      <View className="flex-1 justify-center items-center bg-black/50">
        <View className="bg-white rounded-2xl p-6 m-4 shadow-lg w-80">
          <View className="flex-row justify-end">
            <TouchableHighlight onPress={SetModalFunc} underlayColor="#e2e8f0">
              <AntDesign name="close-circle" size={24} color="black" />
            </TouchableHighlight>
          </View>

          <Text className="text-xl font-bold mb-4 text-slate-800">
            Category Details
          </Text>
          <Text className="text-slate-600 mb-6">
            Select a new category for this transaction.
          </Text>
          <Dropdown
            style={styles.dropdown}
            placeholderStyle={styles.placeholderStyle}
            selectedTextStyle={styles.selectedTextStyle}
            inputSearchStyle={styles.inputSearchStyle}
            iconStyle={styles.iconStyle}
            data={labels}
            search
            maxHeight={300}
            labelField="label"
            valueField="value"
            placeholder="Select item"
            searchPlaceholder="Search..."
            value={value}
            onChange={onChange}
            // renderLeftIcon={() => (
            //   <AntDesign
            //     style={styles.icon}
            //     color="black"
            //     name="Safety"
            //     size={20}
            //   />
            // )}
          />
          <Pressable className="bg-blue-500 rounded-lg p-3" onPress={onAccept}>
            <Text className="text-white text-center font-semibold">
              Acceptar
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    margin: 16,
    height: 50,
    borderBottomColor: "gray",
    borderBottomWidth: 0.5,
  },
  icon: {
    marginRight: 5,
  },
  placeholderStyle: {
    fontSize: 16,
  },
  selectedTextStyle: {
    fontSize: 16,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 16,
  },
});
