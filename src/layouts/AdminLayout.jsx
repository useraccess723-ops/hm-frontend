import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Toast from '../components/Toast';
import NewBookingModal from '../components/NewBookingModal';

import { useStore } from '../context/StoreContext';

export default function AdminLayout() {
  const { user } = useStore();
  const isCustomer = Boolean((user?.role || '').toUpperCase() === 'CUSTOMER' || (user?.role || '').toUpperCase() === 'GUEST');
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="app">
      <Sidebar open={menuOpen} />
      {menuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="main">
        <Header onMenu={() => setMenuOpen((o) => !o)} />
        <main className="content">
          <Outlet />
        </main>
      </div>
      {!isCustomer && <NewBookingModal />}
      <Toast />
    </div>
  );
}
