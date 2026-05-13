import AntDesign from "@expo/vector-icons/AntDesign";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useCategories } from "../../hooks/useCategories";
import { authJsonHeaders } from "../../lib/apiHeaders";
import { formatApiError } from "../../lib/apiErrors";
import { setPendingTxnTablePostEffects } from "../../lib/pendingTxnTableModal";
import { parseQueryKeyParam } from "../../lib/queryKeyParams";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const TXN_FILTER_NULL_OPTION = {
  label: "null",
  value: null,
};

function paramOne(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw);
}

export default function TxnModalSelectCategory() {
  const { theme } = useTheme();
  const { tenantId, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const table = paramOne(params.table);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const { data: categoriesData } = useCategories();

  const queryKey = useMemo(
    () => parseQueryKeyParam(paramOne(params.queryKeyJson)),
    [params.queryKeyJson],
  );
  const ids = JSON.parse(params.ids);

  const labels = useMemo(() => {
    const categories = Array.isArray(categoriesData) ? categoriesData : [];
    return [TXN_FILTER_NULL_OPTION, ...categories];
  }, [categoriesData]);

  const closeModal = useCallback(() => {
    router.back();
  }, []);

  const onAccept = async () => {
    if (ids.length === 0 || queryKey == null) return;
    console.log({ ids, value: selectedCategory?.value });
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/update_txn_category/?table=${table}`,
        {
          method: "PUT",
          headers: authJsonHeaders(getAuthHeaders),
          body: JSON.stringify({ ids, value: selectedCategory?.value }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(
          "Error",
          formatApiError(body) || `Error ${res.status}`,
        );
        return;
      }

      const clearingCategory = selectedCategory?.value == null;
      const categoryLabel = clearingCategory ? null : selectedCategory?.label;

      const idSet = new Set(ids.map((x) => String(x)));
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            Array.isArray(page)
              ? page.map((txn) =>
                  idSet.has(String(txn.id))
                    ? {
                        ...txn,
                        category: categoryLabel,
                        category_id: clearingCategory
                          ? null
                          : selectedCategory?.value,
                      }
                    : txn,
                )
              : page,
          ),
        };
      });

      if (ids.length > 1) {
        setPendingTxnTablePostEffects({ clearSelection: true });
      }
      router.back();
    } catch (error) {
      console.error("Failed to update transactions:", error);
      Alert.alert(
        "Error",
        error?.message ?? "No se pudo actualizar la categoría.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <SafeAreaView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.modalHeader}>
          <Pressable onPress={closeModal} style={styles.iconButton}>
            {({ pressed }) => (
              <AntDesign
                name="close"
                size={24}
                color={pressed ? theme.colors.textSecondary : theme.colors.text}
              />
            )}
          </Pressable>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
            Categoría
          </Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.description, { color: theme.colors.text }]}>
            Seleccione una categoría para{" "}
            {ids.length > 1 ? "las transacciones" : "la transacción"}.
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
            value={selectedCategory?.value}
            onChange={(item) => setSelectedCategory(item)}
          />
          <Pressable
            style={({ pressed }) => [
              styles.acceptButton,
              { backgroundColor: theme.colors.primary },
              (pressed || loading) && { opacity: 0.85 },
            ]}
            onPress={onAccept}
            disabled={loading}
          >
            <Text style={styles.acceptButtonText}>Aceptar</Text>
          </Pressable>
        </View>
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
    minWidth: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  description: {
    marginBottom: 16,
    fontSize: 15,
  },
  dropdown: {
    marginBottom: 16,
    height: 40,
    width: "100%",
    borderRadius: 40,
    paddingHorizontal: 14,
  },
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
    borderRadius: 8,
    padding: 12,
  },
  acceptButtonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "600",
  },
});
