import { lazy, Suspense, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import AdminLogin from '../admin/AdminLogin';
import AdminSidebar from '../admin/AdminSidebar';
import Loading from '../components/Loading';
import { MenuIcon } from '../components/Icons';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const Dashboard = lazy(() => import('../admin/Dashboard'));
const Orders = lazy(() => import('../admin/Orders'));
const Products = lazy(() => import('../admin/Products'));
const Categories = lazy(() => import('../admin/Categories'));
const LandingEditor = lazy(() => import('../admin/LandingEditor'));
const Drops = lazy(() => import('../admin/Drops'));
const Sliders = lazy(() => import('../admin/Sliders'));
const Coupons = lazy(() => import('../admin/Coupons'));
const Shipping = lazy(() => import('../admin/Shipping'));
const StoreSettings = lazy(() => import('../admin/StoreSettings'));

function Gate() {
  const { session, isAdmin, loading, signOut } = useAuth();
  const { settings } = useSettings();
  const [nav, setNav] = useState(false);

  if (loading) return <Loading label="Checking your session…" />;
  if (!session) return <AdminLogin />;
  if (!isAdmin) {
    return (
      <div className="setup">
        <div className="setup-card">
          <h1>Not authorized</h1>
          <p>You are signed in as <strong>{session.user.email}</strong>, but this account is not an administrator.</p>
          <button className="btn btn-outline" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin">
      <AdminSidebar open={nav} onClose={() => setNav(false)} email={session.user.email} onSignOut={signOut} />
      <div className="admin-main">
        <div className="admin-topbar">
          <button className="icon-btn" onClick={() => setNav(true)} aria-label="Open menu"><MenuIcon /></button>
          <strong>{settings.store_name} · Admin</strong>
        </div>
        <div className="admin-content">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route index element={<Dashboard />} />
              <Route path="orders" element={<Orders />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="landing" element={<LandingEditor />} />
              <Route path="drops" element={<Drops />} />
              <Route path="sliders" element={<Sliders />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="shipping" element={<Shipping />} />
              <Route path="settings" element={<StoreSettings />} />
              <Route path="*" element={<div className="state"><h2>Page not found</h2><p>This admin page does not exist.</p><a className="btn btn-primary" href="/admin">Back to dashboard</a></div>} />
            </Routes>
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default function Admin() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}
