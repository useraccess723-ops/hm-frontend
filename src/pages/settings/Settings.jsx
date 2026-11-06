import { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { api } from '../../services/api';
import PageHead from '../../components/PageHead';
import SubNav from '../../components/SubNav';

const DEFAULTS = { hotel_name: 'StayFlow Hotel', check_in_time: '14:00', check_out_time: '11:00', currency: 'INR', timezone: 'Asia/Kolkata', gst_percent: 12, cancellation_hours: 48, no_show_charge: 'First night' };
export default function Settings() {
  const { notify, theme, setTheme } = useStore();
  const [form, setForm] = useState(DEFAULTS); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { api('/api/settings').then(data => setForm({ ...DEFAULTS, ...data })).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  async function save() { try { const body = { ...form, gst_percent: Number(form.gst_percent), cancellation_hours: Number(form.cancellation_hours) }; const updated = await api('/api/settings', { method: 'PUT', body: JSON.stringify(body) }); setForm({ ...DEFAULTS, ...updated }); notify('Hotel settings saved to database'); } catch (e) { notify(e.message); } }
  return <>
    <PageHead title="System settings" subtitle="Hotel profile, policies and tax" />
    <SubNav parentPath="/settings" />
    {error && <p className="note">Could not load settings: {error}</p>}
    <div className="row r-2">
      <div className="panel"><h2>Hotel profile</h2><div className="sub">Stored in the hotel database and used as operational settings</div>
        <div className="field"><label htmlFor="s-name">Hotel name</label><input id="s-name" value={form.hotel_name} onChange={set('hotel_name')} disabled={loading} /></div>
        <div className="grid2"><div className="field"><label htmlFor="s-in">Check-in time</label><input id="s-in" type="time" value={form.check_in_time} onChange={set('check_in_time')} /></div><div className="field"><label htmlFor="s-out">Check-out time</label><input id="s-out" type="time" value={form.check_out_time} onChange={set('check_out_time')} /></div></div>
        <div className="grid2"><div className="field"><label htmlFor="s-cur">Currency</label><select id="s-cur" value={form.currency} onChange={set('currency')}><option value="INR">INR (₹)</option><option value="USD">USD ($)</option></select></div><div className="field"><label htmlFor="s-tz">Time zone</label><select id="s-tz" value={form.timezone} onChange={set('timezone')}><option>Asia/Kolkata</option><option>UTC</option></select></div></div>
        <button className="btn" onClick={save} disabled={loading}>Save changes</button>
      </div>
      <div className="panel"><h2>Policies & tax</h2><div className="sub">Stored operational policies</div>
        <div className="field"><label htmlFor="gst">GST percentage</label><input id="gst" type="number" min="0" max="100" step="0.01" value={form.gst_percent} onChange={set('gst_percent')} /></div>
        <div className="field"><label htmlFor="cancel">Free cancellation cutoff (hours)</label><input id="cancel" type="number" min="0" max="720" value={form.cancellation_hours} onChange={set('cancellation_hours')} /></div>
        <div className="field"><label htmlFor="noshow">No-show charge rule</label><select id="noshow" value={form.no_show_charge} onChange={set('no_show_charge')}><option>First night</option><option>Full stay</option><option>No charge</option></select></div>
        <p className="note">These settings are persisted. Automatic GST calculation, cancellation fee collection and invoice generation still need their own workflow integration.</p>
      </div>
      <div className="panel" style={{ gridColumn: 'span 2', marginTop: 12 }}>
        <h2>Theme & Appearance</h2>
        <div className="sub">Switch between Light and Dark theme. Selected theme is saved to your account and persists across page refreshes.</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn ${theme === 'light' ? 'primary' : ''}`}
            onClick={() => { setTheme('light'); notify('Switched to Light Theme'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 600 }}
          >
            ☀️ Light Theme {theme === 'light' && '✓ (Active)'}
          </button>
          <button
            type="button"
            className={`btn ${theme === 'dark' ? 'primary' : ''}`}
            onClick={() => { setTheme('dark'); notify('Switched to Dark Theme'); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', fontWeight: 600 }}
          >
            🌙 Dark Theme {theme === 'dark' && '✓ (Active)'}
          </button>
        </div>
      </div>
    </div>
  </>;
}
