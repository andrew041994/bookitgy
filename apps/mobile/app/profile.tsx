import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { clearAuth, loadAuth } from '../src/auth';
import { theme } from '../src/theme';

export default function Profile() {
  const [role, setRole] = useState<string>('');
  const [token, setToken] = useState<string>('');

  useEffect(()=>{
    (async()=>{
      const { role, token } = await loadAuth();
      setRole(role);
      setToken(token);
    })();
  }, []);

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Profile</Text>
      <Text>Role: {role || 'Guest'}</Text>
      <Text numberOfLines={1} style={{ color: theme.subtext }}>Token: {token ? token.slice(0,24)+'…' : '—'}</Text>
      {token ? (
        <TouchableOpacity onPress={async()=>{ await clearAuth(); alert('Logged out.'); }} style={{ backgroundColor: '#111', padding:12, borderRadius:8 }}>
          <Text style={{ color:'#fff', textAlign:'center' }}>Log out</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
