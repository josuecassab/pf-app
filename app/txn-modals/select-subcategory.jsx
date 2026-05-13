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
import { useSubcategories } from "../../hooks/useSubcategories";
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

function parseSubcategoriesJson(raw) {
  const s = paramOne(raw);
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function TxnModalSelectSubcategory() {
  const { theme } = useTheme();
  const { tenantId, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const table = paramOne(params.table);
  const categoryIdParam = paramOne(params.category_id);
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [loading, setLoading] = useState(false);
  const { data: subcategoriesData } = useSubcategories();

  const queryKey = useMemo(
    () => parseQueryKeyParam(paramOne(params.queryKeyJson)),
    [params.queryKeyJson],
  );
  const ids = JSON.parse(params.ids);

  const labels = useMemo(() => {
    const list = subcategoriesData ?? [];
    const forCategory =
      categoryIdParam === ""
        ? list
        : list.filter((sc) => String(sc.category_id) === categoryIdParam);
    return [TXN_FILTER_NULL_OPTION, ...forCategory];
  }, [subcategoriesData, categoryIdParam]);

  const closeModal = useCallback(() => {
    router.back();
  }, []);

  const onAccept = async () => {
    if (ids.length === 0 || queryKey == null) return;
    console.log({ ids, value: selectedSubcategory?.value });
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/update_txn_subcategory/?table=${table}`,
        {
          method: "PUT",
          headers: authJsonHeaders(getAuthHeaders),
          body: JSON.stringify({ ids, value: selectedSubcategory?.value }),
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

      const clearingSubcategory = selectedSubcategory?.value == null;
      const subcategoryLabel = clearingSubcategory
        ? null
        : selectedSubcategory?.label;

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
                        subcategory: subcategoryLabel,
                        subcategory_id: clearingSubcategory
                          ? null
                          : selectedSubcategory?.value,
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
        error?.message ?? "No se pudo actualizar la subcategoría.",
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
            Subcategoría
          </Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.description, { color: theme.colors.text }]}>
            Seleccione una subcategoría para{" "}
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
            value={selectedSubcategory?.value}
            onChange={(item) => setSelectedSubcategory(item)}
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
