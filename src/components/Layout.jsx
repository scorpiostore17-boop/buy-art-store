import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import Cart from './Cart';
import Loading from './Loading';
import ScrollToTop from './ScrollToTop';

export default function Layout() {
  return (
    <>
      <ScrollToTop />
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <main id="main">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <Cart />
    </>
  );
}
