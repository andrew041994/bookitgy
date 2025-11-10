import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'bookit.token';
const ROLE_KEY = 'bookit.role';

export async function saveAuth(token: string, role: 'ADMIN'|'PROVIDER'|'CLIENT') {
  await AsyncStorage.multiSet([[TOKEN_KEY, token], [ROLE_KEY, role]]);
  (globalThis as any).authToken = token;
  (globalThis as any).authRole = role;
}

export async function loadAuth() {
  const entries = await AsyncStorage.multiGet([TOKEN_KEY, ROLE_KEY]);
  const token = entries.find(([k])=>k===TOKEN_KEY)?.[1] || '';
  const role = (entries.find(([k])=>k===ROLE_KEY)?.[1] as any) || '';
  if (token) (globalThis as any).authToken = token;
  if (role) (globalThis as any).authRole = role;
  return { token, role };
}

export async function clearAuth() {
  await AsyncStorage.multiRemove([TOKEN_KEY, ROLE_KEY]);
  (globalThis as any).authToken = '';
  (globalThis as any).authRole = '';
}
