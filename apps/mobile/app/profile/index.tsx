import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Button, StyleSheet } from "react-native";
import axios from "axios";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";

async function getToken() {
  return AsyncStorage.getItem("auth_token");
}

export default function ProfileScreen() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        if (!token) {
          alert("Please log in again");
          router.replace("/auth/login");
          return;
        }
        const { data } = await axios.get(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProfile(data);
      } catch (e) {
        console.error("Failed to load profile", e);
        alert("Failed to load profile");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !profile) {
    return (
      <View style={styles.container}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  async function onSave() {
    try {
      const token = await getToken();
      const { data } = await axios.patch(
        `${API}/me`,
        { phone: profile.phone, fullName: profile.fullName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile(data);
      alert("Profile updated!");
    } catch (e: any) {
      console.error("Update failed", e?.response?.data || e.message);
      alert(e?.response?.data?.error || "Update failed");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Full Name</Text>
      <TextInput
        value={profile.fullName}
        onChangeText={(text) =>
          setProfile((prev: any) => ({ ...prev, fullName: text }))
        }
        style={styles.input}
      />

      <Text style={styles.label}>Email (cannot change)</Text>
      <TextInput value={profile.email} editable={false} style={styles.input} />

      <Text style={styles.label}>Phone (WhatsApp)</Text>
      <TextInput
        value={profile.phone || ""}
        onChangeText={(text) =>
          setProfile((prev: any) => ({ ...prev, phone: text }))
        }
        style={styles.input}
        keyboardType="phone-pad"
      />

      <Button title="Save" onPress={onSave} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  label: { fontWeight: "600", marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
});
