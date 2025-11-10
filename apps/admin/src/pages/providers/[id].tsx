import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function ProviderDetail() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const [prov, setProv] = useState<any>(null);
  const [stmts, setStmts] = useState<any[]>([]);
  const [percent, setPercent] = useState<string>('');
  const [promo, setPromo] = useState<string>('');

  useEffect(()=>{
    if (!id) return;
    (async()=>{
      const p = await api.get(`/providers/${id}`);
      setProv(p.data);
      setPercent(String(p.data.servicePercent));
      const s = await api.get('/admin/statements', { params: { providerId: id } });
      setStmts(s.data);
    })();
  }, [id]);

  async function savePercent() {
    await api.post(`/admin/providers/${id}/set-percent`, { percent });
    const p = await api.get(`/providers/${id}`);
    setProv(p.data);
    alert('Updated.');
  }
  async function applyPromo() {
    await api.post(`/admin/providers/${id}/apply-promo`, { freeAppointments: Number(promo)||0 });
    const p = await api.get(`/providers/${id}`);
    setProv(p.data);
    alert('Promo applied.');
  }
  async function markPaid(stid: string) {
    const method = prompt('Method (cash | bank | mmg)') || 'cash';
    const ref = prompt('Reference / note') || '';
    await api.post(`/admin/statements/${stid}/mark-paid`, { method, ref });
    const s = await api.get('/admin/statements', { params: { providerId: id } });
    setStmts(s.data);
  }

  if (!prov) return <div style={{ padding:24 }}>Loading…</div>;

  return (
    <div style={{ padding:24 }}>
      <a href="/">&larr; Back</a>
      <h1>{prov.businessName}</h1>
      <div>Phone: {prov.user?.phone}</div>
      <div>Category: {prov.category}</div>
      <div>Status: {prov.isLocked ? 'Locked' : 'Active'}</div>
      <div>Service %: {prov.servicePercent}%</div>
      <div>Promo Free Appointments Balance: {prov.promoFreeAppointments || 0}</div>

      <div style={{ marginTop:16, padding:16, border:'1px solid #eee', borderRadius:8 }}>
        <h3>Adjustments</h3>
        <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:8 }}>
          <label>Service %</label>
          <input value={percent} onChange={e=>setPercent(e.target.value)} style={{ width:80 }} />
          <button onClick={savePercent}>Save</button>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          <label>Apply Promo (free appts)</label>
          <input value={promo} onChange={e=>setPromo(e.target.value)} style={{ width:120 }} />
          <button onClick={applyPromo}>Apply</button>
        </div>
      </div>

      <div style={{ marginTop:16, padding:16, border:'1px solid #eee', borderRadius:8 }}>
        <h3>Statements</h3>
        <table width="100%" cellPadding={8}>
          <thead><tr><th>Period</th><th>Service (GYD)</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {stmts.map((s:any)=>(
              <tr key={s.id}>
                <td>{s.periodYear}-{String(s.periodMonth).padStart(2,'0')}</td>
                <td>{(s.serviceCents/100).toFixed(2)}</td>
                <td>{s.isPaid ? 'PAID' : 'UNPAID'}</td>
                <td>{!s.isPaid && <button onClick={()=>markPaid(s.id)}>Mark Paid</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
