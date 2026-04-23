import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { supabase } from "../lib/supabase";

function usernameFromGoogleSupabaseUser(user) {
  if (!user) return "user";
  const fromMeta = user.user_metadata?.username;
  if (typeof fromMeta === "string" && fromMeta.trim()) {
    const s = fromMeta
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 30);
    if (s.length >= 3) return s;
  }
  const email = user.email ?? "";
  const local =
    email
      .split("@")[0]
      ?.toLowerCase()
      .replace(/[^a-z0-9_]/g, "") ?? "";
  let base = local || "user";
  if (base.length < 3) base = `${base}xxx`;
  return base.slice(0, 30);
}

const redirectTo = Linking.createURL("");
console.log(redirectTo);

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/** Idempotent: backend should no-op if schema already exists. */
function ensureUserTxnSchema(username) {
  const schemaName =
    typeof username === "string" && username.trim() ? username.trim() : "";
  if (!schemaName || !API_URL) return;
  const url = `${API_URL}/create_txns_table/`;
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ schema: schemaName }),
  })
    .then((res) => res.json())
    .then((body) => {
      console.log(body);
    })
    .catch((err) => {
      console.warn("ensureUserTxnSchema", err);
    });
}

export default function Auth() {
  const { theme } = useTheme();
  const { setSession, schema } = useAuth();
  const [mode, setMode] = useState("signIn"); // "signIn" | "signUp" | "resetPassword" | "changePassword"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  /** iOS: email/password hidden until user opts in; Google is the default path. */
  const [emailAuthExpanded, setEmailAuthExpanded] = useState(false);

  const url = Linking.useLinkingURL();
  console.log(url);
  useEffect(() => {
    if (!url) return;
    try {
      const { path, queryParams, hostname } = Linking.parse(url);
      // Supabase (and many OAuth flows) put tokens in the URL fragment (#), not query (?).
      // Linking.parse() only gives queryParams from the query string, so we must parse the fragment.
      const hashIndex = url.indexOf("#");
      const fragmentParams =
        hashIndex >= 0
          ? Object.fromEntries(
              new URLSearchParams(url.slice(hashIndex + 1)).entries(),
            )
          : {};
      const params = { ...queryParams, ...fragmentParams };
      // For zerogasto://reset#... the parser treats "reset" as hostname, not path, so path is null.
      const pathLower = (path || hostname || "")
        .toLowerCase()
        .replace(/^\/+/, "");
      console.log("path", pathLower);
      const accessToken = params.access_token ?? queryParams?.access_token;
      const refreshToken = params.refresh_token ?? queryParams?.refresh_token;
      const isResetPath =
        pathLower === "reset" ||
        pathLower === "/reset" ||
        pathLower.endsWith("/reset") ||
        (pathLower === "/" && !!accessToken);
      console.log("isResetPath", isResetPath);
      console.log("accessToken", accessToken);
      if (isResetPath && accessToken) {
        setAccessToken(accessToken);
        setRefreshToken(refreshToken);
        setMode("changePassword");
      }
      // Recovery / magic link: set session from URL tokens so user is signed in
      // if (accessToken && (params.type === "recovery" || params.type === "magiclink")) {
      //   setSession({
      //     access_token: accessToken,
      //     refresh_token: refreshToken || undefined,
      //     user: params.user ? JSON.parse(decodeURIComponent(params.user)) : { email: params.email },
      //   });
      // }

      console.log("accessToken", accessToken);
      console.log("refreshToken", refreshToken);
    } catch (_) {
      // ignore parse errors
    }
  }, [url, setSession]);

  useEffect(() => {
    setEmailAuthExpanded(false);
  }, [mode]);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (!iosClientId) return;
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    GoogleSignin.configure({
      iosClientId,
      ...(webClientId ? { webClientId } : {}),
    });
  }, []);

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("El correo es obligatorio");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Introduce una dirección de correo válida");
      return false;
    }
    setEmailError("");
    return true;
  }

  function validatePassword(password) {
    if (!password) {
      setPasswordError("La contraseña es obligatoria");
      return false;
    }
    if (password.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("La contraseña debe contener al menos una mayúscula");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError("La contraseña debe contener al menos una minúscula");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError("La contraseña debe contener al menos un número");
      return false;
    }
    setPasswordError("");
    return true;
  }

  function validateNewPassword(value) {
    if (!value) {
      setNewPasswordError("La contraseña es obligatoria");
      return false;
    }
    if (value.length < 8) {
      setNewPasswordError("Mínimo 8 caracteres");
      return false;
    }
    if (!/[A-Z]/.test(value)) {
      setNewPasswordError("Al menos una mayúscula");
      return false;
    }
    if (!/[a-z]/.test(value)) {
      setNewPasswordError("Al menos una minúscula");
      return false;
    }
    if (!/[0-9]/.test(value)) {
      setNewPasswordError("Al menos un número");
      return false;
    }
    setNewPasswordError("");
    return true;
  }

  function validateConfirmPassword(confirm) {
    if (!confirm) {
      setConfirmPasswordError("Confirma tu nueva contraseña");
      return false;
    }
    if (confirm !== newPassword) {
      setConfirmPasswordError("Las contraseñas no coinciden");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  }

  async function submitChangePassword() {
    const isNewValid = validateNewPassword(newPassword);
    const isConfirmValid = validateConfirmPassword(confirmPassword);
    if (!isNewValid || !isConfirmValid) return;
    if (!accessToken || !refreshToken) {
      Alert.alert("Error", "Enlace inválido o expirado. Solicita uno nuevo.");
      setMode("signIn");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/reset_password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          new_password: newPassword,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(
          "Error",
          data.detail ||
            data.message ||
            "No se pudo restablecer la contraseña.",
        );
        return;
      }
      Alert.alert(
        "Contraseña actualizada",
        "Ya puedes iniciar sesión con tu nueva contraseña.",
        [
          {
            text: "OK",
            onPress: () => {
              setAccessToken(null);
              setRefreshToken(null);
              setNewPassword("");
              setConfirmPassword("");
              setMode("signIn");
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err.message ?? "Error de conexión. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInWithEmail() {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/sign_in`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      // console.log(data);
      if (!res.ok) {
        Alert.alert(
          "Error al iniciar sesión",
          data.detail || data.message || "Error desconocido. Intenta de nuevo.",
        );
        return;
      }
      await setSession({
        access_token: data.access_token ?? data.token,
        user: data.user ?? data.user,
      });
      ensureUserTxnSchema(data.user?.username);
    } catch (err) {
      Alert.alert(
        "Error al iniciar sesión",
        err.message ?? "Error de conexión. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    if (Platform.OS !== "ios") return;
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    if (!iosClientId) {
      Alert.alert(
        "Google",
        "Falta EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID en la configuración.",
      );
      return;
    }
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (isCancelledResponse(response)) return;
      if (!isSuccessResponse(response)) return;
      const idToken = response.data?.idToken;
      if (!idToken) {
        Alert.alert(
          "Error",
          "No se pudo obtener el identificador de Google. Vuelve a intentarlo.",
        );
        return;
      }
      let googleAccessToken;
      try {
        const tokens = await GoogleSignin.getTokens();
        googleAccessToken = tokens?.accessToken;
      } catch (_) {
        // optional for Supabase; sign-in can still succeed with id token only
      }
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
        ...(googleAccessToken ? { access_token: googleAccessToken } : {}),
      });
      if (error) {
        Alert.alert(
          "Error con Google",
          error.message ?? "No se pudo completar el inicio de sesión.",
        );
        return;
      }
      const nextSession = data.session;
      if (!nextSession?.access_token || !nextSession.user) {
        Alert.alert("Error", "Respuesta de sesión inválida.");
        return;
      }
      const u = nextSession.user;
      const username = usernameFromGoogleSupabaseUser(u);
      await setSession({
        access_token: nextSession.access_token,
        refresh_token: nextSession.refresh_token,
        user: { ...u, username },
      });
      ensureUserTxnSchema(username);
    } catch (err) {
      if (
        isErrorWithCode(err) &&
        String(err.code) === String(statusCodes.SIGN_IN_CANCELLED)
      ) {
        return;
      }
      Alert.alert(
        "Error con Google",
        err?.message ?? "No se pudo iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function requestPasswordReset() {
    const isEmailValid = validateEmail(email);
    if (!isEmailValid) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot_password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          redirect_to: "zerogasto://reset",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        Alert.alert(
          "Error",
          data.detail ||
            data.message ||
            "No se pudo enviar el correo de recuperación.",
        );
        return;
      }
      Alert.alert(
        "Correo enviado",
        "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.",
        [{ text: "OK", onPress: () => setMode("signIn") }],
      );
    } catch (err) {
      Alert.alert(
        "Error",
        err.message ?? "Error de conexión. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function signUpWithEmail() {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/sign_up`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert(
          "Error al registrarse",
          data.detail || data.message || "Error desconocido. Intenta de nuevo.",
        );
        return;
      }
      if (data.access_token ?? data.token) {
        await setSession({
          access_token: data.access_token ?? data.token,
          user: data.user ?? data.user,
        });
      } else {
        Alert.alert(
          "Registro exitoso",
          "Revisa tu correo para verificar tu cuenta.",
        );
      }
      console.log(data);
      ensureUserTxnSchema(data.user?.username);
    } catch (err) {
      Alert.alert(
        "Error al registrarse",
        err.message ?? "Error de conexión. Intenta de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  const wrapperStyle = {
    flex: 1,
    justifyContent: "space-between",
  };

  const showGooglePrimary =
    Platform.OS === "ios" &&
    mode !== "changePassword" &&
    mode !== "resetPassword" &&
    (mode === "signIn" || mode === "signUp");
  const showEmailFields =
    mode === "resetPassword" ||
    mode === "changePassword" ||
    !showGooglePrimary ||
    emailAuthExpanded;

  const formContent = (
    <>
      <View
        style={[
          styles.formContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text }]}>
          ZeroGasto
        </Text>

        {showGooglePrimary ? (
          <View style={styles.oauthPrimaryBlock}>
            <Pressable
              style={({ pressed }) => [
                styles.googleBrandedButton,
                loading ? styles.buttonDisabled : null,
                pressed && !loading && styles.buttonPressed,
              ]}
              disabled={loading}
              onPress={signInWithGoogle}
            >
              {loading ? (
                <ActivityIndicator color="#1f1f1f" size="small" />
              ) : (
                <View style={styles.googleBrandedButtonInner}>
                  <Image
                    accessibilityIgnoresInvertColors
                    source={require("../assets/images/google-g-logo.png")}
                    style={styles.googleBrandedLogo}
                  />
                  <Text style={styles.googleBrandedLabel}>
                    Continuar con Google
                  </Text>
                </View>
              )}
            </Pressable>
            <Text
              style={[styles.dividerText, { color: theme.colors.placeholder }]}
            >
              o
            </Text>
            <Pressable
              onPress={() => setEmailAuthExpanded((v) => !v)}
              style={styles.emailOptionToggle}
            >
              <Text
                style={[
                  styles.modeLinkText,
                  { color: theme.colors.primary, fontWeight: "600" },
                ]}
              >
                {emailAuthExpanded
                  ? "Ocultar correo y contraseña"
                  : "Usar correo y contraseña"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.inputContainer}>
          {mode === "changePassword" ? (
            <>
              <Text
                style={[
                  styles.modeLinkText,
                  {
                    color: theme.colors.text,
                    textAlign: "center",
                    marginBottom: 8,
                  },
                ]}
              >
                Introduce tu nueva contraseña.
              </Text>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Nueva contraseña
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: newPasswordError
                      ? theme.colors.error
                      : theme.colors.border,
                    color: theme.colors.text,
                    caretColor: theme.colors.text,
                  },
                ]}
                onChangeText={(text) => {
                  setNewPassword(text);
                  if (newPasswordError) validateNewPassword(text);
                }}
                onBlur={() => validateNewPassword(newPassword)}
                value={newPassword}
                secureTextEntry
                placeholder="Nueva contraseña"
                placeholderTextColor={theme.colors.placeholder}
                autoCapitalize="none"
              />
              {newPasswordError ? (
                <Text style={styles.errorText}>{newPasswordError}</Text>
              ) : null}
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Confirmar contraseña
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: confirmPasswordError
                      ? theme.colors.error
                      : theme.colors.border,
                    color: theme.colors.text,
                    caretColor: theme.colors.text,
                  },
                ]}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError)
                    setConfirmPasswordError(
                      text !== newPassword
                        ? "Las contraseñas no coinciden"
                        : "",
                    );
                }}
                onBlur={() => validateConfirmPassword(confirmPassword)}
                value={confirmPassword}
                secureTextEntry
                placeholder="Confirmar contraseña"
                placeholderTextColor={theme.colors.placeholder}
                autoCapitalize="none"
              />
              {confirmPasswordError ? (
                <Text style={styles.errorText}>{confirmPasswordError}</Text>
              ) : null}
            </>
          ) : null}
          {mode !== "changePassword" && showEmailFields ? (
            <>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: emailError
                      ? theme.colors.error
                      : theme.colors.border,
                    color: theme.colors.text,
                    caretColor: theme.colors.text,
                  },
                ]}
                onChangeText={(text) => {
                  setEmail(text);
                  if (emailError) validateEmail(text);
                }}
                onBlur={() => validateEmail(email)}
                value={email}
                placeholder="email@address.com"
                placeholderTextColor={theme.colors.placeholder}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {emailError ? (
                <Text style={styles.errorText}>{emailError}</Text>
              ) : null}
              {mode !== "resetPassword" && mode !== "changePassword" ? (
                <>
                  <Text style={[styles.label, { color: theme.colors.text }]}>
                    Contraseña
                  </Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: passwordError
                          ? theme.colors.error
                          : theme.colors.border,
                        color: theme.colors.text,
                        caretColor: theme.colors.text,
                      },
                    ]}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (passwordError) validatePassword(text);
                    }}
                    onBlur={() => validatePassword(password)}
                    value={password}
                    secureTextEntry={true}
                    placeholder="Contraseña"
                    placeholderTextColor={theme.colors.placeholder}
                    autoCapitalize="none"
                  />
                  {passwordError ? (
                    <Text style={styles.errorText}>{passwordError}</Text>
                  ) : null}
                </>
              ) : null}
            </>
          ) : null}
        </View>
        <View style={[styles.buttonContainer]}>
          {mode === "changePassword" ? (
            <>
              <Pressable
                onPress={() => {
                  setMode("signIn");
                  setAccessToken(null);
                  setRefreshToken(null);
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                style={styles.modeLinkWrap}
              >
                <Text
                  style={[styles.modeLinkText, { color: theme.colors.text }]}
                >
                  Volver a{" "}
                </Text>
                <Text
                  style={[styles.modeLinkText, { color: theme.colors.primary }]}
                >
                  Iniciar sesión
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.colors.primary },
                  loading ? styles.buttonDisabled : null,
                  pressed && !loading && styles.buttonPressed,
                ]}
                disabled={loading}
                onPress={submitChangePassword}
              >
                <Text style={styles.buttonText}>Cambiar contraseña</Text>
              </Pressable>
            </>
          ) : mode === "resetPassword" ? (
            <>
              <Text
                style={[
                  styles.modeLinkText,
                  {
                    color: theme.colors.text,
                    textAlign: "center",
                    marginBottom: 8,
                  },
                ]}
              >
                Ingresa tu correo y te enviaremos un enlace para restablecer tu
                contraseña.
              </Text>
              <Pressable
                onPress={() => setMode("signIn")}
                style={styles.modeLinkWrap}
              >
                <Text
                  style={[styles.modeLinkText, { color: theme.colors.text }]}
                >
                  Volver a{" "}
                </Text>
                <Text
                  style={[styles.modeLinkText, { color: theme.colors.primary }]}
                >
                  Iniciar sesión
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.colors.primary },
                  loading ? styles.buttonDisabled : null,
                  pressed && !loading && styles.buttonPressed,
                ]}
                disabled={loading}
                onPress={requestPasswordReset}
              >
                <Text style={styles.buttonText}>
                  Enviar enlace de recuperación
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              {mode === "signIn" &&
              (emailAuthExpanded || !showGooglePrimary) ? (
                <Pressable
                  onPress={() => setMode("resetPassword")}
                  style={[styles.modeLinkWrap, { marginBottom: 4 }]}
                >
                  <Text
                    style={[
                      styles.modeLinkText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    ¿Olvidaste tu contraseña?
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
                style={styles.modeLinkWrap}
              >
                <Text
                  style={[styles.modeLinkText, { color: theme.colors.text }]}
                >
                  {mode === "signIn"
                    ? "¿No tienes una cuenta? "
                    : "¿Ya tienes una cuenta? "}
                </Text>
                <Text
                  style={[styles.modeLinkText, { color: theme.colors.primary }]}
                >
                  {mode === "signIn" ? "Registrarse" : "Iniciar sesión"}
                </Text>
              </Pressable>
              {showEmailFields ? (
                <Pressable
                  style={({ pressed }) => [
                    showGooglePrimary ? styles.googleButton : styles.button,
                    showGooglePrimary
                      ? {
                          borderColor: theme.colors.border,
                          backgroundColor: theme.colors.surface,
                        }
                      : { backgroundColor: theme.colors.primary },
                    loading ? styles.buttonDisabled : null,
                    pressed && !loading && styles.buttonPressed,
                  ]}
                  disabled={loading}
                  onPress={() =>
                    mode === "signIn" ? signInWithEmail() : signUpWithEmail()
                  }
                >
                  {loading ? (
                    <ActivityIndicator
                      color={showGooglePrimary ? theme.colors.text : "#ffffff"}
                      size="small"
                    />
                  ) : (
                    <Text
                      style={
                        showGooglePrimary
                          ? [
                              styles.googleButtonText,
                              { color: theme.colors.text },
                            ]
                          : styles.buttonText
                      }
                    >
                      {mode === "signIn" ? "Iniciar sesión" : "Registrarse"}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, flex: 1 },
      ]}
    >
      {Platform.OS === "web" ? (
        <View style={wrapperStyle}>{formContent}</View>
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={wrapperStyle}>{formContent}</View>
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  titleContainer: {
    marginVertical: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: "600",
    textAlign: "center",
  },
  formContainer: {
    flex: 1,
    justifyContent: "space-around",
    alignItems: "center",
    gap: 16,
    paddingHorizontal: 16,
  },
  modeLinkWrap: {
    flexDirection: "row",
    marginBottom: 8,
    alignSelf: "center",
  },
  modeLinkText: {
    fontSize: 14,
  },
  inputContainer: {
    paddingVertical: 4,
    alignSelf: "stretch",
    gap: 8,
  },
  buttonContainer: {
    marginTop: 20,
    paddingVertical: 4,
    alignSelf: "stretch",
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    marginTop: 4,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#ffffff",
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  googleButton: {
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignSelf: "stretch",
  },
  googleButtonText: {
    textAlign: "center",
    fontWeight: "600",
    fontSize: 16,
  },
  oauthPrimaryBlock: {
    alignSelf: "stretch",
    gap: 12,
    marginBottom: 4,
  },
  dividerText: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
  emailOptionToggle: {
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  googleBrandedButton: {
    alignSelf: "stretch",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#747775",
    borderRadius: 9999,
    paddingVertical: 13,
    paddingHorizontal: 16,
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  googleBrandedButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  googleBrandedLogo: {
    width: 20,
    height: 20,
    marginRight: 12,
  },
  googleBrandedLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1f1f1f",
  },
});
