import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import Loading from './components/Loading';
import { CartProvider } from './context/CartContext';
import { CatalogProvider } from './context/CatalogContext';
import { SettingsProvider } from './context/SettingsContext';
import { ToastProvider } from './context/ToastContext';

const Home = lazy(() => import('./pages/Home'));
const Shop = lazy(() => import('./pages/Shop'));
const ProductDetails = lazy(() => import('./pages/ProductDetails'));
const Contact = lazy(() => import('./pages/Contact'));
const Checkout = lazy(() => import('./pages/Checkout'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Admin = lazy(() => import('./pages/Admin'));

// Catalog + cart are only mounted for storefront routes; the admin panel loads its own data.
function StoreShell() {
  return (
    <CatalogProvider>
      <CartProvider>
        <Layout />
      </CartProvider>
    </CatalogProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <SettingsProvider>
            <Routes>
              <Route element={<StoreShell />}>
                <Route index element={<Home />} />
                <Route path="shop" element={<Shop />} />
                <Route path="product/:id" element={<ProductDetails />} />
                <Route path="contact" element={<Contact />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="*" element={<NotFound />} />
              </Route>
              <Route path="/admin/*" element={<Suspense fallback={<Loading />}><Admin /></Suspense>} />
            </Routes>
          </SettingsProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
