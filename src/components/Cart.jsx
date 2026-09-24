import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import CartItem from './CartItem';
import CouponInput from './CouponInput';
import { CloseIcon } from './Icons';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

/** Slide-in cart drawer. */
export default function Cart() {
  const { isOpen, closeCart, items, subtotal, discount, count } = useCart();
  const { money } = useSettings();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => e.key === 'Escape' && closeCart();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [isOpen, closeCart]);

  return (
    <>
      <div className={`drawer-backdrop${isOpen ? ' is-open' : ''}`} onClick={closeCart} />
      <aside className={`drawer${isOpen ? ' is-open' : ''}`} aria-hidden={!isOpen} aria-label="Shopping cart">
        <header className="drawer-head">
          <h2>Your cart {count > 0 && <span className="muted">({count})</span>}</h2>
          <button className="icon-btn" onClick={closeCart} aria-label="Close cart"><CloseIcon /></button>
        </header>

        {items.length === 0 ? (
          <div className="drawer-empty">
            <p>Your cart is empty.</p>
            <Link className="btn btn-primary" to="/shop" onClick={closeCart}>Start shopping</Link>
          </div>
        ) : (
          <>
            <ul className="cart-list">
              {items.map((it) => <CartItem key={it.key} item={it} onNavigate={closeCart} />)}
            </ul>
            <footer className="drawer-foot">
              <CouponInput />
              <div className="sum-row"><span>Subtotal</span><span>{money(subtotal)}</span></div>
              {discount > 0 && <div className="sum-row discount"><span>Discount</span><span>−{money(discount)}</span></div>}
              <p className="muted small">Shipping is calculated at checkout.</p>
              <Link className="btn btn-primary btn-block" to="/checkout" onClick={closeCart}>Checkout</Link>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
