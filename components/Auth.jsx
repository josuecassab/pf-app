import { useState } from "react";
import {
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

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export default function Auth() {
  const { theme } = useTheme();
  const { setSession } = useAuth();
  const [mode, setMode] = useState("signIn"); // "signIn" | "signUp"
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function validateUsername(username) {
    if (!username || !username.trim()) {
      setUsernameError("Username is required");
      return false;
    }
    const trimmed = username.trim();
    if (trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters");
      return false;
    }
    if (trimmed.length > 30) {
      setUsernameError("Username must be 30 characters or less");
      return false;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
      setUsernameError(
        "Username can only contain letters, numbers, and underscores",
      );
      return false;
    }
    setUsernameError("");
    return true;
  }

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError("Email is required");
      return false;
    }
    if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  }

  function validatePassword(password) {
    if (!password) {
      setPasswordError("Password is required");
      return false;
    }
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(password)) {
      setPasswordError("Password must contain at least one lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(password)) {
      setPasswordError("Password must contain at least one number");
      return false;
    }
    setPasswordError("");
    return true;
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
          data.detail || data.message || "Error desconocido",
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
        err.message ?? "Error de conexión",
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
        body: JSON.stringify({ email, password, username }),
      });
      const data = await res.json();

      if (!res.ok) {
        Alert.alert(
          "Error al registrarse",
          data.detail || data.message || "Error desconocido",
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
      Alert.alert("Error al registrarse", err.message ?? "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, flex: 1 },
      ]}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            justifyContent: "space-between",
            // alignItems: "center",
          }}
        >
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
              {mode === "signUp" ? (
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
              <Text style={[styles.label, { color: theme.colors.text }]}>
                Password
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
                  },
                ]}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                }}
                onBlur={() => validatePassword(password)}
                value={password}
                secureTextEntry={true}
                placeholder="Password"
                placeholderTextColor={theme.colors.placeholder}
                autoCapitalize="none"
              />
              {passwordError ? (
                <Text style={styles.errorText}>{passwordError}</Text>
              ) : null}
            </View>
            <View style={[styles.buttonContainer]}>
              <Pressable
                onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
                style={styles.modeLinkWrap}
              >
                <Text
                  style={[styles.modeLinkText, { color: theme.colors.text }]}
                >
                  {mode === "signIn"
                    ? "Don't have an account? "
                    : "Already have an account? "}
                </Text>
                <Text
                  style={[styles.modeLinkText, { color: theme.colors.primary }]}
                >
                  {mode === "signIn" ? "Sign up" : "Sign in"}
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
                <Text style={styles.buttonText}>
                  {mode === "signIn" ? "Sign in" : "Sign up"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
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
