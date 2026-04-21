import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

const redirectTo = Linking.createURL("");
console.log(redirectTo);

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Auth() {
  const { theme } = useTheme();
  const { setSession } = useAuth();
  const [mode, setMode] = useState("signIn"); // "signIn" | "signUp" | "resetPassword" | "changePassword"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [accessToken, setAccessToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

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

  function validateUsername(username) {
    if (!username || !username.trim()) {
      setUsernameError("El nombre de usuario es obligatorio");
      return false;
    }
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameError("El nombre de usuario debe tener al menos 3 caracteres");
      return false;
    }
    if (trimmed.length > 30) {
      setUsernameError("El nombre de usuario debe tener 30 caracteres o menos");
      return false;
    }
    if (!/^[a-z0-9_]+$/.test(trimmed)) {
      setUsernameError(
        "El nombre de usuario solo puede contener letras minúsculas, números y guiones bajos",
      );
      return false;
    }
    setUsernameError("");
    return true;
  }

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
    } catch (err) {
      Alert.alert(
        "Error al iniciar sesión",
        err.message ?? "Error de conexión. Intenta de nuevo.",
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
    const isUsernameValid = validateUsername(username);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isUsernameValid || !isEmailValid || !isPasswordValid) return;
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
          username: username.toLowerCase(),
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
      fetch(`${API_URL}/create_txns_table/?schema=${username}`, {
        method: "GET",
      })
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
        });
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
          ) : mode === "signUp" ? (
            <>
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Username
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: usernameError
                      ? theme.colors.error
                      : theme.colors.border,
                    color: theme.colors.text,
                    caretColor: theme.colors.text,
                  },
                ]}
                onChangeText={(text) => {
                  setUsername(text);
                  if (usernameError) validateUsername(text);
                }}
                onBlur={() => validateUsername(username)}
                value={username}
                placeholder="username"
                placeholderTextColor={theme.colors.placeholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {usernameError ? (
                <Text style={styles.errorText}>{usernameError}</Text>
              ) : null}
            </>
          ) : null}
          {mode !== "changePassword" ? (
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
              {mode === "signIn" ? (
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
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: theme.colors.primary },
                  loading ? styles.buttonDisabled : null,
                  pressed && !loading && styles.buttonPressed,
                ]}
                disabled={loading}
                onPress={() =>
                  mode === "signIn" ? signInWithEmail() : signUpWithEmail()
                }
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.buttonText}>
                    {mode === "signIn" ? "Iniciar sesión" : "Registrarse"}
                  </Text>
                )}
              </Pressable>
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
});
