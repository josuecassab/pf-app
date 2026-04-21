import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import TxnTable from "../../components/TxnTable";
import { useTheme } from "../../contexts/ThemeContext";
import { useCategories } from "../../hooks/useCategories";
import { reconcileStyles } from "../reconcileStyles";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

function parseIdsParam(raw) {
  if (raw == null || raw === "") return [];
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function ReconcileDuplicateRows() {
  const { theme } = useTheme();
  const params = useLocalSearchParams();
  const schema = params.schema;
  const table = params.table;
  const ids = useMemo(() => parseIdsParam(params.ids), [params.ids]);

  const { data: categoriesData } = useCategories();

  const idsKey = useMemo(() => ids.join(","), [ids]);

  const {
    data: queryData,
    error,
    isPending,
    refetch,
  } = useQuery({
    queryKey: ["statement_records", schema, table, idsKey],
    queryFn: async () => {
      const qs = new URLSearchParams({
        schema: String(schema),
        table: String(table),
      });
      const res = await fetch(
        `${API_URL}/statement_records/?${qs.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          body?.detail ?? body?.message ?? `Server error ${res.status}`,
        );
      }
      const rows = Array.isArray(body) ? body : body?.records ?? [];
      return { pages: [rows], pageParams: [null] };
    },
    enabled: Boolean(schema && table && ids.length > 0),
  });

  const txns = useMemo(
    () => queryData?.pages?.flatMap((p) => p) ?? [],
    [queryData],
  );

  if (!schema || !table) {
    return (
      <SafeAreaView
        style={[
          reconcileStyles.container,
          { flex: 1, backgroundColor: theme.colors.background },
        ]}
        edges={["bottom"]}
      >
        <Text style={{ color: theme.colors.text, padding: 16 }}>
          Faltan parámetros de tabla o esquema.
        </Text>
      </SafeAreaView>
    );
  }

  if (ids.length === 0) {
    return (
      <SafeAreaView
        style={[
          reconcileStyles.container,
          { flex: 1, backgroundColor: theme.colors.background },
        ]}
        edges={["bottom"]}
      >
        <Text style={{ color: theme.colors.text, padding: 16 }}>
          No hay identificadores de duplicados para cargar.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        reconcileStyles.container,
        { flex: 1, backgroundColor: theme.colors.background },
      ]}
      edges={["bottom"]}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={[reconcileStyles.sectionTitle, { color: theme.colors.text }]}
        >
          Filas duplicadas ({ids.length}{" "}
          {ids.length === 1 ? "grupo" : "grupos"})
        </Text>
        <Text style={{ color: theme.colors.text, opacity: 0.85 }}>
          Revise y corrija las transacciones duplicadas antes de completar la
          conciliación.
        </Text>
        <TxnTable
          categories={categoriesData}
          shrinkToContent
          table={String(table)}
          txns={txns}
          error={error}
          fetchNextPage={() => {}}
          hasNextPage={false}
          isFetchingNextPage={false}
          isPending={isPending}
          queryKey={["statement_records", schema, table, idsKey]}
          refetch={refetch}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
