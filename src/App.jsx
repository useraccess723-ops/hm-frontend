import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { RbacProvider } from './context/RbacContext';
import AppRoutes from './routes/AppRoutes';
import Login from './pages/Login';
import StaffLogin from './pages/StaffLogin';
import CustomerRegistration from './pages/customer/CustomerRegistration';
import GuestDetailsPublic from './pages/guests/GuestDetailsPublic';
import GuestRegistrationPublic from './pages/guests/GuestRegistrationPublic';
import GuestPortal from './pages/guest-portal/GuestPortal';
import { api, getToken, setToken } from './services/api';

export default function App() {
  const location = useLocation();
  const path = (location.pathname || '').toLowerCase().replace(/\/$/, '');

  // ── Dedicated Public Routes (Direct access without login or landing page) ──
  if (
    path === '/guest-portal' ||
    path === '/guest-verification' ||
    path === '/checkin' ||
    path === '/checkout'
  ) {
    return <GuestPortal />;
  }
  if (path === '/customer-registration' || path.startsWith('/customer-registration/')) {
    return <CustomerRegistration />;
  }
  if (path === '/guest-registration') {
    return <GuestRegistrationPublic />;
  }
  if (path.startsWith('/guest-details') || path.startsWith('/g/')) {
    return <GuestDetailsPublic />;
  }

  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(getToken()));
  const [showStaffLogin, setShowStaffLogin] = useState(() => {
    const loc = typeof window !== 'undefined' ? window.location : { hash: '', search: '', pathname: '' };
    return (
      loc.hash.includes('staff') ||
      loc.search.includes('staff') ||
      loc.search.includes('role') ||
      loc.pathname.includes('staff-login') ||
      loc.pathname === '/login'
    );
  });

  useEffect(() => {
    const handleHash = () => {
      const loc = window.location;
      if (loc.hash.includes('staff') || loc.search.includes('staff') || loc.search.includes('role')) {
        setShowStaffLogin(true);
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    const tok = getToken();
    if (!tok) return;
    api('/api/auth/me')
      .then((u) => {
        setUser(u);
        try { sessionStorage.setItem('stayflow_access_token', tok); } catch {}
        if (u?.tenant_id) {
          try { sessionStorage.setItem('stayflow_active_tenant_id', String(u.tenant_id)); } catch {}
        }
      })
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  if (checking) return <div className="login-shell"><p>Checking session…</p></div>;

  if (!user) {
    if (showStaffLogin) {
      return (
        <StaffLogin
          onLogin={setUser}
          onBackToHome={() => {
            setShowStaffLogin(false);
            if (window.location.hash.includes('staff')) {
              window.history.replaceState(null, '', window.location.pathname);
            }
          }}
        />
      );
    }
    return (
      <Login
        onLogin={setUser}
        onStaffPortal={() => {
          setShowStaffLogin(true);
          window.location.hash = 'staff-login';
        }}
      />
    );
  }

  return (
    <StoreProvider user={user} onLogout={() => { setToken(null); setUser(null); }}>
      <RbacProvider>
        <AppRoutes />
      </RbacProvider>
    </StoreProvider>
  );
}
