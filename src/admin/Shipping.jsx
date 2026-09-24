import { useEffect, useMemo, useState } from 'react';
import ErrorState from '../components/ErrorState';
import Loading from '../components/Loading';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import { listShippingAdmin, saveShippingRows } from '../services/adminApi';
import { PageHead, Switch } from './ui';

export default function Shipping() {
  const { settings } = useSettings();
  const toast = useToast();
  const rates = useAsync(listShippingAdmin, []);
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState('');
  const [bulk, setBulk] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (rates.data) setRows(rates.data.map((r) => ({ ...r }))); }, [rates.data]);

  const dirty = useMemo(() => {
    const orig = new Map((rates.data || []).map((r) => [r.id, r]));
    return rows.filter((r) => {
      const o = orig.get(r.id);
      return o && (Number(o.price) !== Number(r.price) || o.is_active !== r.is_active);
    });
  }, [rows, rates.data]);

  const patch = (id, p) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...p } : r)));
  const applyBulk = () => {
    if (bulk === '' || Number(bulk) < 0) return toast.error('Enter a valid price.');
    setRows((rs) => rs.map((r) => ({ ...r, price: Number(bulk) })));
  };
  const save = async () => {
    if (dirty.some((r) => r.price === '' || Number(r.price) < 0 || Number.isNaN(Number(r.price)))) return toast.error('Every price must be a number of 0 or more.');
    setBusy(true);
    try { await saveShippingRows(dirty); toast.success(`${dirty.length} wilaya${dirty.length === 1 ? '' : 's'} updated`); rates.reload(true); } catch (e) { toast.error(e.message); } finally { setBusy(false); }
  };

  const shown = rows.filter((r) => `${r.wilaya_code} ${r.name}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHead title="Shipping" subtitle="Delivery price for each wilaya. Disabled wilayas can't be selected at checkout.">
        <input type="search" placeholder="Search wilaya" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search wilaya" />
        <button className="btn btn-primary" onClick={save} disabled={busy || !dirty.length}>{busy ? 'Saving…' : `Save changes${dirty.length ? ` (${dirty.length})` : ''}`}</button>
      </PageHead>

      <div className="panel bulk">
        <span>Set the same price for all wilayas:</span>
        <input type="number" min="0" value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={settings.currency} aria-label="Bulk price" />
        <button className="btn btn-outline btn-sm" onClick={applyBulk}>Apply to all</button>
        <small className="muted">Then press "Save changes".</small>
      </div>

      {rates.loading ? <Loading /> : rates.error ? <ErrorState message={rates.error} onRetry={rates.reload} /> : (
        <div className="panel table-wrap">
          <table className="table">
            <thead><tr><th>#</th><th>Wilaya</th><th>Price ({settings.currency})</th><th>Active</th></tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={dirty.some((d) => d.id === r.id) ? 'is-dirty' : ''}>
                  <td className="muted">{r.wilaya_code}</td><td>{r.name}</td>
                  <td><input className="narrow" type="number" min="0" step="10" value={r.price} onChange={(e) => patch(r.id, { price: e.target.value })} aria-label={`Price for ${r.name}`} /></td>
                  <td><Switch checked={r.is_active} onChange={(v) => patch(r.id, { is_active: v })} /></td>
                </tr>
              ))}
              {!shown.length && <tr><td colSpan={4} className="muted">No wilaya matches your search.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
