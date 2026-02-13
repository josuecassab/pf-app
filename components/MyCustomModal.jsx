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
import { useTheme } from "../contexts/ThemeContext";

export default function MyCustomModal({
  labels,
  value,
  onChange,
  containerStyle,
  SetModalFunc,
  onAccept,
  ...rest
}) {
  const { theme } = useTheme();
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
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.borderLight,
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Pressable onPress={SetModalFunc}>
              {({ pressed }) => (
                <AntDesign
                  name="close-circle"
                  size={24}
                  color={pressed ? "#4d4d4d" : theme.colors.text}
                />
              )}
            </Pressable>
          </View>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Category Details
          </Text>
          <Text style={[styles.modalDescription, { color: theme.colors.text }]}>
            Select a new category for this transaction.
          </Text>
          <Dropdown
            style={[
              styles.dropdown,
              {
                backgroundColor: theme.colors.inputBackground,
                borderBottomColor: theme.colors.border,
              },
            ]}
            placeholderStyle={[
              styles.placeholderStyle,
              { color: theme.colors.placeholder },
            ]}
            selectedTextStyle={[
              styles.selectedTextStyle,
              { color: theme.colors.text },
            ]}
            inputSearchStyle={[
              styles.inputSearchStyle,
              { color: theme.colors.text },
            ]}
            iconStyle={styles.iconStyle}
            containerStyle={{
              backgroundColor: theme.colors.inputBackground,
              borderRadius: 8,
              borderColor: theme.colors.border,
            }}
            itemContainerStyle={{
              backgroundColor: theme.colors.inputBackground,
            }}
            itemTextStyle={{
              color: theme.colors.text,
            }}
            activeColor={theme.colors.primary + "20"}
            data={labels}
            search
            maxHeight={220}
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
    // backgroundColor: "rgba(0, 0, 0, 0.25)",
  },
  modalContent: {
    borderRadius: 16,
    borderWidth: 1,
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
  },
  modalDescription: {
    marginBottom: 24,
  },
  dropdown: {
    marginBottom: 16,
    height: 40,
    width: "100%",
    borderRadius: 40,
    paddingHorizontal: 14,
  },
  // icon: {
  //   marginRight: 5,
  // },
  placeholderStyle: {
    fontSize: 14,
  },
  selectedTextStyle: {
    fontSize: 14,
  },
  iconStyle: {
    width: 20,
    height: 20,
  },
  inputSearchStyle: {
    height: 40,
    fontSize: 14,
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
