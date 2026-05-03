import AntDesign from "@expo/vector-icons/AntDesign";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  GestureHandlerRootView,
  ScrollView as GHScrollView,
} from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import SwipeableCategoryItem from "../components/SwipeableCategoryItem";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useBanks } from "../hooks/useBanks";
import { setPendingBankSelection } from "../lib/pendingBankSelection";

function formatApiError(data) {
  if (data == null || typeof data !== "object") return String(data ?? "");
  const msg = data.detail ?? data.message;
  if (msg == null) return JSON.stringify(data);
  return typeof msg === "string" ? msg : JSON.stringify(msg);
}

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const EMPTY_BANK_LIST = [];

function closeModal() {
  router.back();
}

export default function ManageBanksScreen() {
  const queryClient = useQueryClient();
  const { tenantId, getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  const { data: banksData } = useBanks();
  const bankList = Array.isArray(banksData) ? banksData : EMPTY_BANK_LIST;

  const [visibleInputBank, setVisibleInputBank] = useState(false);
  const [inputBank, setInputBank] = useState("");
  const [updatingBank, setUpdatingBank] = useState(null);

  const addBank = async () => {
    const label = inputBank.trim();
    if (label === "") return;
    try {
      const res = await fetch(
        `${API_URL}/banks/insert_bank/?name=${encodeURIComponent(label)}`,
        { method: "POST", headers: getAuthHeaders() },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error agregando el banco", formatApiError(data));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["banks"] });
      setInputBank("");
      setVisibleInputBank(false);
      if (data?.value != null) {
        setPendingBankSelection({
          label: data.label ?? data.name ?? label,
          value: data.value,
        });
      }
    } catch (error) {
      console.error("Error adding bank:", error);
      Alert.alert("Error agregando el banco", error.message);
    }
  };

  const deleteBank = async (bankValue) => {
    try {
      const res = await fetch(
        `${API_URL}/banks/delete_bank/?id=${bankValue}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        },
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error eliminando el banco", formatApiError(result));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["banks"] });
    } catch (error) {
      console.error("Error deleting bank:", error);
      Alert.alert("Error eliminando el banco", error.message);
    }
  };

  const updateBank = async (value, newLabel) => {
    setUpdatingBank(value);
    try {
      const res = await fetch(
        `${API_URL}/banks/update_bank/?value=${value}&name=${encodeURIComponent(newLabel)}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
        },
      );
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error actualizando el banco", formatApiError(result));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["banks"] });
    } catch (error) {
      console.error("Error actualizando el banco:", error);
    } finally {
      setUpdatingBank(null);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.surface }]}
      >
        <View style={styles.modalHeader}>
          <Pressable
            onPress={() => {
              closeModal();
              setVisibleInputBank(false);
              setInputBank("");
            }}
            style={styles.iconButton}
          >
            {({ pressed }) => (
              <AntDesign
                name="close"
                size={24}
                color={pressed ? theme.colors.textSecondary : theme.colors.text}
              />
            )}
          </Pressable>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Bancos
          </Text>
          <Pressable
            onPress={() => setVisibleInputBank(!visibleInputBank)}
            style={styles.iconButton}
          >
            {({ pressed }) => (
              <AntDesign
                name={visibleInputBank ? "close" : "plus"}
                size={24}
                color={pressed ? theme.colors.textSecondary : theme.colors.text}
              />
            )}
          </Pressable>
        </View>
        {visibleInputBank && (
          <View style={styles.inputRow}>
            <TextInput
              style={[
                styles.categoryInput,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              placeholder="Nuevo banco"
              placeholderTextColor={theme.colors.placeholder}
              value={inputBank}
              onChangeText={setInputBank}
            />
            <Pressable
              style={({ pressed }) => [
                styles.addButton,
                { backgroundColor: theme.colors.primary },
                pressed && styles.addButtonPressed,
              ]}
              onPress={() => addBank()}
            >
              <Text style={styles.addButtonText}>Agregar</Text>
            </Pressable>
          </View>
        )}
        <GestureHandlerRootView style={styles.flex}>
          <GHScrollView contentContainerStyle={styles.bankList}>
            {bankList.map((b) => (
              <SwipeableCategoryItem
                key={b.value}
                cat={b}
                onDelete={deleteBank}
                onEdit={(value, newLabel) => updateBank(value, newLabel)}
                isLoading={updatingBank === b.value}
                emptyNameMessage="El nombre del banco no puede estar vacío."
                renameConfirmMessage="¿Está seguro que desea cambiar el nombre del banco?"
              />
            ))}
          </GHScrollView>
        </GestureHandlerRootView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  iconButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  categoryInput: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    color: "#000000",
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: "#0a84ff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  bankList: {
    paddingHorizontal: 20,
  },
});
