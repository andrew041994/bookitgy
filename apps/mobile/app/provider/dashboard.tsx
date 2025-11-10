import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import dayjs from 'dayjs';
import axios from 'axios';
import * as Location from 'expo-location';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function ProviderDashboard() {
  const [me, setMe] = useState<any>(null);
  const [totals, setTotals] = useState<any>(null);
  const [appts, setAppts] = useState<any[]>([]);

  async function load() {
    const token = (globalThis as any).authToken;
    const headers = { Authorization: `Bearer ${token}` };
    const meRes = await axios.get(`${API}/me`, { headers });
    setMe(meRes.data);
    if (meRes.data?.providerId) {
      const rt = await axios.get(`${API}/providers/${meRes.data.providerId}/running-total`);
      setTotals(rt.data);
      const from = dayjs().startOf('month').toISOString();
      const to = dayjs().endOf('month').toISOString();
      const cal = await axios.get(`${API}/providers/${meRes.data.providerId}/appointments`, { params: { from, to }, headers });
      setAppts(cal.data);
    }
  }

  useEffect(()=>{ load(); }, []);

  if (!me) return <Text>Loading…</Text>;

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>Provider Dashboard</Text>

      <TouchableOpacity
        onPress={async()=>{
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission','Location permission denied'); return; }
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            const token = (globalThis as any).authToken;
            await axios.patch(`${API}/providers/${me.providerId}/location`,
              { latitude: loc.coords.latitude, longitude: loc.coords.longitude },
              { headers: { Authorization: `Bearer ${token}` }});
            Alert.alert('Saved','Current location updated (private).');
          } catch {
            Alert.alert('Error','Unable to set location');
          }
        }}
        style={{ backgroundColor:'#111', padding:10, borderRadius:8, alignSelf:'flex-start' }}
      >
        <Text style={{ color:'#fff' }}>Update Current Location</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async()=>{
          try {
            const token = (globalThis as any).authToken;
            await axios.post(`${API}/providers/${me.providerId}/location/publish`,
              { label: undefined },
              { headers: { Authorization: `Bearer ${token}` }});
            Alert.alert('Published','Public location set to current and locked.');
          } catch (e:any) {
            Alert.alert('Error', e?.response?.data?.error || 'Unable to publish location');
          }
        }}
        style={{ backgroundColor:'#0a7', padding:10, borderRadius:8, alignSelf:'flex-start' }}
      >
        <Text style={{ color:'#fff' }}>Publish & Lock Here</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={async()=>{
          try {
            const token = (globalThis as any).authToken;
            await axios.post(`${API}/providers/${me.providerId}/location/unlock`, {},
              { headers: { Authorization: `Bearer ${token}` }});
            Alert.alert('Unlocked','You can move and publish a new public location.');
          } catch {
            Alert.alert('Error','Unable to unlock');
          }
        }}
        style={{ backgroundColor:'#c50', padding:10, borderRadius:8, alignSelf:'flex-start' }}
      >
        <Text style={{ color:'#fff' }}>Unlock Location</Text>
      </TouchableOpacity>

      {totals && (
        <View style={{ backgroundColor:'#fff', borderRadius:8, padding:12, borderWidth:1 }}>
          <Text>Month-to-date Gross: {(totals.grossCents/100).toFixed(2)} GYD</Text>
          <Text>Service %: {totals.percent}%</Text>
          <Text>Service Charge (MTD): {(totals.serviceCents/100).toFixed(2)} GYD</Text>
        </View>
      )}
      <Text style={{ fontWeight:'700', marginTop: 8 }}>This Month's Appointments</Text>
      <FlatList
        data={appts}
        keyExtractor={(a)=>a.id}
        renderItem={({item})=>(
          <View style={{ paddingVertical:8, borderBottomWidth:.5 }}>
            <Text>{dayjs(item.startsAt).format('ddd, DD MMM YYYY HH:mm')} — {item.service?.name} — {(item.priceCents/100).toFixed(2)} GYD</Text>
            <Text>Status: {item.status}</Text>
            <Text>Client: {item.client?.user?.fullName}</Text>
          </View>
        )}
      />
    </View>
  );
}
