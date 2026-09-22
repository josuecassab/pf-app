import Feather from "@expo/vector-icons/Feather";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { formatApiError } from "../../lib/apiErrors";
import { hasActiveEntitlement } from "../../lib/revenuecatEntitlements";

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const DELETE_CONFIRM_WORD = "eliminar";
const APP_VERSION =
  Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "1.0.0";

function Section({ title, theme, children }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
        {title}
      </Text>
      <View
        style={[
          styles.sectionCard,
          {
            backgroundColor: theme.colors.card,
            borderColor: theme.colors.borderLight,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function InfoRow({ label, value, theme, isLast }) {
  return (
    <View
      style={[
        styles.infoRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.borderLight,
        },
      ]}
    >
      <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>
        {label}
      </Text>
      <Text
        style={[styles.infoValue, { color: theme.colors.text }]}
        numberOfLines={1}
      >
        {value || "—"}
      </Text>
    </View>
  );
}

function NavRow({ label, onPress, theme, isLast }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.navRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.borderLight,
        },
        pressed && styles.buttonPressed,
      ]}
    >
      <Text style={[styles.navLabel, { color: theme.colors.text }]}>{label}</Text>
      <Feather name="chevron-right" size={18} color={theme.colors.textSecondary} />
    </Pressable>
  );
}

export default function Settings() {
  const { theme } = useTheme();
  const router = useRouter();
  const { session, signOut: clearSession, getAuthHeaders } = useAuth();
  const {
    isNativePurchasesPlatform,
    sdkReady,
    sdkError,
    isProActive,
    entitlementId,
    presentPaywallIfNeeded,
    presentCustomerCenter,
    restorePurchases,
  } = usePurchasesContext();
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const user = session?.user;
  const email = user?.email ?? "";
  const username =
    (typeof user?.username === "string" && user.username.trim()) ||
    (typeof user?.user_metadata?.username === "string" &&
      user.user_metadata.username.trim()) ||
    "";

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

  async function handleGetPro() {
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
        Alert.alert("Suscripción", error.message ?? String(error));
        return;
      }
      if (
        result === PAYWALL_RESULT.PURCHASED ||
        result === PAYWALL_RESULT.RESTORED
      ) {
        Alert.alert("ZeroGasto Pro", "Tu suscripción está activa. ¡Gracias!");
      } else if (result === PAYWALL_RESULT.NOT_PRESENTED) {
        Alert.alert("ZeroGasto Pro", "Ya tienes acceso Pro activo.");
      }
    } finally {
      setPurchaseBusy(false);
    }
  }

  async function handleRestore() {
    if (!isNativePurchasesPlatform) {
      Alert.alert(
        "No disponible",
        "Restaurar compras solo funciona en la app iOS o Android.",
      );
      return;
    }
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
      Alert.alert(
        "No disponible",
        "Gestionar la suscripción requiere iOS o Android.",
      );
      return;
    }
    setPurchaseBusy(true);
    try {
      const { ok, error } = await presentCustomerCenter();
      if (!ok && error) {
        Alert.alert(
          "Suscripción",
          error.message ?? String(error),
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
    ? "Disponible solo en la app iOS o Android"
    : !sdkReady
      ? sdkError?.message
        ? "Compras no disponibles en este momento"
        : "Inicializando…"
      : isProActive
        ? "Activa"
        : "No activa";

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="Cuenta" theme={theme}>
          <InfoRow label="Correo" value={email} theme={theme} />
          <InfoRow label="Usuario" value={username} theme={theme} isLast />
        </Section>

        <Section title="Apariencia" theme={theme}>
          <View style={styles.settingRow}>
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Modo oscuro
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
        </Section>

        <Section title="Suscripción" theme={theme}>
          <View
            style={[
              styles.proHeader,
              {
                borderBottomWidth: StyleSheet.hairlineWidth,
                borderBottomColor: theme.colors.borderLight,
              },
            ]}
          >
            <View style={styles.proHeaderText}>
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

          <View style={styles.proActions}>
            {!isProActive ? (
              <Pressable
                onPress={handleGetPro}
                disabled={paywallButtonsDisabled}
                style={({ pressed }) => [
                  styles.primaryButton,
                  { backgroundColor: theme.colors.primary },
                  pressed && styles.buttonPressed,
                  paywallButtonsDisabled && styles.buttonDisabled,
                ]}
              >
                {purchaseBusy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Obtener Pro</Text>
                )}
              </Pressable>
            ) : null}

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
                style={[
                  styles.secondaryButtonText,
                  { color: theme.colors.text },
                ]}
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
                style={[
                  styles.secondaryButtonText,
                  { color: theme.colors.text },
                ]}
              >
                Gestionar suscripción
              </Text>
            </Pressable>
          </View>
        </Section>

        <Section title="Datos" theme={theme}>
          <NavRow
            label="Categorías"
            theme={theme}
            onPress={() => router.push("/manage-categories")}
          />
          <NavRow
            label="Bancos"
            theme={theme}
            isLast
            onPress={() => router.push("/manage-banks")}
          />
        </Section>

        <View style={styles.footerActions}>
          <Pressable
            onPress={() => signOut()}
            disabled={deletingAccount}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.colors.primary },
              pressed && styles.buttonPressed,
              deletingAccount && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryButtonText}>Salir</Text>
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

        <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
          ZeroGasto · v{APP_VERSION}
        </Text>
      </ScrollView>

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
    padding: 24,
    paddingBottom: 40,
    gap: 8,
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  infoValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    textAlign: "right",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  navLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  proHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  proHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  proActions: {
    padding: 16,
    gap: 10,
  },
  subLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  badge: {
    fontSize: 14,
    fontWeight: "700",
  },
  footerActions: {
    marginTop: 16,
    gap: 12,
  },
  primaryButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 16,
    letterSpacing: 0.5,
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
  buttonDisabled: {
    opacity: 0.45,
  },
  versionText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 12,
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
