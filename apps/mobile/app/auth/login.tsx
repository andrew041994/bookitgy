import React, { useState } from "react";
import { View, TextInput, Button, Text, Alert } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import { saveAuth } from "../../src/auth";

const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

export default function Login() {
  const [identifier, setIdentifier] = useState(""); // email or phone
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    if (!identifier || !password) {
      Alert.alert("Missing info", "Please enter email/phone and password.");
      return;
    }

    try {
      setLoading(true);
      const { data } = await axios.post(`${API}/auth/login`, {
        identifier,
        password,
      });

      await saveAuth(data.token, data.role);

      if (data.role === "PROVIDER") {
        router.replace("/provider/dashboard");
      } else {
        router.replace("/");
      }
    } catch (e: any) {
      console.error("Login failed", e?.response?.data || e.message);
      Alert.alert("Login failed", e?.response?.data?.error || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ padding: 20, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 8 }}>
        Login
      </Text>

      <TextInput
        placeholder="Email or Phone"
        autoCapitalize="none"
        keyboardType="email-address"
        value={identifier}
        onChangeText={setIdentifier}
        style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
      />

      <TextInput
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        style={{ borderWidth: 1, borderRadius: 8, padding: 10 }}
      />

      <Button title={loading ? "Logging in..." : "Login"} onPress={onLogin} />
    </View>
  );
}
