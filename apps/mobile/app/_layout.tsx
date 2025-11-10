import { Tabs, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { loadAuth } from '../src/auth';
import { theme } from '../src/theme';

export default function Layout() {
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<string>('');

  useEffect(()=>{
    (async()=>{
      const { role } = await loadAuth();
      setRole(role);
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.subtext
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen
        name="provider/dashboard"
        options={{
          title: 'Dashboard',
          href: role === 'PROVIDER' ? '/provider/dashboard' : null
        }}
      />
      <Tabs.Screen
        name="auth/login"
        options={{
          title: 'Login',
          href: role ? null : '/auth/login'
        }}
      />
      <Tabs.Screen
        name="auth/register"
        options={{
          title: 'Register',
          href: role ? null : '/auth/register'
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile'
        }}
      />
    </Tabs>
  );
}
