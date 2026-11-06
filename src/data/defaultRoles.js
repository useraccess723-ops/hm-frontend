
// Fallback metadata & default role permissions for all 11 default hotel roles

export const ALL_PERMS = { view: true, create: true, edit: true, delete: true, approve: true, export: true };
export const VIEW_EXPORT = { view: true, create: false, edit: false, delete: false, approve: false, export: true };
export const VIEW_ONLY = { view: true, create: false, edit: false, delete: false, approve: false, export: false };
export const NO_ACCESS = { view: false, create: false, edit: false, delete: false, approve: false, export: false };

export const MODULES_META_FALLBACK = [
  {
    id: 'dashboard',
    name: 'Dashboard & Overview',
    path: '/',
    group: 'Main Menu',
    submodules: []
  },
  {
    id: 'knowledge-base',
    name: 'Knowledge Base & AI Assistant',
    path: '/knowledge-base',
    group: 'Main Menu',
    submodules: []
  },
  {
    id: 'bookings',
    name: 'Reservations & Bookings',
    path: '/bookings',
    group: 'Main Menu',
    submodules: [
      { name: 'Reservation Details', path: '/bookings/details' },
      { name: 'Booking Calendar', path: '/bookings/calendar' },
      { name: 'Group Reservation', path: '/bookings/group' },
      { name: 'Walk-in Reservation', path: '/bookings/walk-in' },
      { name: 'Booking History', path: '/bookings/history' },
      { name: 'Refund Request', path: '/bookings/refund' },
    ]
  },
  {
    id: 'front-desk',
    name: 'Front Desk',
    path: '/front-desk',
    group: 'Main Menu',
    submodules: [
      { name: 'Check-in & Check-out History', path: '/front-desk/history' },
      { name: 'Pending Check-in', path: '/front-desk/pending-checkin' },
      { name: 'Check-out', path: '/front-desk/checkout' },
      { name: 'Room Assignment', path: '/front-desk/room-assignment' },
      { name: 'Guest Registration', path: '/front-desk/guest-registration' },
      { name: 'Walk-in Guest Check-in', path: '/front-desk/walk-in-checkin' },
      { name: 'Early Check-in', path: '/front-desk/early-checkin' },
      { name: 'Late Check-out', path: '/front-desk/late-checkout' },
      { name: 'ID Verification', path: '/front-desk/id-verification' },
      { name: 'Room Transfer', path: '/front-desk/room-transfer' },
      { name: 'Extend Stay', path: '/front-desk/extend-stay' },
      { name: 'Additional Charges', path: '/front-desk/additional-charges' },
      { name: 'Final Bill Generation', path: '/front-desk/final-bill' },
    ]
  },
  {
    id: 'guests',
    name: 'Guest Management',
    path: '/guests',
    group: 'Main Menu',
    submodules: [
      { name: 'Guest Directory', path: '/guests/directory' },
      { name: 'VIP Guests', path: '/guests/vip' },
      { name: 'Stay History', path: '/guests/stay-history' },
      { name: 'Guest Preferences', path: '/guests/preferences' },
      { name: 'Blacklisted Guests', path: '/guests/blacklisted' },
      { name: 'Loyalty Members', path: '/guests/loyalty' },
      { name: 'Guest Details', path: '/guests/details' },
      { name: 'Identification Records', path: '/guests/identification' },
      { name: 'Guest Feedback & Reviews', path: '/guests/feedback' },
      { name: 'Complaints & Service Requests', path: '/guests/complaints' },
    ]
  },
  {
    id: 'guest-services',
    name: 'Guest Services',
    path: '/guest-services',
    group: 'Main Menu',
    submodules: [
      { name: 'Concierge Desk', path: '/guest-services/concierge' },
      { name: 'Luggage & Bell Desk', path: '/guest-services/bell-desk' },
      { name: 'Valet & Airport Transfers', path: '/guest-services/valet-transfers' },
      { name: 'Wake-up Calls & Reminders', path: '/guest-services/wakeup-calls' },
      { name: 'Special Amenities Requests', path: '/guest-services/amenities-requests' },
      { name: 'Lost & Found Desk', path: '/guest-services/lost-and-found' },
      { name: 'VIP Butler Service', path: '/guest-services/butler-service' },
      { name: 'Wi-Fi Management', path: '/guest-services/wifi' },
      { name: 'Air Conditioning (AC)', path: '/guest-services/ac' },
      { name: 'Television (TV)', path: '/guest-services/tv' },
      { name: 'Swimming Pool', path: '/guest-services/swimming-pool' },
      { name: 'Gym & Fitness', path: '/guest-services/gym' },
      { name: 'Parking Management', path: '/guest-services/parking' },
      { name: 'Spa Services', path: '/guest-services/spa' },
    ]
  },
  {
    id: 'rooms',
    name: 'Room & Room Types',
    path: '/rooms',
    group: 'Main Menu',
    submodules: [
      { name: 'Room Availability', path: '/rooms/availability' },
      { name: 'Room Types & Gallery', path: '/rooms/types-gallery' },
      { name: 'Floor Management', path: '/rooms/floor-management' },
      { name: 'Out-of-Order Rooms', path: '/rooms/out-of-order' },
      { name: 'Seasonal Pricing', path: '/rooms/seasonal-pricing' },
      { name: 'Taxes and Fees', path: '/rooms/taxes-fees' },
      { name: 'Rate Plans', path: '/rooms/rate-plans' },
    ]
  },
  {
    id: 'availability',
    name: 'Availability & Pricing',
    path: '/availability',
    group: 'Main Menu',
    submodules: [
      { name: 'Daily Inventory', path: '/availability/daily-inventory' },
      { name: 'Dynamic Pricing', path: '/availability/dynamic-pricing' },
      { name: 'Minimum Stay Rules', path: '/availability/min-stay' },
      { name: 'Stop Sell Controls', path: '/availability/stop-sell' },
    ]
  },
  {
    id: 'revenue-management',
    name: 'Revenue Management',
    path: '/revenue-management',
    group: 'Finance & Operations',
    submodules: [
      { name: 'Pricing Strategy & Yield', path: '/revenue-management/pricing-strategy' },
      { name: 'Demand Forecasting', path: '/revenue-management/demand-forecasting' },
      { name: 'Competitor Rate Intelligence', path: '/revenue-management/competitor-rates' },
      { name: 'Channel Yield Analysis', path: '/revenue-management/channel-yield' },
      { name: 'RevPAR & ADR Analytics', path: '/revenue-management/revpar-adr' },
      { name: 'Upsell & Upgrade Engine', path: '/revenue-management/upsell-engine' },
    ]
  },
  {
    id: 'finance',
    name: 'Finance & Payments',
    path: '/finance',
    group: 'Finance & Operations',
    submodules: [
      { name: 'General Ledger', path: '/finance/ledger' },
      { name: 'Payment Requests', path: '/finance/payment-requests' },
      { name: 'Booking Payments', path: '/finance/booking-payments' },
      { name: 'Invoices & Billing', path: '/finance/invoices' },
      { name: 'Refund Processing', path: '/finance/refunds' },
      { name: 'Payment Gateways', path: '/finance/gateways' },
      { name: 'GST & Tax Reports', path: '/finance/gst-reports' },
      { name: 'Daily Financial Summary', path: '/finance/daily-summary' },
    ]
  },
  {
    id: 'sales-marketing',
    name: 'Sales & Marketing',
    path: '/sales-marketing',
    group: 'Finance & Operations',
    submodules: [
      { name: 'Corporate Accounts & Contracts', path: '/sales-marketing/corporate-accounts' },
      { name: 'Travel Agent & OTA Commissions', path: '/sales-marketing/travel-agents' },
      { name: 'MICE & Banquet Inquiries', path: '/sales-marketing/mice-inquiries' },
      { name: 'Campaign Performance & ROI', path: '/sales-marketing/campaigns' },
      { name: 'Email Marketing & Newsletters', path: '/sales-marketing/email-marketing' },
      { name: 'Promo Code ROI Analytics', path: '/sales-marketing/promo-roi' },
    ]
  },
  {
    id: 'offers',
    name: 'Offers & Promotions',
    path: '/offers',
    group: 'Main Menu',
    submodules: [
      { name: 'All Offers', path: '/offers/list' },
      { name: 'Create Offer', path: '/offers/create' },
      { name: 'Flash Deals', path: '/offers/flash-deals' },
      { name: 'Seasonal Discounts', path: '/offers/seasonal' },
    ]
  },
  {
    id: 'channels',
    name: 'Channel Manager',
    path: '/channels',
    group: 'Main Menu',
    submodules: [
      { name: 'Connected Channels', path: '/channels/connected' },
      { name: 'Inventory Sync Log', path: '/channels/sync-log' },
      { name: 'Rate Parity Monitor', path: '/channels/rate-parity' },
      { name: 'Channel Mapping', path: '/channels/mapping' },
    ]
  },
  {
    id: 'food-beverage',
    name: 'Food & Beverage',
    path: '/food-beverage',
    group: 'Hotel Operations',
    submodules: [
      { name: 'Restaurant POS & Orders', path: '/food-beverage/restaurant-pos' },
      { name: 'In-Room Dining', path: '/food-beverage/in-room-dining' },
      { name: 'Menu and Pricing', path: '/food-beverage/menu-engineering' },
      { name: 'Bar & Beverage Management', path: '/food-beverage/bar-management' },
      { name: 'Banquet & Event Catering', path: '/food-beverage/banquets' },
      { name: 'Kitchen Inventory & Requisitions', path: '/food-beverage/kitchen-inventory' },
      { name: 'Table Reservations', path: '/food-beverage/table-reservations' },
    ]
  },
  {
    id: 'housekeeping',
    name: 'Housekeeping',
    path: '/housekeeping',
    group: 'Hotel Operations',
    submodules: [
      { name: 'Dirty Rooms', path: '/housekeeping/dirty-rooms' },
      { name: 'Clean Rooms', path: '/housekeeping/clean-rooms' },
      { name: 'Inspection Pending', path: '/housekeeping/inspection' },
      { name: 'Staff Assignment', path: '/housekeeping/staff-assignment' },
      { name: 'Lost & Found', path: '/housekeeping/lost-found' },
      { name: 'Room Readiness', path: '/housekeeping/room-readiness' },
    ]
  },
  {
    id: 'engineering',
    name: 'Engineering & Maintenance',
    path: '/engineering',
    group: 'Hotel Operations',
    submodules: [
      { name: 'Maintenance Work Orders', path: '/engineering/work-orders' },
      { name: 'Preventive Maintenance Schedules', path: '/engineering/preventive-maintenance' },
      { name: 'HVAC & Climate Control', path: '/engineering/hvac-control' },
      { name: 'Asset Registry & Warranty', path: '/engineering/asset-registry' },
      { name: 'Utility Meters & Energy Log', path: '/engineering/utility-meters' },
      { name: 'Fire Safety & Compliance Audit', path: '/engineering/fire-safety' },
    ]
  },
  {
    id: 'procurement',
    name: 'Procurement',
    path: '/procurement',
    group: 'Hotel Operations',
    submodules: [
      { name: 'Purchase Requisitions', path: '/procurement/requisitions' },
      { name: 'Purchase Orders (PO)', path: '/procurement/purchase-orders' },
      { name: 'Vendor Directory & Contracts', path: '/procurement/vendors' },
      { name: 'Goods Received Notes (GRN)', path: '/procurement/grn' },
      { name: 'Central Store Inventory', path: '/procurement/inventory' },
      { name: 'Cost Center Approvals', path: '/procurement/approvals' },
    ]
  },
  {
    id: 'security',
    name: 'Security',
    path: '/security',
    group: 'Hotel Operations',
    submodules: [
      { name: 'Visitor & Vendor Gate Pass', path: '/security/gate-pass' },
      { name: 'Incident Reports & Logbook', path: '/security/incident-reports' },
      { name: 'CCTV Surveillance Status', path: '/security/cctv-status' },
      { name: 'Key Card Audit & Access Log', path: '/security/keycard-audit' },
      { name: 'Emergency Evacuation & SOPs', path: '/security/emergency-sops' },
      { name: 'Patrol & Guard Dispatch', path: '/security/patrol-rounds' },
    ]
  },
  {
    id: 'webhooks',
    name: 'Webhooks & APIs',
    path: '/webhooks',
    group: 'Main Menu',
    submodules: [
      { name: 'Endpoints', path: '/webhooks/endpoints' },
      { name: 'Delivery Logs', path: '/webhooks/logs' },
      { name: 'API Keys', path: '/webhooks/api-keys' },
      { name: 'Sandbox & Production', path: '/webhooks/sandbox-production' },
    ]
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    path: '/reports',
    group: 'Main Menu',
    submodules: [
      { name: 'Occupancy Rate', path: '/reports/occupancy' },
      { name: 'Revenue Reports', path: '/reports/revenue' },
      { name: 'Booking Source', path: '/reports/booking-source' },
      { name: 'Guest Demographics', path: '/reports/demographics' },
      { name: 'Staff Performance', path: '/reports/staff-performance' },
      { name: 'Financial Summary', path: '/reports/financial-summary' },
    ]
  },
  {
    id: 'human-resources',
    name: 'Human Resources',
    path: '/human-resources',
    group: 'System & Administration',
    submodules: [
      { name: 'Employee Directory & Profiles', path: '/human-resources/employee-directory' },
      { name: 'Shift Roster & Scheduling', path: '/human-resources/shift-roster' },
      { name: 'Attendance & Biometric Log', path: '/human-resources/attendance-log' },
      { name: 'Leave & Vacation Requests', path: '/human-resources/leave-requests' },
      { name: 'Payroll & Salary Slips', path: '/human-resources/payroll' },
      { name: 'Staff Training & Onboarding', path: '/human-resources/training-modules' },
    ]
  },
  {
    id: 'staff',
    name: 'Admin & Staff',
    path: '/staff',
    group: 'System & Administration',
    submodules: [
      { name: 'Staff Directory', path: '/staff/directory' },
      { name: 'Roles & Permissions', path: '/staff/roles' },
      { name: 'Shift Management', path: '/staff/shifts' },
      { name: 'Staff Performance', path: '/staff/performance' },
    ]
  },
  {
    id: 'notifications',
    name: 'Notifications & Alerts',
    path: '/notifications',
    group: 'System & Administration',
    submodules: [
      { name: 'All Notifications', path: '/notifications/all' },
      { name: 'Notification Settings', path: '/notifications/settings' },
      { name: 'Email Templates', path: '/notifications/email-templates' },
      { name: 'SMS & WhatsApp Alerts', path: '/notifications/sms-alerts' },
    ]
  },
  {
    id: 'settings',
    name: 'System Settings',
    path: '/settings',
    group: 'System & Administration',
    submodules: [
      { name: 'General Settings', path: '/settings/general' },
      { name: 'Hotel Profile', path: '/settings/hotel-profile' },
      { name: 'Payment Gateways', path: '/settings/gateways' },
      { name: 'Currency & Timezone', path: '/settings/currency-timezone' },
      { name: 'Tax & Invoicing', path: '/settings/tax-invoicing' },
      { name: 'Security Settings', path: '/settings/security' },
    ]
  },
  {
    id: 'integrations',
    name: 'AI Receptionist & Integrations',
    path: '/integrations',
    group: 'System & Administration',
    submodules: []
  },
  {
    id: 'audit-logs',
    name: 'Audit Logs',
    path: '/audit-logs',
    group: 'System & Administration',
    submodules: [
      { name: 'User Activity', path: '/audit-logs/user-activity' },
      { name: 'System Events', path: '/audit-logs/system-events' },
      { name: 'Security Logs', path: '/audit-logs/security-logs' },
    ]
  },
];

// Helper to create role permission matrix
function buildRoleMatrix(allowedPaths, writePaths = [], approvePaths = [], exportPaths = []) {
  const matrix = {};
  MODULES_META_FALLBACK.forEach((mod) => {
    const isModAllowed = allowedPaths.includes(mod.path);
    matrix[mod.path] = isModAllowed ? {
      view: true,
      create: writePaths.includes(mod.path),
      edit: writePaths.includes(mod.path),
      delete: false,
      approve: approvePaths.includes(mod.path),
      export: exportPaths.includes(mod.path),
    } : { ...NO_ACCESS };

    (mod.submodules || []).forEach((sub) => {
      const isSubAllowed = isModAllowed || allowedPaths.includes(sub.path);
      matrix[sub.path] = isSubAllowed ? {
        view: true,
        create: writePaths.includes(sub.path) || writePaths.includes(mod.path),
        edit: writePaths.includes(sub.path) || writePaths.includes(mod.path),
        delete: false,
        approve: approvePaths.includes(sub.path) || approvePaths.includes(mod.path),
        export: exportPaths.includes(sub.path) || exportPaths.includes(mod.path),
      } : { ...NO_ACCESS };
    });
  });
  return matrix;
}

// 1. Admin: full access to everything
const adminPerms = {};
MODULES_META_FALLBACK.forEach((mod) => {
  adminPerms[mod.path] = { ...ALL_PERMS };
  (mod.submodules || []).forEach((sub) => {
    adminPerms[sub.path] = { ...ALL_PERMS };
  });
});

// 2. General Manager: view everything, approve everything, export everything
const gmPerms = {};
MODULES_META_FALLBACK.forEach((mod) => {
  gmPerms[mod.path] = { view: true, create: true, edit: true, delete: false, approve: true, export: true };
  (mod.submodules || []).forEach((sub) => {
    gmPerms[sub.path] = { view: true, create: true, edit: true, delete: false, approve: true, export: true };
  });
});

// 3. Revenue Manager
const rmPerms = buildRoleMatrix(
  ['/', '/revenue-management', '/availability', '/rooms', '/channels', '/reports', '/bookings'],
  ['/revenue-management', '/availability'],
  ['/revenue-management'],
  ['/revenue-management', '/availability', '/reports', '/channels']
);

// 4. Reservation Manager
const resMgrPerms = buildRoleMatrix(
  ['/', '/bookings', '/guests', '/front-desk', '/rooms', '/offers', '/channels', '/reports'],
  ['/bookings', '/guests', '/offers'],
  ['/bookings', '/offers'],
  ['/bookings', '/guests', '/reports']
);

// 5. Front Desk
const fdPerms = buildRoleMatrix(
  ['/', '/front-desk', '/bookings', '/guests', '/guest-services', '/rooms'],
  ['/front-desk', '/bookings', '/guests', '/guest-services'],
  ['/front-desk'],
  ['/front-desk', '/bookings']
);

// 6. Housekeeping
const hkPerms = buildRoleMatrix(
  ['/', '/housekeeping', '/rooms', '/guest-services'],
  ['/housekeeping'],
  ['/housekeeping'],
  ['/housekeeping']
);

// 7. Finance
const finPerms = buildRoleMatrix(
  ['/', '/finance', '/procurement', '/reports', '/bookings'],
  ['/finance', '/procurement'],
  ['/finance', '/procurement'],
  ['/finance', '/reports', '/procurement']
);

// 8. Human Resources
const hrPerms = buildRoleMatrix(
  ['/', '/human-resources', '/staff', '/reports'],
  ['/human-resources', '/staff'],
  ['/human-resources'],
  ['/human-resources', '/staff', '/reports']
);

// 9. Food & Beverage
const fbPerms = buildRoleMatrix(
  ['/', '/food-beverage', '/procurement'],
  ['/food-beverage'],
  ['/food-beverage'],
  ['/food-beverage']
);

// 10. Sales & Marketing
const smPerms = buildRoleMatrix(
  ['/', '/sales-marketing', '/offers', '/channels', '/reports', '/bookings'],
  ['/sales-marketing', '/offers'],
  ['/sales-marketing', '/offers'],
  ['/sales-marketing', '/offers', '/reports']
);

// 11. Engineering
const engPerms = buildRoleMatrix(
  ['/', '/engineering', '/rooms', '/procurement'],
  ['/engineering'],
  ['/engineering'],
  ['/engineering']
);

// 12. Procurement
const procPerms = buildRoleMatrix(
  ['/', '/procurement', '/finance'],
  ['/procurement'],
  ['/procurement'],
  ['/procurement', '/finance']
);

// 13. Guest Services
const gsPerms = buildRoleMatrix(
  ['/', '/guest-services', '/guests', '/bookings', '/front-desk'],
  ['/guest-services'],
  ['/guest-services'],
  ['/guest-services']
);

// 14. Security
const secPerms = buildRoleMatrix(
  ['/', '/security', '/guests', '/audit-logs'],
  ['/security'],
  ['/security'],
  ['/security', '/audit-logs']
);

// 15. Customer / Guest
const customerPerms = buildRoleMatrix(
  ['/', '/customer/amenities', '/customer/my-requests', '/customer-amenities', '/guest-portal', '/guest-services'],
  ['/customer/amenities', '/customer/my-requests', '/customer-amenities'],
  ['/customer/amenities', '/customer/my-requests', '/customer-amenities'],
  ['/customer/amenities', '/customer/my-requests', '/customer-amenities']
);

export const DEFAULT_ROLES_FALLBACK = [
  {
    id: 1,
    name: 'Admin',
    code: 'ADMIN',
    description: 'Full access to all hotel operations, system settings, financial controls, and role management.',
    is_system: true,
    user_count: 1,
    permissions: adminPerms,
  },
  {
    id: 2,
    name: 'General Manager',
    code: 'GENERAL_MANAGER',
    description: 'Executive hotel oversight with view access to all modules, financial approvals, and operational reports.',
    is_system: true,
    user_count: 0,
    permissions: gmPerms,
  },
  {
    id: 3,
    name: 'Revenue Manager',
    code: 'REVENUE_MANAGER',
    description: 'Oversees pricing strategies, yield management, demand forecasting, RevPAR analytics, and OTA channels.',
    is_system: true,
    user_count: 0,
    permissions: rmPerms,
  },
  {
    id: 4,
    name: 'Reservation Manager',
    code: 'RESERVATION_MANAGER',
    description: 'Manages reservations, group bookings, guest records, promotions, and room allocation policies.',
    is_system: true,
    user_count: 0,
    permissions: resMgrPerms,
  },
  {
    id: 5,
    name: 'Front Desk',
    code: 'FRONT_DESK',
    description: 'Guest check-in/out, keycards, room assignment, walk-ins, and guest services execution.',
    is_system: true,
    user_count: 0,
    permissions: fdPerms,
  },
  {
    id: 6,
    name: 'Housekeeping',
    code: 'HOUSEKEEPING',
    description: 'Room cleaning management, inspection sign-offs, linen tracking, and lost & found custody.',
    is_system: true,
    user_count: 0,
    permissions: hkPerms,
  },
  {
    id: 7,
    name: 'Finance',
    code: 'FINANCE',
    description: 'Ledgers, invoices, GST taxation, refunds, payment reconciliation, and procurement accounts.',
    is_system: true,
    user_count: 0,
    permissions: finPerms,
  },
  {
    id: 8,
    name: 'Human Resources',
    code: 'HUMAN_RESOURCES',
    description: 'Staff roster, biometric attendance, payroll, leave requests, employee records, and training.',
    is_system: true,
    user_count: 0,
    permissions: hrPerms,
  },
  {
    id: 9,
    name: 'Food & Beverage',
    code: 'FOOD_BEVERAGE',
    description: 'Restaurant POS, room dining, banquet orders, bar management, and kitchen inventory stores.',
    is_system: true,
    user_count: 0,
    permissions: fbPerms,
  },
  {
    id: 10,
    name: 'Sales & Marketing',
    code: 'SALES_MARKETING',
    description: 'Corporate accounts, travel agent partnerships, MICE event sales, campaigns, and promotional ROI.',
    is_system: true,
    user_count: 0,
    permissions: smPerms,
  },
  {
    id: 11,
    name: 'Engineering',
    code: 'ENGINEERING',
    description: 'Work orders, preventive maintenance, HVAC controls, asset registry, and fire safety compliance.',
    is_system: true,
    user_count: 0,
    permissions: engPerms,
  },
  {
    id: 12,
    name: 'Procurement',
    code: 'PROCUREMENT',
    description: 'Purchase requisitions, POs, vendor contracts, goods received notes, store inventory, and cost approvals.',
    is_system: true,
    user_count: 0,
    permissions: procPerms,
  },
  {
    id: 13,
    name: 'Guest Services',
    code: 'GUEST_SERVICES',
    description: 'Concierge, bell desk, valet parking, wake-up calls, butler assignments, and lost & found.',
    is_system: true,
    user_count: 0,
    permissions: gsPerms,
  },
  {
    id: 14,
    name: 'Security',
    code: 'SECURITY',
    description: 'Visitor gate passes, CCTV monitoring, incident reports, key card audits, and emergency procedures.',
    is_system: true,
    user_count: 0,
    permissions: secPerms,
  },
  {
    id: 15,
    name: 'Customer / Guest',
    code: 'CUSTOMER',
    description: 'Explore hotel amenities, submit amenity booking requests, view request status, and manage charges.',
    is_system: true,
    user_count: 1,
    permissions: customerPerms,
  },
];
