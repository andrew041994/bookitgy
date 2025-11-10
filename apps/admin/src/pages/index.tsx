import { useEffect, useState } from 'react';
import { api, setToken, getToken } from '../lib/api';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(()=>{
    async function boot() {
      try {
        if (!getToken()) {
          // quick demo login form is not included; assume you already have admin token.
          // For MVP, you can hardcode admin token once or log in via API elsewhere.
        }
        const me = await api.get('/me');
        setUser(me.data);
        const m = await api.get('/admin/metrics');
        setMetrics(m.data);
      } catch (e) {
        console.error(e);
      }
    }
    boot();
  }, []);

  if (!metrics) return <div style={{ padding: 24 }}>Loading admin dashboard…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Bookit GY — Admin</h1>
      <div style={{ display:'flex', gap: 16, marginTop: 16 }}>
        <Stat label="Providers" value={metrics.providers} />
        <Stat label="Clients" value={metrics.clients} />
        <Stat label="Unpaid Statements" value={metrics.unpaid} />
      </div>

      <div style={{ marginTop: 24, background:'#fff', padding: 16, borderRadius: 8 }}>
        <h3>Service Charges Collected (GYD) — by Statement Month</h3>
        <Line data={{
          labels: metrics.series.labels,
          datasets: [{ label: 'Service Charges (GYD)', data: metrics.series.values }]
        }}/>
      </div>

      <div style={{ marginTop: 24, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 16 }}>
        <ProvidersPanel />
        <StatementsPanel />
      </div>
    </div>
  );
}

function Stat({label, value}:{label:string, value:any}) {
  return (
    <div style={{ background:'#fff', padding:16, borderRadius:8, minWidth:180 }}>
      <div style={{ fontSize:12, opacity:.6 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700 }}>{value}</div>
    </div>
  );
}

function ProvidersPanel() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ (async()=>{
    const r = await api.get('/admin/providers');
    setRows(r.data);
  })(); }, []);

  async function lock(id:string){ await api.post(`/admin/providers/${id}/lock`, { reason:'Admin action' }); refresh(); }
  async function unlock(id:string){ await api.post(`/admin/providers/${id}/unlock`, {}); refresh(); }
  async function refresh(){ const r = await api.get('/admin/providers'); setRows(r.data); }

  return (
    <div style={{ background:'#fff', padding:16, borderRadius:8 }}>
      <h3>Providers</h3>
      <table width="100%" cellPadding={8}>
        <thead><tr><th>Name</th><th>Phone</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {rows.map((p:any)=>(
            <tr key={p.id}>
              <td><a href={`/providers/${p.id}`}>{p.businessName}</a></td>
              <td>{p.user?.phone}</td>
              <td>{p.isLocked ? 'Locked' : 'Active'}</td>
              <td>
                {p.isLocked
                 ? <button onClick={()=>unlock(p.id)}>Unlock</button>
                 : <button onClick={()=>lock(p.id)}>Lock</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatementsPanel() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(()=>{ (async()=>{
    const r = await api.get('/admin/statements');
    setRows(r.data);
  })(); }, []);

  async function markPaid(id:string) {
    const method = prompt('Method (cash | bank | mmg)') || 'cash';
    const ref = prompt('Reference / note') || '';
    await api.post(`/admin/statements/${id}/mark-paid`, { method, ref });
    const r = await api.get('/admin/statements');
    setRows(r.data);
  }

  return (
    <div style={{ background:'#fff', padding:16, borderRadius:8 }}>
      <h3>Statements</h3>
      <table width="100%" cellPadding={8}>
        <thead><tr><th>Period</th><th>Provider</th><th>Service (GYD)</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {rows.map((s:any)=>(
            <tr key={s.id}>
              <td>{s.periodYear}-{String(s.periodMonth).padStart(2,'0')}</td>
              <td>{s.provider?.businessName}</td>
              <td>{(s.serviceCents/100).toFixed(2)}</td>
              <td>{s.isPaid ? 'PAID' : 'UNPAID'}</td>
              <td>{!s.isPaid && <button onClick={()=>markPaid(s.id)}>Mark Paid</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
