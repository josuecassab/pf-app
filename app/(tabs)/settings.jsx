import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { PAYWALL_RESULT } from "react-native-purchases-ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { usePurchasesContext } from "../../contexts/PurchasesContext";
import { useTheme } from "../../contexts/ThemeContext";
import { hasActiveEntitlement } from "../../lib/revenuecatEntitlements";
import { REVENUECAT_PRODUCT_IDS } from "../../lib/revenuecatConstants";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Settings() {
  const { theme } = useTheme();
  const { signOut: clearSession, getAuthHeaders } = useAuth();
  const {
    isNativePurchasesPlatform,
    sdkReady,
    sdkError,
    isProActive,
    entitlementId,
    presentPaywall,
    presentPaywallIfNeeded,
    presentCustomerCenter,
    restorePurchases,
    customerInfo,
  } = usePurchasesContext();
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  console.log("customerInfo", customerInfo);
  async function signOut() {
    try {
      await fetch(`${API_URL}/auth/sign_out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });
    } finally {
      await clearSession();
    }
  }

  async function handleShowPaywall() {
    if (!isNativePurchasesPlatform) {
      Alert.alert(
        "No disponible",
        "Las compras integradas solo funcionan en la app iOS o Android (no en la web ni en Expo Go sin un development build).",
      );
      return;
    }
    setPurchaseBusy(true);
    try {
      const { ok, result, error } = await presentPaywall();
      if (!ok && error) {
        Alert.alert("Paywall", error.message ?? String(error));
        return;
      }
      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        Alert.alert("ZeroGasto Pro", "Tu suscripción está activa. ¡Gracias!");
      }
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function handleShowPaywallIfNeeded() {
    if (!isNativePurchasesPlatform) {
      Alert.alert(
        "No disponible",
        "Las compras integradas solo funcionan en la app iOS o Android (development build).",
      );
      return;
    }
    setPurchaseBusy(true);
    try {
      const { ok, result, error } = await presentPaywallIfNeeded();
      if (!ok && error) {
        Alert.alert("Paywall", error.message ?? String(error));
        return;
      }
      if (result === PAYWALL_RESULT.NOT_PRESENTED) {
        Alert.alert("ZeroGasto Pro", "Ya tienes acceso Pro activo.");
      }
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function handleRestore() {
    if (!isNativePurchasesPlatform) return;
    setPurchaseBusy(true);
    try {
      const {
        ok,
        error,
        cancelled,
        customerInfo: restored,
      } = await restorePurchases();
      if (cancelled) return;
      if (!ok) {
        Alert.alert("Restaurar", error?.message ?? "No se pudo restaurar.");
        return;
      }
      const hasEntitlement = hasActiveEntitlement(restored, entitlementId);
      Alert.alert(
        "Restaurar",
        hasEntitlement
          ? "Compras restauradas correctamente."
          : "No se encontró una suscripción activa para esta cuenta de la tienda.",
      );
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function handleCustomerCenter() {
    if (!isNativePurchasesPlatform) {
      Alert.alert("No disponible", "Customer Center requiere iOS o Android.");
      return;
    }
    setPurchaseBusy(true);
    try {
      const { ok, error } = await presentCustomerCenter();
      if (!ok && error) {
        Alert.alert(
          "Customer Center",
          `${error.message ?? String(error)}\n\nNota: Customer Center en el dashboard de RevenueCat suele requerir un plan Pro o Enterprise.`,
        );
      }
    } finally {
      setPurchaseBusy(false);
    }
  }

  const paywallButtonsDisabled =
    purchaseBusy || (isNativePurchasesPlatform && !sdkReady);

  const proSubtitle = !isNativePurchasesPlatform
    ? "Solo en app móvil nativa. Los botones abren un aviso; el paywall real es en iOS/Android."
    : !sdkReady
      ? sdkError?.message?.includes("Missing RevenueCat")
        ? "Configura las claves EXPO_PUBLIC_REVENUECAT_* en .env y reinicia Expo (Metro)."
        : sdkError?.message
          ? sdkError.message
          : "Inicializando compras…"
      : isProActive
        ? "Suscripción activa"
        : "Desbloquea funciones Pro";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.settingRow,
            { borderBottomColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
            Modo Oscuro
          </Text>
          <Switch
            value={theme.isDark}
            onValueChange={theme.toggleTheme}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            thumbColor={theme.isDark ? "#ffffff" : "#f4f3f4"}
          />
        </View>

        <View
          style={[
            styles.settingRow,
            {
              borderBottomColor: theme.colors.border,
              flexDirection: "column",
              alignItems: "stretch",
              gap: 12,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
                ZeroGasto Pro
              </Text>
              <Text
                style={[styles.subLabel, { color: theme.colors.textSecondary }]}
              >
                {proSubtitle}
              </Text>
              {isNativePurchasesPlatform &&
              sdkReady &&
              customerInfo?.originalAppUserId ? (
                <Text
                  style={[styles.monoHint, { color: theme.colors.border }]}
                  numberOfLines={1}
                  ellipsizeMode="middle"
                >
                  RC user: {customerInfo.originalAppUserId}
                </Text>
              ) : null}
            </View>
            {isProActive ? (
              <Text style={[styles.badge, { color: theme.colors.primary }]}>
                Pro
              </Text>
            ) : null}
          </View>

          <Text style={[styles.productHint, { color: theme.colors.border }]}>
            Productos en tienda: {REVENUECAT_PRODUCT_IDS.MONTHLY},{" "}
            {REVENUECAT_PRODUCT_IDS.YEARLY} · Entitlement: {entitlementId}
          </Text>

          <Pressable
            onPress={handleShowPaywallIfNeeded}
            disabled={paywallButtonsDisabled}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.colors.primary },
              pressed && styles.buttonPressed,
              paywallButtonsDisabled && styles.buttonDisabled,
            ]}
          >
            {purchaseBusy ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <Text
                style={[
                  styles.secondaryButtonText,
                  { color: theme.colors.primary },
                ]}
              >
                Ver oferta (si no eres Pro)
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={handleShowPaywall}
            disabled={paywallButtonsDisabled}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.colors.primary },
              pressed && styles.buttonPressed,
              paywallButtonsDisabled && styles.buttonDisabled,
            ]}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: theme.colors.primary },
              ]}
            >
              Mostrar paywall
            </Text>
          </Pressable>

          <Pressable
            onPress={handleRestore}
            disabled={paywallButtonsDisabled}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.colors.border },
              pressed && styles.buttonPressed,
              paywallButtonsDisabled && styles.buttonDisabled,
            ]}
          >
            <Text
              style={[styles.secondaryButtonText, { color: theme.colors.text }]}
            >
              Restaurar compras
            </Text>
          </Pressable>

          <Pressable
            onPress={handleCustomerCenter}
            disabled={paywallButtonsDisabled}
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: theme.colors.border },
              pressed && styles.buttonPressed,
              paywallButtonsDisabled && styles.buttonDisabled,
            ]}
          >
            <Text
              style={[styles.secondaryButtonText, { color: theme.colors.text }]}
            >
              Gestionar suscripción (Customer Center)
            </Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.colors.primary },
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Salir</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "space-between",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  subLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  monoHint: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: Platform.select({
      ios: "Menlo",
      android: "monospace",
      default: undefined,
    }),
  },
  productHint: {
    fontSize: 12,
  },
  badge: {
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
