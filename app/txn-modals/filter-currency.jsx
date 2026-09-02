import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";
import CloseButton from "../../components/CloseButton";
import { useTheme } from "../../contexts/ThemeContext";
import { useTxnFilterModalSubmit } from "../../hooks/useTxnFilterModalSubmit";
import { parseJsonParam } from "../../lib/txnFilterModalParams";

const HEADER = "Moneda";
const DROP_MAX_H = 480;
const CURRENCY_OPTIONS = [
  { label: "COP", value: "COP" },
  { label: "USD", value: "USD" },
];

export default function TxnModalFilterCurrency() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const { closeModal, submit } = useTxnFilterModalSubmit();

  const filterCurrency = useMemo(
    () => parseJsonParam(params.filterCurrencyJson, null),
    [params.filterCurrencyJson],
  );

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: theme.colors.background }]}
      edges={["top", "bottom"]}
    >
      <View style={styles.flex}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View
            style={[
              styles.embeddedRoot,
              { flex: 1, backgroundColor: theme.colors.modalBackground },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerSide}>
                <CloseButton onPress={closeModal} />
              </View>
              <Text
                style={[styles.title, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {HEADER}
              </Text>
              <Pressable
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerButton,
                  pressed && styles.headerButtonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.headerButtonText,
                    { color: theme.colors.primary },
                  ]}
                >
                  Listo
                </Text>
              </Pressable>
            </View>
            <View style={[styles.body, styles.bodyFlex]}>
              <Dropdown
                key={HEADER}
                data={CURRENCY_OPTIONS}
                value={filterCurrency?.value}
                onChange={(item) => submit(HEADER, item)}
                labelField="label"
                valueField="value"
                placeholder="Seleccionar moneda"
                maxHeight={DROP_MAX_H}
                dropdownPosition="bottom"
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
                iconStyle={styles.iconStyle}
                containerStyle={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                  },
                ]}
                itemContainerStyle={{
                  backgroundColor: theme.colors.inputBackground,
                }}
                itemTextStyle={{ color: theme.colors.text }}
                activeColor={theme.colors.primary + "20"}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  embeddedRoot: {
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  headerSide: {
    minWidth: 64,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerButton: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  headerButtonPressed: { opacity: 0.7 },
  headerButtonText: { fontSize: 17, fontWeight: "400" },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    marginHorizontal: 8,
  },
  body: { paddingVertical: 8 },
  bodyFlex: { flex: 1 },
  dropdown: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  dropdownContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  placeholderStyle: { fontSize: 16 },
  selectedTextStyle: { fontSize: 16 },
  iconStyle: { width: 22, height: 22 },
});
