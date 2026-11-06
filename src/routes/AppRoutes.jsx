import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import AdminLayout from '../layouts/AdminLayout';
import Dashboard from '../pages/Dashboard';
import Bookings from '../pages/bookings/Bookings';
import FrontDesk from '../pages/frontdesk/FrontDesk';
import Rooms from '../pages/rooms/Rooms';
import Availability from '../pages/rooms/Availability';
import Guests from '../pages/guests/Guests';
import Finance from '../pages/finance/Finance';
import Offers from '../pages/offers/Offers';
import Channels from '../pages/channels/Channels';
import Webhooks from '../pages/webhooks/Webhooks';
import Housekeeping from '../pages/housekeeping/Housekeeping';
import Reports from '../pages/reports/Reports';
import Staff from '../pages/staff/Staff';
import Notifications from '../pages/settings/Notifications';
import Settings from '../pages/settings/Settings';
import AppearanceSettings from '../pages/settings/AppearanceSettings';
import AuditLogs from '../pages/settings/AuditLogs';
import Integrations from '../pages/integrations/Integrations';
import SubPage from '../components/SubPage';
import RoomTypes from '../pages/rooms/RoomTypes';
import RolesPermissions from '../pages/staff/RolesPermissions';
import RoleDashboard from '../pages/dashboards/RoleDashboard';
import GuestRegistration from '../pages/guests/GuestRegistration';
import CustomerRegistration from '../pages/customer/CustomerRegistration';
import CustomerAmenities from '../pages/customer/CustomerAmenities';
import IncomingWebhookLogs from '../pages/webhooks/IncomingWebhookLogs';
import GuestPortal from '../pages/guest-portal/GuestPortal';
import { useRbac } from '../context/RbacContext';
import { useStore } from '../context/StoreContext';
import SuperAdminDashboard from '../pages/superadmin/SuperAdminDashboard';
import TenantManagement from '../pages/superadmin/TenantManagement';
import TenantAdministrators from '../pages/superadmin/TenantAdministrators';
import TenantConfigurations from '../pages/superadmin/TenantConfigurations';
import PlatformSettings from '../pages/superadmin/PlatformSettings';
import PlatformMonitoring from '../pages/superadmin/PlatformMonitoring';
import KnowledgeBase from '../pages/knowledge/KnowledgeBase';

function SuperAdminRoute({ element }) {
  const { user } = useStore();
  const navigate = useNavigate();

  const isSuper = Boolean((user?.is_super_admin || user?.role === 'SUPER_ADMIN') && !user?.tenant_id);

  if (!isSuper) {
    return (
      <div style={{ padding: '32px 20px', maxWidth: 700, margin: '40px auto' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 12 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--red, #ef4444)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 18px',
            fontSize: 28
          }}>
            🔒
          </div>
          <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--head-color, #fff)' }}>
            Super Admin Access Required
          </h2>
          <p style={{ maxWidth: 480, margin: '0 auto 24px', color: 'var(--sub, #9ca3af)', fontSize: 14, lineHeight: 1.6 }}>
            This portal is strictly restricted to Platform Super Administrators. Your account does not have platform-level administration privileges.
          </p>
          <button className="btn primary" onClick={() => navigate('/')}>
            Return to Hotel Dashboard
          </button>
        </div>
      </div>
    );
  }

  return element;
}

function GuardedRoute({ path, element }) {
  const { canView, effectiveRole, activeRoleObj } = useRbac();
  const { user } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const targetPath = path || location.pathname;

  const isCustomer = Boolean((user?.role || '').toUpperCase() === 'CUSTOMER' || (effectiveRole || '').toUpperCase() === 'CUSTOMER');
  if (isCustomer) {
    return <Navigate to="/" replace />;
  }

  if (!canView(targetPath)) {
    return (
      <div style={{ padding: '32px 20px', maxWidth: 700, margin: '40px auto' }}>
        <div className="panel" style={{ textAlign: 'center', padding: '60px 24px', borderRadius: 12 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.12)',
            color: 'var(--red, #ef4444)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 18px',
            fontSize: 28
          }}>
            🔒
          </div>
          <h2 style={{ fontSize: 20, marginBottom: 8, color: 'var(--head-color, #fff)' }}>
            Access Restricted
          </h2>
          <p style={{ maxWidth: 480, margin: '0 auto 24px', color: 'var(--sub, #9ca3af)', fontSize: 14, lineHeight: 1.6 }}>
            Your current role (<b>{activeRoleObj?.name || effectiveRole}</b>) does not have permission to view <code>{targetPath}</code>.
            Please switch to an authorized role in the top header or contact an administrator.
          </p>
          <button className="btn primary" onClick={() => navigate('/')}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return element;
}

export default function AppRoutes() {
  const { user } = useStore();
  const isSuper = Boolean((user?.is_super_admin || user?.role === 'SUPER_ADMIN') && !user?.tenant_id);

  if (isSuper) {
    return (
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index element={<Navigate to="/superadmin" replace />} />
          <Route path="dashboard/*" element={<Navigate to="/superadmin" replace />} />
          <Route path="superadmin" element={<SuperAdminRoute element={<SuperAdminDashboard />} />} />
          <Route path="superadmin/tenants" element={<SuperAdminRoute element={<TenantManagement />} />} />
          <Route path="superadmin/administrators" element={<SuperAdminRoute element={<TenantAdministrators />} />} />
          <Route path="superadmin/configurations" element={<SuperAdminRoute element={<TenantConfigurations />} />} />
          <Route path="superadmin/settings" element={<SuperAdminRoute element={<PlatformSettings />} />} />
          <Route path="superadmin/monitoring" element={<SuperAdminRoute element={<PlatformMonitoring />} />} />
          <Route path="*" element={<Navigate to="/superadmin" replace />} />
        </Route>
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<RoleDashboard />} />
        <Route path="dashboard/:role" element={<RoleDashboard />} />

        {/* Knowledge Base & AI RAG */}
        <Route path="knowledge-base" element={<GuardedRoute path="/knowledge-base" element={<KnowledgeBase />} />} />
        <Route path="knowledge-base/:sub" element={<GuardedRoute element={<KnowledgeBase />} />} />

        {/* Reservations & Bookings */}
        <Route path="bookings" element={<GuardedRoute path="/bookings" element={<Bookings />} />} />
        <Route path="bookings/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Front Desk */}
        <Route path="front-desk" element={<GuardedRoute path="/front-desk" element={<FrontDesk />} />} />
        <Route path="front-desk/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Guest Management */}
        <Route path="guests" element={<GuardedRoute path="/guests" element={<Guests />} />} />
        <Route path="guests/:sub" element={<GuardedRoute element={<SubPage />} />} />
        <Route path="guest-registration" element={<GuestRegistration />} />
        <Route path="customer-registration" element={<CustomerRegistration />} />
        <Route path="guest-portal" element={<GuestPortal />} />
        <Route path="guest-verification" element={<GuestPortal />} />

        {/* Customer Amenities & Service Requests */}
        <Route path="customer/amenities" element={<CustomerAmenities defaultTab="my-reservation" />} />
        <Route path="customer/my-requests" element={<CustomerAmenities defaultTab="requests" />} />
        <Route path="customer-amenities" element={<CustomerAmenities defaultTab="my-reservation" />} />

        {/* Guest Services */}
        <Route path="guest-services" element={<GuardedRoute path="/guest-services" element={<SubPage />} />} />
        <Route path="guest-services/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Room & Room Types */}
        <Route path="rooms" element={<GuardedRoute path="/rooms" element={<Rooms />} />} />
        <Route path="rooms/types-gallery" element={<GuardedRoute path="/rooms" element={<RoomTypes />} />} />
        <Route path="rooms/types" element={<GuardedRoute path="/rooms" element={<RoomTypes />} />} />
        <Route path="rooms/room-types" element={<GuardedRoute path="/rooms" element={<RoomTypes />} />} />
        <Route path="rooms/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Availability & Pricing */}
        <Route path="availability" element={<GuardedRoute path="/availability" element={<Availability />} />} />
        <Route path="availability/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Revenue Management */}
        <Route path="revenue-management" element={<GuardedRoute path="/revenue-management" element={<SubPage />} />} />
        <Route path="revenue-management/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Finance & Payments */}
        <Route path="finance" element={<GuardedRoute path="/finance" element={<Finance />} />} />
        <Route path="finance/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Sales & Marketing */}
        <Route path="sales-marketing" element={<GuardedRoute path="/sales-marketing" element={<SubPage />} />} />
        <Route path="sales-marketing/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Offers & Promotions */}
        <Route path="offers" element={<GuardedRoute path="/offers" element={<Offers />} />} />
        <Route path="offers/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Channel Manager */}
        <Route path="channels" element={<GuardedRoute path="/channels" element={<Channels />} />} />
        <Route path="channels/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Food & Beverage */}
        <Route path="food-beverage" element={<GuardedRoute path="/food-beverage" element={<SubPage />} />} />
        <Route path="food-beverage/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Housekeeping */}
        <Route path="housekeeping" element={<GuardedRoute path="/housekeeping" element={<Housekeeping />} />} />
        <Route path="housekeeping/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Engineering & Maintenance */}
        <Route path="engineering" element={<GuardedRoute path="/engineering" element={<SubPage />} />} />
        <Route path="engineering/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Procurement */}
        <Route path="procurement" element={<GuardedRoute path="/procurement" element={<SubPage />} />} />
        <Route path="procurement/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Security */}
        <Route path="security" element={<GuardedRoute path="/security" element={<SubPage />} />} />
        <Route path="security/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Webhooks & APIs */}
        <Route path="webhooks" element={<GuardedRoute path="/webhooks" element={<Webhooks />} />} />
        <Route path="webhooks/incoming-logs" element={<GuardedRoute path="/webhooks/incoming-logs" element={<IncomingWebhookLogs />} />} />
        <Route path="webhooks/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Reports & Analytics */}
        <Route path="reports" element={<GuardedRoute path="/reports" element={<Reports />} />} />
        <Route path="reports/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Human Resources */}
        <Route path="human-resources" element={<GuardedRoute path="/human-resources" element={<SubPage />} />} />
        <Route path="human-resources/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Admin & Staff */}
        <Route path="staff" element={<GuardedRoute path="/staff" element={<Staff />} />} />
        <Route path="staff/roles" element={<GuardedRoute path="/staff/roles" element={<RolesPermissions />} />} />
        <Route path="staff/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Notifications & Alerts */}
        <Route path="notifications" element={<GuardedRoute path="/notifications" element={<Notifications />} />} />
        <Route path="notifications/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* System Settings */}
        <Route path="settings" element={<GuardedRoute path="/settings" element={<Settings />} />} />
        <Route path="settings/appearance" element={<GuardedRoute path="/settings" element={<AppearanceSettings />} />} />
        <Route path="settings/theme" element={<GuardedRoute path="/settings" element={<AppearanceSettings />} />} />
        <Route path="settings/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* AI Receptionist Integration */}
        <Route path="integrations" element={<GuardedRoute path="/integrations" element={<Integrations />} />} />
        <Route path="integrations/:sub" element={<GuardedRoute path="/integrations" element={<Integrations />} />} />

        {/* Audit Logs */}
        <Route path="audit-logs" element={<GuardedRoute path="/audit-logs" element={<AuditLogs />} />} />
        <Route path="audit-logs/:sub" element={<GuardedRoute element={<SubPage />} />} />

        {/* Super Admin Platform Routes */}
        <Route path="superadmin" element={<SuperAdminRoute element={<SuperAdminDashboard />} />} />
        <Route path="superadmin/tenants" element={<SuperAdminRoute element={<TenantManagement />} />} />
        <Route path="superadmin/administrators" element={<SuperAdminRoute element={<TenantAdministrators />} />} />
        <Route path="superadmin/configurations" element={<SuperAdminRoute element={<TenantConfigurations />} />} />
        <Route path="superadmin/settings" element={<SuperAdminRoute element={<PlatformSettings />} />} />
        <Route path="superadmin/monitoring" element={<SuperAdminRoute element={<PlatformMonitoring />} />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
