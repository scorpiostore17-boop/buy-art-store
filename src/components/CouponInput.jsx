import { useState } from 'react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

export default function CouponInput() {
  const { couponCode, discount, applyCoupon, removeCoupon } = useCart();
  const { money } = useSettings();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const r = await applyCoupon(value);
    setBusy(false);
    setMsg(r);
    if (r.ok) setValue('');
  };

  if (couponCode) {
    return (
      <div className="coupon-applied">
        <span><strong>{couponCode}</strong> applied · you save {money(discount)}</span>
        <button type="button" className="link-btn" onClick={() => { removeCoupon(); setMsg(null); }}>Remove</button>
      </div>
    );
  }
  return (
    <form className="coupon" onSubmit={submit} noValidate>
      <div className="coupon-row">
        <input value={value} onChange={(e) => setValue(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon code" autoComplete="off" />
        <button className="btn btn-outline" disabled={busy || !value.trim()}>{busy ? 'Checking…' : 'Apply'}</button>
      </div>
      {msg && !msg.ok && <p className="field-error" role="alert">{msg.message}</p>}
    </form>
  );
}
