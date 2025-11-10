import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function setToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem('admin_token', token);
}
export function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('admin_token') || '';
}

export const api = axios.create({ baseURL: API });
api.interceptors.request.use((config)=>{
  const t = getToken();
  if (t) config.headers = { ...(config.headers||{}), Authorization: `Bearer ${t}` };
  return config;
});
