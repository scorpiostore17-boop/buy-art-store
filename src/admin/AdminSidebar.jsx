import { Link, NavLink } from 'react-router-dom';
import { CloseIcon } from '../components/Icons';
import { useSettings } from '../context/SettingsContext';

const LINKS = [
  ['/admin', 'Dashboard', true],
  ['/admin/orders', 'Orders & sales'],
  ['/admin/products', 'Products & inventory'],
  ['/admin/categories', 'Categories'],
  ['/admin/landing', 'Landing page'],
  ['/admin/drops', 'Drops'],
  ['/admin/sliders', 'Sliders'],
  ['/admin/coupons', 'Coupons'],
  ['/admin/shipping', 'Shipping'],
  ['/admin/settings', 'Store settings'],
];

export default function AdminSidebar({ open, onClose, email, onSignOut }) {
  const { logoSrc, settings } = useSettings();
  return (
    <>
      {open && <div className="drawer-backdrop is-open" onClick={onClose} />}
      <aside className={`admin-side${open ? ' is-open' : ''}`}>
        <div className="admin-side-head">
          <img src={logoSrc} alt={settings.store_name} width="64" />
          <button className="icon-btn admin-side-close" onClick={onClose} aria-label="Close menu"><CloseIcon /></button>
        </div>
        <nav aria-label="Admin">
          {LINKS.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} onClick={onClose} className={({ isActive }) => (isActive ? 'active' : undefined)}>{label}</NavLink>
          ))}
        </nav>
        <div className="admin-side-foot">
          <Link to="/" target="_blank" className="link-btn">View store ↗</Link>
          <small className="muted">{email}</small>
          <button className="btn btn-outline btn-sm" onClick={onSignOut}>Sign out</button>
        </div>
      </aside>
    </>
  );
}
