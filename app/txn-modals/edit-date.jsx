import AntDesign from "@expo/vector-icons/AntDesign";
import DateTimePicker from "@react-native-community/datetimepicker";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { authJsonHeaders } from "../../lib/apiHeaders";
import { setPendingTxnTablePostEffects } from "../../lib/pendingTxnTableModal";
import { parseQueryKeyParam } from "../../lib/queryKeyParams";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

function paramOne(raw) {
  if (raw == null) return "";
  if (Array.isArray(raw)) return String(raw[0] ?? "");
  return String(raw);
}

function parseTxndate(date) {
  if (!date) return new Date();
  const str = String(date).trim();
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export default function TxnModalEditDate() {
  const { theme } = useTheme();
  const { schema, getAuthHeaders } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const table = paramOne(params.table);
  const dateStr = paramOne(params.dateStr);
  const queryKey = useMemo(
    () => parseQueryKeyParam(paramOne(params.queryKeyJson)),
    [params.queryKeyJson],
  );
  const ids = JSON.parse(params.ids);

  const [date, setDate] = useState(() => parseTxndate(dateStr));
  const [loading, setLoading] = useState(false);

  const closeModal = useCallback(() => {
    router.back();
  }, []);

  const onAccept = async () => {
    if (ids.length === 0 || queryKey == null) return;
    const formatted = date.toLocaleDateString("en-CA");
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/update_txn_date/?table=${table}&schema=${schema ?? ""}`,
        {
          method: "PUT",
          headers: authJsonHeaders(getAuthHeaders),
          body: JSON.stringify({ ids, date: formatted }),
        },
      );
      await res.json().catch(() => ({}));
      if (!res.ok) return;

      const idSet = new Set(ids.map((x) => String(x)));
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            Array.isArray(page)
              ? page.map((txn) =>
                  idSet.has(String(txn.id))
                    ? { ...txn, date: formatted }
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
            Fecha
          </Text>
          <View style={styles.iconButton} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.description, { color: theme.colors.text }]}>
            Seleccione una fecha para{" "}
            {ids.length > 1 ? "las transacciones" : "la transacción"}.
          </Text>
          <View style={styles.pickerWrap}>
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(_, selectedDate) => {
                if (selectedDate) setDate(selectedDate);
              }}
              textColor={theme.colors.text}
              themeVariant={theme.isDark ? "dark" : "light"}
              accentColor={theme.colors.primary}
            />
          </View>
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
  pickerWrap: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
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
