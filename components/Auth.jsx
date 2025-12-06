import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

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
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    if (!isEmailValid || !isPasswordValid) return;
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    if (!session)
      Alert.alert("Please check your inbox for email verification!");
    setLoading(false);
  }

  return (
    <View className="flex-1 p-4">
      <View className="my-10">
        <Text className="text-5xl font-semibold text-center text-black">
          Personal Finance App
        </Text>
      </View>
      <View className="flex-1 justify-start items-center bg-white gap-4 px-4">
        <View className="py-1 self-stretch mt-5">
          <Text className="text-gray-700 text-sm font-medium mb-1">Email</Text>
          <TextInput
            className={`border rounded-lg px-4 py-3 text-base bg-white ${emailError ? "border-red-500" : "border-gray-300"}`}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) validateEmail(text);
            }}
            onBlur={() => validateEmail(email)}
            value={email}
            placeholder="email@address.com"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {emailError ? (
            <Text className="text-red-500 text-sm mt-1">{emailError}</Text>
          ) : null}
        </View>
        <View className="py-1 self-stretch">
          <Text className="text-gray-700 text-sm font-medium mb-1">
            Password
          </Text>
          <TextInput
            className={`border rounded-lg px-4 py-3 text-base bg-white ${passwordError ? "border-red-500" : "border-gray-300"}`}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) validatePassword(text);
            }}
            onBlur={() => validatePassword(password)}
            value={password}
            secureTextEntry={true}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
          />
          {passwordError ? (
            <Text className="text-red-500 text-sm mt-1">{passwordError}</Text>
          ) : null}
        </View>
        <View className="py-1 self-stretch mt-5">
          <Pressable
            className={`rounded-lg py-3 px-4 ${loading ? "bg-blue-300" : "bg-blue-600 active:bg-blue-700"}`}
            disabled={loading}
            onPress={() => signInWithEmail()}
          >
            <Text className="text-white text-center font-semibold text-base">
              Sign in
            </Text>
          </Pressable>
        </View>
        <View className="py-1 self-stretch">
          <Pressable
            className={`rounded-lg py-3 px-4 ${loading ? "bg-blue-300" : "bg-blue-600 active:bg-blue-700"}`}
            disabled={loading}
            onPress={() => signUpWithEmail()}
          >
            <Text className="text-white text-center font-semibold text-base">
              Sign up
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
