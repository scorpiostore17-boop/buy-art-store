import { useState } from 'react';
import ErrorState from '../components/ErrorState';
import Loading from '../components/Loading';
import { PlusIcon } from '../components/Icons';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import useAsync from '../hooks/useAsync';
import useConfirm from '../hooks/useConfirm';
import { deleteCoupon, listCategoriesAdmin, listCouponsAdmin, listProductOptions, saveCoupon } from '../services/adminApi';
import { formatDate, fromLocalInput, toLocalInput } from '../utils/format';
import { Modal, PageHead, Picker, Switch } from './ui';

const BLANK = { code: '', discount_type: 'percentage', discount_value: '', min_order: 0, expires_at: '', usage_limit: '', is_active: true };

function CouponForm({ coupon, products, categories, onClose, onSaved }) {
  const toast = useToast();
  const { settings } = useSettings();
  const [f, setF] = useState(coupon ? { ...coupon, expires_at: toLocalInput(coupon.expires_at), usage_limit: coupon.usage_limit ?? '' } : BLANK);
  const [pIds, setPIds] = useState(coupon ? coupon.coupon_products.map((x) => x.product_id) : []);
  const [cIds, setCIds] = useState(coupon ? coupon.coupon_categories.map((x) => x.category_id) : []);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const value = Number(f.discount_value);
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(f.code.trim())) return setError('Code must be 3-32 letters, numbers, dashes or underscores.');
    if (!(value > 0)) return setError('Enter a discount value greater than 0.');
    if (f.discount_type === 'percentage' && value > 100) return setError('A percentage discount cannot exceed 100.');
    if (f.usage_limit !== '' && !(parseInt(f.usage_limit, 10) > 0)) return setError('Usage limit must be a positive number (or empty for unlimited).');
    setBusy(true);
    try {
      await saveCoupon({ ...f, expires_at: fromLocalInput(f.expires_at) }, pIds, cIds);
      toast.success('Coupon saved');
      onSaved();
    } catch (err) {
      setError(/duplicate|unique/i.test(err.message) ? 'A coupon with this code already exists.' : err.message);
    } finally { setBusy(false); }
  };

  return (
    <Modal title={coupon ? 'Edit coupon' : 'New coupon'} wide onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>Cancel</button><button className="btn btn-primary" form="coupon-form" disabled={busy}>{busy ? 'Saving…' : 'Save coupon'}</button></>}>
      <form id="coupon-form" className="form-stack" onSubmit={submit} noValidate>
        {error && <p className="notice error" role="alert">{error}</p>}
        <div className="form-row">
          <label className="field">Code *<input value={f.code} onChange={(e) => setF((s) => ({ ...s, code: e.target.value.toUpperCase() }))} /></label>
          <label className="field">Type
            <select value={f.discount_type} onChange={set('discount_type')}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed amount ({settings.currency})</option></select>
          </label>
        </div>
        <div className="form-row">
          <label className="field">Value *<input type="number" min="0" value={f.discount_value} onChange={set('discount_value')} /></label>
          <label className="field">Minimum order ({settings.currency})<input type="number" min="0" value={f.min_order} onChange={set('min_order')} /></label>
        </div>
        <div className="form-row">
          <label className="field">Expires<input type="datetime-local" value={f.expires_at} onChange={set('expires_at')} /></label>
          <label className="field">Usage limit<input type="number" min="1" value={f.usage_limit} onChange={set('usage_limit')} placeholder="Unlimited" /></label>
        </div>
        <Switch checked={f.is_active} onChange={(v) => setF((s) => ({ ...s, is_active: v }))} label="Active" />
        <p className="muted small">Leave both lists empty to apply the coupon to the whole cart. If you pick products and/or categories, only those items receive the discount.</p>
        <div className="form-row">
          <fieldset className="box"><legend>Specific products</legend><Picker options={products.map((p) => ({ id: p.id, label: p.name }))} selected={pIds} onChange={setPIds} placeholder="Search products" empty="No products" /></fieldset>
          <fieldset className="box"><legend>Specific categories</legend><Picker options={categories.map((c) => ({ id: c.id, label: c.name }))} selected={cIds} onChange={setCIds} placeholder="Search categories" empty="No categories" /></fieldset>
        </div>
      </form>
    </Modal>
  );
}

export default function Coupons() {
  const toast = useToast();
  const { money, settings } = useSettings();
  const [confirm, dialog] = useConfirm();
  const coupons = useAsync(listCouponsAdmin, []);
  const products = useAsync(listProductOptions, []);
  const cats = useAsync(listCategoriesAdmin, []);
  const [editing, setEditing] = useState(null);

  const toggle = async (c, v) => {
    try {
      await saveCoupon({ ...c, is_active: v }, c.coupon_products.map((x) => x.product_id), c.coupon_categories.map((x) => x.category_id));
      coupons.reload(true);
    } catch (e) { toast.error(e.message); }
  };
  const remove = async (c) => {
    if (!(await confirm({ title: 'Delete coupon?', message: `Code "${c.code}" will stop working. Past orders keep their discount.`, confirmLabel: 'Delete coupon' }))) return;
    try { await deleteCoupon(c.id); toast.success('Coupon deleted'); coupons.reload(true); } catch (e) { toast.error(e.message); }
  };
  const expired = (c) => c.expires_at && new Date(c.expires_at) < new Date();

  return (
    <>
      <PageHead title="Coupons" subtitle="Discount codes customers can apply at checkout.">
        <button className="btn btn-primary" onClick={() => setEditing('new')}><PlusIcon width={18} height={18} /> New coupon</button>
      </PageHead>
      {coupons.loading ? <Loading /> : coupons.error ? <ErrorState message={coupons.error} onRetry={coupons.reload} /> : (
        <div className="panel table-wrap">
          <table className="table">
            <thead><tr><th>Code</th><th>Discount</th><th>Min. order</th><th>Applies to</th><th>Used</th><th>Expires</th><th>Active</th><th /></tr></thead>
            <tbody>
              {coupons.data.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.code}</strong></td>
                  <td>{c.discount_type === 'percentage' ? `${Number(c.discount_value)}%` : money(c.discount_value)}</td>
                  <td>{c.min_order > 0 ? money(c.min_order) : '-'}</td>
                  <td className="muted">{c.coupon_products.length + c.coupon_categories.length === 0 ? 'Whole cart' : `${c.coupon_products.length} products, ${c.coupon_categories.length} categories`}</td>
                  <td>{c.used_count}{c.usage_limit ? ` / ${c.usage_limit}` : ''}</td>
                  <td className={expired(c) ? 'text-danger' : 'muted'}>{c.expires_at ? formatDate(c.expires_at, { dateStyle: 'medium' }) : 'Never'}</td>
                  <td><Switch checked={c.is_active} onChange={(v) => toggle(c, v)} /></td>
                  <td className="row-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => setEditing(c)}>Edit</button>
                    <button className="btn btn-ghost btn-sm danger" onClick={() => remove(c)}>Delete</button>
                  </td>
                </tr>
              ))}
              {!coupons.data.length && <tr><td colSpan={8} className="muted">No coupons yet. Prices are shown in {settings.currency}.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {editing && !products.loading && !cats.loading && (
        <CouponForm coupon={editing === 'new' ? null : editing} products={products.data || []} categories={cats.data || []} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); coupons.reload(true); }} />
      )}
      {dialog}
    </>
  );
}
