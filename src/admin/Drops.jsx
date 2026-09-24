import { useState } from 'react';
import ErrorState from '../components/ErrorState';
import Loading from '../components/Loading';
import { PlusIcon } from '../components/Icons';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import useConfirm from '../hooks/useConfirm';
import { deleteDrop, listDropsAdmin, listProductOptions, saveDrop } from '../services/adminApi';
import { formatDate, fromLocalInput, toLocalInput } from '../utils/format';
import ImageUploader from './ImageUploader';
import { Modal, PageHead, Picker, Switch, cap } from './ui';

function DropForm({ drop, products, onClose, onSaved }) {
  const toast = useToast();
  const [f, setF] = useState(() => (drop ? {
    ...drop, start_at: toLocalInput(drop.start_at), end_at: toLocalInput(drop.end_at),
  } : {
    name: '', description: '', banner_url: '', start_at: '', end_at: '', is_enabled: true,
    hide_products_before_start: true, hide_products_after_end: false,
  }));
  const [ids, setIds] = useState(drop ? drop.drop_products.map((x) => x.product_id) : []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setError('Give the drop a name.');
    const start = fromLocalInput(f.start_at);
    const end = fromLocalInput(f.end_at);
    if (!start || !end) return setError('Choose a start and an end date.');
    if (new Date(end) <= new Date(start)) return setError('The end date must be after the start date.');
    setBusy(true);
    setError('');
    try {
      await saveDrop({ ...f, start_at: start, end_at: end }, ids);
      toast.success('Drop saved');
      onSaved();
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return (
    <Modal title={drop ? 'Edit drop' : 'New drop'} wide onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="drop-form" disabled={busy}>{busy ? 'Saving…' : 'Save drop'}</button></>}>
      <form id="drop-form" className="form-stack" onSubmit={submit} noValidate>
        {error && <p className="notice error" role="alert">{error}</p>}
        <label className="field">Name *<input value={f.name} onChange={set('name')} /></label>
        <label className="field">Description<textarea rows={3} value={f.description || ''} onChange={set('description')} /></label>
        <ImageUploader label="Banner" value={f.banner_url} onChange={(url) => setF((s) => ({ ...s, banner_url: url }))} folder="drops" ratio="16 / 7" />
        <div className="form-row">
          <label className="field">Starts *<input type="datetime-local" value={f.start_at} onChange={set('start_at')} /></label>
          <label className="field">Ends *<input type="datetime-local" value={f.end_at} onChange={set('end_at')} /></label>
        </div>
        <p className="muted small">Times use your current timezone. The status (scheduled / live / ended) is decided by the database clock, not by visitors' browsers.</p>
        <div className="switch-col">
          <Switch checked={f.is_enabled} onChange={(v) => setF((s) => ({ ...s, is_enabled: v }))} label="Enabled (turn off to keep it as a draft)" />
          <Switch checked={f.hide_products_before_start} onChange={(v) => setF((s) => ({ ...s, hide_products_before_start: v }))} label="Hide its products in the shop until the drop starts" />
          <Switch checked={f.hide_products_after_end} onChange={(v) => setF((s) => ({ ...s, hide_products_after_end: v }))} label="Hide its products again after the drop ends" />
        </div>
        <fieldset className="box">
          <legend>Products in this drop</legend>
          <Picker options={products.map((p) => ({ id: p.id, label: p.name }))} selected={ids} onChange={setIds} placeholder="Search products" empty="No products yet" />
        </fieldset>
      </form>
    </Modal>
  );
}

export default function Drops() {
  const toast = useToast();
  const [confirm, dialog] = useConfirm();
  const drops = useAsync(listDropsAdmin, []);
  const products = useAsync(listProductOptions, []);
  const [editing, setEditing] = useState(null);

  const remove = async (d) => {
    if (!(await confirm({ title: 'Delete drop?', message: `"${d.name}" will be removed. Its products stay in the store.`, confirmLabel: 'Delete drop' }))) return;
    try { await deleteDrop(d.id); toast.success('Drop deleted'); drops.reload(true); } catch (e) { toast.error(e.message); }
  };

  return (
    <>
      <PageHead title="Drops" subtitle="Timed releases with a public countdown.">
        <button className="btn btn-primary" onClick={() => setEditing('new')}><PlusIcon width={18} height={18} /> New drop</button>
      </PageHead>
      {drops.loading ? <Loading /> : drops.error ? <ErrorState message={drops.error} onRetry={drops.reload} /> : (
        <div className="panel table-wrap">
          <table className="table">
            <thead><tr><th>Name</th><th>Status</th><th>Starts</th><th>Ends</th><th>Products</th><th /></tr></thead>
            <tbody>
              {drops.data.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td><span className={`status status-drop-${d.status}`}>{cap(d.status)}</span></td>
                  <td>{formatDate(d.start_at)}</td><td>{formatDate(d.end_at)}</td><td>{d.drop_products.length}</td>
                  <td className="row-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(d)}>Edit</button>
                    <button className="btn btn-ghost btn-sm danger" onClick={() => remove(d)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!drops.data.length && <tr><td colSpan={6} className="muted">No drops yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {editing && !products.loading && (
        <DropForm drop={editing === 'new' ? null : editing} products={products.data || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); drops.reload(true); }} />
      )}
      {dialog}
    </>
  );
}
