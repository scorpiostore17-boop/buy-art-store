import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { CartIcon, CloseIcon, MenuIcon } from './Icons';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';

const LINKS = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/contact', label: 'Contact' },
];

export default function Header() {
  const { settings, logoSrc } = useSettings();
  const { count, openCart } = useCart();
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <header className="header">
      <div className="container header-inner">
        <button className="icon-btn menu-btn" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}><MenuIcon /></button>

        <Link to="/" className="brand" aria-label={settings.store_name}>
          <img src={logoSrc} alt={settings.store_name} width="120" height="118" />
        </Link>

        <nav className={`nav${open ? ' is-open' : ''}`} aria-label="Main">
          <button className="icon-btn nav-close" aria-label="Close menu" onClick={() => setOpen(false)}><CloseIcon /></button>
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>{l.label}</NavLink>
          ))}
        </nav>
        {open && <div className="nav-backdrop" onClick={() => setOpen(false)} />}

        <button className="cart-btn" onClick={openCart} aria-label={`Open cart, ${count} items`}>
          <CartIcon />
          {count > 0 && <span className="cart-badge">{count}</span>}
        </button>
      </div>
    </header>
  );
}
