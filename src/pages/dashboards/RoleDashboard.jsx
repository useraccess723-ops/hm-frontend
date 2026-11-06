import React from 'react';
import { useParams } from 'react-router-dom';
import { useRbac } from '../../context/RbacContext';
import { useStore } from '../../context/StoreContext';
import Dashboard from '../Dashboard'; // Admin & Default full hotel dashboard
import GeneralManagerDashboard from './GeneralManagerDashboard';
import RevenueManagerDashboard from './RevenueManagerDashboard';
import ReservationManagerDashboard from './ReservationManagerDashboard';
import FrontDeskDashboard from './FrontDeskDashboard';
import HousekeepingDashboard from './HousekeepingDashboard';
import FinanceDashboard from './FinanceDashboard';
import HrDashboard from './HrDashboard';
import FbDashboard from './FbDashboard';
import SalesMarketingDashboard from './SalesMarketingDashboard';
import EngineeringDashboard from './EngineeringDashboard';
import ProcurementDashboard from './ProcurementDashboard';
import GuestServicesDashboard from './GuestServicesDashboard';
import SecurityDashboard from './SecurityDashboard';
import CustomerAmenities from '../customer/CustomerAmenities';

export default function RoleDashboard() {
  const { effectiveRole, canonicalRole } = useRbac();
  const { user } = useStore();
  const { role: routeRole } = useParams();

  const slugMap = {
    'admin': 'ADMIN',
    'general-manager': 'GENERAL_MANAGER',
    'hotel-manager': 'GENERAL_MANAGER',
    'manager': 'GENERAL_MANAGER',
    'gm': 'GENERAL_MANAGER',
    'revenue-manager': 'REVENUE_MANAGER',
    'revenue': 'REVENUE_MANAGER',
    'reservation-manager': 'RESERVATION_MANAGER',
    'reservation': 'RESERVATION_MANAGER',
    'front-desk': 'FRONT_DESK',
    'reception': 'FRONT_DESK',
    'front-office': 'FRONT_DESK',
    'night-auditor': 'FRONT_DESK',
    'housekeeping': 'HOUSEKEEPING',
    'finance': 'FINANCE',
    'finance-manager': 'FINANCE',
    'accounts': 'FINANCE',
    'hr': 'HUMAN_RESOURCES',
    'human-resources': 'HUMAN_RESOURCES',
    'fb': 'FOOD_BEVERAGE',
    'food-beverage': 'FOOD_BEVERAGE',
    'restaurant': 'FOOD_BEVERAGE',
    'sales-marketing': 'SALES_MARKETING',
    'engineering': 'ENGINEERING',
    'maintenance': 'ENGINEERING',
    'procurement': 'PROCUREMENT',
    'guest-services': 'GUEST_SERVICES',
    'security': 'SECURITY',
    'customer': 'CUSTOMER',
    'guest': 'CUSTOMER',
  };

  // Determine target department role
  let targetRole = canonicalRole || effectiveRole || user?.role || 'ADMIN';
  const isCustRole = (user?.role || '').toUpperCase() === 'CUSTOMER' ||
                     (canonicalRole || '').toUpperCase() === 'CUSTOMER' ||
                     (effectiveRole || '').toUpperCase() === 'CUSTOMER';

  if (isCustRole) {
    targetRole = 'CUSTOMER';
  } else if (routeRole && slugMap[routeRole.toLowerCase()]) {
    targetRole = slugMap[routeRole.toLowerCase()];
  } else if (!routeRole && user?.assigned_dashboard && slugMap[user.assigned_dashboard.toLowerCase()]) {
    targetRole = slugMap[user.assigned_dashboard.toLowerCase()];
  }

  const normalized = (targetRole || '').toUpperCase().trim();

  switch (normalized) {
    case 'CUSTOMER':
    case 'GUEST':
      return <CustomerAmenities defaultTab="my-reservation" />;
    case 'GENERAL_MANAGER':
    case 'MANAGER':
    case 'HOTEL_MANAGER':
      return <GeneralManagerDashboard />;
    case 'REVENUE_MANAGER':
    case 'REVENUE':
      return <RevenueManagerDashboard />;
    case 'RESERVATION_MANAGER':
    case 'RESERVATIONS':
      return <ReservationManagerDashboard />;
    case 'FRONT_DESK':
    case 'RECEPTION':
    case 'FRONT_OFFICE':
    case 'NIGHT_AUDITOR':
      return <FrontDeskDashboard />;
    case 'HOUSEKEEPING':
      return <HousekeepingDashboard />;
    case 'FINANCE':
    case 'FINANCE_MANAGER':
    case 'ACCOUNTS':
    case 'ACCOUNTANT':
      return <FinanceDashboard />;
    case 'HUMAN_RESOURCES':
    case 'HR':
      return <HrDashboard />;
    case 'FOOD_BEVERAGE':
    case 'FB':
    case 'FOOD_AND_BEVERAGE':
    case 'RESTAURANT':
    case 'KITCHEN':
      return <FbDashboard />;
    case 'SALES_MARKETING':
    case 'SALES':
    case 'MARKETING':
      return <SalesMarketingDashboard />;
    case 'ENGINEERING':
    case 'MAINTENANCE':
      return <EngineeringDashboard />;
    case 'PROCUREMENT':
    case 'PURCHASING':
      return <ProcurementDashboard />;
    case 'GUEST_SERVICES':
    case 'CONCIERGE':
      return <GuestServicesDashboard />;
    case 'SECURITY':
      return <SecurityDashboard />;
    case 'STAFF':
      return <FrontDeskDashboard />;
    case 'ADMIN':
    case 'SUPER_ADMIN':
    default:
      return <Dashboard />;
  }
}

