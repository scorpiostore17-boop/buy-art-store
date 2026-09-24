import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import CartItem from '../components/CartItem';
import CouponInput from '../components/CouponInput';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import { CheckIcon } from '../components/Icons';
import Loading from '../components/Loading';
import { useCart } from '../context/CartContext';
import { useCatalog } from '../context/CatalogContext';
import { useSettings } from '../context/SettingsContext';
import useAsync from '../hooks/useAsync';
import { fetchShippingRates, placeOrder } from '../services/api';
import { sendOrderConfirmation } from '../services/emailjs';
import { isEmail, isPhone, normalizePhone } from '../utils/validation';

const EMPTY = { name: '', phone: '', email: '', wilaya: '', municipality: '', neighborhood: '', address: '', note: '' };

function Summary({ shipping }) {
  const { items, subtotal, discount, total } = useCart();
  const { money } = useSettings();
  return (
    <aside className="summary card-box" aria-label="Order summary">
      <h2>Order summary</h2>
      <ul className="cart-list">{items.map((it) => <CartItem key={it.key} item={it} compact readOnly />)}</ul>
      <CouponInput />
      <div className="sum-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
      <div className={`sum-row${discount > 0 ? ' discount' : ''}`}><span>Discount</span><span>{discount > 0 ? `−${money(discount)}` : money(0)}</span></div>
      <div className="sum-row"><span>Shipping</span><span>{shipping.wilaya ? money(shipping.price) : 'Select wilaya'}</span></div>
      <div className="sum-row total"><span>Total</span><span>{money(total)}</span></div>
    </aside>
  );
}

function Success({ done }) {
  const { money } = useSettings();
  const { order, customer, emailed } = done;
  return (
    <div className="container success">
      <div className="success-badge"><CheckIcon width={36} height={36} /></div>
      <h1>Thank you, {customer.customer_name.split(' ')[0]}!</h1>
      <p className="lead">Your order <strong>#{order.order_number}</strong> has been received. We will contact you on {customer.phone} to confirm delivery.</p>
      {emailed && customer.email && <p className="muted">A confirmation was sent to {customer.email}.</p>}
      <div className="card-box success-card">
        <ul className="plain">
          {order.items.map((i) => (
            <li key={i.variant_id} className="sum-row">
              <span>{i.qty} × {i.name}{(i.size !== 'One size' || i.color_name) && ` (${[i.size !== 'One size' && i.size, i.color_name].filter(Boolean).join(' / ')})`}</span>
              <span>{money(i.unit_price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="sum-row"><span>Subtotal</span><span>{money(order.subtotal)}</span></div>
        {order.discount > 0 && <div className="sum-row discount"><span>Discount</span><span>−{money(order.discount)}</span></div>}
        <div className="sum-row"><span>Shipping</span><span>{money(order.shipping)}</span></div>
        <div className="sum-row total"><span>Total</span><span>{money(order.total)}</span></div>
        <p className="muted small">Deliver to: {customer.address}, {customer.municipality}, {customer.wilaya}</p>
      </div>
      <Link to="/shop" className="btn btn-primary btn-lg">Continue shopping</Link>
    </div>
  );
}

export default function Checkout() {
  const { items, couponCode, shipping, setShipping, clear } = useCart();
  const { settings } = useSettings();
  const catalog = useCatalog();
  const rates = useAsync(fetchShippingRates, []);
  const [form, setForm] = useState({ ...EMPTY, wilaya: shipping.wilaya });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const formRef = useRef(null);

  // keep the shipping price in sync with the selected wilaya (and refreshed rates)
  useEffect(() => {
    if (!rates.data || !form.wilaya) return;
    const r = rates.data.find((x) => x.name === form.wilaya);
    if (r) setShipping(r.name, r.price); else setShipping('', 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.wilaya, rates.data]);

  if (done) return <Success done={done} />;
  if (!items.length) {
    return <div className="container"><EmptyState title="Your cart is empty" text="Add something you like before checking out." actionLabel="Go to shop" actionTo="/shop" /></div>;
  }
  if (rates.loading) return <Loading />;
  if (rates.error) return <div className="container"><ErrorState message={rates.error} onRetry={rates.reload} /></div>;

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (form.name.trim().length < 3) e.name = 'Enter your full name';
    if (!isPhone(form.phone)) e.phone = 'Enter a valid phone number (e.g. 0555 12 34 56)';
    if (form.email && !isEmail(form.email)) e.email = 'Enter a valid email or leave it empty';
    if (!form.wilaya) e.wilaya = 'Choose your wilaya';
    if (!form.municipality.trim()) e.municipality = 'Enter your municipality';
    if (form.address.trim().length < 5) e.address = 'Enter a detailed address';
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setFormError('');
    if (Object.keys(e).length) {
      formRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    setBusy(true);
    try {
      const customer = {
        customer_name: form.name.trim(),
        phone: normalizePhone(form.phone),
        email: form.email.trim() || null,
        wilaya: form.wilaya,
        municipality: form.municipality.trim(),
        neighborhood: form.neighborhood.trim() || null,
        address: form.address.trim(),
        note: form.note.trim() || null,
      };
      // 1-6: order, customer, items + variants, shipping, discount, total and stock are saved atomically by the database
      const order = await placeOrder(customer, items, couponCode);
      // 7: confirmation email (a mail failure must never undo a successful order)
      let emailed = false;
      if (settings.emailjs_service_id && settings.emailjs_template_id && settings.emailjs_public_key) {
        try { await sendOrderConfirmation({ order, customer, settings }); emailed = true; } catch (err) { console.warn('EmailJS failed', err); }
      }
      // 8-9: success + clear cart
      clear();
      setDone({ order, customer, emailed });
      window.scrollTo(0, 0);
      catalog.reload();
    } catch (err) {
      setFormError(err.message || 'Could not place your order. Please try again.');
      if (/stock|available|coupon/i.test(err.message || '')) catalog.reload();
    } finally {
      setBusy(false);
    }
  };

  const field = (k, label, props = {}) => (
    <label className="field">
      {label}
      <input value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <span className="field-error">{errors[k]}</span>}
    </label>
  );

  return (
    <div className="container checkout">
      <h1>Checkout</h1>
      <div className="checkout-grid">
        <form ref={formRef} className="card-box" onSubmit={submit} noValidate>
          <h2>Delivery details</h2>
          <div className="form-row">
            {field('name', 'Full name *', { autoComplete: 'name' })}
            {field('phone', 'Phone *', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '05 55 12 34 56' })}
          </div>
          {field('email', 'Email (for your confirmation)', { type: 'email', autoComplete: 'email' })}
          <div className="form-row">
            <label className="field">
              Wilaya *
              <select value={form.wilaya} onChange={set('wilaya')} aria-invalid={!!errors.wilaya}>
                <option value="">Select your wilaya</option>
                {rates.data.map((r) => <option key={r.id} value={r.name}>{r.wilaya_code} - {r.name}</option>)}
              </select>
              {errors.wilaya && <span className="field-error">{errors.wilaya}</span>}
            </label>
            {field('municipality', 'Municipality *')}
          </div>
          {field('neighborhood', 'Neighborhood')}
          {field('address', 'Detailed address *', { autoComplete: 'street-address' })}
          <label className="field">Delivery note<textarea rows={3} value={form.note} onChange={set('note')} placeholder="Landmarks, preferred time…" /></label>

          {formError && <p className="notice error" role="alert">{formError}</p>}
          <button className="btn btn-primary btn-lg btn-block" disabled={busy}>{busy ? 'Placing your order…' : 'Place order'}</button>
        </form>
        <Summary shipping={shipping} />
      </div>
    </div>
  );
}
