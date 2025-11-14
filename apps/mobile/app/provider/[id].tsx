import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking } from 'react-native';
import dayjs from 'dayjs';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function ProviderScreen() {
  const { id } = useLocalSearchParams<{id:string}>();
  const [provider, setProvider] = useState<any>(null);

  async function load() {
    const { data } = await axios.get(`${API}/providers/${id}`);
    setProvider(data);
  }

  useEffect(() => {
  if (!id) return;   // Prevent effect from running before id is ready
  load();
}, [id]);

  if (!provider) return <Text>Loading...</Text>;

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>{provider.businessName}</Text>
      <Text>{provider.category}</Text>
      {provider.publishedLatitude != null && provider.publishedLongitude != null && (
        <TouchableOpacity
          onPress={()=> Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${provider.publishedLatitude},${provider.publishedLongitude}`)}
          style={{ padding:8, borderWidth:1, borderRadius:8, alignSelf:'flex-start' }}
        >
          <Text>Directions</Text>
        </TouchableOpacity>
      )}

      <Text style={{ marginTop: 10, fontWeight: '700' }}>Services</Text>
      <FlatList
        data={provider.services}
        keyExtractor={(s)=>s.id}
        renderItem={({item})=>(
          <View style={{ paddingVertical: 8, borderBottomWidth: .5 }}>
            <Text style={{ fontWeight:'600' }}>{item.name}</Text>
            <Text>{(item.priceCents/100).toFixed(2)} GYD • {item.durationMin} min</Text>
            <TouchableOpacity
              onPress={async ()=>{
                const startsAt = dayjs().add(1,'day').hour(10).minute(0).second(0).toISOString();
                const token = (globalThis as any).authToken;
                const { data } = await axios.post(`${API}/appointments`,
                  { providerId: provider.id, serviceId: item.id, startsAt },
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                alert('Appointment requested. Provider will confirm.');
              }}
              style={{ marginTop: 6, padding: 10, backgroundColor: '#111', borderRadius: 8 }}
            >
              <Text style={{ color: 'white', textAlign:'center' }}>Book</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
