import { useState } from 'react';
import { api, setToken } from '../lib/api';

export default function AdminLogin() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  async function onLogin(e:any) {
    e.preventDefault();
    setMsg('');
    try {
      const { data } = await api.post('/auth/login', { phone, password });
      if (data.role !== 'ADMIN') {
        setMsg('This account is not an ADMIN.');
        return;
      }
      setToken(data.token);
      setMsg('Logged in. Go to Dashboard.');
      window.location.href = '/';
    } catch (e:any) {
      setMsg(e?.response?.data?.error || 'Login failed');
    }
  }

  return (
    <div style={{ display:'grid', placeItems:'center', height:'100vh' }}>
      <form onSubmit={onLogin} style={{ padding:24, border:'1px solid #eee', borderRadius:8, width:360, background:'#fff' }}>
        <h2>Admin Login</h2>
        <div style={{ display:'grid', gap:8, marginTop:12 }}>
          <input placeholder="Phone (+592…)" value={phone} onChange={e=>setPhone(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={e=>setPassword(e.target.value)} />
          <button type="submit">Login</button>
          <div style={{ color:'#d00', minHeight:24 }}>{msg}</div>
        </div>
      </form>
    </div>
  );
}
