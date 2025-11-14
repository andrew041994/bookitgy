import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { loadAuth } from "../src/auth";
import { theme } from "../src/theme";

export default function Layout() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string>("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { role } = await loadAuth();
        if (!cancelled) {
          setRole(role || "");
        }
      } catch (e) {
        // no auth yet or error – treat as logged out
        if (!cancelled) {
          setRole("");
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.subtext,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />

      <Tabs.Screen
        name="provider/dashboard"
        options={{
          title: "Dashboard",
          // Only show Dashboard tab for providers
          href: role === "PROVIDER" ? "/provider/dashboard" : null,
        }}
      />

      <Tabs.Screen
        name="auth/login"
        options={{
          title: "Login",
          // Hide login tab when already logged in
          href: role ? null : "/auth/login",
        }}
      />

      <Tabs.Screen
        name="auth/register"
        options={{
          title: "Register",
          // Hide register tab when already logged in
          href: role ? null : "/auth/register",
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
        }}
      />
    </Tabs>
  );
}
