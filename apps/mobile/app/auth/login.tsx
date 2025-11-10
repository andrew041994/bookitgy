import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { saveAuth } from '../../src/auth';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function Login() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  async function onLogin() {
    try {
      const { data } = await axios.post(`${API}/auth/login`, { phone, password });
      await saveAuth(data.token, data.role);
      Alert.alert('Login success', `Role: ${data.role}`);
    } catch (e:any) {
      Alert.alert('Login failed', e?.response?.data?.error || 'Error');
    }
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Login</Text>
      <TextInput placeholder="Phone (+592… or local)" value={phone} onChangeText={setPhone} style={{ borderWidth:1, borderRadius:8, padding:10 }}/>
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth:1, borderRadius:8, padding:10 }}/>
      <TouchableOpacity onPress={onLogin} style={{ backgroundColor:'#111', padding:12, borderRadius:8 }}>
        <Text style={{ color:'#fff', textAlign:'center' }}>Login</Text>
      </TouchableOpacity>
    </View>
  );
}
