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
  const { schema } = useAuth();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams();
  const idRaw = paramOne(params.id);
  const table = paramOne(params.table);
  const dateStr = paramOne(params.dateStr);
  const queryKey = useMemo(
    () => parseQueryKeyParam(paramOne(params.queryKeyJson)),
    [params.queryKeyJson],
  );

  const [date, setDate] = useState(() => parseTxndate(dateStr));
  const [saving, setSaving] = useState(false);

  const id = useMemo(() => {
    const n = Number(idRaw);
    if (!Number.isNaN(n) && String(n) === idRaw) return n;
    return idRaw;
  }, [idRaw]);

  const closeModal = useCallback(() => {
    router.back();
  }, []);

  const save = useCallback(async () => {
    if (!table || queryKey == null) {
      closeModal();
      return;
    }
    const formatted = date.toLocaleDateString("en-CA");
    setSaving(true);
    try {
      const res = await fetch(
        `${API_URL}/update_txn_date/?table=${table}&schema=${schema ?? ""}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, date: formatted }),
        },
      );
      await res.json().catch(() => ({}));
      if (!res.ok) return;
      queryClient.setQueryData(queryKey, (oldData) => {
        if (!oldData?.pages) return oldData;
        return {
          ...oldData,
          pages: oldData.pages.map((page) =>
            Array.isArray(page)
              ? page.map((txn) =>
                  String(txn.id) === String(id)
                    ? { ...txn, date: formatted }
                    : txn,
                )
              : page,
          ),
        };
      });
      closeModal();
    } catch (e) {
      console.error("Failed to update transaction date:", e);
    } finally {
      setSaving(false);
    }
  }, [id, date, table, schema, queryKey, queryClient, closeModal]);

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
        <View style={styles.sheet}>
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
          <View
            style={[styles.actions, { borderTopColor: theme.colors.border }]}
          >
            <Pressable
              onPress={closeModal}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={{ color: theme.colors.text }}>Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={save}
              disabled={saving}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed || saving ? 0.7 : 1 },
              ]}
            >
              <Text style={{ color: theme.colors.primary, fontWeight: "600" }}>
                Guardar
              </Text>
            </Pressable>
          </View>
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
  sheet: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  pickerWrap: {
    width: "100%",
    alignItems: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
});
