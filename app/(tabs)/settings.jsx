import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { PAYWALL_RESULT } from "react-native-purchases-ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import { usePurchasesContext } from "../../contexts/PurchasesContext";
import { useTheme } from "../../contexts/ThemeContext";
import { REVENUECAT_PRODUCT_IDS } from "../../lib/revenuecatConstants";
import { hasActiveEntitlement } from "../../lib/revenuecatEntitlements";
import { formatApiError } from "../../lib/apiErrors";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DELETE_CONFIRM_WORD = "eliminar";

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
  } = usePurchasesContext();
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  async function signOut() {
    try {
      const res = await fetch(`${API_URL}/auth/sign_out`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(
          "Aviso",
          formatApiError(body) ||
            "No se pudo notificar el cierre de sesión al servidor. Se cerró la sesión en este dispositivo.",
        );
      }
    } catch (e) {
      Alert.alert(
        "Aviso",
        e?.message ??
          "No se pudo contactar al servidor. Se cerró la sesión en este dispositivo.",
      );
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

  function closeDeleteModal() {
    if (deletingAccount) return;
    setDeleteModalVisible(false);
    setDeleteConfirmText("");
  }

  function openDeleteModal() {
    if (deletingAccount) return;
    setDeleteConfirmText("");
    setDeleteModalVisible(true);
  }

  const canConfirmDelete =
    deleteConfirmText.trim().toLowerCase() === DELETE_CONFIRM_WORD;

  async function deleteAccount() {
    if (deletingAccount || !canConfirmDelete) return;
    setDeletingAccount(true);
    try {
      const res = await fetch(`${API_URL}/tenants/delete_user/`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(
          "Error",
          formatApiError(body) || "No se pudo eliminar la cuenta.",
        );
        return;
      }
      setDeleteModalVisible(false);
      setDeleteConfirmText("");
      await clearSession();
    } catch (e) {
      Alert.alert(
        "Error",
        e?.message ?? "No se pudo contactar al servidor.",
      );
    } finally {
      setDeletingAccount(false);
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
      edges={["top", "bottom", "left", "right"]}
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

        <View style={styles.footerActions}>
          <Pressable
            onPress={() => signOut()}
            disabled={deletingAccount}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.colors.primary },
              pressed && styles.buttonPressed,
              deletingAccount && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Salir</Text>
          </Pressable>

          <Pressable
            onPress={openDeleteModal}
            disabled={deletingAccount}
            style={({ pressed }) => [
              styles.dangerButton,
              pressed && styles.buttonPressed,
              deletingAccount && styles.buttonDisabled,
            ]}
          >
            <Text
              style={[styles.dangerButtonText, { color: theme.colors.error }]}
            >
              Eliminar cuenta
            </Text>
          </Pressable>
        </View>
      </View>

      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeDeleteModal} />
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.colors.modalBackground,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              Eliminar cuenta
            </Text>
            <Text
              style={[styles.modalBody, { color: theme.colors.textSecondary }]}
            >
              Se eliminarán tu cuenta y todos tus datos de forma permanente.
              Esta acción no se puede deshacer. Las suscripciones de la tienda
              se cancelan por separado en App Store o Google Play.
            </Text>
            <Text
              style={[styles.modalHint, { color: theme.colors.textSecondary }]}
            >
              Escribe{" "}
              <Text style={{ fontWeight: "700", color: theme.colors.text }}>
                {DELETE_CONFIRM_WORD}
              </Text>{" "}
              para confirmar.
            </Text>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deletingAccount}
              placeholder={DELETE_CONFIRM_WORD}
              placeholderTextColor={theme.colors.placeholder}
              style={[
                styles.confirmInput,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.inputBackground,
                  borderColor: theme.colors.border,
                },
              ]}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={closeDeleteModal}
                disabled={deletingAccount}
                style={({ pressed }) => [
                  styles.modalSecondaryButton,
                  { borderColor: theme.colors.border },
                  pressed && styles.buttonPressed,
                  deletingAccount && styles.buttonDisabled,
                ]}
              >
                <Text
                  style={[
                    styles.modalSecondaryButtonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Cancelar
                </Text>
              </Pressable>
              <Pressable
                onPress={deleteAccount}
                disabled={!canConfirmDelete || deletingAccount}
                style={({ pressed }) => [
                  styles.modalDangerButton,
                  { backgroundColor: theme.colors.error },
                  pressed && styles.buttonPressed,
                  (!canConfirmDelete || deletingAccount) &&
                    styles.buttonDisabled,
                ]}
              >
                {deletingAccount ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalDangerButtonText}>Eliminar</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  footerActions: {
    marginTop: 24,
    gap: 12,
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
  },
  dangerButton: {
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dangerButtonText: {
    fontWeight: "500",
    fontSize: 13,
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
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    zIndex: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  modalBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalHint: {
    fontSize: 14,
    lineHeight: 20,
  },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  modalSecondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  modalDangerButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  modalDangerButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 15,
  },
});
