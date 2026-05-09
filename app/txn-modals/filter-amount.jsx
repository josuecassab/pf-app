import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import CurrencyInput from "react-native-currency-input";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useTxnFilterModalSubmit } from "../../hooks/useTxnFilterModalSubmit";

const HEADER = "Monto";

export default function TxnModalFilterAmount() {
  const { theme } = useTheme();
  const {
    closeModal,
    submit,
    filterValue,
    setFilterValue,
  } = useTxnFilterModalSubmit();

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
              <Pressable
                onPress={closeModal}
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
                  Cerrar
                </Text>
              </Pressable>
              <Text
                style={[styles.title, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {HEADER}
              </Text>
              <Pressable
                onPress={() => submit(HEADER, null)}
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
              <View style={styles.currencyContainer}>
                <CurrencyInput
                  style={[
                    styles.currencyInput,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  value={filterValue ?? null}
                  onChangeValue={setFilterValue}
                  delimiter="."
                  separator=","
                  precision={2}
                  keyboardType="number-pad"
                  placeholder="Filtrar por valor"
                  placeholderTextColor={theme.colors.placeholder}
                />
              </View>
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
  currencyContainer: { paddingVertical: 8 },
  currencyInput: {
    fontSize: 16,
    textAlign: "center",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
});
