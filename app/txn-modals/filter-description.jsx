import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../contexts/ThemeContext";
import { useTxnFilterModalSubmit } from "../../hooks/useTxnFilterModalSubmit";

const HEADER = "Descripción";

export default function TxnModalFilterDescription() {
  const { theme } = useTheme();
  const {
    closeModal,
    submit,
    filterDescription,
    setFilterDescription,
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
              <View style={styles.textContainer}>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: theme.colors.inputBackground,
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  value={filterDescription ?? ""}
                  onChangeText={setFilterDescription}
                  placeholder="Filtrar por texto en descripción"
                  placeholderTextColor={theme.colors.placeholder}
                  autoCapitalize="none"
                  autoCorrect={false}
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
  textContainer: { paddingVertical: 8 },
  textInput: {
    fontSize: 16,
    textAlign: "left",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
  },
});
