import AntDesign from "@expo/vector-icons/AntDesign";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Pressable onPress={SetModalFunc}>
              {({ pressed }) => (
                <AntDesign
                  name="close-circle"
                  size={24}
                  color={pressed ? "#4d4d4d" : "black"}
                />
              )}
            </Pressable>
          </View>
          <Text style={styles.modalTitle}>Category Details</Text>
          <Text style={styles.modalDescription}>
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
            labelField="label"
            valueField="value"
            placeholder="Seleccionar item"
            searchPlaceholder="Buscar..."
            value={value}
            onChange={onChange}
          />
          <Pressable style={styles.acceptButton} onPress={onAccept}>
            <Text style={styles.acceptButtonText}>Acceptar</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    margin: 16,
    width: 320,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#1e293b",
  },
  modalDescription: {
    color: "#475569",
    marginBottom: 24,
  },
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
  acceptButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    padding: 12,
  },
  acceptButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "600",
  },
});
