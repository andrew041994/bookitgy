import { useState } from 'react';
import { TouchableOpacity, Alert } from 'react-native';
import axios from 'axios';
import { saveAuth } from '../../src/auth';
import * as Location from 'expo-location';
import { StyleSheet, TextInput, View, Text, Button } from "react-native";


const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function Register() {
  const [role, setRole] = useState<'CLIENT'|'PROVIDER'>('CLIENT');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('Barber');
  const [email, setEmail] = useState('');
  const [identifier, setIdentifier] = useState('');

  async function onRegister() {
    try {
      const payload:any = { role, fullName, email, phone, password };
      if (role === 'PROVIDER') {
        // Ask for permission to attach current coords (private; not published)
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            payload.latitude = loc.coords.latitude;
            payload.longitude = loc.coords.longitude;
          }
        } catch {}
        Object.assign(payload, { businessName, category });
      }
      const { data } = await axios.post(`${API}/auth/register`, payload);
      await saveAuth(data.token, role);
      Alert.alert('Registered', role === 'PROVIDER' ? 'Provider account created.' : 'Client account created');
    } catch (e:any) {
      Alert.alert('Failed', e?.response?.data?.error || 'Error');
    }
  }
      


  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Register</Text>
      <View style={{ flexDirection:'row', gap: 8 }}>
        <TouchableOpacity onPress={()=>setRole('CLIENT')} style={{ padding:8, borderWidth:1, borderRadius:8, backgroundColor: role==='CLIENT'?'#ddd':'#fff' }}><Text>Client</Text></TouchableOpacity>
        <TouchableOpacity onPress={()=>setRole('PROVIDER')} style={{ padding:8, borderWidth:1, borderRadius:8, backgroundColor: role==='PROVIDER'?'#ddd':'#fff' }}><Text>Provider</Text></TouchableOpacity>
      </View>
      <TextInput placeholder="Full name" value={fullName} onChangeText={setFullName} style={{ borderWidth:1, borderRadius:8, padding:10 }}/>
      
      <TextInput placeholder="Email" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} style={styles.input}/>
      <TextInput placeholder="Phone (WhatsApp)" keyboardType="phone-pad" autoCapitalize="none" value={phone} onChangeText={setPhone} style={styles.input}/>
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={{ borderWidth:1, borderRadius:8, padding:10 }}/>
      {role==='PROVIDER' && (<>
        <TextInput placeholder="Business name" value={businessName} onChangeText={setBusinessName} style={{ borderWidth:1, borderRadius:8, padding:10 }}/>
        <TextInput placeholder="Category (e.g.,Hairdresser, Barber)" value={category} onChangeText={setCategory} style={{ borderWidth:1, borderRadius:8, padding:10 }}/>
      </>)}
      <TouchableOpacity onPress={onRegister} style={{ backgroundColor:'#111', padding:12, borderRadius:8 }}>
        <Text style={{ color:'#fff', textAlign:'center' }}>Create account</Text>
      </TouchableOpacity>
    </View>

    
  );



}

const styles = StyleSheet.create({
        input: {
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 10,
       },
      });