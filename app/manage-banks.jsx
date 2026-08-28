import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useFinancialEntities } from "../hooks/useFinancialEntities";
import { formatApiError } from "../lib/apiErrors";
import { setPendingBankSelection } from "../lib/pendingBankSelection";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const EMPTY_BANK_LIST = [];
const EMPTY_ENTITY_LIST = [];

function closeModal() {
  router.back();
}

function bankId(bank) {
  return bank?.id ?? bank?.value;
}

function bankLabel(bank) {
  return bank?.name ?? bank?.label ?? "";
}

export default function ManageBanksScreen() {
  const queryClient = useQueryClient();
  const { getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  const { data: banksData } = useBanks();
  const { data: entitiesData, isPending: isLoadingEntities } =
    useFinancialEntities();
  const bankList = Array.isArray(banksData) ? banksData : EMPTY_BANK_LIST;
  const financialEntities = Array.isArray(entitiesData)
    ? entitiesData
    : EMPTY_ENTITY_LIST;

  const [visibleEntityPicker, setVisibleEntityPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [addingFeCode, setAddingFeCode] = useState(null);

  const usedFeCodes = useMemo(() => {
    const codes = new Set();
    for (const bank of bankList) {
      if (bank.fe_code != null) codes.add(bank.fe_code);
    }
    return codes;
  }, [bankList]);

  const availableEntities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = financialEntities
      .filter((entity) => !usedFeCodes.has(entity.code))
      .sort((a, b) =>
        String(a.legal_name ?? "").localeCompare(
          String(b.legal_name ?? ""),
          "es",
        ),
      );
    if (!q) return list.length ? list : EMPTY_ENTITY_LIST;
    const filtered = list.filter((entity) =>
      String(entity.legal_name ?? "")
        .toLowerCase()
        .includes(q),
    );
    return filtered.length ? filtered : EMPTY_ENTITY_LIST;
  }, [financialEntities, usedFeCodes, searchQuery]);

  const resetPicker = () => {
    setVisibleEntityPicker(false);
    setSearchQuery("");
  };

  const addBank = async (entity) => {
    if (entity?.code == null || addingFeCode != null) return;
    setAddingFeCode(entity.code);
    try {
      const res = await fetch(
        `${API_URL}/banks/insert_bank/?fe_code=${encodeURIComponent(entity.code)}`,
        { method: "POST", headers: getAuthHeaders() },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert("Error agregando el banco", formatApiError(data));
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["banks"] });
      resetPicker();
      const createdId = data?.id ?? data?.value;
      if (createdId != null) {
        setPendingBankSelection({
          label: entity.legal_name,
          name: entity.legal_name,
          value: createdId,
          id: createdId,
          fe_code: entity.code,
        });
      }
    } catch (error) {
      console.error("Error adding bank:", error);
      Alert.alert("Error agregando el banco", error.message);
    } finally {
      setAddingFeCode(null);
    }
  };

  const deleteBank = async (id) => {
    try {
      const res = await fetch(`${API_URL}/banks/delete_bank/?id=${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
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
              resetPicker();
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
            {visibleEntityPicker ? "Agregar banco" : "Bancos"}
          </Text>
          <Pressable
            onPress={() => {
              if (visibleEntityPicker) {
                resetPicker();
              } else {
                setVisibleEntityPicker(true);
              }
            }}
            style={styles.iconButton}
          >
            {({ pressed }) => (
              <AntDesign
                name={visibleEntityPicker ? "close" : "plus"}
                size={24}
                color={pressed ? theme.colors.textSecondary : theme.colors.text}
              />
            )}
          </Pressable>
        </View>
        {visibleEntityPicker ? (
          <>
            <View style={styles.searchContainer}>
              <Feather
                name="search"
                size={18}
                color={theme.colors.placeholder}
                style={styles.searchIcon}
              />
              <TextInput
                style={[
                  styles.searchInput,
                  {
                    backgroundColor: theme.colors.inputBackground,
                    borderColor: theme.colors.border,
                    color: theme.colors.text,
                  },
                ]}
                placeholder="Buscar entidad..."
                placeholderTextColor={theme.colors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
                clearButtonMode="while-editing"
              />
            </View>
            <GestureHandlerRootView style={styles.flex}>
              {isLoadingEntities ? (
                <View style={styles.centered}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                </View>
              ) : (
                <GHScrollView
                  contentContainerStyle={styles.bankList}
                  keyboardShouldPersistTaps="handled"
                >
                  {availableEntities.length === 0 ? (
                    <Text
                      style={[
                        styles.emptyText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {searchQuery.trim()
                        ? "No se encontraron entidades."
                        : financialEntities.length === 0
                          ? "No hay entidades disponibles."
                          : "Todas las entidades ya fueron agregadas."}
                    </Text>
                  ) : (
                    availableEntities.map((entity) => (
                      <Pressable
                        key={entity.code}
                        style={({ pressed }) => [
                          styles.entityRow,
                          { borderBottomColor: theme.colors.borderLight },
                          pressed && {
                            backgroundColor: theme.colors.inputBackground,
                          },
                          addingFeCode != null &&
                            addingFeCode !== entity.code && { opacity: 0.5 },
                        ]}
                        onPress={() => addBank(entity)}
                        disabled={addingFeCode != null}
                      >
                        <Text
                          style={[
                            styles.entityName,
                            { color: theme.colors.text },
                          ]}
                        >
                          {entity.legal_name}
                        </Text>
                        {addingFeCode === entity.code ? (
                          <ActivityIndicator
                            size="small"
                            color={theme.colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    ))
                  )}
                </GHScrollView>
              )}
            </GestureHandlerRootView>
          </>
        ) : (
          <GestureHandlerRootView style={styles.flex}>
            <GHScrollView contentContainerStyle={styles.bankList}>
              {bankList.map((b) => {
                const id = bankId(b);
                return (
                  <SwipeableCategoryItem
                    key={id}
                    cat={{
                      ...b,
                      label: bankLabel(b),
                      value: id,
                    }}
                    onDelete={deleteBank}
                    showEdit={false}
                  />
                );
              })}
            </GHScrollView>
          </GestureHandlerRootView>
        )}
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    position: "absolute",
    left: 28,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  bankList: {
    paddingHorizontal: 20,
  },
  entityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    minHeight: 48,
  },
  entityName: {
    fontSize: 14,
    flex: 1,
    paddingRight: 12,
  },
  emptyText: {
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 16,
  },
});
