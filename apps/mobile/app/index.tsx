import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, Image, Linking } from 'react-native';
import axios from 'axios';
import { loadAuth } from '../src/auth';
import { theme } from '../src/theme';
import * as Location from 'expo-location';
import { Button } from 'react-native';
import { router } from 'expo-router';

const API = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

export default function Home() {
  const [q, setQ] = useState('');
  const [list, setList] = useState<any[]>([]);
  const [role, setRole] = useState<string>('');
  const [radius, setRadius] = useState<number>(10);
  const radii = [5,10,15,20,25,30];

  async function load() {
    const { data } = await axios.get(`${API}/providers`, { params: { q }});
    setList(data);
  }
useEffect(() => {
  async function init() {
    try {
      await load(); // loads providers list

      const { role } = await loadAuth();
      setRole(role || "");
    } catch (e) {
      console.log("Init error:", e);
      setRole("");
    }
  }

  init();
}, []);


  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 24, fontWeight: '700' }}>Bookit GY</Text>
      <Text style={{ color: theme.subtext }}>{role ? `Signed in as ${role}` : 'You are not signed in'}</Text>

      <Button 
        title="Profile" 
        onPress={() => router.push("/profile")}
      />

      {!role && (
        <View style={{ flexDirection:'row', gap: 8 }}>
          <Link href="/auth/login"><Text style={{ textDecorationLine:'underline' }}>Login</Text></Link>
          <Link href="/auth/register"><Text style={{ textDecorationLine:'underline' }}>Register</Text></Link>
        </View>
      )}

      {role === 'PROVIDER' && (
        <View>
          <Link href="/provider/dashboard"><Text style={{ textDecorationLine:'underline' }}>Go to Provider Dashboard</Text></Link>
        </View>
      )}

      <View style={{ flexDirection:'row', gap:8, alignItems:'center', flexWrap:'wrap' }}>
        <TouchableOpacity
          onPress={async()=>{
            try {
              const { status } = await Location.requestForegroundPermissionsAsync();
              if (status !== 'granted') { alert('Location permission denied'); return; }
              const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
              const { data } = await axios.get(`${API}/providers`, { params: { lat: loc.coords.latitude, lng: loc.coords.longitude, radiusKm: radius, q } });
              setList(data);
            } catch (e) {
              alert('Unable to get nearby providers');
            }
          }}
          style={{ padding:8, borderWidth:1, borderRadius:8 }}
        >
          <Text>Near me ({radius} km)</Text>
        </TouchableOpacity>

        <View style={{ flexDirection:'row', gap:6, alignItems:'center' }}>
          <Text>Radius:</Text>
          <FlatList
            data={radii}
            horizontal
            keyExtractor={(v)=>String(v)}
            renderItem={({item})=>(
              <TouchableOpacity onPress={()=>setRadius(item)} style={{ paddingVertical:4, paddingHorizontal:8, borderWidth:1, borderRadius:6, backgroundColor: item===radius ? '#ddd' : '#fff', marginRight:6 }}>
                <Text>{item}km</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      <TextInput
        placeholder="Search barber, nails, stylist..."
        value={q}
        onChangeText={setQ}
        onSubmitEditing={load}
        style={{ borderWidth: 1, borderRadius: 8, padding: 12 }}
      />
      <FlatList
        data={list}
        keyExtractor={(p)=>p.id}
        renderItem={({item})=>(
          <View style={{ paddingVertical: 10, borderBottomWidth:.5 }}>
            <Link href={{ pathname: `/provider/${item.id}` }}>
              <View style={{ flexDirection:'row', gap: 12 }}>
                <Image source={{ uri: item.avatarUrl || 'https://placehold.co/80x80' }} style={{ width: 64, height: 64, borderRadius: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight:'600' }}>{item.businessName}</Text>
                  <Text>{item.category} {item._distanceKm != null ? `• ${item._distanceKm.toFixed(1)} km` : ''}</Text>
                  <Text numberOfLines={1} style={{ opacity:.6 }}>{item.publishedLabel || item.bio || ''}</Text>
                </View>
              </View>
            </Link>

            {item.publishedLatitude != null && item.publishedLongitude != null && (
              <TouchableOpacity
                onPress={()=>{
                  const url = `https://www.google.com/maps/dir/?api=1&destination=${item.publishedLatitude},${item.publishedLongitude}`;
                  Linking.openURL(url);
                }}
                style={{ marginTop:6, padding:8, borderWidth:1, borderRadius:8, alignSelf:'flex-start' }}
              >
                <Text>Directions</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}
