import React, { Fragment } from 'react';

import { useParams, useLocation, useNavigate } from 'react-router-dom';

import { useStore } from '../context/StoreContext';

import { NAV } from '../data/mock';

import { api } from '../services/api';

import { inr, todayISO, addDaysISO, formatHotelTime, formatHotelDateTime } from '../utils/format';

import Badge, { StatusBadge } from './Badge';

import PageHead from './PageHead';

import SubNav from './SubNav';

import RoomTypes from '../pages/rooms/RoomTypes';

import RestaurantPosView from './RestaurantPosView';

import { useRbac } from '../context/RbacContext';

import AmenitiesManagement from '../pages/guest-services/AmenitiesManagement';

import AmenitiesOverviewSection from '../pages/guest-services/AmenitiesOverviewSection';

import IncomingWebhookLogs from '../pages/webhooks/IncomingWebhookLogs';

import GuestModal from './GuestModal';

import AppearanceSettings from '../pages/settings/AppearanceSettings';



/* ── Per-section configuration ─────────────────────────────────────────── */



export const BASE_STAFF_ROLES = [

  'General Manager',

  'Hotel Manager',

  'Revenue Manager',

  'Reservation Manager',

  'Front Desk Associate',

  'Night Auditor',

  'Housekeeping Supervisor',

  'Room Attendant',

  'Finance Manager',

  'Accountant',

  'Restaurant Manager',

  'Head Chef',

  'Server / Waiter',

  'HR Manager',

  'Chief Engineer',

  'Maintenance Technician',

  'Procurement Officer',

  'Concierge',

  'Guest Services Associate',

  'Security Officer',

  'Sales Manager',

];



export const ALL_STAFF_ROLES = BASE_STAFF_ROLES;



export const DEPARTMENT_NAMES = new Set([

  'food & beverage',

  'food and beverage',

  'food & beverage department',

  'f&b',

  'housekeeping',

  'housekeeping department',

  'human resources',

  'human resources department',

  'hr',

  'engineering & maintenance',

  'engineering and maintenance',

  'engineering',

  'maintenance',

  'guest services',

  'guest services department',

  'finance',

  'finance department',

  'accounts',

  'accounts department',

  'procurement',

  'procurement department',

  'security',

  'security department',

  'reception',

  'front desk',

  'reservations',

  'reservations department',

  'revenue management',

  'revenue management department',

  'management',

  'sales & marketing',

  'sales and marketing',

  'operations',

]);



export function isDepartmentName(name = '') {

  if (!name) return false;

  return DEPARTMENT_NAMES.has(name.toLowerCase().trim());

}



export const ROLE_TO_DEPT_MAP = {

  'General Manager': 'Management',

  'Hotel Manager': 'Management',

  'Revenue Manager': 'Revenue Management',

  'Reservation Manager': 'Reservations',

  'Front Desk Associate': 'Reception',

  'Night Auditor': 'Reception',

  'Housekeeping Supervisor': 'Housekeeping',

  'Room Attendant': 'Housekeeping',

  'Finance Manager': 'Accounts',

  'Accountant': 'Accounts',

  'Restaurant Manager': 'Food & Beverage',

  'Head Chef': 'Food & Beverage',

  'Server / Waiter': 'Food & Beverage',

  'HR Manager': 'Human Resources',

  'Chief Engineer': 'Engineering',

  'Maintenance Technician': 'Engineering',

  'Procurement Officer': 'Procurement',

  'Concierge': 'Guest Services',

  'Guest Services Associate': 'Guest Services',

  'Security Officer': 'Security',

  'Sales Manager': 'Sales & Marketing',

  // Backwards compatibility for existing records:

  'Front Desk': 'Reception',

  'Housekeeping': 'Housekeeping',

  'Food & Beverage': 'Food & Beverage',

  'Human Resources': 'Human Resources',

  'Engineering & Maintenance': 'Engineering',

  'Guest Services': 'Guest Services',

};



export function getDepartmentForRole(roleStr = '') {

  if (!roleStr) return 'Reception';

  const exact = ROLE_TO_DEPT_MAP[roleStr];

  if (exact) return exact;

  const r = roleStr.toLowerCase().trim();

  if (r.includes('revenue')) return 'Revenue Management';

  if (r.includes('front desk') || r.includes('reception') || r.includes('night audit')) return 'Reception';

  if (r.includes('housekeep') || r.includes('clean') || r.includes('room attendant') || r.includes('laundry')) return 'Housekeeping';

  if (r.includes('finance') || r.includes('account') || r.includes('cashier') || r.includes('billing')) return 'Accounts';

  if (r.includes('food') || r.includes('beverage') || r.includes('chef') || r.includes('kitchen') || r.includes('restaurant') || r.includes('bar') || r.includes('f&b') || r.includes('fb') || r.includes('server') || r.includes('waiter')) return 'Food & Beverage';

  if (r.includes('hr') || r.includes('human resource') || r.includes('personnel') || r.includes('talent')) return 'Human Resources';

  if (r.includes('engineer') || r.includes('maintenance') || r.includes('tech')) return 'Engineering';

  if (r.includes('procurement') || r.includes('purchas') || r.includes('inventory') || r.includes('store')) return 'Procurement';

  if (r.includes('security') || r.includes('guard') || r.includes('safety')) return 'Security';

  if (r.includes('reservation') || r.includes('booking')) return 'Reservations';

  if (r.includes('guest service') || r.includes('concierge') || r.includes('bell') || r.includes('valet')) return 'Guest Services';

  if (r.includes('manager') || r.includes('gm') || r.includes('management') || r.includes('director')) return 'Management';

  return 'Operations';

}



const SECTION_CONFIG = {

  /* ── Reservations & Bookings ─────────────────────────────── */

  '/bookings/details': {

    title: 'Reservation Details',

    subtitle: 'View and manage all reservation information, guest data and room allocations',

    type: 'detail',

    fields: [],

    buttons: ['Edit Reservation', 'Print Confirmation', 'Send to Guest'],

  },

  '/bookings/calendar': {

    title: 'Booking Calendar',

    subtitle: 'Visual calendar view of all reservations across room types',

    type: 'calendar',

    buttons: ['New Booking', 'Export Calendar'],

  },

  '/bookings/group': {

    title: 'Group Reservation',

    subtitle: 'Manage block bookings for events, tours and corporate groups',

    type: 'table',

    columns: ['Group Name', 'Rooms', 'Check-in', 'Check-out', 'Contact', 'Status'],

    rows: [],

    buttons: ['Create Group Booking'],

  },

  '/bookings/walk-in': {

    title: 'Walk-in Reservation',

    subtitle: 'Register guests who arrive without a prior reservation',

    type: 'form',

    formFields: ['Guest Name', 'Phone Number', 'ID Proof Type', 'ID Number', 'Room Type', 'Number of Guests', 'Duration (Nights)', 'Special Requests'],

    buttons: ['Register Walk-in'],

  },

  '/bookings/history': {

    title: 'Booking History',

    subtitle: 'Complete archive of all past bookings with status and payment details',

    type: 'table',

    columns: ['Booking ID', 'Guest', 'Room', 'Check-in', 'Check-out', 'Amount', 'Status'],

    rows: [],

    buttons: ['Export History', 'Filter by Date'],

  },

  '/bookings/refund': {

    title: 'Refund Request',

    subtitle: 'Process and track refund requests for cancelled or modified bookings',

    type: 'table',

    columns: ['Request ID', 'Booking ID', 'Guest', 'Amount', 'Reason', 'Status'],

    rows: [],

    buttons: ['New Refund Request', 'Export Report'],

  },



  /* ── Front Desk ──────────────────────────────────────────── */

  '/front-desk/pending-checkin': {

    title: 'Pending Check-in',

    subtitle: 'Guests expected today who haven\'t checked in yet',

    type: 'table',

    columns: ['Guest', 'Room Type', 'Booking ID', 'Expected Time', 'Payment', 'Action'],

    rows: [],

    buttons: ['Refresh List'],

  },

  '/front-desk/walk-in-checkin': {

    title: 'Walk-in Guest Check-in',

    subtitle: 'Quick check-in for guests arriving without advance booking',

    type: 'form',

    formFields: ['Guest Name', 'Phone Number', 'ID Proof Type', 'ID Number', 'Room Type', 'Payment Method', 'Advance Amount', 'Number of Guests'],

    buttons: ['Check-in Guest'],

  },

  '/front-desk/guest-registration': {

    title: 'Guest Registration',

    subtitle: 'Collect and store guest identification and contact information',

    type: 'form',

    formFields: ['Full Name', 'Email Address', 'Phone Number', 'Nationality', 'ID Proof Type', 'ID Number', 'Address', 'Purpose of Visit'],

    buttons: ['Save Registration'],

  },

  '/front-desk/room-assignment': {

    title: 'Room Assignment',

    subtitle: 'Assign available rooms to checked-in or confirmed guests',

    type: 'table',

    columns: ['Guest', 'Requested Type', 'Assigned Room', 'Floor', 'Status', 'Action'],

    rows: [

      ['Ravi Kumar', 'Deluxe', '205', '2', 'Assigned', 'Change Room'],

      ['Anita Sharma', 'Suite', '410', '4', 'Assigned', 'Change Room'],

      ['John Mathew', 'Standard', '—', '—', 'Pending', 'Assign Now'],

    ],

    buttons: ['Auto-Assign Rooms'],

  },

  '/front-desk/id-verification': {

    title: 'ID Verification',

    subtitle: 'Verify government-issued identification for regulatory compliance',

    type: 'table',

    columns: ['Guest', 'ID Type', 'ID Number', 'Verified By', 'Status'],

    rows: [

      ['Ravi Kumar', 'Aadhaar', 'XXXX-XXXX-4521', 'Suresh K', 'Verified'],

      ['Anita Sharma', 'Passport', 'J84XXXXX', 'Suresh K', 'Verified'],

      ['John Mathew', 'Driving License', 'TN-XX-XXXXX', '—', 'Pending'],

    ],

    buttons: ['Upload ID Document'],

  },

  '/front-desk/early-checkin': {

    title: 'Early Check-in',

    subtitle: 'Manage requests for check-in before the standard 2:00 PM time',

    type: 'table',

    columns: ['Guest', 'Requested Time', 'Room', 'Charge', 'Approval', 'Action'],

    rows: [

      ['Priya Nair', '10:00 AM', '302', '₹500', 'Pending', 'Approve'],

      ['David Wilson', '11:00 AM', '408', '₹750', 'Pending', 'Approve'],

    ],

    buttons: ['Set Early Check-in Policy'],

  },

  '/front-desk/late-checkout': {

    title: 'Late Check-out',

    subtitle: 'Manage requests for check-out after the standard 11:00 AM time',

    type: 'table',

    columns: ['Guest', 'Requested Time', 'Room', 'Extra Charge', 'Approval', 'Action'],

    rows: [

      ['Mohammed Faiz', '2:00 PM', '107', '₹1,000', 'Approved', '—'],

      ['Lakshmi Devi', '4:00 PM', '301', '₹1,500', 'Pending', 'Approve'],

    ],

    buttons: ['Set Late Check-out Policy'],

  },

  '/front-desk/room-transfer': {

    title: 'Room Transfer',

    subtitle: 'Transfer a guest from one room to another during their stay',

    type: 'form',

    formFields: ['Guest Name', 'Current Room', 'New Room', 'Reason for Transfer', 'Rate Adjustment', 'Effective Date'],

    buttons: ['Process Transfer'],

  },

  '/front-desk/extend-stay': {

    title: 'Extend Stay',

    subtitle: 'Extend a guest\'s reservation for additional nights',

    type: 'form',

    formFields: ['Guest Name', 'Current Check-out', 'New Check-out', 'Additional Nights', 'Rate per Night', 'Total Additional Charge'],

    buttons: ['Extend Reservation'],

  },

  '/front-desk/additional-charges': {

    title: 'Additional Guest Charges',

    subtitle: 'Record extra charges like room service, minibar, laundry and damages',

    type: 'table',

    columns: ['Guest', 'Room', 'Charge Type', 'Amount', 'Date', 'Status'],

    rows: [

      ['Ravi Kumar', '205', 'Room Service', '₹850', '13 Oct', 'Pending'],

      ['Anita Sharma', '410', 'Minibar', '₹1,200', '13 Oct', 'Pending'],

      ['Mohammed Faiz', '107', 'Laundry', '₹350', '12 Oct', 'Added to bill'],

    ],

    buttons: ['Add Charge', 'Generate Bill'],

  },

  '/front-desk/checkout': {

    title: 'Check-out',

    subtitle: 'Process guest departures, settle bills and release rooms',

    type: 'table',

    columns: ['Guest', 'Room', 'Total Bill', 'Balance Due', 'Payment', 'Action'],

    rows: [

      ['Mohammed Faiz', '107', '₹9,350', '₹350', 'Partial', 'Check out'],

      ['Ravi Kumar', '205', '₹5,850', '₹0', 'Paid', 'Check out'],

    ],

    buttons: ['Process All Departures'],

  },

  '/front-desk/final-bill': {

    title: 'Final Bill Generation',

    subtitle: 'Generate itemized invoices with taxes for departing guests',

    type: 'detail',

    fields: [

      { label: 'Guest', value: 'Mohammed Faiz' },

      { label: 'Room', value: '107 – Family Room' },

      { label: 'Stay', value: '12 Oct – 14 Oct (2 nights)' },

      { label: 'Room Charges', value: '₹9,000' },

      { label: 'Room Service', value: '₹350' },

      { label: 'GST (12%)', value: '₹1,122' },

      { label: 'Total', value: '₹10,472', highlight: true },

      { label: 'Paid', value: '₹9,000' },

      { label: 'Balance Due', value: '₹1,472', badge: 'red' },

    ],

    buttons: ['Generate Invoice', 'Print Bill', 'Email to Guest'],

  },

  '/front-desk/history': {

    title: 'Check-in & Check-out History',

    subtitle: 'Complete log of all guest arrivals and departures',

    type: 'table',

    columns: ['Date', 'Guest', 'Room Number', 'Type', 'Handled By', 'Notes'],

    rows: [

      ['13 Oct, 2:15 PM', 'Ravi Kumar', '205', 'Check-in', 'Suresh K', '—'],

      ['12 Oct, 2:05 PM', 'Mohammed Faiz', '107', 'Check-in', 'Suresh K', 'Family with 2 kids'],

      ['12 Oct, 11:30 AM', 'Lakshmi Devi', '301', 'Check-out', 'Suresh K', 'Late check-out approved'],

      ['11 Oct, 11:00 AM', 'Karthik Raja', '102', 'Check-out', 'Suresh K', 'Cancelled – refund initiated'],

    ],

    buttons: ['Export History', 'Filter by Date'],

  },



  /* ── Guest Management ────────────────────────────────────── */

  '/guests/directory': {

    title: 'Guest Directory',

    subtitle: 'Searchable list of all guests who have stayed at the property',

    type: 'table',

    columns: ['Guest', 'Phone', 'Email', 'Total Stays', 'Last Visit', 'Tier'],

    rows: [

      ['Ravi Kumar', '+91 98xxx 41021', 'ravi@mail.com', '4', '13 Oct', 'Gold'],

      ['Anita Sharma', '+91 99xxx 22874', 'anita@mail.com', '9', '13 Oct', 'VIP'],

      ['Mohammed Faiz', '+91 90xxx 13498', 'faiz@mail.com', '6', '12 Oct', 'Gold'],

      ['Priya Nair', '+91 97xxx 66310', 'priya@mail.com', '2', '14 Oct', 'Silver'],

    ],

    buttons: ['Add Guest', 'Import from CSV'],

  },

  '/guests/profile': {

    title: 'Guest Profile',

    subtitle: 'Detailed view of an individual guest\'s data, preferences and history',

    type: 'detail',

    fields: [

      { label: 'Full Name', value: 'Anita Sharma' },

      { label: 'Phone', value: '+91 99xxx 22874' },

      { label: 'Email', value: 'anita.sharma@mail.com' },

      { label: 'Nationality', value: 'Indian' },

      { label: 'Total Stays', value: '9' },

      { label: 'Tier', value: 'VIP', badge: 'teal' },

      { label: 'Average Spend', value: '₹14,200' },

      { label: 'Preferred Room', value: 'Suite / High Floor' },

    ],

    buttons: ['Edit Profile', 'View Stay History', 'Send Message'],

  },

  '/guests/details': {

    title: 'Guest Details',

    subtitle: 'Contact and identification information for the selected guest',

    type: 'form',

    formFields: ['Guest ID', 'Full Name', 'Date of Birth', 'Gender', 'Phone Number', 'Email', 'Nationality', 'Address', 'Emergency Contact'],

    buttons: ['Update Details'],

  },

  '/guests/identification': {

    title: 'Identification Records',

    subtitle: 'Government-issued IDs uploaded and verified for each guest',

    type: 'table',

    columns: ['Guest', 'ID Type', 'ID Number', 'Upload Date', 'Verified', 'Action'],

    rows: [

      ['Ravi Kumar', 'Aadhaar Card', 'XXXX-4521', '13 Oct', 'Yes', 'View'],

      ['Anita Sharma', 'Passport', 'J84XXXXX', '10 Oct', 'Yes', 'View'],

      ['David Wilson', 'Passport', 'UK-XXXXXX', '16 Oct', 'No', 'Verify'],

    ],

    buttons: ['New Entry', 'Upload New ID'],

  },

  '/guests/stay-history': {

    title: 'Stay History',

    subtitle: 'Chronological record of all visits by a selected guest',

    type: 'table',

    columns: ['Booking ID', 'Room', 'Check-in', 'Check-out', 'Amount', 'Rating'],

    rows: [],

    buttons: ['Export History'],

  },

  '/guests/preferences': {

    title: 'Guest Preferences',

    subtitle: 'Stored preferences for returning guests – room, food, pillows and more',

    type: 'detail',

    fields: [

      { label: 'Room Preference', value: 'High floor, Away from elevator' },

      { label: 'Bed Type', value: 'King-size' },

      { label: 'Pillow', value: 'Extra soft pillows × 2' },

      { label: 'Dietary', value: 'Vegetarian, No onion/garlic' },

      { label: 'Temperature', value: '22°C' },

      { label: 'Newspaper', value: 'The Hindu – English' },

      { label: 'Mini bar', value: 'Stock with fruit juices' },

    ],

    buttons: ['Edit Preferences'],

  },

  '/guests/vip': {

    title: 'VIP Guest',

    subtitle: 'High-value guests with priority service and special arrangements',

    type: 'table',

    columns: ['Guest', 'Tier', 'Total Stays', 'Lifetime Spend', 'Special Notes'],

    rows: [

      ['Anita Sharma', 'VIP', '9', '₹1,28,000', 'Airport pickup, Suite upgrade'],

      ['Rajesh Kapoor', 'VIP', '15', '₹3,50,000', 'Corner suite, Welcome champagne'],

      ['Mohammed Faiz', 'Gold', '6', '₹54,000', 'Family arrangements'],

    ],

    buttons: ['Add VIP Guest', 'Send VIP Notification'],

  },

  '/guests/feedback': {

    title: 'Guest Feedback & Reviews',

    subtitle: 'Ratings and reviews collected from guests after check-out',

    type: 'table',

    columns: ['Guest', 'Stay', 'Rating', 'Feedback', 'Date', 'Response'],

    rows: [

      ['Ravi Kumar', 'BK-10421', '⭐ 4', 'Great service, food could improve', '15 Oct', 'Replied'],

      ['Lakshmi Devi', 'BK-10428', '⭐ 5', 'Excellent stay, very clean', '12 Oct', 'Replied'],

      ['David Wilson', 'BK-10429', '⭐ 3', 'Room was good, noisy corridor', '19 Oct', 'Pending'],

    ],

    buttons: ['Send Review Request', 'Export Feedback'],

  },

  '/guests/complaints': {

    title: 'Complaints & Service Requests',

    subtitle: 'Track and resolve guest complaints and special service requests',

    type: 'table',

    columns: ['Ticket', 'Guest', 'Room', 'Issue', 'Priority', 'Status', 'Action'],

    rows: [

      ['SR-041', 'Ravi Kumar', '205', 'AC too cold', 'Medium', 'Open', 'Assign'],

      ['SR-040', 'Anita Sharma', '410', 'Extra towels needed', 'Low', 'Resolved', '—'],

      ['SR-039', 'David Wilson', '408', 'Noisy neighbours', 'High', 'Escalated', 'Resolve'],

    ],

    buttons: ['New Service Request', 'Escalation Settings'],

  },

  '/guests/loyalty': {

    title: 'Loyalty & Membership',

    subtitle: 'Manage loyalty tiers, points and membership benefits',

    type: 'table',

    columns: ['Guest', 'Tier', 'Points', 'Member Since', 'Next Tier At', 'Status'],

    rows: [

      ['Anita Sharma', 'VIP', '12,400', 'Jan 2024', '—', 'Active'],

      ['Ravi Kumar', 'Gold', '6,200', 'Mar 2024', '10,000 pts', 'Active'],

      ['Mohammed Faiz', 'Gold', '4,800', 'Jun 2024', '10,000 pts', 'Active'],

      ['Priya Nair', 'Silver', '1,200', 'Aug 2025', '5,000 pts', 'Active'],

    ],

    buttons: ['Create Membership Plan', 'Adjust Points'],

  },

  '/guests/blacklisted': {

    title: 'Blacklisted / Restricted Guests',

    subtitle: 'Guests who are restricted from booking — authorized staff access only',

    type: 'table',

    columns: ['Guest', 'Reason', 'Restricted Since', 'Restricted By', 'Review Date'],

    rows: [

      ['Guest A (Redacted)', 'Property damage', '15 Aug 2025', 'Admin', '15 Aug 2026'],

      ['Guest B (Redacted)', 'Payment fraud', '3 Jun 2025', 'Finance Manager', '3 Jun 2026'],

    ],

    buttons: ['Add Restricted Guest', 'Review Policy'],

    restricted: true,

  },



  /* ── Room & Room Types ───────────────────────────────────── */

  '/rooms/availability': {

    title: 'Room Availability',

    subtitle: 'Real-time view of room inventory, occupancy and available rooms',

    type: 'table',

    columns: ['Room Type', 'Total', 'Occupied', 'Available', 'Reserved', 'Out of Order'],

    rows: [

      ['Standard', '12', '8', '3', '1', '0'],

      ['Deluxe', '10', '7', '2', '1', '0'],

      ['Premium', '6', '4', '1', '1', '0'],

      ['Suite', '4', '3', '0', '0', '1'],

      ['Family Room', '8', '5', '2', '1', '0'],

    ],

    buttons: ['Update Availability', 'Sync Channels'],

  },

  '/rooms/types-gallery': {

    title: 'Room Type & Gallery',

    subtitle: 'Room categories with photos, amenities and description',

    type: 'cards',

    cards: [

      { name: 'Standard', desc: 'Comfortable room with essential amenities', tags: ['Wi-Fi', 'AC', 'TV'], price: '₹1,500/night' },

      { name: 'Deluxe', desc: 'Spacious room with city view and mini bar', tags: ['Wi-Fi', 'AC', 'TV', 'Mini bar'], price: '₹2,500/night' },

      { name: 'Premium', desc: 'Premium room with balcony and lounge access', tags: ['Wi-Fi', 'AC', 'TV', 'Mini bar', 'Balcony'], price: '₹3,500/night' },

      { name: 'Suite', desc: 'Luxury suite with living area and bathtub', tags: ['Wi-Fi', 'AC', 'TV', 'Mini bar', 'Bathtub', 'Lounge'], price: '₹6,000/night' },

      { name: 'Family Room', desc: 'Extra-large room for families with kids', tags: ['Wi-Fi', 'AC', 'TV', 'Mini bar', 'Kids area'], price: '₹4,500/night' },

    ],

    buttons: ['Add Room Type', 'Upload Photos'],

  },

  '/rooms/floor-management': {

    title: 'Floor Management',

    subtitle: 'View and manage rooms organized by floor level',

    type: 'table',

    columns: ['Floor', 'Total Rooms', 'Occupied', 'Vacant', 'Maintenance', 'Status'],

    rows: [

      ['Floor 1', '10', '6', '3', '1', 'Active'],

      ['Floor 2', '10', '8', '2', '0', 'Active'],

      ['Floor 3', '10', '7', '2', '1', 'Active'],

      ['Floor 4', '10', '5', '4', '1', 'Active'],

    ],

    buttons: ['View Floor Plan'],

  },

  '/rooms/out-of-order': {

    title: 'Out-of-Order Rooms',

    subtitle: 'Rooms temporarily taken offline for repair or maintenance',

    type: 'table',

    columns: ['Room', 'Floor', 'Reason', 'Since', 'Expected Ready', 'Status'],

    rows: [

      ['310', '3', 'AC repair', '11 Oct', '14 Oct', 'In progress'],

      ['410', '4', 'Bathroom renovation', '8 Oct', '18 Oct', 'In progress'],

    ],

    buttons: ['Mark Out of Order', 'Restore Room'],

  },

  '/rooms/seasonal-pricing': {

    title: 'Seasonal Pricing',

    subtitle: 'Rate adjustments based on season, festivals and demand periods',

    type: 'table',

    columns: ['Season', 'Period', 'Adjustment', 'Applies To', 'Status'],

    rows: [

      ['Diwali', '25 Oct – 5 Nov', '+35%', 'All rooms', 'Active'],

      ['Christmas', '20 Dec – 2 Jan', '+40%', 'All rooms', 'Scheduled'],

      ['Monsoon Off-Peak', '1 Jul – 31 Aug', '-15%', 'Standard, Deluxe', 'Active'],

      ['Summer Peak', '1 Apr – 30 Jun', '+20%', 'All rooms', 'Inactive'],

    ],

    buttons: ['Add Season', 'Configure Rules'],

  },

  '/rooms/taxes-fees': {

    title: 'Taxes and Fees',

    subtitle: 'Tax rates and fee structures applied to room charges',

    type: 'detail',

    fields: [

      { label: 'GST (Rooms < ₹7,500)', value: '12%' },

      { label: 'GST (Rooms ≥ ₹7,500)', value: '18%' },

      { label: 'Service Charge', value: '5% (optional)' },

      { label: 'Extra Bed Charge', value: '₹800 / night' },

      { label: 'Early Check-in Fee', value: '₹500 – ₹1,000' },

      { label: 'Late Check-out Fee', value: '₹500 – ₹1,500' },

      { label: 'Cancellation Fee', value: 'First night (within 48hrs)' },

    ],

    buttons: ['Edit Tax Rates', 'Save Changes'],

  },

  '/rooms/rate-plans': {

    title: 'Rate Plans',

    subtitle: 'Named pricing plans for different stay types and channels',

    type: 'table',

    columns: ['Plan Name', 'Base Rate', 'Includes', 'Channels', 'Status'],

    rows: [

      ['Standard Rate', '₹1,500', 'Room only', 'All', 'Active'],

      ['Bed & Breakfast', '₹1,800', 'Room + Breakfast', 'Direct, MMT', 'Active'],

      ['Full Board', '₹3,200', 'Room + All meals', 'Direct', 'Active'],

      ['Corporate', '₹1,350', 'Room + Wi-Fi + Parking', 'Direct', 'Active'],

    ],

    buttons: ['Create Rate Plan'],

  },



  /* ── Availability & Pricing ──────────────────────────────── */

  '/availability/daily-inventory': {

    title: 'Daily Inventory',

    subtitle: 'Day-by-day room count showing what\'s available for sale',

    type: 'table',

    columns: ['Date', 'Standard', 'Deluxe', 'Premium', 'Suite', 'Family'],

    rows: [

      ['13 Oct', '6', '4', '3', '2', '2'],

      ['14 Oct', '5', '3', '3', '1', '2'],

      ['15 Oct', '3', '2', '2', '1', '1'],

      ['16 Oct', '2', '1', '2', '0', '1'],

      ['17 Oct', '1', '0', '1', '0', '1'],

    ],

    buttons: ['Update Inventory', 'Bulk Edit'],

  },

  '/availability/room-type': {

    title: 'Room Type Availability',

    subtitle: 'Availability per room type across selected date range',

    type: 'table',

    columns: ['Room Type', 'Total', 'Booked', 'Available', 'Stop Sell'],

    rows: [

      ['Standard', '12', '6', '6', 'No'],

      ['Deluxe', '10', '7', '3', 'No'],

      ['Premium', '6', '4', '2', 'No'],

      ['Suite', '4', '4', '0', 'Yes'],

      ['Family Room', '8', '5', '3', 'No'],

    ],

    buttons: ['Set Date Range', 'Open/Close Rooms'],

  },

  '/availability/min-max-stay': {

    title: 'Minimum / Maximum Stay',

    subtitle: 'Set stay duration constraints for different room types and periods',

    type: 'table',

    columns: ['Room Type', 'Min Stay', 'Max Stay', 'Period', 'Override'],

    rows: [

      ['Standard', '1 night', '30 nights', 'Year-round', 'Edit'],

      ['Suite', '2 nights', '14 nights', 'Weekends', 'Edit'],

      ['Family Room', '2 nights', '21 nights', 'School holidays', 'Edit'],

    ],

    buttons: ['Add Rule'],

  },

  '/availability/closed': {

    title: 'Closed to Arrival / Departure',

    subtitle: 'Block arrivals or departures on specific dates',

    type: 'table',

    columns: ['Rule', 'Room Types', 'Dates', 'Type', 'Status'],

    rows: [

      ['Diwali no-arrival', 'All', '1 Nov', 'Closed to Arrival', 'Active'],

      ['Christmas no-departure', 'Suite', '25 Dec', 'Closed to Departure', 'Scheduled'],

    ],

    buttons: ['Add Restriction'],

  },

  '/availability/stop-sell': {

    title: 'Stop Sell',

    subtitle: 'Temporarily stop selling rooms on specific channels or dates',

    type: 'table',

    columns: ['Room Type', 'Channel', 'Dates', 'Reason', 'Action'],

    rows: [

      ['Suite', 'All', '17-18 Oct', 'Fully booked', 'Reopen'],

      ['Deluxe', 'Agoda', '20-22 Oct', 'Sync issue', 'Reopen'],

    ],

    buttons: ['New Stop Sell'],

  },

  '/availability/seasonal-rates': {

    title: 'Seasonal Rates',

    subtitle: 'Rate multipliers for peak and off-peak seasons',

    type: 'table',

    columns: ['Season', 'Start', 'End', 'Multiplier', 'Room Types'],

    rows: [

      ['Diwali Peak', '25 Oct', '5 Nov', '+35%', 'All'],

      ['Christmas Peak', '20 Dec', '2 Jan', '+40%', 'All'],

      ['Monsoon Low', '1 Jul', '31 Aug', '-15%', 'Standard, Deluxe'],

    ],

    buttons: ['Add Seasonal Rate'],

  },

  '/availability/weekend-rates': {

    title: 'Weekend Rates',

    subtitle: 'Automatic rate adjustments applied on Friday – Sunday',

    type: 'table',

    columns: ['Room Type', 'Weekday Rate', 'Weekend Rate', 'Adjustment'],

    rows: [

      ['Standard', '₹1,500', '₹1,800', '+20%'],

      ['Deluxe', '₹2,500', '₹3,000', '+20%'],

      ['Premium', '₹3,500', '₹4,200', '+20%'],

      ['Suite', '₹6,000', '₹7,200', '+20%'],

      ['Family Room', '₹4,500', '₹5,400', '+20%'],

    ],

    buttons: ['Edit Weekend Rules'],

  },

  '/availability/dynamic-rates': {

    title: 'Dynamic Rates',

    subtitle: 'AI-driven rate adjustments based on demand, occupancy and competition',

    type: 'detail',

    fields: [

      { label: 'Algorithm', value: 'Demand-based pricing v2.1' },

      { label: 'Base Factor', value: 'Occupancy + Competitor rates' },

      { label: 'Max Increase', value: '+50%' },

      { label: 'Max Decrease', value: '-20%' },

      { label: 'Update Frequency', value: 'Every 6 hours' },

      { label: 'Status', value: 'Active', badge: 'green' },

    ],

    buttons: ['Configure Algorithm', 'View Rate History', 'Pause Dynamic Pricing'],

  },



  /* ── Finance & Payment Dashboard ─────────────────────────── */

  '/finance/booking-payments': {

    title: 'Booking Payments',

    subtitle: 'All payments received against bookings',

    type: 'table',

    columns: ['Booking ID', 'Guest', 'Amount', 'Method', 'Date', 'Status'],

    rows: [],

    buttons: ['Record Payment', 'Send Payment Reminder'],

  },

  '/finance/payment-requests': {

    title: 'Payment Requests & Deposits',

    subtitle: 'Outstanding payment requests and advance deposit tracking',

    type: 'table',

    columns: ['Guest', 'Booking', 'Deposit Required', 'Received', 'Due Date', 'Status'],

    rows: [],

    buttons: ['Send Payment Link', 'Generate Invoice'],

  },

  '/finance/invoice-receipt': {

    title: 'Invoice and Receipt',

    subtitle: 'Generate, view and download invoices and payment receipts',

    type: 'table',

    columns: ['Invoice No.', 'Guest', 'Amount', 'Date', 'Type', 'Action'],

    rows: [

      ['INV-2026-1042', 'Ravi Kumar', '₹5,600', '15 Oct', 'Tax Invoice', 'Download'],

      ['INV-2026-1041', 'Mohammed Faiz', '₹10,472', '14 Oct', 'Tax Invoice', 'Download'],

      ['REC-2026-0089', 'Lakshmi Devi', '₹7,840', '12 Oct', 'Receipt', 'Download'],

    ],

    buttons: ['Generate Invoice', 'Bulk Download'],

  },

  '/finance/tax-gst': {

    title: 'Tax and GST Report',

    subtitle: 'Monthly GST collected, filed and due for government remittance',

    type: 'detail',

    fields: [

      { label: 'Total Revenue (Oct)', value: '₹11,84,000' },

      { label: 'GST Collected (12%)', value: '₹1,08,480' },

      { label: 'GST Collected (18%)', value: '₹32,400' },

      { label: 'Total GST', value: '₹1,40,880', highlight: true },

      { label: 'GST Filed', value: 'Sep 2026 – Filed' },

      { label: 'GST Pending', value: 'Oct 2026 – Due Nov 20' },

    ],

    buttons: ['Download GST Report', 'File GST Return'],

  },

  '/finance/revenue': {

    title: 'Revenue',

    subtitle: 'Revenue breakdown by source, room type and time period',

    type: 'table',

    columns: ['Source', 'Bookings', 'Revenue', 'Share', 'Trend'],

    rows: [

      ['Direct', '42', '₹4,28,000', '36%', '↑ 8%'],

      ['MakeMyTrip', '35', '₹3,52,000', '30%', '↑ 12%'],

      ['Agoda', '18', '₹2,16,000', '18%', '↓ 3%'],

      ['Booking.com', '15', '₹1,88,000', '16%', '↑ 5%'],

    ],

    buttons: ['Export Report', 'Set Date Range'],

  },

  '/finance/deposit-management': {

    title: 'Deposit Management',

    subtitle: 'Track advance deposits, refundable deposits and security amounts',

    type: 'table',

    columns: ['Guest', 'Deposit Type', 'Amount', 'Date', 'Refundable', 'Status'],

    rows: [

      ['Anita Sharma', 'Advance', '₹12,000', '10 Oct', 'Adjustable', 'Held'],

      ['David Wilson', 'Security', '₹5,000', '16 Oct', 'Yes', 'Held'],

      ['Lakshmi Devi', 'Advance', '₹7,000', '8 Oct', 'Adjustable', 'Refunded'],

    ],

    buttons: ['Record Deposit', 'Process Refund'],

  },

  '/finance/commission-booking': {

    title: 'Revenue / Commission Booking',

    subtitle: 'Revenue recognition and OTA commission entries for accounting',

    type: 'table',

    columns: ['Booking', 'Channel', 'Gross Revenue', 'Commission %', 'Commission Amt', 'Net Revenue'],

    rows: [

      ['BK-10421', 'MakeMyTrip', '₹5,000', '15%', '₹750', '₹4,250'],

      ['BK-10423', 'Agoda', '₹1,500', '17%', '₹255', '₹1,245'],

      ['BK-10424', 'Booking.com', '₹10,500', '15%', '₹1,575', '₹8,925'],

    ],

    buttons: ['Export Ledger', 'Reconcile'],

  },

  '/finance/reconciliation': {

    title: 'Reconciliation',

    subtitle: 'Match booking payments with bank statements and OTA remittances',

    type: 'table',

    columns: ['Date', 'Description', 'Expected', 'Received', 'Difference', 'Status'],

    rows: [

      ['13 Oct', 'MakeMyTrip settlement', '₹48,500', '₹48,500', '₹0', 'Matched'],

      ['12 Oct', 'Agoda settlement', '₹22,400', '₹21,800', '-₹600', 'Mismatch'],

      ['11 Oct', 'Direct – UPI', '₹31,400', '₹31,400', '₹0', 'Matched'],

    ],

    buttons: ['Upload Bank Statement', 'Auto-Reconcile'],

  },

  '/finance/refunds': {

    title: 'Refunds',

    subtitle: 'All processed and pending refunds across bookings',

    type: 'table',

    columns: ['Refund ID', 'Booking', 'Guest', 'Amount', 'Method', 'Date', 'Status'],

    rows: [

      ['RF-001', 'BK-10427', 'Karthik Raja', '₹3,000', 'Original method', '11 Oct', 'Completed'],

      ['RF-002', 'BK-10420', 'Meera Das', '₹2,500', 'Bank transfer', '—', 'Pending'],

    ],

    buttons: ['Process Refund', 'Export Report'],

  },

  '/finance/outstanding-balance': {

    title: 'Outstanding Balance',

    subtitle: 'Guests and bookings with pending payment balances',

    type: 'table',

    columns: ['Guest', 'Booking', 'Total Due', 'Paid', 'Outstanding', 'Due Date'],

    rows: [

      ['Anita Sharma', 'BK-10422', '₹18,000', '₹12,000', '₹6,000', '16 Oct'],

      ['John Mathew', 'BK-10423', '₹1,500', '₹0', '₹1,500', '14 Oct'],

      ['Sneha Iyer', 'BK-10426', '₹7,500', '₹0', '₹7,500', '15 Oct'],

    ],

    buttons: ['Send Reminder', 'Export Outstanding'],

  },

  '/finance/vendor-payment': {

    title: 'Vendor Payment',

    subtitle: 'Payments to suppliers, service providers and maintenance vendors',

    type: 'table',

    columns: ['Vendor', 'Invoice', 'Amount', 'Due Date', 'Category', 'Status'],

    rows: [

      ['Fresh Foods Co.', 'VN-2026-089', '₹45,000', '15 Oct', 'F&B Supply', 'Paid'],

      ['CleanPro Services', 'VN-2026-090', '₹22,000', '20 Oct', 'Housekeeping', 'Pending'],

      ['TechFix Solutions', 'VN-2026-091', '₹8,500', '18 Oct', 'Maintenance', 'Due'],

    ],

    buttons: ['Add Vendor', 'Record Payment'],

  },

  '/finance/ota-commission': {

    title: 'OTA Commission Booking',

    subtitle: 'Commission amounts payable to OTA partners per booking',

    type: 'table',

    columns: ['OTA', 'Bookings', 'Gross Revenue', 'Commission Rate', 'Commission Due', 'Settlement'],

    rows: [

      ['MakeMyTrip', '35', '₹3,52,000', '15%', '₹52,800', 'Monthly'],

      ['Agoda', '18', '₹2,16,000', '17%', '₹36,720', 'Bi-weekly'],

      ['Booking.com', '15', '₹1,88,000', '15%', '₹28,200', 'Monthly'],

    ],

    buttons: ['Export Commission Report', 'Schedule Payment'],

  },



  /* ── Offers & Promotions ─────────────────────────────────── */

  '/offers/create': {

    title: 'Create New Offers',

    subtitle: 'Design a new promotional offer with discount rules and validity',

    type: 'form',

    formFields: ['Offer Name', 'Promo Code', 'Discount Type', 'Discount Value', 'Valid From', 'Valid Until', 'Applicable Room Types', 'Applicable Channels', 'Minimum Stay', 'Max Usage Limit', 'Description'],

    buttons: ['Create Offer', 'Save as Draft'],

  },

  '/offers/fixed-discount': {

    title: 'Fixed Amount Discount',

    subtitle: 'Flat monetary discounts applied to bookings',

    type: 'table',

    columns: ['Offer Name', 'Code', 'Discount', 'Valid Until', 'Used', 'Status'],

    rows: [

      ['Last-Minute Deal', 'LASTMIN', '₹500 off', 'Ongoing', '21', 'Active'],

      ['Welcome Bonus', 'WELCOME', '₹300 off', '31 Dec', '84', 'Active'],

    ],

    buttons: ['Create Fixed Discount'],

  },

  '/offers/early-booking': {

    title: 'Early Booking Offers',

    subtitle: 'Discounts for guests who book well in advance',

    type: 'table',

    columns: ['Offer', 'Code', 'Advance Days', 'Discount', 'Valid Until', 'Used', 'Status'],

    rows: [

      ['Book 30 days early', 'EARLY15', '30+', '15%', '31 Dec', '48', 'Active'],

      ['Book 60 days early', 'EARLY20', '60+', '20%', '31 Mar', '12', 'Active'],

    ],

    buttons: ['Create Early Booking Offer'],

  },

  '/offers/last-minute': {

    title: 'Last-Minute Deals',

    subtitle: 'Special rates for same-day or next-day bookings',

    type: 'table',

    columns: ['Offer', 'Code', 'Window', 'Discount', 'Channel', 'Used', 'Status'],

    rows: [

      ['Tonight only', 'TONIGHT', 'Same day', '25%', 'Direct', '15', 'Active'],

      ['Tomorrow deal', 'LASTMIN', 'Next day', '₹500 off', 'All', '21', 'Active'],

    ],

    buttons: ['Create Last-Minute Deal'],

  },

  '/offers/long-stay': {

    title: 'Long Stay Discount',

    subtitle: 'Discounts for guests staying 5 or more nights',

    type: 'table',

    columns: ['Offer', 'Code', 'Min Nights', 'Discount', 'Valid Until', 'Used', 'Status'],

    rows: [

      ['5+ nights', 'STAY5', '5', '10%', '31 Mar', '9', 'Active'],

      ['10+ nights', 'STAY10', '10', '18%', '31 Mar', '3', 'Active'],

    ],

    buttons: ['Create Long Stay Discount'],

  },

  '/offers/seasonal': {

    title: 'Seasonal Package',

    subtitle: 'Bundled offers with room + dining + activities for specific seasons',

    type: 'table',

    columns: ['Package', 'Code', 'Includes', 'Season', 'Discount', 'Status'],

    rows: [

      ['Diwali Delight', 'DIWALI26', 'Room + Dinner + Decor', 'Oct-Nov', '20%', 'Scheduled'],

      ['Monsoon Escape', 'RAIN25', 'Room + Breakfast + Spa', 'Jul-Aug', '25%', 'Expired'],

    ],

    buttons: ['Create Seasonal Package'],

  },

  '/offers/corporate': {

    title: 'Corporate Rates',

    subtitle: 'Negotiated rates for corporate clients and business travellers',

    type: 'table',

    columns: ['Company', 'Code', 'Discount', 'Room Types', 'Contract Until', 'Bookings'],

    rows: [

      ['TechCorp India', 'CORP-TECH', '12%', 'Deluxe, Premium', '31 Mar', '34'],

      ['GlobalFinance Ltd', 'CORP-GF', '15%', 'Suite', '31 Dec', '18'],

    ],

    buttons: ['Add Corporate Client', 'Renew Contract'],

  },

  '/offers/members-only': {

    title: 'Members Only Offer',

    subtitle: 'Exclusive discounts available only to loyalty program members',

    type: 'table',

    columns: ['Offer', 'Tier Required', 'Discount', 'Valid Until', 'Redemptions', 'Status'],

    rows: [

      ['Gold Weekend Treat', 'Gold', '10%', 'Ongoing', '22', 'Active'],

      ['VIP Suite Upgrade', 'VIP', 'Free upgrade', 'Ongoing', '5', 'Active'],

      ['Silver Welcome Back', 'Silver', '₹200 off', '31 Dec', '31', 'Active'],

    ],

    buttons: ['Create Members Offer'],

  },

  '/offers/booking-restriction': {

    title: 'Booking Restriction',

    subtitle: 'Rules that restrict which offers can be combined or applied',

    type: 'table',

    columns: ['Rule', 'Applies To', 'Restriction', 'Status'],

    rows: [

      ['No double discount', 'All offers', 'Max 1 promo per booking', 'Active'],

      ['Min booking value', 'LASTMIN', 'Booking ≥ ₹2,000', 'Active'],

      ['Channel restriction', 'CORP codes', 'Direct only', 'Active'],

    ],

    buttons: ['Add Restriction Rule'],

  },

  '/offers/redemption-reports': {

    title: 'Redemption Reports',

    subtitle: 'Track how often offers are used and their revenue impact',

    type: 'table',

    columns: ['Offer', 'Code', 'Redemptions', 'Total Discount Given', 'Bookings Generated', 'Revenue Impact'],

    rows: [

      ['Early booking', 'EARLY15', '48', '₹1,08,000', '48', '+₹6,12,000'],

      ['Last-minute', 'LASTMIN', '21', '₹10,500', '21', '+₹62,500'],

      ['Long stay', 'STAY5', '9', '₹31,500', '9', '+₹2,83,500'],

      ['Corporate', 'CORP', '34', '₹72,000', '34', '+₹5,28,000'],

    ],

    buttons: ['Export Report', 'Set Date Range'],

  },



  /* ── Channel Manager ─────────────────────────────────────── */

  '/channels/availability': {

    title: 'Channel Availability',

    subtitle: 'Room availability pushed to each connected channel',

    type: 'table',

    columns: ['Channel', 'Standard', 'Deluxe', 'Premium', 'Suite', 'Last Synced'],

    rows: [

      ['MakeMyTrip', '6', '4', '3', '2', '4 min ago'],

      ['Agoda', '6', '4', '3', '2', '9 min ago'],

      ['Booking.com', '—', '—', '—', '—', 'Not connected'],

    ],

    buttons: ['Force Sync', 'Configure Channels'],

  },

  '/channels/rate-mapping': {

    title: 'Channel Rate Mapping',

    subtitle: 'Map your base rates to each channel\'s pricing structure',

    type: 'table',

    columns: ['Room Type', 'Base Rate', 'MakeMyTrip', 'Agoda', 'Booking.com'],

    rows: [

      ['Standard', '₹1,500', '₹1,650', '₹1,620', '₹1,650'],

      ['Deluxe', '₹2,500', '₹2,750', '₹2,700', '₹2,750'],

      ['Premium', '₹3,500', '₹3,850', '₹3,780', '₹3,850'],

      ['Suite', '₹6,000', '₹6,600', '₹6,480', '₹6,600'],

    ],

    buttons: ['Edit Rate Mapping', 'Sync Rates'],

  },

  '/channels/room-type-mapping': {

    title: 'Room Type Mapping',

    subtitle: 'Map your room types to each channel\'s room categories',

    type: 'table',

    columns: ['Your Room Type', 'MakeMyTrip', 'Agoda', 'Booking.com'],

    rows: [

      ['Standard', 'Standard Room', 'Standard Double', 'Standard Room'],

      ['Deluxe', 'Deluxe Room', 'Superior Double', 'Deluxe Room'],

      ['Premium', 'Premium Room', 'Deluxe Suite', 'Premium Room'],

      ['Suite', 'Royal Suite', 'Executive Suite', 'Suite'],

    ],

    buttons: ['Edit Mapping'],

  },

  '/channels/reservation-sync': {

    title: 'Reservation Synchronization',

    subtitle: 'Real-time booking sync status between your PMS and OTA channels',

    type: 'table',

    columns: ['Channel', 'Last Sync', 'Pending', 'Failed', 'Status'],

    rows: [

      ['MakeMyTrip', '4 min ago', '0', '0', 'Healthy'],

      ['Agoda', '9 min ago', '1', '0', 'Syncing'],

      ['Booking.com', '—', '—', '—', 'Not connected'],

    ],

    buttons: ['Force Sync All', 'View Sync Log'],

  },

  '/channels/inventory-sync': {

    title: 'Inventory Synchronization',

    subtitle: 'Track inventory count updates pushed to each channel',

    type: 'table',

    columns: ['Channel', 'Last Update', 'Rooms Synced', 'Errors', 'Status'],

    rows: [

      ['MakeMyTrip', '4 min ago', '40', '0', 'Healthy'],

      ['Agoda', '9 min ago', '40', '1', 'Warning'],

      ['Booking.com', '—', '0', '—', 'Offline'],

    ],

    buttons: ['Push Inventory', 'View Error Log'],

  },

  '/channels/import-history': {

    title: 'Booking Import History',

    subtitle: 'Log of bookings imported from OTA channels',

    type: 'table',

    columns: ['Date', 'Channel', 'Booking ID', 'Guest', 'Room', 'Status'],

    rows: [

      ['13 Oct 10:42', 'MakeMyTrip', 'MMT-89234', 'Ravi Kumar', 'Deluxe', 'Imported'],

      ['13 Oct 09:15', 'Agoda', 'AG-12891', 'John Mathew', 'Standard', 'Imported'],

      ['12 Oct 18:30', 'MakeMyTrip', 'MMT-89210', 'Sneha Iyer', 'Deluxe', 'Imported'],

    ],

    buttons: ['Re-import', 'Export Log'],

  },

  '/channels/failed-sync': {

    title: 'Failed Sync Queue',

    subtitle: 'Updates that failed to sync and need manual attention or retry',

    type: 'table',

    columns: ['Channel', 'Task', 'Error', 'Attempts', 'Last Attempt', 'Action'],

    rows: [

      ['Agoda', 'Rate update – Deluxe', 'Timeout', '2 of 5', '10:31 AM', 'Retry'],

      ['MakeMyTrip', 'Inventory – Suite', 'Auth error', '1 of 5', '10:12 AM', 'Retry'],

    ],

    buttons: ['Retry All Failed', 'Clear Queue'],

  },

  '/channels/commission-settings': {

    title: 'Channel Commission Settings',

    subtitle: 'Commission percentages and payment terms per OTA channel',

    type: 'table',

    columns: ['Channel', 'Commission %', 'Payment Terms', 'Settlement', 'Contract Until'],

    rows: [

      ['MakeMyTrip', '15%', 'Net 30', 'Monthly', '31 Mar 2027'],

      ['Agoda', '17%', 'Net 14', 'Bi-weekly', '31 Dec 2026'],

      ['Booking.com', '15%', 'Net 30', 'Monthly', '30 Jun 2027'],

    ],

    buttons: ['Edit Commission', 'Add Channel'],

  },

  '/channels/connection-health': {

    title: 'Connection Health',

    subtitle: 'Real-time health status of all channel API connections',

    type: 'table',

    columns: ['Channel', 'API Status', 'Latency', 'Last Heartbeat', 'Uptime (30d)', 'Action'],

    rows: [

      ['MakeMyTrip', '✅ Online', '120ms', '2 min ago', '99.8%', 'Test'],

      ['Agoda', '⚠️ Degraded', '450ms', '9 min ago', '97.2%', 'Diagnose'],

      ['Booking.com', '❌ Offline', '—', '—', '—', 'Connect'],

    ],

    buttons: ['Run Health Check', 'View Logs'],

  },



  /* ── Webhooks & APIs ─────────────────────────────────────── */

  '/webhooks/api-credentials': {

    title: 'API Credentials',

    subtitle: 'View and manage API keys, secrets and access tokens',

    type: 'detail',

    fields: [

      { label: 'API Key', value: '—' },

      { label: 'Secret Key', value: '—' },

      { label: 'Environment', value: 'Not configured', badge: 'grey' },

      { label: 'Created', value: '—' },

      { label: 'Last Used', value: 'Never' },

    ],

    buttons: ['Regenerate Key', 'Copy to Clipboard'],

  },

  '/webhooks/api-key-management': {

    title: 'API Key Management',

    subtitle: 'Create, revoke and manage multiple API keys for integrations',

    type: 'table',

    columns: ['Key Name', 'API Key', 'Created', 'Last Used', 'Permissions', 'Status'],

    rows: [],

    buttons: ['Create New Key', 'Revoke Key'],

  },

  '/webhooks/incoming-logs': {

    title: 'Incoming Webhook Logs',

    subtitle: 'Events received by your system from external services',

    type: 'table',

    columns: ['Time', 'Source', 'Event', 'Status', 'Response Time'],

    rows: [],

    buttons: ['Refresh Logs', 'Export'],

  },

  '/webhooks/outgoing-logs': {

    title: 'Outgoing Webhook Logs',

    subtitle: 'Events sent from your system to external endpoints',

    type: 'table',

    columns: ['Time', 'Event', 'Endpoint', 'Response', 'Attempts'],

    rows: [],

    buttons: ['Resend Event', 'Export Logs'],

  },

  '/webhooks/retry-queue': {

    title: 'Retry Queue',

    subtitle: 'Failed webhook deliveries queued for automatic retry',

    type: 'table',

    columns: ['Event', 'Endpoint', 'Error', 'Attempts', 'Next Retry', 'Action'],

    rows: [],

    buttons: ['Retry All', 'Clear Queue'],

  },

  '/webhooks/failed-queue': {

    title: 'Failed Event / Webhook Queue',

    subtitle: 'Events that exhausted all retry attempts and need manual resolution',

    type: 'table',

    columns: ['Event', 'Endpoint', 'Error', 'Failed At', 'Total Attempts', 'Action'],

    rows: [],

    buttons: ['Resend All', 'Acknowledge & Clear'],

  },

  '/webhooks/signature-verification': {

    title: 'Signature Verification',

    subtitle: 'Configure HMAC-SHA256 signature verification for inbound and outbound webhook security',

    type: 'detail',

    fields: [

      { label: 'Signing Secret', value: 'stayflow_whsec_production_secret_key_2026' },

      { label: 'Algorithm', value: 'HMAC-SHA256' },

      { label: 'Primary Header', value: 'X-StayFlow-Signature (sha256=<hex>)' },

      { label: 'Partner Headers', value: 'X-MMT-Auth-Token, X-Agoda-Webhook-Token, X-Razorpay-Signature' },

      { label: 'Timestamp Tolerance', value: '300 seconds' },

      { label: 'Status', value: 'Active & Enforced', badge: 'green' },

    ],

    buttons: ['Regenerate Secret', 'Test Verification'],

  },

  '/webhooks/api-usage': {

    title: 'API Usage & Rate Limits',

    subtitle: 'Monitor API call volume and rate limiting thresholds',

    type: 'detail',

    fields: [

      { label: 'Current Plan', value: 'Standard' },

      { label: 'Rate Limit', value: '1,000 requests/min' },

      { label: 'Today\'s Calls', value: '0' },

      { label: 'Monthly Calls', value: '0 / 500,000' },

      { label: 'Avg Response Time', value: '—' },

      { label: 'Error Rate', value: '—' },

    ],

    buttons: ['View Usage Graph', 'Upgrade Plan'],

  },

  '/webhooks/test-console': {

    title: 'Integration Test Console',

    subtitle: 'Send test API requests and inspect responses',

    type: 'form',

    formFields: ['HTTP Method', 'Endpoint URL', 'API Key', 'Request Body (JSON)', 'Headers'],

    buttons: ['Send Request', 'Load Example'],

  },

  '/webhooks/api-permissions': {

    title: 'API Auth / Permission Settings',

    subtitle: 'Control which API keys have access to which resources',

    type: 'table',

    columns: ['Key Name', 'Bookings', 'Rooms', 'Guests', 'Finance', 'Admin'],

    rows: [],

    buttons: ['Edit Permissions', 'Create Scoped Key'],

  },

  '/webhooks/sandbox-production': {

    title: 'Sandbox & Production Settings',

    subtitle: 'Toggle between sandbox (test) and production environments',

    type: 'detail',

    fields: [

      { label: 'Active Environment', value: 'Production', badge: 'green' },

      { label: 'Sandbox URL', value: '—' },

      { label: 'Production URL', value: '—' },

      { label: 'Sandbox Data', value: 'None' },

      { label: 'Last Sandbox Use', value: 'Never' },

    ],

    buttons: ['Switch to Sandbox', 'Reset Sandbox Data'],

  },



  /* ── Housekeeping & Maintenance ──────────────────────────── */

  '/housekeeping/dirty-rooms': {

    title: 'Dirty Rooms',

    subtitle: 'Rooms that need cleaning after guest check-out',

    type: 'table',

    columns: ['Room', 'Floor', 'Type', 'Checked Out', 'Priority', 'Action'],

    rows: [

      ['205', '2', 'Deluxe', '12:00 PM', 'High', 'Assign Staff'],

      ['107', '1', 'Family Room', '11:30 AM', 'Medium', 'Assign Staff'],

      ['302', '3', 'Premium', '11:00 AM', 'Low', 'Assign Staff'],

    ],

    buttons: ['Mark All Clean', 'Print Task Sheet'],

  },

  '/housekeeping/clean-rooms': {

    title: 'Clean Rooms',

    subtitle: 'Rooms that have been cleaned and are ready for inspection or sale',

    type: 'table',

    columns: ['Room', 'Floor', 'Type', 'Cleaned By', 'Time', 'Inspected'],

    rows: [

      ['101', '1', 'Standard', 'Rajan P', '9:30 AM', 'Yes'],

      ['203', '2', 'Standard', 'Rajan P', '10:15 AM', 'Yes'],

      ['305', '3', 'Deluxe', 'Priya M', '10:45 AM', 'No'],

    ],

    buttons: ['Mark for Inspection'],

  },

  '/housekeeping/inspection': {

    title: 'Inspection Pending',

    subtitle: 'Cleaned rooms awaiting supervisor inspection before going live',

    type: 'table',

    columns: ['Room', 'Floor', 'Type', 'Cleaned By', 'Cleaned At', 'Action'],

    rows: [

      ['305', '3', 'Deluxe', 'Priya M', '10:45 AM', 'Inspect'],

      ['408', '4', 'Premium', 'Rajan P', '11:00 AM', 'Inspect'],

    ],

    buttons: ['Approve All', 'Reject & Reassign'],

  },

  '/housekeeping/staff-assignment': {

    title: 'Staff Assignment',

    subtitle: 'Assign housekeeping staff to rooms and floors',

    type: 'table',

    columns: ['Staff', 'Assigned Rooms', 'Floor', 'Status', 'Tasks Done'],

    rows: [

      ['Rajan P', '101, 102, 103, 203', '1 & 2', 'Working', '3/4'],

      ['Priya M', '301, 305, 306', '3', 'Working', '1/3'],

      ['Kala S', '401, 405, 408', '4', 'On break', '0/3'],

    ],

    buttons: ['Auto-Assign', 'Print Assignment'],

  },

  '/housekeeping/lost-found': {

    title: 'Lost & Found',

    subtitle: 'Items found in rooms after guest departure',

    type: 'table',

    columns: ['Item', 'Room', 'Found By', 'Date', 'Guest', 'Status'],

    rows: [

      ['Phone charger', '205', 'Rajan P', '13 Oct', 'Ravi Kumar', 'Unclaimed'],

      ['Watch', '301', 'Priya M', '12 Oct', 'Lakshmi Devi', 'Returned'],

      ['Sunglasses', '107', 'Rajan P', '12 Oct', 'Mohammed Faiz', 'Unclaimed'],

    ],

    buttons: ['Log New Item', 'Contact Guest'],

  },

  '/housekeeping/room-readiness': {

    title: 'Room Readiness',

    subtitle: 'Overview of which rooms are ready to sell, in progress, or blocked',

    type: 'table',

    columns: ['Room', 'Floor', 'Type', 'Readiness', 'ETA', 'Notes'],

    rows: [

      ['101', '1', 'Standard', 'Ready', '—', '—'],

      ['205', '2', 'Deluxe', 'Cleaning', '30 min', '—'],

      ['310', '3', 'Premium', 'Maintenance', '1 day', 'AC repair'],

      ['408', '4', 'Premium', 'Inspection', '15 min', '—'],

    ],

    buttons: ['Refresh Status'],

  },



  /* ── Reports & Analytics ─────────────────────────────────── */

  '/reports/booking-source': {

    title: 'Booking Source Report',

    subtitle: 'Breakdown of bookings by channel and booking source',

    type: 'table',

    columns: ['Source', 'Bookings', 'Revenue', 'Share', 'Avg Booking Value', 'Cancel Rate'],

    rows: [

      ['Direct', '42', '₹4,28,000', '36%', '₹10,190', '3%'],

      ['MakeMyTrip', '35', '₹3,52,000', '30%', '₹10,057', '8%'],

      ['Agoda', '18', '₹2,16,000', '18%', '₹12,000', '5%'],

      ['Booking.com', '15', '₹1,88,000', '16%', '₹12,533', '10%'],

    ],

    buttons: ['Export Report', 'Set Date Range'],

  },

  '/reports/revenue-by-room': {

    title: 'Revenue by Room / Room Type',

    subtitle: 'Revenue generated by each room type over the selected period',

    type: 'table',

    columns: ['Room Type', 'Occupancy', 'ADR', 'Revenue', 'RevPAR'],

    rows: [

      ['Standard', '72%', '₹1,480', '₹2,56,000', '₹1,066'],

      ['Deluxe', '70%', '₹2,540', '₹3,41,000', '₹1,778'],

      ['Premium', '66%', '₹3,480', '₹2,90,000', '₹2,297'],

      ['Family Room', '61%', '₹4,400', '₹1,58,000', '₹2,684'],

      ['Suite', '58%', '₹5,900', '₹1,39,000', '₹3,422'],

    ],

    buttons: ['Export', 'View by Room Number'],

  },

  '/reports/occupancy': {

    title: 'Occupancy Report',

    subtitle: 'Occupancy rates across room types and time periods',

    type: 'table',

    columns: ['Period', 'Rooms Available', 'Rooms Sold', 'Occupancy %', 'vs Last Period'],

    rows: [

      ['Week 1 (Oct)', '280', '196', '70%', '+4%'],

      ['Week 2 (Oct)', '280', '182', '65%', '-5%'],

      ['Sep 2026', '1200', '804', '67%', '+2%'],

      ['Aug 2026', '1240', '769', '62%', '-3%'],

    ],

    buttons: ['Export', 'Set Custom Period'],

  },

  '/reports/revenue-report': {

    title: 'Daily / Monthly Revenue Report',

    subtitle: 'Detailed revenue figures broken down by day and month',

    type: 'table',

    columns: ['Date', 'Room Revenue', 'F&B Revenue', 'Other Income', 'Total', 'vs Last Year'],

    rows: [

      ['13 Oct', '₹76,400', '₹12,500', '₹3,200', '₹92,100', '+18%'],

      ['12 Oct', '₹68,200', '₹10,800', '₹2,900', '₹81,900', '+12%'],

      ['11 Oct', '₹72,100', '₹11,400', '₹3,000', '₹86,500', '+15%'],

    ],

    buttons: ['Export to Excel', 'Export to PDF', 'Email Report'],

  },

  '/reports/feedback-complaint': {

    title: 'Guest Feedback & Complaint Report',

    subtitle: 'Summary of guest satisfaction scores and complaint trends',

    type: 'table',

    columns: ['Period', 'Avg Rating', 'Reviews', 'Complaints', 'Resolution Rate', 'Top Issue'],

    rows: [

      ['Oct 2026', '4.2', '18', '6', '83%', 'Noise'],

      ['Sep 2026', '4.4', '24', '4', '100%', 'AC issues'],

      ['Aug 2026', '4.1', '20', '8', '75%', 'Cleanliness'],

    ],

    buttons: ['Export', 'View All Reviews'],

  },

  '/reports/cancellation-refund': {

    title: 'Cancellation & Refund Report',

    subtitle: 'Track cancellation trends, refund amounts and revenue impact',

    type: 'table',

    columns: ['Period', 'Cancellations', 'Refund Amount', 'Revenue Lost', 'Top Reason', 'Rate'],

    rows: [

      ['Oct 2026', '8', '₹18,500', '₹42,000', 'Change of plans', '7.4%'],

      ['Sep 2026', '5', '₹12,000', '₹28,000', 'Price found elsewhere', '5.2%'],

    ],

    buttons: ['Export Report'],

  },

  '/reports/export': {

    title: 'Export Dashboard',

    subtitle: 'Export any report as CSV, Excel or PDF',

    type: 'table',

    columns: ['Report', 'Last Exported', 'Format', 'Records', 'Action'],

    rows: [

      ['Booking Report', '13 Oct', 'CSV', '110', 'Download'],

      ['Revenue Report', '12 Oct', 'Excel', '30', 'Download'],

      ['Occupancy Report', '10 Oct', 'PDF', '30', 'Download'],

      ['Guest Feedback', '8 Oct', 'CSV', '62', 'Download'],

    ],

    buttons: ['Export All', 'Schedule Auto-Export'],

  },

  '/reports/no-show': {

    title: 'No Show Reports',

    subtitle: 'Guests who had confirmed bookings but did not arrive',

    type: 'table',

    columns: ['Booking', 'Guest', 'Room Type', 'Date', 'Amount', 'No-Show Fee'],

    rows: [

      ['BK-10430', 'Farah Khan', 'Deluxe', '12 Oct', '₹2,500', '₹2,500'],

      ['BK-10415', 'Guest X', 'Standard', '5 Oct', '₹1,500', '₹1,500'],

    ],

    buttons: ['Export Report', 'Send No-Show Notifications'],

  },

  '/reports/ota-commission': {

    title: 'OTA Commission Reports',

    subtitle: 'Commission paid to OTA channels per period',

    type: 'table',

    columns: ['Channel', 'Bookings', 'Gross Revenue', 'Commission %', 'Commission Paid', 'Net Revenue'],

    rows: [

      ['MakeMyTrip', '35', '₹3,52,000', '15%', '₹52,800', '₹2,99,200'],

      ['Agoda', '18', '₹2,16,000', '17%', '₹36,720', '₹1,79,280'],

      ['Booking.com', '15', '₹1,88,000', '15%', '₹28,200', '₹1,59,800'],

    ],

    buttons: ['Export Report', 'Reconcile with OTA'],

  },



  /* ── Admin & Staff ───────────────────────────────────────── */

  '/staff/directory': {

    title: 'Staff Directory',

    subtitle: 'Complete list of all hotel staff with contact and department info',

    type: 'table',

    columns: ['Name', 'Role', 'Department', 'Phone', 'Email', 'Status'],

    rows: [

      ['Admin', 'Super Admin', 'Management', '+91 90xxx xxxxx', 'admin@hotel.com', 'Active'],

      ['Meena R', 'Hotel Manager', 'Management', '+91 98xxx xxxxx', 'meena@hotel.com', 'Active'],

      ['Suresh K', 'Front Desk', 'Reception', '+91 97xxx xxxxx', 'suresh@hotel.com', 'Active'],

      ['Divya S', 'Finance Manager', 'Accounts', '+91 96xxx xxxxx', 'divya@hotel.com', 'Active'],

      ['Rajan P', 'Housekeeping', 'Housekeeping', '+91 95xxx xxxxx', 'rajan@hotel.com', 'Active'],

    ],

    buttons: ['Add Staff Member', 'Export Directory'],

  },

  '/staff/admin-users': {

    title: 'Admin Users',

    subtitle: 'Users with administrative privileges and system access',

    type: 'table',

    columns: ['Name', 'Role', 'Last Login', '2FA', 'Sessions', 'Action'],

    rows: [

      ['Admin', 'Super Admin', 'Today 09:12', 'Enabled', '1', 'Manage'],

      ['Meena R', 'Hotel Manager', 'Today 08:40', 'Enabled', '1', 'Manage'],

    ],

    buttons: ['Add Admin User', 'Review Permissions'],

  },

  '/staff/roles': {

    title: 'Role & Permissions',

    subtitle: 'Define roles and assign granular permissions to each role',

    type: 'table',

    columns: ['Role', 'Members', 'Bookings', 'Finance', 'Guests', 'Rooms', 'Admin'],

    rows: [

      ['Super Admin', '1', '✅', '✅', '✅', '✅', '✅'],

      ['Hotel Manager', '1', '✅', '✅', '✅', '✅', '❌'],

      ['Front Desk', '1', '✅', '❌', '✅', '✅', '❌'],

      ['Finance Manager', '1', '✅', '✅', '❌', '❌', '❌'],

      ['Housekeeping', '1', '❌', '❌', '❌', '✅', '❌'],

      ['Read-Only Auditor', '1', '👁️', '👁️', '👁️', '👁️', '❌'],

    ],

    buttons: ['Create Role', 'Edit Permissions'],

  },

  '/staff/departments': {

    title: 'Department & Access Control',

    subtitle: 'Organize staff into departments with department-level access rules',

    type: 'table',

    columns: ['Department', 'Head', 'Staff Count', 'Access Level', 'Status'],

    rows: [

      ['Management', 'Admin', '2', 'Full', 'Active'],

      ['Reception', 'Suresh K', '3', 'Front Desk + Guests', 'Active'],

      ['Accounts', 'Divya S', '2', 'Finance + Reports', 'Active'],

      ['Housekeeping', 'Rajan P', '4', 'Rooms only', 'Active'],

    ],

    buttons: ['Add Department', 'Edit Access Rules'],

  },

  '/staff/password-reset': {

    title: 'Password Reset',

    subtitle: 'Reset passwords for staff accounts',

    type: 'form',

    formFields: ['Staff Member', 'New Password', 'Confirm Password', 'Require Change on Login'],

    buttons: ['Reset Password', 'Send Reset Link'],

  },

  '/staff/sessions': {

    title: 'Session Management',

    subtitle: 'View and terminate active login sessions',

    type: 'table',

    columns: ['User', 'Device', 'IP Address', 'Login Time', 'Location', 'Action'],

    rows: [

      ['Admin', 'Chrome / Windows', '192.168.1.100', 'Today 09:12', 'Chennai', 'Terminate'],

      ['Meena R', 'Safari / macOS', '192.168.1.105', 'Today 08:40', 'Chennai', 'Terminate'],

      ['Suresh K', 'Chrome / Android', '192.168.1.120', 'Today 07:55', 'Chennai', 'Terminate'],

    ],

    buttons: ['Terminate All Sessions', 'Set Session Timeout'],

  },

  '/staff/audit-log': {

    title: 'Audit / Activity Log',

    subtitle: 'Detailed log of all actions performed by staff',

    type: 'table',

    columns: ['Time', 'User', 'Action', 'Module', 'Details'],

    rows: [

      ['10:44', 'Meena R', 'Price change', 'Rooms', 'Deluxe weekend rate ₹2,500 → ₹3,000'],

      ['10:20', 'Divya S', 'Refund approved', 'Finance', 'BK-10427 · ₹3,000'],

      ['09:58', 'System', 'Sync failure', 'Channels', 'Agoda rate sync, attempt 2'],

      ['09:12', 'Admin', 'Login', 'Auth', 'Chennai, IN'],

    ],

    buttons: ['Export Log', 'Filter by User'],

  },

  '/staff/2fa': {

    title: 'Two-Factor Authentication',

    subtitle: 'Manage 2FA settings for all staff accounts',

    type: 'table',

    columns: ['Staff', 'Role', '2FA Method', 'Enabled', 'Last Verified'],

    rows: [

      ['Admin', 'Super Admin', 'TOTP App', 'Yes', 'Today'],

      ['Meena R', 'Hotel Manager', 'TOTP App', 'Yes', 'Today'],

      ['Suresh K', 'Front Desk', '—', 'No', '—'],

      ['Divya S', 'Finance Manager', 'TOTP App', 'Yes', 'Yesterday'],

    ],

    buttons: ['Enforce 2FA for All', 'Reset 2FA for User'],

  },

  '/staff/property-access': {

    title: 'Property-Level Access',

    subtitle: 'Control which staff can access which properties (multi-property)',

    type: 'table',

    columns: ['Staff', 'Properties', 'Access Level', 'Granted By'],

    rows: [

      ['Admin', 'All Properties', 'Super Admin', 'System'],

      ['Meena R', 'Grand Meridian Chennai', 'Hotel Manager', 'Admin'],

      ['Suresh K', 'Grand Meridian Chennai', 'Front Desk', 'Meena R'],

    ],

    buttons: ['Grant Access', 'Add Property'],

  },

  '/staff/login-access': {

    title: 'Login Access Control',

    subtitle: 'IP restrictions, login hours and device-based access rules',

    type: 'detail',

    fields: [

      { label: 'IP Whitelist', value: '192.168.1.0/24, 10.0.0.0/8' },

      { label: 'Login Hours', value: '6:00 AM – 11:00 PM IST' },

      { label: 'Failed Login Lock', value: 'After 5 attempts' },

      { label: 'Session Timeout', value: '30 minutes idle' },

      { label: 'Device Trust', value: 'Enabled (remember for 30 days)' },

    ],

    buttons: ['Edit Access Rules', 'View Login History'],

  },



  /* ── Notifications & Alerts ──────────────────────────────── */

  '/notifications/new-booking': { title: 'New Booking Alerts', subtitle: 'Get notified when a new reservation is created', type: 'settings', settings: [{ label: 'Email', enabled: true }, { label: 'SMS', enabled: false }, { label: 'In-App', enabled: true }, { label: 'WhatsApp', enabled: false }], buttons: ['Save Preferences'] },

  '/notifications/cancellation': { title: 'Booking Cancellation Alerts', subtitle: 'Alerts when a booking is cancelled', type: 'settings', settings: [{ label: 'Email', enabled: true }, { label: 'SMS', enabled: true }, { label: 'In-App', enabled: true }], buttons: ['Save Preferences'] },

  '/notifications/payment-failure': { title: 'Payment Failure Alerts', subtitle: 'Immediate alerts for failed payment transactions', type: 'settings', settings: [{ label: 'Email', enabled: true }, { label: 'SMS', enabled: true }, { label: 'In-App', enabled: true }], buttons: ['Save Preferences'] },

  '/notifications/checkin-checkout': { title: 'Check-in / Check-out Reminders', subtitle: 'Automatic reminders for upcoming arrivals and departures', type: 'settings', settings: [{ label: 'Email', enabled: true }, { label: 'SMS', enabled: false }, { label: 'In-App', enabled: true }], buttons: ['Save Preferences', 'Set Reminder Time'] },

  '/notifications/low-availability': { title: 'Low Room Availability Alerts', subtitle: 'Trigger alerts when room availability drops below threshold', type: 'settings', settings: [{ label: 'Email', enabled: true }, { label: 'In-App', enabled: true }, { label: 'Threshold', value: '2 rooms' }], buttons: ['Save Preferences', 'Set Threshold'] },

  '/notifications/late-preparation': { title: 'Late Room Preparation Alerts', subtitle: 'Alerts when room cleaning is behind schedule', type: 'settings', settings: [{ label: 'Email', enabled: false }, { label: 'In-App', enabled: true }, { label: 'Trigger After', value: '60 minutes' }], buttons: ['Save Preferences'] },

  '/notifications/refund-cancellation': { title: 'Refund & Cancellation Alerts', subtitle: 'Notifications for refund approvals and cancellation policies triggered', type: 'settings', settings: [{ label: 'Email', enabled: true }, { label: 'In-App', enabled: true }], buttons: ['Save Preferences'] },

  '/notifications/special-requests': { title: 'Guest Special Requests', subtitle: 'Alerts for special guest requests requiring attention', type: 'settings', settings: [{ label: 'Email', enabled: false }, { label: 'In-App', enabled: true }, { label: 'SMS', enabled: false }], buttons: ['Save Preferences'] },

  '/notifications/billing-due': { title: 'Billing / Payment Due Alerts', subtitle: 'Reminders for outstanding balances and upcoming due dates', type: 'settings', settings: [{ label: 'Email', enabled: true }, { label: 'In-App', enabled: true }], buttons: ['Save Preferences'] },

  '/notifications/staff-tasks': { title: 'Staff Task Alerts', subtitle: 'Notify staff when tasks are assigned or overdue', type: 'settings', settings: [{ label: 'Email', enabled: false }, { label: 'In-App', enabled: true }, { label: 'SMS', enabled: false }], buttons: ['Save Preferences'] },

  '/notifications/email': { title: 'Email Notifications', subtitle: 'Configure email notification templates and delivery settings', type: 'form', formFields: ['SMTP Server', 'Port', 'Username', 'Password', 'From Email', 'Reply-To Email', 'Email Template'], buttons: ['Save Configuration', 'Send Test Email'] },

  '/notifications/sms': { title: 'SMS Notifications', subtitle: 'Configure SMS gateway and message templates', type: 'form', formFields: ['SMS Provider', 'API Key', 'Sender ID', 'Default Template', 'Character Limit'], buttons: ['Save Configuration', 'Send Test SMS'] },

  '/notifications/whatsapp': { title: 'WhatsApp Notifications', subtitle: 'Configure WhatsApp Business API for guest messaging', type: 'form', formFields: ['WhatsApp Business ID', 'API Token', 'Phone Number', 'Template Name', 'Default Language'], buttons: ['Save Configuration', 'Send Test Message'] },

  '/notifications/preferences': { title: 'Notification Preferences by Role', subtitle: 'Customize which roles receive which notifications', type: 'table', columns: ['Notification', 'Super Admin', 'Manager', 'Front Desk', 'Finance', 'Housekeeping'], rows: [['New Booking', '✅', '✅', '✅', '❌', '❌'], ['Payment', '✅', '✅', '❌', '✅', '❌'], ['Check-in/out', '❌', '✅', '✅', '❌', '❌'], ['Housekeeping', '❌', '✅', '❌', '❌', '✅']], buttons: ['Save Preferences'] },

  '/notifications/ota-sync-failure': { title: 'OTA Sync Failure', subtitle: 'Alerts when channel synchronization fails', type: 'settings', settings: [{ label: 'Email', enabled: true }, { label: 'In-App', enabled: true }, { label: 'Auto-Retry', enabled: true }], buttons: ['Save Preferences'] },

  '/notifications/pending-cleaning': { title: 'Pending Room Cleaning', subtitle: 'Alerts for rooms awaiting cleaning past the scheduled time', type: 'settings', settings: [{ label: 'In-App', enabled: true }, { label: 'SMS to Housekeeping', enabled: false }, { label: 'Trigger After', value: '45 minutes' }], buttons: ['Save Preferences'] },

  '/notifications/room-inspection': { title: 'Room Inspection', subtitle: 'Notify supervisors when rooms are ready for inspection', type: 'settings', settings: [{ label: 'In-App', enabled: true }, { label: 'Email', enabled: false }], buttons: ['Save Preferences'] },

  '/notifications/maintenance': { title: 'Maintenance Request', subtitle: 'Alerts for new maintenance requests and status updates', type: 'settings', settings: [{ label: 'In-App', enabled: true }, { label: 'Email', enabled: true }, { label: 'SMS', enabled: false }], buttons: ['Save Preferences'] },

  '/notifications/overdue-task': { title: 'Overdue Task', subtitle: 'Escalation alerts when tasks pass their deadline', type: 'settings', settings: [{ label: 'In-App', enabled: true }, { label: 'Email', enabled: true }, { label: 'Escalate After', value: '2 hours' }], buttons: ['Save Preferences', 'Set Escalation Rules'] },

  '/notifications/in-app': { title: 'In-App Notification', subtitle: 'Configure the in-app notification bell and real-time alerts', type: 'detail', fields: [{ label: 'Sound', value: 'Enabled' }, { label: 'Badge Count', value: 'Show unread count' }, { label: 'Auto-dismiss', value: 'After 10 seconds' }, { label: 'Max Visible', value: '5 at a time' }], buttons: ['Edit Settings'] },

  '/notifications/reminder-escalation': { title: 'Reminder Frequency & Escalation', subtitle: 'Configure how often reminders repeat and when they escalate', type: 'detail', fields: [{ label: 'First Reminder', value: 'Immediately' }, { label: 'Second Reminder', value: 'After 15 minutes' }, { label: 'Third Reminder', value: 'After 1 hour' }, { label: 'Escalation', value: 'After 2 hours → Manager' }, { label: 'Max Reminders', value: '5' }], buttons: ['Edit Rules', 'Test Escalation'] },



  /* ── System Updates ──────────────────────────────────────── */

  '/settings/appearance': {

    title: 'Theme & Appearance',

    subtitle: 'Customize interface theme and visual display preferences',

    type: 'custom',

  },

  '/settings/properties': {

    title: 'Multiple Properties',

    subtitle: 'Manage multiple hotel properties under one account',

    type: 'table',

    columns: ['Property', 'Location', 'Rooms', 'Manager', 'Status'],

    rows: [

      ['Grand Meridian Chennai', 'Chennai, TN', '40', 'Meena R', 'Active'],

      ['Grand Meridian Bangalore', 'Bangalore, KA', '60', '—', 'Setup'],

    ],

    buttons: ['Add Property', 'Switch Property'],

  },

  '/settings/guest-details': {

    title: 'Additional Guest Details',

    subtitle: 'Configure which guest fields are collected during registration',

    type: 'detail',

    fields: [

      { label: 'Full Name', value: 'Required' },

      { label: 'Phone', value: 'Required' },

      { label: 'Email', value: 'Optional' },

      { label: 'ID Proof', value: 'Required' },

      { label: 'Nationality', value: 'Required' },

      { label: 'Purpose of Visit', value: 'Optional' },

      { label: 'Company Name', value: 'Optional' },

      { label: 'Vehicle Number', value: 'Optional' },

    ],

    buttons: ['Edit Fields', 'Add Custom Field'],

  },

  '/settings/checkin-checkout': {

    title: 'Check-in / Check-out Configuration',

    subtitle: 'Set default check-in and check-out times and policies',

    type: 'detail',

    fields: [

      { label: 'Standard Check-in', value: '2:00 PM' },

      { label: 'Standard Check-out', value: '11:00 AM' },

      { label: 'Early Check-in Fee', value: '₹500 – ₹1,000' },

      { label: 'Late Check-out Fee', value: '₹500 – ₹1,500' },

      { label: 'Grace Period', value: '30 minutes' },

    ],

    buttons: ['Edit Configuration', 'Save Changes'],

  },

  '/settings/booking-policies': {

    title: 'Booking Policies',

    subtitle: 'Default policies applied to all new bookings',

    type: 'detail',

    fields: [

      { label: 'Advance Booking', value: 'Up to 365 days' },

      { label: 'Minimum Stay', value: '1 night' },

      { label: 'Deposit Required', value: 'First night on confirmation' },

      { label: 'No-Show Charge', value: 'Full first night' },

      { label: 'Overbooking Buffer', value: '5%' },

    ],

    buttons: ['Edit Policies', 'Save Changes'],

  },

  '/settings/cancellation-policies': {

    title: 'Cancellation Policies',

    subtitle: 'Rules for free and paid cancellations',

    type: 'detail',

    fields: [

      { label: 'Free Cancellation', value: 'Up to 48 hours before check-in' },

      { label: 'Late Cancellation Fee', value: 'First night charge' },

      { label: 'Same-Day Cancellation', value: 'Full booking amount' },

      { label: 'No-Show', value: 'Full first night' },

      { label: 'Group Booking', value: '30 days notice required' },

    ],

    buttons: ['Edit Policies', 'Save Changes'],

  },

  '/settings/backup': {

    title: 'Backup & Data Protection',

    subtitle: 'Automated backups, data retention and disaster recovery',

    type: 'detail',

    fields: [

      { label: 'Auto Backup', value: 'Daily at 2:00 AM' },

      { label: 'Retention', value: '90 days' },

      { label: 'Last Backup', value: '13 Oct 2026, 2:00 AM' },

      { label: 'Backup Size', value: '2.4 GB' },

      { label: 'Encryption', value: 'AES-256', badge: 'green' },

    ],

    buttons: ['Backup Now', 'Download Backup', 'Restore from Backup'],

  },

  '/settings/address-contact': {

    title: 'Address & Contact Details',

    subtitle: 'Hotel address, phone and contact details shown on invoices',

    type: 'form',

    formFields: ['Hotel Name', 'Address Line 1', 'Address Line 2', 'City', 'State', 'PIN Code', 'Phone', 'Email', 'Website', 'GST Number'],

    buttons: ['Save Changes'],

  },

  '/settings/language': {

    title: 'Language',

    subtitle: 'Set the default language for the admin panel and guest communications',

    type: 'detail',

    fields: [

      { label: 'Admin Panel Language', value: 'English' },

      { label: 'Guest Communication', value: 'English' },

      { label: 'Invoice Language', value: 'English' },

      { label: 'Available Languages', value: 'English, Hindi, Tamil, Kannada' },

    ],

    buttons: ['Change Language'],

  },

  '/settings/notification-settings': {

    title: 'Notification Settings',

    subtitle: 'Global notification preferences and delivery channels',

    type: 'detail',

    fields: [

      { label: 'Email Notifications', value: 'Enabled' },

      { label: 'SMS Notifications', value: 'Enabled' },

      { label: 'WhatsApp', value: 'Disabled' },

      { label: 'In-App Alerts', value: 'Enabled' },

      { label: 'Daily Digest', value: 'Enabled – 8:00 AM' },

    ],

    buttons: ['Edit Settings', 'Test Notifications'],

  },

  '/settings/email-sms': {

    title: 'Email / SMS Configuration',

    subtitle: 'Configure email SMTP and SMS gateway settings',

    type: 'form',

    formFields: ['SMTP Host', 'SMTP Port', 'SMTP Username', 'SMTP Password', 'SMS Provider', 'SMS API Key', 'SMS Sender ID'],

    buttons: ['Save Configuration', 'Send Test Email', 'Send Test SMS'],

  },

  '/settings/invoice-template': {

    title: 'Invoice Template',

    subtitle: 'Customize the layout and branding of invoices and receipts',

    type: 'detail',

    fields: [

      { label: 'Template', value: 'Default – Professional' },

      { label: 'Logo', value: 'Uploaded ✓' },

      { label: 'Header Color', value: '#13243A' },

      { label: 'Footer Text', value: 'Thank you for staying with us!' },

      { label: 'Show GST Breakup', value: 'Yes' },

      { label: 'Show Payment QR', value: 'Yes' },

    ],

    buttons: ['Edit Template', 'Preview Invoice', 'Upload Logo'],

  },



  /* ── Audit Log ───────────────────────────────────────────── */

  '/audit-logs/booking-changes': {

    title: 'Booking Changes',

    subtitle: 'Log of all booking modifications including dates, rooms and amounts',

    type: 'table',

    columns: ['Time', 'Booking', 'Changed By', 'Field', 'Old Value', 'New Value'],

    rows: [

      ['10:44', 'BK-10429', 'Admin', 'Room Type', 'Deluxe', 'Suite'],

      ['09:30', 'BK-10422', 'Meena R', 'Check-out', '15 Oct', '16 Oct'],

      ['Yesterday', 'BK-10425', 'System', 'Status', 'Confirmed', 'Checked-in'],

    ],

    buttons: ['Export Log', 'Filter by Booking'],

  },

  '/audit-logs/rate-changes': {

    title: 'Rate Changes',

    subtitle: 'History of room rate modifications and who made them',

    type: 'table',

    columns: ['Time', 'User', 'Room Type', 'Old Rate', 'New Rate', 'Reason'],

    rows: [

      ['10:44', 'Meena R', 'Deluxe (weekend)', '₹2,500', '₹3,000', 'Seasonal adjustment'],

      ['8 Oct', 'Admin', 'Suite', '₹5,500', '₹6,000', 'Market correction'],

    ],

    buttons: ['Export Log'],

  },

  '/audit-logs/refund-approvals': {

    title: 'Refund Approvals',

    subtitle: 'Record of all refund approvals with approver and amount',

    type: 'table',

    columns: ['Time', 'Approved By', 'Booking', 'Guest', 'Amount', 'Reason'],

    rows: [

      ['10:20', 'Divya S', 'BK-10427', 'Karthik Raja', '₹3,000', 'Full cancellation'],

      ['5 Oct', 'Divya S', 'BK-10412', 'Sarah Lee', '₹2,000', 'Partial refund – AC issue'],

    ],

    buttons: ['Export Log'],

  },

  '/audit-logs/reservation-changes': {

    title: 'Reservation Changes',

    subtitle: 'Modifications to reservation status, dates and guest details',

    type: 'table',

    columns: ['Time', 'User', 'Booking', 'Change', 'Details'],

    rows: [

      ['10:44', 'Admin', 'BK-10429', 'Status change', 'Modified → Confirmed'],

      ['09:30', 'Meena R', 'BK-10422', 'Date extended', '+1 night'],

      ['Yesterday', 'System', 'BK-10425', 'Auto check-in', 'Guest arrived'],

    ],

    buttons: ['Export Log'],

  },

  '/audit-logs/integration-failures': {

    title: 'Integration Failures',

    subtitle: 'Failed API calls and synchronization errors with external services',

    type: 'table',

    columns: ['Time', 'Service', 'Endpoint', 'Error', 'Status', 'Resolution'],

    rows: [

      ['09:58', 'Agoda', 'Rate sync', '500 Timeout', 'Auto-retried', '2nd attempt succeeded'],

      ['8 Oct', 'Booking.com', 'Auth', '401 Unauthorized', 'Resolved', 'Token refreshed'],

    ],

    buttons: ['Export Log', 'View Error Details'],

  },

  '/audit-logs/api-activity': {

    title: 'API Activity',

    subtitle: 'Log of all API calls made to and from the system',

    type: 'table',

    columns: ['Time', 'Method', 'Endpoint', 'Key', 'Status', 'Response Time'],

    rows: [],

    buttons: ['Export Log', 'Filter by Key'],

  },

  '/audit-logs/data-export': {

    title: 'Data Export History',

    subtitle: 'Record of all data exports performed by users',

    type: 'table',

    columns: ['Time', 'User', 'Report', 'Format', 'Records', 'Size'],

    rows: [

      ['13 Oct', 'Meena R', 'Booking Report', 'CSV', '110', '24 KB'],

      ['12 Oct', 'Divya S', 'Revenue Report', 'Excel', '30', '18 KB'],

      ['10 Oct', 'Admin', 'Guest Data', 'CSV', '250', '42 KB'],

    ],

    buttons: ['Export Log'],

  },

  '/audit-logs/permission-changes': {

    title: 'Permission Changes',

    subtitle: 'Log of role and permission modifications',

    type: 'table',

    columns: ['Time', 'Changed By', 'User/Role', 'Change', 'Details'],

    rows: [

      ['Yesterday', 'Admin', 'Front Desk', 'Added permission', 'Check-out access granted'],

      ['5 Oct', 'Admin', 'Auditor', 'Created role', 'Read-only access to all modules'],

    ],

    buttons: ['Export Log'],

  },



  /* ── Guest Services ───────────────────────────────────────── */

  '/guest-services': {

    title: 'Guest Services Overview',

    subtitle: 'Concierge, luggage, valet, guest requests and VIP experiences',

    type: 'table',

    columns: ['Service Request ID', 'Guest Name', 'Room', 'Service Type', 'Assigned To', 'Priority', 'Status'],

    rows: [

      ['GS-801', 'Vikram Malhotra', 'Room 402', 'Airport Transfer', 'Ramesh (Valet)', 'High', 'Scheduled'],

      ['GS-802', 'Elena Rostova', 'Suite 501', 'Champagne & Fruit Basket', 'Meera (Butler)', 'Urgent', 'In Progress'],

      ['GS-803', 'Rajesh Kothari', 'Room 214', 'Luggage Assistance', 'Sunil (Bell Desk)', 'Normal', 'Completed'],

      ['GS-804', 'Sarah Jenkins', 'Room 318', 'City Heritage Tour Booking', 'Ananya (Concierge)', 'Normal', 'Confirmed'],

    ],

    buttons: ['New Service Request', 'Export Log', 'Filter by Date'],

  },

  '/guest-services/concierge': {

    title: 'Concierge Desk',

    subtitle: 'City tours, restaurant reservations, ticket bookings and itinerary planning',

    type: 'table',

    columns: ['Ref ID', 'Guest Name', 'Room', 'Activity / Request', 'Vendor / Venue', 'Date & Time', 'Status'],

    rows: [

      ['CON-101', 'Sarah Jenkins', 'Room 318', 'City Heritage Palace Tour', 'Royal Rajasthan Tours', 'Today, 16:30', 'Confirmed'],

      ['CON-102', 'David Miller', 'Suite 505', 'Fine Dining Table Reservation', 'Bukhara Heritage Restaurant', 'Tomorrow, 20:00', 'Confirmed'],

      ['CON-103', 'Amitabh Roy', 'Room 108', 'Spa & Wellness Session', 'Ananda Ayurvedic Spa', 'Today, 18:00', 'In Progress'],

    ],

    buttons: ['Add Concierge Booking', 'Export Itinerary', 'Filter by Date'],

  },

  '/guest-services/bell-desk': {

    title: 'Luggage & Bell Desk',

    subtitle: 'Baggage storage, check-in baggage delivery, and checkout luggage handling',

    type: 'table',

    columns: ['Tag Number', 'Guest Name', 'Room / Locker', 'Bags Count', 'Handler', 'Type', 'Status'],

    rows: [

      ['LUG-441', 'Rajesh Kothari', 'Room 214', '3 Bags', 'Sunil Bellman', 'Delivery to Room', 'Completed'],

      ['LUG-442', 'Claire Dupont', 'Locker Bay A-4', '2 Suitcases', 'Vikram Porter', 'Short-term Storage', 'Stored'],

      ['LUG-443', 'Siddharth Rao', 'Room 305', '4 Luggage pieces', 'Manoj Bellman', 'Departure Pickup', 'Pending'],

    ],

    buttons: ['Log Baggage', 'Export Baggage Manifest', 'Filter by Date'],

  },

  '/guest-services/valet-transfers': {

    title: 'Valet & Airport Transfers',

    subtitle: 'Fleet coordination, private chauffeur bookings, and valet parking tokens',

    type: 'table',

    columns: ['Transfer ID', 'Guest Name', 'Vehicle / Chauffeur', 'Pickup / Drop', 'Flight / Time', 'Rate', 'Status'],

    rows: [

      ['TRN-901', 'Vikram Malhotra', 'Mercedes E-Class (Chauffeur Ramesh)', 'Airport to Hotel', 'AI-802 | 14:15', '₹3,500', 'Dispatched'],

      ['TRN-902', 'Elena Rostova', 'BMW 7 Series (Chauffeur Suresh)', 'Hotel to Airport', 'EK-512 | 19:30', '₹4,500', 'Scheduled'],

      ['TRN-903', 'Aditi Verma', 'Valet Token #84 (Audi A4)', 'Valet Bay 2', 'Parked at 11:30', 'Complimentary', 'Parked'],

    ],

    buttons: ['Dispatch Chauffeur', 'Issue Valet Token', 'Export Schedule'],

  },

  '/guest-services/wakeup-calls': {

    title: 'Wake-up Calls & Reminders',

    subtitle: 'Automated PBX and front-desk reminder call schedule for guests',

    type: 'table',

    columns: ['Call ID', 'Guest Name', 'Room', 'Scheduled Time', 'Date', 'Type', 'Status'],

    rows: [

      ['WUC-301', 'Michael Chang', 'Room 205', '06:00 AM', 'Tomorrow', 'Flight Departure', 'Scheduled'],

      ['WUC-302', 'Kiran Patel', 'Room 412', '07:15 AM', 'Tomorrow', 'Conference Meeting', 'Scheduled'],

      ['WUC-303', 'Anita Sen', 'Suite 502', '05:45 AM', 'Today', 'Morning Safari', 'Completed'],

    ],

    buttons: ['Schedule Call', 'Export Schedule', 'Filter by Date'],

  },

  '/guest-services/amenities-requests': {

    title: 'Special Amenities Requests',

    subtitle: 'Extra pillows, dental kits, baby cribs, adapters and guest essentials',

    type: 'table',

    columns: ['Request ID', 'Guest Name', 'Room', 'Requested Items', 'Time Logged', 'Turnaround', 'Status'],

    rows: [

      ['AMN-501', 'Gaurav Sharma', 'Room 310', 'Extra Memory Foam Pillow & Universal Adapter', '10 mins ago', '15 mins', 'Dispatched'],

      ['AMN-502', 'Priya Menon', 'Room 118', 'Baby Crib & Bottle Warmer', '25 mins ago', '20 mins', 'Delivered'],

      ['AMN-503', 'Hans Weber', 'Suite 504', 'Iron & Ironing Board', '40 mins ago', '10 mins', 'Delivered'],

    ],

    buttons: ['New Amenity Request', 'Export Requests', 'Filter by Date'],

  },

  '/guest-services/lost-and-found': {

    title: 'Lost & Found Desk',

    subtitle: 'Custody logs, unclaimed guest valuables, returned items and claim verifications',

    type: 'table',

    columns: ['Item ID', 'Description', 'Found Location', 'Found By / Date', 'Current Storage', 'Claimed By', 'Status'],

    rows: [

      ['LF-201', 'Gold Apple Watch Series 8', 'Lobby Restroom', 'Sunita (HK) | 12 Oct', 'Front Office Safe #2', 'Pending Claim', 'Safeguarded'],

      ['LF-202', 'Ray-Ban Sunglasses & Case', 'Poolside Lounge Bed 4', 'Ravi (Pool) | 14 Oct', 'Security Locker B-1', 'Rajesh Kothari', 'Returned'],

      ['LF-203', 'Black Leather Passport Wallet', 'Room 302 Desk', 'Deepak (HK) | 15 Oct', 'Vault #1', 'Under Verification', 'In Custody'],

    ],

    buttons: ['Log Found Item', 'Verify Claim', 'Export Log'],

  },

  '/guest-services/butler-service': {

    title: 'Guest Experience & VIP Butler',

    subtitle: 'High-touch personalized service for Royal Suites and VIP loyalty tiers',

    type: 'table',

    columns: ['Suite', 'VIP Guest', 'Tier', 'Assigned Butler', 'Special Preferences', 'Daily Briefing Status'],

    rows: [

      ['Presidential Suite 601', 'Lord Alistair Sterling', 'Imperial Royal VIP', 'Master Butler Charles', 'High Tea at 17:00, Sparkling Water chilled to 8°C', 'Active Duty'],

      ['Maharaja Suite 501', 'Elena Rostova', 'Chairman Club', 'Butler Meera', 'Silk pillowcases, Jasmine aromatherapy at turndown', 'Active Duty'],

      ['Executive Suite 410', 'Ratan Singhania', 'Diamond Elite', 'Butler Arvind', 'Daily Business Standard & Financial Times at 06:30', 'Active Duty'],

    ],

    buttons: ['Assign Butler', 'Update VIP Preferences', 'Export VIP Manifest'],

  },

  '/guest-services/wifi': {

    title: 'Wi-Fi Management',

    subtitle: 'Wi-Fi networks, coverage areas, passwords, speeds and availability status',

    type: 'amenity',

  },

  '/guest-services/ac': {

    title: 'Air Conditioning (AC)',

    subtitle: 'Room climate control, temperature settings, and maintenance status',

    type: 'amenity',

  },

  '/guest-services/tv': {

    title: 'Television (TV)',

    subtitle: 'Room televisions, channels, services, remotes, and maintenance status',

    type: 'amenity',

  },

  '/guest-services/swimming-pool': {

    title: 'Swimming Pool',

    subtitle: 'Pools, operating hours, capacity, water safety, and maintenance notes',

    type: 'amenity',

  },

  '/guest-services/gym': {

    title: 'Gym & Fitness',

    subtitle: 'Fitness center, equipment, hours, capacity, and maintenance notes',

    type: 'amenity',

  },

  '/guest-services/parking': {

    title: 'Parking Management',

    subtitle: 'Parking spaces, bay locations, charges, availability, and valet status',

    type: 'amenity',

  },

  '/guest-services/spa': {

    title: 'Spa Services',

    subtitle: 'Spa therapies, durations, prices, time slots, and booking status',

    type: 'amenity',

  },



  /* ── Revenue Management ───────────────────────────────────── */

  '/revenue-management': {

    title: 'Revenue Management Overview',

    subtitle: 'Rate strategies, demand forecasting, RevPAR performance and yield controls',

    type: 'table',

    columns: ['Metric / KPI', 'Current Value', 'Target Value', 'Variance vs Last Month', '30-Day Trend', 'Status'],

    rows: [

      ['RevPAR (Revenue per Available Room)', '₹4,850', '₹5,200', '+8.4%', 'Upward', 'Strong'],

      ['ADR (Average Daily Rate)', '₹6,450', '₹6,300', '+2.4%', 'Stable', 'On Target'],

      ['Occupancy Rate', '75.2%', '80.0%', '+5.1%', 'Upward', 'Healthy'],

      ['TRevPAR (Total RevPAR)', '₹7,920', '₹8,100', '+11.2%', 'Upward', 'Strong'],

      ['GOPPAR (Gross Operating Profit PAR)', '₹3,240', '₹3,400', '+6.8%', 'Upward', 'On Target'],

    ],

    buttons: ['Run Yield Algorithm', 'Export Revenue Snapshot', 'Filter by Date'],

  },

  '/revenue-management/rate-strategy': {

    title: 'Rate Strategy & Yield',

    subtitle: 'Base rate grids, hurdle rates, and revenue optimization strategies',

    type: 'table',

    columns: ['Season / Period', 'Room Category', 'Hurdle Rate', 'BAR Rate', 'Ceiling Rate', 'Target Occupancy', 'Strategy'],

    rows: [

      ['Peak Winter (Nov-Feb)', 'Deluxe Suite', '₹6,500', '₹8,500', '₹14,000', '88%', 'Maximize ADR'],

      ['Peak Winter (Nov-Feb)', 'Standard King', '₹3,800', '₹4,900', '₹7,500', '92%', 'Occupancy Maximization'],

      ['Regular Shoulder Season', 'Deluxe Suite', '₹4,800', '₹6,200', '₹9,500', '78%', 'Balanced Yield'],

      ['Monsoon Promotional', 'Standard King', '₹2,900', '₹3,600', '₹5,200', '70%', 'Volume Drive via Packages'],

    ],

    buttons: ['Update Rate Strategy', 'Export Rate Grid', 'Apply Hurdle Rates'],

  },

  '/revenue-management/demand-forecasting': {

    title: 'Demand Forecasting',

    subtitle: 'Predictive occupancy modeling, unconstrained demand and market pickup',

    type: 'table',

    columns: ['Forecast Window', 'Predicted Occupancy', 'OTB Rooms', 'Expected Pickup', 'Demand Index', 'Recommended Action'],

    rows: [

      ['Next 7 Days (Oct 18-24)', '84%', '112 / 140', '+14 Rooms', 'High (124)', 'Raise BAR Rate by 10%'],

      ['Next 14 Days (Oct 25-31)', '92%', '128 / 140', '+8 Rooms', 'Very High (145)', 'Enforce 2-Night Min Stay'],

      ['Next 30 Days (Nov 01-15)', '78%', '85 / 140', '+32 Rooms', 'Moderate (105)', 'Open OTA Flash Sales'],

      ['Holiday Season (Dec 22-Jan 02)', '98%', '134 / 140', '+6 Rooms', 'Surge (180)', 'Non-refundable only, +25% Surge'],

    ],

    buttons: ['Recalculate Forecast', 'Export Forecast Model', 'Filter by Date'],

  },

  '/revenue-management/revpar-adr': {

    title: 'RevPAR & ADR Analytics',

    subtitle: 'Detailed room revenue benchmarks and historical pricing performance',

    type: 'table',

    columns: ['Room Category', 'Available Nights', 'Sold Nights', 'ADR (₹)', 'RevPAR (₹)', 'Total Revenue (₹)', 'Performance'],

    rows: [

      ['Presidential & Luxury Suites', '300', '245', '₹18,500', '₹15,108', '₹45,32,500', 'Top Performer'],

      ['Executive Deluxe Rooms', '1,200', '940', '₹7,200', '₹5,640', '₹67,68,000', 'Above Benchmark'],

      ['Superior King Rooms', '1,800', '1,420', '₹4,800', '₹3,786', '₹68,16,000', 'On Target'],

      ['Standard Twin Rooms', '900', '680', '₹3,400', '₹2,568', '₹23,12,000', 'Needs Push'],

    ],

    buttons: ['Generate RevPAR Report', 'Export Analytics', 'Filter by Date'],

  },

  '/revenue-management/competitor-rates': {

    title: 'Competitor Rate Intelligence',

    subtitle: 'Daily comp-set rate parity, OTA scrapers and benchmark index (MPI / ARI)',

    type: 'table',

    columns: ['Competitor Hotel', 'Star Rating', 'Comp BAR (Today)', 'Our Rate (Today)', 'Variance', 'MPI (Market Pen)', 'ARI (Rate Index)'],

    rows: [

      ['The Grand Palace Hotel', '5 Star Deluxe', '₹7,200', '₹6,450', '-₹750 (-10.4%)', '108.2', '96.5'],

      ['Taj Heritage Residency', '5 Star Luxury', '₹8,900', '₹6,450', '-₹2,450 (-27.5%)', '115.0', '88.0'],

      ['Radisson Blu Central', '5 Star Business', '₹5,900', '₹6,450', '+₹550 (+9.3%)', '98.4', '104.1'],

      ['Marriott Courtyard', '4 Star Deluxe', '₹5,200', '₹6,450', '+₹1,250 (+24.0%)', '92.1', '112.5'],

    ],

    buttons: ['Refresh Scraper', 'Export Comp-Set Report', 'Configure Competitors'],

  },

  '/revenue-management/los-controls': {

    title: 'Length of Stay Controls',

    subtitle: 'Min-stay restrictions, CTA/CTD and shoulder-night protection',

    type: 'table',

    columns: ['Control Name', 'Applicable Dates', 'Room Type', 'Min LOS', 'Max LOS', 'CTA / CTD Rule', 'Status'],

    rows: [

      ['Diwali Weekend Protection', '2026-11-10 to 2026-11-15', 'All Suites', '3 Nights', 'None', 'CTA on Saturday', 'Active'],

      ['New Year Gala Package', '2026-12-30 to 2027-01-02', 'All Categories', '2 Nights', 'None', 'CTA & CTD on Dec 31', 'Active'],

      ['Mid-week Corporate Saver', 'Mon - Wed Weekly', 'Superior King', '1 Night', '4 Nights', 'Open', 'Active'],

    ],

    buttons: ['Add Stay Restriction', 'Export Restrictions', 'Filter by Date'],

  },

  '/revenue-management/dynamic-pricing': {

    title: 'Dynamic Pricing Rules',

    subtitle: 'Automated pricing triggers based on pace, velocity and occupancy thresholds',

    type: 'table',

    columns: ['Rule Name', 'Trigger Condition', 'Pricing Action', 'Lead Time Window', 'Override Policy', 'Status'],

    rows: [

      ['Occupancy Surge > 85%', 'Occupancy reaches 85%', 'Increase rate by ₹800', '0 to 14 days', 'Auto-execute', 'Active'],

      ['Last-Minute Distress Fill', 'Occupancy < 60% with < 48h to go', 'Apply 15% Secret OTA Discount', '0 to 2 days', 'Manager Approval', 'Active'],

      ['High Pace Velocity Spike', 'Bookings exceed 15 in 2 hours', 'Bump BAR rate by +12%', 'Any arrival date', 'Auto-execute', 'Active'],

      ['Lead Time Early Bird', 'Bookings > 45 days in advance', 'Offer 18% Advance Purchase Rate', '45+ days', 'Auto-execute', 'Active'],

    ],

    buttons: ['Create Pricing Rule', 'Test Pricing Engine', 'Export Rules'],

  },

  '/revenue-management/channel-yield': {

    title: 'Channel Yield Management',

    subtitle: 'Net contribution margins across Direct Web, OTAs, GDS and Corporate',

    type: 'table',

    columns: ['Channel', 'Gross Revenue (₹)', 'OTA Commission (₹)', 'Net Yield (₹)', 'Net Margin %', 'Inventory Allocation'],

    rows: [

      ['Direct Brand Website / App', '₹42,80,000', '₹0', '₹42,80,000', '100.0%', 'Uncapped (Priority)'],

      ['Corporate Negotiated Direct', '₹28,50,000', '₹0', '₹28,50,000', '100.0%', '40 Rooms Max'],

      ['Booking.com', '₹24,10,000', '₹3,61,500 (15%)', '₹20,48,500', '85.0%', 'Dynamic 30 Rooms'],

      ['MakeMyTrip / Goibibo', '₹19,40,000', '₹3,29,800 (17%)', '₹16,10,200', '83.0%', 'Dynamic 25 Rooms'],

      ['Expedia Partner Central', '₹12,60,000', '₹2,26,800 (18%)', '₹10,33,200', '82.0%', 'Dynamic 15 Rooms'],

    ],

    buttons: ['Adjust Channel Allocation', 'Export Yield Analysis', 'Filter by Date'],

  },



  /* ── Sales & Marketing ────────────────────────────────────── */

  '/sales-marketing': {

    title: 'Sales & Marketing Overview',

    subtitle: 'Corporate accounts, MICE group contracts, campaigns, leads and loyalty programs',

    type: 'table',

    columns: ['Segment', 'Active Contracts', 'Contracted Room Nights', 'Revenue YTD (₹)', 'Pipeline Target', 'Achievement %'],

    rows: [

      ['Corporate Key Accounts', '42 Accounts', '4,850 Nights', '₹2,64,32,000', '₹3,00,00,000', '88.1%'],

      ['MICE & Destination Weddings', '18 Events', '2,100 Nights', '₹1,95,40,000', '₹2,10,00,000', '93.0%'],

      ['Travel Trade & Tour Operators', '28 Agencies', '3,400 Nights', '₹1,22,50,000', '₹1,40,00,000', '87.5%'],

      ['Direct Digital & Social Campaigns', '8 Live Campaigns', '1,620 Nights', '₹94,80,000', '₹1,00,00,000', '94.8%'],

    ],

    buttons: ['New Sales Lead', 'Export Pipeline Report', 'Filter by Date'],

  },

  '/sales-marketing/corporate-accounts': {

    title: 'Corporate Accounts',

    subtitle: 'Negotiated corporate master services agreements (MSA), corporate rates and credit terms',

    type: 'table',

    columns: ['Company Name', 'Corporate Rate (₹)', 'LRA / NLRA', 'Account Manager', 'Credit Period', 'Annual Commitment', 'Status'],

    rows: [

      ['Tata Consultancy Services (TCS)', '₹4,500 / night', 'LRA (Last Room Avail)', 'Sameer Verma', '30 Days Net', '1,200 Nights', 'Active'],

      ['Infosys Limited', '₹4,600 / night', 'NLRA', 'Sameer Verma', '30 Days Net', '850 Nights', 'Active'],

      ['Deloitte Consulting India', '₹5,200 / night', 'LRA', 'Priyanka Sen', '15 Days Net', '600 Nights', 'Active'],

      ['McKinsey & Company', '₹6,800 / night', 'LRA (Executive Suite)', 'Priyanka Sen', 'Immediate / Card', '350 Nights', 'Active'],

    ],

    buttons: ['Add Corporate Account', 'Export Accounts', 'Filter by Date'],

  },

  '/sales-marketing/group-sales': {

    title: 'Group & Event Sales',

    subtitle: 'Banquet blocks, conventions, destination weddings and residential conference contracts',

    type: 'table',

    columns: ['Event / Group Name', 'Organizer', 'Block Dates', 'Rooms Blocked', 'Banquet Hall', 'Total Contract Value', 'Status'],

    rows: [

      ['All-India Cardiology Summit 2026', 'MedCon India Ltd', '2026-11-20 to 2026-11-24', '65 Rooms', 'Grand Kohinoor Ballroom', '₹34,50,000', 'Confirmed'],

      ['Kapoor & Sharma Wedding Gala', 'Mr. Sanjeev Kapoor', '2026-12-11 to 2026-12-14', '80 Rooms', 'Imperial Lawn & Ballroom', '₹52,00,000', 'Contract Signed'],

      ['FinTech Founders Conclave', 'Venture Catalysts', '2026-10-28 to 2026-10-30', '40 Rooms', 'Senate Convention Hall', '₹18,20,000', 'Deposit Paid'],

    ],

    buttons: ['New Group RFP', 'Export Event Pipeline', 'Filter by Date'],

  },

  '/sales-marketing/travel-agents': {

    title: 'Travel Agent Contracts',

    subtitle: 'B2B tour operators, DMC partners, IATA travel agency contracts and commissions',

    type: 'table',

    columns: ['Agency Name', 'IATA / Reg ID', 'Agreed Commission', 'Contract Tier', 'Contact Person', 'Annual Production', 'Status'],

    rows: [

      ['Thomas Cook India', 'IATA-1430982', '12% Commission', 'Platinum Preferred', 'Rajiv Nair', '₹42,00,000', 'Active'],

      ['SOTC Travel Services', 'IATA-1102948', '12% Commission', 'Gold Partner', 'Vandana Mathur', '₹28,50,000', 'Active'],

      ['Kuoni Destination Management', 'IATA-0928341', '14% Commission', 'Inbound Luxury', 'Marcello Rossi', '₹35,00,000', 'Active'],

    ],

    buttons: ['Register Agent', 'Export Partner Directory', 'Filter by Date'],

  },

  '/sales-marketing/campaigns': {

    title: 'Campaign Management',

    subtitle: 'Omnichannel advertising, email marketing, Google Ads and social media promotions',

    type: 'table',

    columns: ['Campaign Name', 'Channel', 'Start Date', 'Budget (₹)', 'Leads Generated', 'Bookings Attributed', 'Status'],

    rows: [

      ['Winter Luxury Staycation 2026', 'Meta Ads & Instagram', '2026-10-01', '₹1,50,000', '480 Leads', '142 Bookings (₹11.2L)', 'Running'],

      ['Google Search Brand Protection', 'Google Ads Search', 'Ongoing', '₹75,000 / mo', '1,200 Clicks', '88 Bookings (₹6.5L)', 'Active'],

      ['Royal Suite Spa Getaway Emailer', 'Klaviyo Email Newsletter', '2026-10-10', '₹15,000', '3,400 Opens', '34 Bookings (₹3.8L)', 'Completed'],

    ],

    buttons: ['Create Campaign', 'Export Campaign ROI', 'Filter by Date'],

  },

  '/sales-marketing/leads': {

    title: 'Leads & Pipeline',

    subtitle: 'Inbound sales inquiries, corporate meeting RFPs and lead qualification tracker',

    type: 'table',

    columns: ['Lead ID', 'Client / Company', 'Contact Person', 'Requirement', 'Estimated Value', 'Sales Rep', 'Stage'],

    rows: [

      ['LD-1082', 'Google India Hyderabad', 'Rashmi Bansal', 'Annual Offsite (50 Rooms)', '₹14,50,000', 'Sameer Verma', 'Proposal Sent'],

      ['LD-1083', 'Dr. Reddy Labs', 'Karthik Rao', 'Executive Board Meeting (12 Pax)', '₹3,20,000', 'Priyanka Sen', 'Negotiation'],

      ['LD-1084', 'Singhania Family', 'Rohit Singhania', 'Silver Jubilee Anniversary Dinner', '₹6,80,000', 'Anil Mehta', 'Deposit Pending'],

    ],

    buttons: ['Add New Lead', 'Export Pipeline', 'Filter by Date'],

  },

  '/sales-marketing/loyalty-campaigns': {

    title: 'Loyalty Program Campaigns',

    subtitle: 'Tier upgrades, points multipliers, member rewards and birthday promotions',

    type: 'table',

    columns: ['Program / Promotion', 'Target Tier', 'Points Multiplier', 'Reward Benefit', 'Enrolled Members', 'Redemptions', 'Status'],

    rows: [

      ['Imperial Circle Double Points', 'Gold & Platinum Members', '2x Points', 'Free Suite Upgrade Voucher', '1,420 Members', '186 Upgrades', 'Active'],

      ['Birthday Milestone Gift', 'All Loyalty Tiers', '1,000 Bonus Pts', 'Complimentary Bottle of Wine', '340 Birthday Guests', '112 Redeemed', 'Active'],

      ['Weekend Dining 20% Rebate', 'Silver, Gold & Platinum', '1.5x Points', '20% off F&B Bill', '2,150 Members', '420 Diners', 'Active'],

    ],

    buttons: ['Launch Loyalty Promo', 'Export Loyalty Members', 'Filter by Date'],

  },

  '/sales-marketing/marketing-roi': {

    title: 'ROI & Channel Performance',

    subtitle: 'Customer acquisition cost (CAC), return on ad spend (ROAS) and direct share',

    type: 'table',

    columns: ['Marketing Channel', 'Spend (₹)', 'Attributed Revenue (₹)', 'ROAS Multiplier', 'Avg CAC per Booking (₹)', 'Conversion %'],

    rows: [

      ['Direct Website Organic (SEO)', '₹45,000 / mo', '₹28,50,000', '63.3x', '₹112', '4.2%'],

      ['Google Paid Search Ads', '₹75,000 / mo', '₹6,50,000', '8.6x', '₹852', '3.8%'],

      ['Meta Social Ads (FB/IG)', '₹1,50,000 / mo', '₹11,20,000', '7.4x', '₹1,056', '2.4%'],

      ['Email CRM Retention', '₹15,000 / mo', '₹3,80,000', '25.3x', '₹441', '5.1%'],

    ],

    buttons: ['Calculate ROI', 'Export Performance Report', 'Filter by Date'],

  },



  /* ── Food & Beverage ──────────────────────────────────────── */

  '/food-beverage': {

    title: 'Food & Beverage Overview',

    subtitle: 'Restaurants, in-room dining, bar operations, banquet catering and kitchen stores',

    type: 'table',

    columns: ['Outlet / Department', 'Today Covers', 'Today Revenue (₹)', 'Average Check (₹)', 'Labor Cost %', 'Food Cost %', 'Status'],

    rows: [

      ['The Saffron Royale (Fine Dining)', '142 Covers', '₹3,45,000', '₹2,430', '18.2%', '28.5%', 'Open'],

      ['Café Heritage (All-Day Dining)', '260 Covers', '₹2,10,000', '₹807', '16.5%', '31.2%', 'Open'],

      ['In-Room Dining (IRD)', '88 Orders', '₹1,32,000', '₹1,500', '14.0%', '27.8%', '24/7 Active'],

      ['The Polo Bar & Cellar', '95 Guests', '₹1,85,000', '₹1,947', '12.0%', '21.4%', 'Open'],

      ['Grand Kohinoor Banquets', '350 Pax Event', '₹4,90,000', '₹1,400', '11.5%', '24.0%', 'Event Running'],

    ],

    buttons: ['New Order / Bill', 'Export F&B Daily Report', 'Filter by Date'],

  },

  '/food-beverage/restaurant-pos': {

    title: 'Restaurant POS & Orders',

    subtitle: 'Kitchen Order Tickets (KOT), live dining tables, order dispatch and bill settlement',

    type: 'table',

    columns: ['KOT #', 'Table #', 'Server', 'Ordered Items', 'Amount (₹)', 'Time Placed', 'KOT Status'],

    rows: [

      ['KOT-841', 'Table T-04', 'Rohan (Server)', '2x Dum Biryani, 1x Paneer Tikka, 2x Garlic Naan', '₹2,450', '12 mins ago', 'Cooking in Kitchen'],

      ['KOT-842', 'Table T-11', 'Sunil (Server)', '1x Grilled Atlantic Salmon, 1x Caesar Salad', '₹3,200', '25 mins ago', 'Ready to Serve'],

      ['KOT-843', 'Table T-02', 'Anita (Server)', '4x Cappuccino, 2x Belgian Chocolate Tart', '₹1,650', '5 mins ago', 'Beverage Bar'],

    ],

    buttons: ['New KOT Order', 'Table Layout View', 'Print Bill'],

  },

  '/food-beverage/in-room-dining': {

    title: 'In-Room Dining (Room Service)',

    subtitle: 'Guest room orders, tray service dispatch, breakfast door knob cards and trolley retrieval',

    type: 'table',

    columns: ['Order ID', 'Room #', 'Guest Name', 'Menu Items', 'Bill (₹)', 'Prep Time', 'Delivery Status'],

    rows: [

      ['IRD-301', 'Room 304', 'Rajesh Kothari', 'Continental Breakfast Tray & Fresh Orange Juice', '₹1,150', '20 mins', 'Out for Delivery'],

      ['IRD-302', 'Suite 501', 'Elena Rostova', 'Midnight Club Sandwich, French Fries, Evian Water', '₹1,450', '15 mins', 'Delivered (Tray to Retrieve)'],

      ['IRD-303', 'Room 412', 'Kiran Patel', 'Tandoori Mixed Platter & Masala Chai', '₹1,850', '25 mins', 'Cooking'],

    ],

    buttons: ['Place Room Order', 'Export IRD Log', 'Filter by Date'],

  },

  '/food-beverage/menu-engineering': {

    title: 'Menu and Pricing',

    subtitle: 'BCG matrix categorization (Stars, Plowhorses, Puzzles, Dogs), food cost margins',

    type: 'table',

    columns: ['Dish Name', 'Category', 'Selling Price (₹)', 'Food Cost (₹)', 'Margin %', 'Popularity', 'Matrix Classification'],

    rows: [

      ['Royal Murgh Dum Biryani', 'Main Course', '₹850', '₹210', '75.3%', 'Very High', 'Star Item (Promote)'],

      ['Dal Makhani Signature', 'Main Course', '₹650', '₹95', '85.4%', 'Very High', 'Star Item (High Profit)'],

      ['Lobster Thermidor', 'Continental', '₹2,400', '₹1,100', '54.2%', 'Low', 'Puzzle (Reposition / Review)'],

      ['Grilled Vegetable Panini', 'Snacks', '₹450', '₹130', '71.1%', 'Moderate', 'Plowhorse (Maintain Volume)'],

    ],

    buttons: ['Add Menu Item', 'Export Recipe Costing', 'Recalculate Margins'],

  },

  '/food-beverage/bar-management': {

    title: 'Bar & Beverage Management',

    subtitle: 'Spirits inventory, wine cellar vintages, cocktail recipes, liquor excise logs',

    type: 'table',

    columns: ['Bottle / Vintage Name', 'Category', 'Pour Size', 'Opening Stock', 'Today Consumption', 'Closing Stock', 'Reorder Level'],

    rows: [

      ['Macallan 12 Year Sherry Oak', 'Single Malt Scotch', '30ml / 60ml', '14 Bottles', '1.4 Bottles (28 Pours)', '12.6 Bottles', '4 Bottles'],

      ['Grey Goose Vodka', 'Premium Vodka', '30ml / 60ml', '22 Bottles', '2.2 Bottles (44 Pours)', '19.8 Bottles', '6 Bottles'],

      ['Sula Dindori Reserve Shiraz', 'Indian Red Wine', '750ml Bottle', '36 Bottles', '6 Bottles', '30 Bottles', '12 Bottles'],

      ['Dom Pérignon Vintage 2013', 'Champagne', '750ml Bottle', '8 Bottles', '1 Bottle', '7 Bottles', '3 Bottles'],

    ],

    buttons: ['Log Bottle Spoilage', 'Export Excise Register', 'Filter by Date'],

  },

  '/food-beverage/banquets': {

    title: 'Banquet & Event Catering',

    subtitle: 'Function Banquet Event Orders (BEO), buffet layouts, session tea breaks and live stations',

    type: 'table',

    columns: ['BEO #', 'Event Title', 'Banquet Venue', 'Pax Count', 'Meal Format', 'BEO Coordinator', 'Status'],

    rows: [

      ['BEO-510', 'Cardiology Conference Gala Dinner', 'Kohinoor Ballroom', '350 Pax', '4-Course Royal Buffet + Live Chaat Counter', 'Chef Rakesh & Maitre d’ Alok', 'Kitchen Ready'],

      ['BEO-511', 'TCS Corporate Leadership High-Tea', 'Gulmohar Hall', '60 Pax', 'Artisanal Savories & Premium Tea Sommelier', 'Maitre d’ Alok', 'Setup Complete'],

      ['BEO-512', 'Singhania Wedding Sangeet Dinner', 'Royal Lawn & Poolside', '450 Pax', 'Multi-Cuisine Interactive Counters', 'Executive Chef Anand', 'Menu Finalized'],

    ],

    buttons: ['Create New BEO', 'Export BEO Sheet', 'Filter by Date'],

  },

  '/food-beverage/kitchen-inventory': {

    title: 'Kitchen Inventory & Requisitions',

    subtitle: 'Perishables, dry rations, cold storage temperatures, daily store indents',

    type: 'table',

    columns: ['Item Description', 'Department Store', 'Current Stock', 'Unit', 'Daily Indent', 'Unit Cost (₹)', 'Storage Temp'],

    rows: [

      ['Basmati Rice (Daawat Gold Extra Long)', 'Dry Store B', '450', 'kg', '50 kg requested', '₹115 / kg', 'Ambient 22°C'],

      ['Amul Salted Butter & Cooking Cream', 'Cold Room 2', '85', 'kg', '20 kg requested', '₹520 / kg', 'Chill 3°C'],

      ['Fresh Farm Chicken (Skinless Curry Cut)', 'Deep Freezer 1', '120', 'kg', '40 kg requested', '₹210 / kg', 'Frozen -18°C'],

      ['Organic Hass Avocados & Salad Greens', 'Walk-in Chiller', '35', 'kg', '10 kg requested', '₹380 / kg', 'Chill 4°C'],

    ],

    buttons: ['Create Indent', 'Log Temperature Check', 'Export Stock Sheet'],

  },

  '/food-beverage/table-reservations': {

    title: 'Table Reservations',

    subtitle: 'Table booking diary, guest dining preferences, dietary allergies and special occasions',

    type: 'table',

    columns: ['Booking Ref', 'Restaurant', 'Guest Name', 'Table Allocated', 'Party Size', 'Time & Date', 'Occasion / Diet', 'Status'],

    rows: [

      ['RES-801', 'The Saffron Royale', 'Vikram Malhotra', 'Table T-06 (Window View)', '4 Pax', 'Today, 20:30', 'Anniversary (Eggless Cake)', 'Confirmed'],

      ['RES-802', 'Café Heritage', 'Dr. Meenakshi Sundaram', 'Table C-14', '2 Pax', 'Tomorrow, 08:30', 'Gluten-Free Diet', 'Confirmed'],

      ['RES-803', 'The Polo Bar', 'Lord Alistair Sterling', 'Private Cigar Lounge Booth', '6 Pax', 'Today, 21:00', 'VIP Guest (Single Malts)', 'Seated'],

    ],

    buttons: ['Reserve Table', 'Export Diary', 'Filter by Date'],

  },



  /* ── Engineering & Maintenance ────────────────────────────── */

  '/engineering': {

    title: 'Engineering & Maintenance Overview',

    subtitle: 'Work orders, HVAC, preventive maintenance, room equipment repairs and energy management',

    type: 'table',

    columns: ['Equipment / System', 'Open Work Orders', 'PPM Compliance', 'Downtime Today', 'Active Technicians', 'System Health'],

    rows: [

      ['Central Chiller Plant & HVAC', '1 Minor Warning', '98.5%', '0 mins', '3 Engineers', 'Optimal'],

      ['Guest Room Electrical & Plumbing', '4 Open Tickets', '94.2%', 'N/A', '5 Technicians', 'Normal Operations'],

      ['Elevators & Passenger Lifts', '0 Tickets', '100.0%', '0 mins', 'Otis AMC Specialist', 'Certified Safe'],

      ['Diesel Generators (DG Backup)', '0 Tickets', '100.0%', '0 mins', '1 Duty Engineer', 'Standby Ready'],

      ['Commercial Kitchen Exhaust & Gas', '1 Open Ticket', '96.0%', '0 mins', '2 Technicians', 'Under Inspection'],

    ],

    buttons: ['Create Work Order', 'Export Maintenance Log', 'Filter by Date'],

  },

  '/engineering/work-orders': {

    title: 'Work Orders & Repair Requests',

    subtitle: 'Immediate guest room breakdowns, public area fixes, plumbing and electrical repair tickets',

    type: 'table',

    columns: ['WO #', 'Location', 'Issue Description', 'Reported By', 'Assigned Tech', 'Priority', 'Status'],

    rows: [

      ['WO-1041', 'Room 304', 'Air Conditioning Thermostat not cooling below 24°C', 'Front Desk (Guest)', 'Naresh Kumar (HVAC)', 'High', 'In Progress'],

      ['WO-1042', 'Lobby Restroom 1st Fl', 'Sensor faucet water pressure weak', 'Housekeeping', 'Dinesh (Plumber)', 'Normal', 'Pending Parts'],

      ['WO-1043', 'Saffron Royale Kitchen', 'Under-counter freezer seal loose', 'Chef Anand', 'Ravi (Refrig)', 'Medium', 'Completed'],

      ['WO-1044', 'Suite 501', 'Master bedroom motorized drape stuck', 'Butler Meera', 'Sanjay (Electrician)', 'Urgent', 'In Progress'],

    ],

    buttons: ['Log Work Order', 'Export Tickets', 'Filter by Date'],

  },

  '/engineering/preventive-maintenance': {

    title: 'Preventive Maintenance (PPM)',

    subtitle: 'Scheduled cycles for chillers, boilers, pumps, transformers and guest room PPM audits',

    type: 'table',

    columns: ['PPM Task ID', 'Asset / Location', 'Frequency', 'Last Serviced', 'Next Due Date', 'Checklist Items', 'Status'],

    rows: [

      ['PPM-201', 'Central Chiller #2 (Carrier 300 TR)', 'Monthly', '2026-09-18', '2026-10-18', 'Refrigerant pressure, oil filter, coil rinse', 'Due Today'],

      ['PPM-202', 'Guest Rooms 4th Floor Block PPM', 'Quarterly', '2026-07-15', '2026-10-25', 'Shower heads, A/C filter, circuit breaker', 'Scheduled'],

      ['PPM-203', 'Substation Transformer 11kV/415V', 'Bi-Annual', '2026-05-10', '2026-11-10', 'Oil breakdown test, earthing pit resistance', 'Scheduled'],

    ],

    buttons: ['Schedule PPM Task', 'Export PPM Schedule', 'Filter by Date'],

  },

  '/engineering/asset-registry': {

    title: 'Asset Registry & Equipment',

    subtitle: 'Capital equipment serial numbers, warranty terms, AMC contracts and asset lifecycle',

    type: 'table',

    columns: ['Asset Tag #', 'Equipment Description', 'Manufacturer / Model', 'Location', 'Purchase Date', 'AMC Provider', 'Warranty Status'],

    rows: [

      ['AST-HVAC-01', 'Centrifugal Chiller 350 TR', 'Carrier Evergreen 19XR', 'Basement Plant Room', '2022-03-10', 'Carrier Total Care AMC', 'Under Active AMC'],

      ['AST-GEN-01', 'Silent Diesel Generator 750 kVA', 'Cummins PowerTech', 'DG Yard Outer Perimeter', '2021-11-20', 'Jakson Cummins Authorized', 'Under Active AMC'],

      ['AST-LFT-03', 'Glass Panoramic Guest Lift 13 Pax', 'Otis SkyRise Series', 'Main Lobby Atrium', '2022-06-15', 'Otis India Comprehensive', 'Under Active AMC'],

      ['AST-BLR-02', 'Hot Water Steam Boiler 500 kg/hr', 'Thermax Compac', 'Boiler Room Utility', '2023-01-14', 'Thermax Energy Services', 'Under Warranty'],

    ],

    buttons: ['Register New Asset', 'Export Asset Register', 'Filter by Date'],

  },

  '/engineering/energy-utility': {

    title: 'Energy & Utility Monitoring',

    subtitle: 'Electricity power factor, diesel consumption, water meters and STP treated water reuse',

    type: 'table',

    columns: ['Utility Resource', 'Daily Consumption', 'Target Benchmark', 'Unit Cost (₹)', 'Power Factor / Quality', 'Variance vs Budget'],

    rows: [

      ['Grid Power (Main HT Meter)', '4,850 kWh / day', '4,600 kWh', '₹8.75 / unit', '0.998 (Unity PF)', '+5.4% (Higher Occupancy)'],

      ['Diesel Fuel (DG Backup Testing)', '45 Liters / test', '50 Liters', '₹92.50 / L', 'Clean Combustion', '-10.0% (Under Budget)'],

      ['Municipal Fresh Water Supply', '140 kL / day', '150 kL', '₹45.00 / kL', 'TDS: 180 ppm (Potable)', '-6.6% (Efficient)'],

      ['STP Recycled Water (Gardening/Flushing)', '85 kL / day', '80 kL', '₹8.20 / kL (STP Power)', 'BOD < 10 ppm (Optimal)', '+6.2% (Savings Generated)'],

    ],

    buttons: ['Record Meter Reading', 'Export Energy Audit', 'Filter by Date'],

  },

  '/engineering/room-inspections': {

    title: 'Room Inspection Sign-off',

    subtitle: 'Engineering handover sign-off before Housekeeping releases rooms to Front Office',

    type: 'table',

    columns: ['Inspection ID', 'Room #', 'Inspect Date', 'Inspector', 'Tested Systems', 'Defects Found', 'Handover Sign-off'],

    rows: [

      ['RMI-601', 'Room 201', '2026-10-17', 'Naresh Kumar', 'A/C chill, TV HDMI, shower mixer, socket load', '0 Defects', 'Approved for Guest'],

      ['RMI-602', 'Room 202', '2026-10-17', 'Dinesh Plumber', 'Drain trap cleaning, minibar temp 5°C', '0 Defects', 'Approved for Guest'],

      ['RMI-603', 'Room 305', '2026-10-16', 'Sanjay Electrician', 'Desk lamp switch replaced, hair dryer tested', 'Switch replaced', 'Approved for Guest'],

    ],

    buttons: ['Log Room Inspection', 'Export Inspection Sheet', 'Filter by Date'],

  },

  '/engineering/hvac-controls': {

    title: 'HVAC & Chillers Control',

    subtitle: 'BMS chilled water supply/return temperatures, CFM air handling units (AHU) and setpoints',

    type: 'table',

    columns: ['AHU / Chiller Unit', 'Zone Monitored', 'Set Temperature', 'Actual Temp', 'Chilled Water In/Out', 'VFD Fan Speed', 'Status'],

    rows: [

      ['Chiller #1 (Lead)', 'Entire Hotel Common', '7.0°C Supply', '7.2°C Supply', 'In: 12.4°C / Out: 7.2°C', '88% Load', 'Running Optimal'],

      ['AHU-LOBBY-01', 'Ground Floor Main Lobby', '22.0°C', '22.2°C', 'In: 7.5°C / Out: 11.8°C', '75% Speed', 'Auto Mode'],

      ['AHU-BANQ-02', 'Kohinoor Grand Ballroom', '21.0°C', '21.5°C', 'In: 7.4°C / Out: 12.0°C', '90% Speed (Event on)', 'Auto Mode'],

    ],

    buttons: ['Adjust Setpoints', 'Export BMS Diagnostics', 'Emergency Override'],

  },

  '/engineering/safety-compliance': {

    title: 'Safety & Fire Compliance',

    subtitle: 'Fire NOC renewals, sprinkler pressure gauges, fire pump testing and emergency exit signs',

    type: 'table',

    columns: ['Compliance Item', 'Statutory Authority', 'Inspection Date', 'Certificate Valid Until', 'Safety Officer', 'Audit Status'],

    rows: [

      ['Fire Safety NOC Certificate', 'State Fire & Emergency Services', '2026-04-10', '2027-04-09', 'Col. Rajiv Verma (Retd)', 'Fully Compliant'],

      ['Passenger Lift License renewal', 'Chief Electrical Inspectorate', '2026-06-12', '2027-06-11', 'Otis Inspector / CEI', 'Valid License'],

      ['Main Diesel Fire Hydrant Pump Test', 'Internal Engineering Weekly', '2026-10-15', 'Next: 2026-10-22', 'Duty Engineer Sunil', 'Tested at 10.5 bar (Pass)'],

    ],

    buttons: ['Log Fire Drill', 'Upload Compliance Cert', 'Export Audit Register'],

  },



  /* ── Procurement ──────────────────────────────────────────── */

  '/procurement': {

    title: 'Procurement Overview',

    subtitle: 'Purchase orders, approved vendor lists, central stores, GRNs and tender bidding',

    type: 'table',

    columns: ['Department Indenting', 'Open POs', 'Pending Approvals', 'Monthly Spend (₹)', 'Budget Allocation (₹)', 'Budget Utilization'],

    rows: [

      ['Food & Beverage Kitchen Supplies', '12 Active POs', '2 Pending GM Sign', '₹18,45,00,000', '₹22,00,000', '83.8%'],

      ['Housekeeping Linen & Guest Supplies', '6 Active POs', '1 Pending Finance', '₹8,20,000', '₹10,50,000', '78.1%'],

      ['Engineering Spares & AMC Spares', '4 Active POs', '0 Pending', '₹6,40,000', '₹7,50,000', '85.3%'],

      ['Front Office & Admin Stationeries', '2 Active POs', '0 Pending', '₹1,15,000', '₹1,50,000', '76.6%'],

    ],

    buttons: ['Create Purchase Order', 'Export Procurement Report', 'Filter by Date'],

  },

  '/procurement/purchase-orders': {

    title: 'Purchase Orders (PO)',

    subtitle: 'Official commercial purchase orders issued to contracted suppliers',

    type: 'table',

    columns: ['PO Number', 'Vendor Name', 'Department', 'Total Amount (₹)', 'Created Date', 'Delivery Due', 'PO Status'],

    rows: [

      ['PO-2026-084', 'ITC Agro Foods Limited', 'F&B Kitchen', '₹3,45,000', '2026-10-12', '2026-10-18', 'Dispatched / In Transit'],

      ['PO-2026-085', 'Bombay Dyeing Hotel Linen', 'Housekeeping', '₹4,80,000', '2026-10-14', '2026-10-24', 'Approved by Finance'],

      ['PO-2026-086', 'Diversey Care India (Cleaners)', 'Housekeeping', '₹1,65,000', '2026-10-15', '2026-10-20', 'Awaiting GM Approval'],

      ['PO-2026-087', 'Carrier Refrigeration Spares', 'Engineering', '₹88,000', '2026-10-16', '2026-10-22', 'Issued to Vendor'],

    ],

    buttons: ['New PO Draft', 'Export PO Register', 'Filter by Date'],

  },

  '/procurement/vendors': {

    title: 'Vendor Directory',

    subtitle: 'Approved supplier profiles, GSTIN numbers, bank details and quality performance ratings',

    type: 'table',

    columns: ['Vendor Code', 'Company Name', 'Category', 'GSTIN', 'Credit Terms', 'Quality Rating', 'Status'],

    rows: [

      ['VND-101', 'ITC Agro Foods Limited', 'Dry Rations & Groceries', '07AAACI1234F1Z8', '30 Days Net', '4.8 / 5.0 ⭐', 'Preferred Supplier'],

      ['VND-102', 'Bombay Dyeing & Mfg Co', 'Linen & Bedding (300 TC)', '27AAACB0987K1Z4', '45 Days Net', '4.9 / 5.0 ⭐', 'Preferred Supplier'],

      ['VND-103', 'Diversey Hygiene India', 'Chemicals & Housekeeping', '27AABCD6789P1Z2', '30 Days Net', '4.7 / 5.0 ⭐', 'Active Supplier'],

      ['VND-104', 'Godrej Security Solutions', 'Safes & Access Hardware', '27AAACG1122Q1Z9', 'Immediate 50% Adv', '4.6 / 5.0 ⭐', 'Active Supplier'],

    ],

    buttons: ['Add New Vendor', 'Export Vendor Master', 'Filter by Date'],

  },

  '/procurement/central-store': {

    title: 'Central Store & Inventory',

    subtitle: 'Bin cards, minimum stock alerts, FIFO issuing and monthly stock valuations',

    type: 'table',

    columns: ['Item Code', 'Item Description', 'Store Bin #', 'In Stock', 'Reorder Threshold', 'Unit Valuation (₹)', 'Stock Value (₹)'],

    rows: [

      ['ST-LIN-01', 'Egyptian Cotton Bath Towels 650 GSM', 'Bin A-14', '420 pcs', '100 pcs', '₹450', '₹1,89,000'],

      ['ST-LIN-02', 'White King Bed Sheet 300 TC Percale', 'Bin A-08', '280 pcs', '80 pcs', '₹850', '₹2,38,000'],

      ['ST-AMN-04', 'Forest Essentials Ayurvedic Shampoo 50ml', 'Bin C-02', '2,400 btls', '500 btls', '₹48', '₹1,15,200'],

      ['ST-ENG-12', 'LED Warm White Bulb 9W B22 Philips', 'Bin E-22', '350 pcs', '100 pcs', '₹85', '₹29,750'],

    ],

    buttons: ['Issue Stock to Dept', 'Stocktake Adjustment', 'Export Stock Valuation'],

  },

  '/procurement/goods-receipt': {

    title: 'Goods Receipt Notes (GRN)',

    subtitle: 'Receiving bay verification, QC inspection, invoice delivery challan matching',

    type: 'table',

    columns: ['GRN #', 'PO Reference', 'Vendor Name', 'Items Received', 'QC Acceptance', 'Received By', 'GRN Date'],

    rows: [

      ['GRN-942', 'PO-2026-080', 'ITC Agro Foods Ltd', '50 Bags Basmati Rice, 20 Tins Ghee', '100% Passed QC', 'Receiving Clerk Mohan', '2026-10-16'],

      ['GRN-943', 'PO-2026-081', 'Diversey Hygiene', '24 Cans Taski R2, 12 Cans Taski R6', 'Passed QC', 'Storekeeper Sunil', '2026-10-15'],

      ['GRN-944', 'PO-2026-079', 'Bombay Dyeing Linen', '100 Bath Robes (Plush Velour)', 'Passed QC (Weight verified)', 'Storekeeper Sunil', '2026-10-14'],

    ],

    buttons: ['Create GRN', 'Export GRN Register', 'Filter by Date'],

  },

  '/procurement/requisitions': {

    title: 'Purchase Requisitions',

    subtitle: 'Internal department purchase requests pending Procurement review and quotation',

    type: 'table',

    columns: ['PR #', 'Originating Dept', 'Requested Items', 'Est Amount (₹)', 'Urgency', 'HOD Sign', 'Status'],

    rows: [

      ['PR-401', 'F&B Kitchen', 'Commercial Dough Kneader 25kg (Hobart)', '₹1,45,000', 'Medium', 'Approved by Exec Chef', 'Sourcing Quotations'],

      ['PR-402', 'Housekeeping', '500 Sets Bamboo Toothbrushes (Eco-friendly)', '₹35,000', 'High', 'Approved by Exec Housekeeper', 'PO Generation Pending'],

      ['PR-403', 'Security', '4x Motorola UHF Walkie Talkies with earpieces', '₹48,000', 'Normal', 'Approved by CSO', 'Under Review'],

    ],

    buttons: ['Submit Requisition', 'Export PR List', 'Filter by Date'],

  },

  '/procurement/contracts': {

    title: 'Vendor Contracts & Tenders',

    subtitle: 'Annual Rate Contracts (ARC), pest control SLAs, laundry outsourced contracts and legal NDAs',

    type: 'table',

    columns: ['Contract ID', 'Contracted Partner', 'Scope of Work', 'Annual Value (₹)', 'Effective Date', 'Expiry Date', 'Contract Status'],

    rows: [

      ['CNT-2025-04', 'Rentokil PCI Pest Control', 'Comprehensive Hotel Pest SLA', '₹4,80,000 / yr', '2025-11-01', '2026-10-31', 'Renewal Under Tender'],

      ['CNT-2026-01', 'QuickClean Commercial Laundry', 'Off-site Linen Laundering Service', '₹24,00,000 / yr', '2026-01-01', '2026-12-31', 'Active in Force'],

      ['CNT-2026-08', 'Otis Elevators India Ltd', 'All Passenger & Service Lifts AMC', '₹8,50,000 / yr', '2026-04-01', '2027-03-31', 'Active in Force'],

    ],

    buttons: ['Upload New Contract', 'Export Contract Schedule', 'Filter by Date'],

  },

  '/procurement/price-comparison': {

    title: 'Price Comparison & Bidding',

    subtitle: '3-way quotation bid analysis, item unit cost benchmarking and tender award matrix',

    type: 'table',

    columns: ['Tender / Item RFQ', 'Lowest Bidder (L1)', 'L1 Price (₹)', 'L2 Bidder & Price (₹)', 'L3 Bidder & Price (₹)', 'Procurement Decision'],

    rows: [

      ['F&B Kitchen: Stainless Steel Work Tables', 'Shree Steel Fab', '₹1,18,000 (L1)', 'Kitchen Kraft (₹1,32,000)', 'Apex Metals (₹1,45,000)', 'Awarded to L1 (Shree Steel)'],

      ['Front Office: RFID Keycards (5,000 pcs)', 'SmartCard Solutions', '₹18 / card (L1)', 'Identiv India (₹22 / card)', 'ZKTeco Cards (₹25 / card)', 'Approved L1 for PO'],

      ['Engineering: Annual LED Replacement Lot', 'Philips Lighting Dist', '₹1,42,000 (L1)', 'Havells Commercial (₹1,55,000)', 'Wipro Consumer (₹1,58,000)', 'Under Technical Eval'],

    ],

    buttons: ['New Price Comparison', 'Export Bid Analysis', 'Filter by Date'],

  },



  /* ── Human Resources ──────────────────────────────────────── */

  '/human-resources': {

    title: 'Human Resources Overview',

    subtitle: 'Workforce demographics, shift attendance, payroll summary, recruitment and training',

    type: 'table',

    columns: ['Department', 'Headcount', 'Present Today', 'On Leave', 'Shift Coverage %', 'Overtime Hours (wk)', 'Dept HR Status'],

    rows: [

      ['Front Office & Concierge', '28 Staff', '24 Present', '4 On Leave', '100% Coverage', '14 hrs', 'Fully Staffed'],

      ['Food & Beverage Service', '45 Staff', '39 Present', '6 On Leave', '98% Coverage', '32 hrs', 'Optimal'],

      ['Culinary / Kitchen Crew', '38 Staff', '34 Present', '4 On Leave', '100% Coverage', '28 hrs', 'Fully Staffed'],

      ['Housekeeping & Laundry', '52 Staff', '46 Present', '6 On Leave', '96% Coverage', '45 hrs', 'Overtime Authorized'],

      ['Engineering & Maintenance', '22 Staff', '20 Present', '2 On Leave', '100% Coverage', '12 hrs', 'Fully Staffed'],

      ['Security & Loss Prevention', '18 Staff', '17 Present', '1 On Leave', '100% Coverage', '8 hrs', 'Optimal'],

    ],

    buttons: ['Add Employee', 'Export Staff Overview', 'Filter by Date'],

  },

  '/human-resources/employee-directory': {

    title: 'Employee Directory',

    subtitle: 'Complete staff database, employment designations, employee codes and official contact details',

    type: 'table',

    columns: ['Emp Code', 'Full Name', 'Department', 'Designation', 'Joining Date', 'Phone', 'Employment Status'],

    rows: [

      ['EMP-1001', 'Vikramaditya Rathore', 'Front Office', 'Front Office Manager', '2021-04-15', '+91 98201 11223', 'Active'],

      ['EMP-1002', 'Chef Anand Swaroop', 'Culinary / Kitchen', 'Executive Chef', '2020-08-01', '+91 98202 22334', 'Active'],

      ['EMP-1003', 'Sunita Deshmukh', 'Housekeeping', 'Executive Housekeeper', '2021-01-10', '+91 98203 33445', 'Active'],

      ['EMP-1004', 'Naresh Kumar', 'Engineering', 'Chief Engineer', '2019-11-25', '+91 98204 44556', 'Active'],

      ['EMP-1005', 'Meera Krishnan', 'Guest Services', 'Head Butler (VIP Services)', '2022-03-05', '+91 98205 55667', 'Active'],

    ],

    buttons: ['Register New Staff', 'Export Employee Master', 'Filter by Date'],

  },

  '/human-resources/attendance': {

    title: 'Attendance & Biometric Logs',

    subtitle: 'Biometric punch-in/out timestamps, tardiness tracking, shift logs and punch adjustments',

    type: 'table',

    columns: ['Log ID', 'Emp Name', 'Designation', 'Punch In', 'Punch Out', 'Hours Logged', 'Attendance Status'],

    rows: [

      ['BIO-701', 'Vikramaditya Rathore', 'Front Office Manager', '06:55 AM', '03:32 PM', '8 hrs 37 mins', 'On Time'],

      ['BIO-702', 'Sunita Deshmukh', 'Executive Housekeeper', '07:48 AM', '04:15 PM', '8 hrs 27 mins', 'On Time'],

      ['BIO-703', 'Rohan Sharma', 'F&B Server', '08:12 AM', '05:02 PM', '8 hrs 50 mins', 'Late (12 mins)'],

      ['BIO-704', 'Naresh Kumar', 'Chief Engineer', '06:58 AM', '03:45 PM', '8 hrs 47 mins', 'On Time'],

    ],

    buttons: ['Manual Punch Entry', 'Export Attendance Log', 'Filter by Date'],

  },

  '/human-resources/shift-rosters': {

    title: 'Duty Rosters & Shifts',

    subtitle: 'Morning (A), Afternoon (B), Night (C) rotational shifts and weekly off (WO) schedules',

    type: 'table',

    columns: ['Staff Member', 'Department', 'Shift Code', 'Shift Hours', 'Weekly Off', 'Station / Floor Allocated', 'Roster Status'],

    rows: [

      ['Alok Verma', 'Front Office', 'Morning Shift (A)', '07:00 – 15:30', 'Wednesday', 'Front Desk Counter 1', 'Published'],

      ['Pooja Nair', 'Front Office', 'Evening Shift (B)', '15:00 – 23:30', 'Thursday', 'Front Desk Counter 2', 'Published'],

      ['Karthik Pillai', 'Front Office', 'Night Shift (C)', '23:00 – 07:30', 'Monday', 'Night Audit Desk', 'Published'],

      ['Deepak Rawat', 'Housekeeping', 'Morning Shift (A)', '08:00 – 16:30', 'Tuesday', '3rd Floor Guest Rooms', 'Published'],

    ],

    buttons: ['Create Shift Roster', 'Export Roster PDF', 'Auto-Generate Schedule'],

  },

  '/human-resources/leave-management': {

    title: 'Leave Management',

    subtitle: 'Paid leave (PL), casual leave (CL), sick leave (SL), compensatory off and leave balances',

    type: 'table',

    columns: ['Leave App #', 'Employee Name', 'Department', 'Leave Type', 'From Date', 'To Date', 'Days', 'Approval Status'],

    rows: [

      ['LVE-210', 'Chef Rakesh Joshi', 'Kitchen', 'Casual Leave (CL)', '2026-10-22', '2026-10-24', '3 Days', 'Approved by HOD'],

      ['LVE-211', 'Sunil Bellman', 'Guest Services', 'Privilege Leave (PL)', '2026-11-02', '2026-11-08', '7 Days', 'Approved by HR'],

      ['LVE-212', 'Anita Sen', 'F&B Service', 'Sick Leave (SL)', '2026-10-16', '2026-10-17', '2 Days', 'Medical Cert Verified'],

    ],

    buttons: ['Apply for Leave', 'Export Leave Balance', 'Filter by Date'],

  },

  '/human-resources/payroll': {

    title: 'Payroll & Compensation',

    subtitle: 'Salary processing, PF & ESI statutory deductions, TDS tax deductions and payslip generation',

    type: 'table',

    columns: ['Month', 'Total Headcount', 'Gross Salary (₹)', 'PF & ESI Deductions (₹)', 'TDS Withheld (₹)', 'Net Disbursed (₹)', 'Payroll Status'],

    rows: [

      ['September 2026', '215 Employees', '₹68,45,000', '₹7,52,950', '₹4,10,000', '₹56,82,050', 'Disbursed (Direct Bank Transfer)'],

      ['August 2026', '212 Employees', '₹67,10,000', '₹7,38,100', '₹3,95,000', '₹55,76,900', 'Disbursed (Direct Bank Transfer)'],

      ['July 2026', '208 Employees', '₹65,80,000', '₹7,23,800', '₹3,82,000', '₹54,74,200', 'Disbursed (Direct Bank Transfer)'],

    ],

    buttons: ['Run Payroll Cycle', 'Generate Payslip', 'Export Bank Transfer Sheet'],

  },

  '/human-resources/recruitment': {

    title: 'Recruitment & Onboarding',

    subtitle: 'Open vacancies, candidate interview pipelines, offer letters and induction checklists',

    type: 'table',

    columns: ['Requisition ID', 'Position Title', 'Department', 'Open Vacancies', 'Applicants in Pipeline', 'Hiring Manager', 'Status'],

    rows: [

      ['REC-045', 'Sous Chef (Tandoor & Indian)', 'Culinary', '1 Opening', '8 Screened (2 Final Round)', 'Chef Anand Swaroop', 'Interviewing'],

      ['REC-046', 'Guest Relations Executive', 'Front Office', '2 Openings', '14 Screened (4 Shortlisted)', 'Vikramaditya Rathore', 'Offers Pending'],

      ['REC-047', 'HVAC Technician', 'Engineering', '1 Opening', '5 Screened', 'Naresh Kumar', 'Screening Resumes'],

    ],

    buttons: ['Post Job Vacancy', 'Export Candidate Tracker', 'Filter by Date'],

  },

  '/human-resources/training': {

    title: 'Staff Training & Certifications',

    subtitle: 'Hospitality grooming, HACCP food hygiene, fire safety drills, guest interaction mastery',

    type: 'table',

    columns: ['Program Title', 'Trainer / Institute', 'Target Attendees', 'Duration / Dates', 'Completed Pax', 'Assessment Pass %', 'Status'],

    rows: [

      ['HACCP & FSSAI Food Hygiene Certification', 'CII-Food Safety Institute', 'All Kitchen & F&B Stewards', '2-Day Workshop', '42 Staff', '98.0%', 'Certified'],

      ['Luxury Five-Star Guest Empathy Training', 'Internal L&D Corporate', 'Front Office & Concierge', '1-Day Intensive', '28 Staff', '100.0%', 'Completed'],

      ['Disaster Evacuation & First-Aid CPR', 'St. John Ambulance India', 'All Department Safety Marshals', 'Annual Refresher', '35 Staff', '96.5%', 'Certified'],

    ],

    buttons: ['Schedule Training', 'Export Certificates', 'Filter by Date'],

  },

  '/human-resources/appraisals': {

    title: 'Performance Appraisals',

    subtitle: 'Quarterly review cycles, KPI scorecards, guest feedback ratings and increment reviews',

    type: 'table',

    columns: ['Appraisal Cycle', 'Staff Reviewed', 'Average KPI Score', 'Top Rated Staff', 'Promotion Recommendations', 'Increment Status'],

    rows: [

      ['Q3 2026 Annual Cycle', '215 Employees', '4.4 / 5.0', 'Meera Krishnan (Butler Service - 4.9)', '14 Staff Recommended', 'Submitted to Board'],

      ['Q2 2026 Mid-Year Review', '208 Employees', '4.3 / 5.0', 'Dinesh Plumber (Eng - 4.8)', '8 Staff Promoted', 'Completed'],

      ['Probation Confirmation (New Hires)', '12 Staff', '4.5 / 5.0', 'Alok Verma (FO)', '12 Confirmed Full-time', 'Processed'],

    ],

    buttons: ['Initiate Review Cycle', 'Export Appraisal Matrix', 'Filter by Date'],

  },



  /* ── Security ─────────────────────────────────────────────── */

  '/security': {

    title: 'Security & Loss Prevention Overview',

    subtitle: 'Surveillance, visitor passes, access logs, emergency readiness and patrol dispatch',

    type: 'table',

    columns: ['Security Station / Zone', 'Active Guards', 'CCTV Status', 'Visitor Count Inside', 'Incidents Today', 'Alert Level'],

    rows: [

      ['Main Hotel Gate & Drop-off Porch', '4 Armed Guards', '8 Cameras Online', '14 Active Vehicles', '0 Incidents', 'Normal (Green)'],

      ['Main Lobby & Atrium', '2 Plainclothes + 2 Uniformed', '16 Cameras Online', '48 Guests & Visitors', '0 Incidents', 'Normal (Green)'],

      ['Service Entry & Delivery Receiving Bay', '2 Guards (Baggage X-Ray)', '6 Cameras Online', '5 Contractors Logged', '0 Incidents', 'Normal (Green)'],

      ['Basement Parking & Plant Room', '2 Mobile Patrol Guards', '12 Cameras Online', '28 Cars Parked', '0 Incidents', 'Normal (Green)'],

      ['Perimeter Fencing & Garden Lawns', '2 Perimeter Guards with K9', '8 Infrared Cameras', '0 Trespassing', '0 Incidents', 'Normal (Green)'],

    ],

    buttons: ['Report Security Incident', 'Export Security Log', 'Filter by Date'],

  },

  '/security/incident-reports': {

    title: 'Incident Reports',

    subtitle: 'Loss prevention logs, safety breaches, property damage and guest security reports',

    type: 'table',

    columns: ['Incident ID', 'Date & Time', 'Location', 'Nature of Incident', 'Reporting Officer', 'Actions Taken', 'Resolution Status'],

    rows: [

      ['INC-108', '2026-10-15 22:45', 'Poolside Deck Bar', 'Minor slip and fall due to spilled cocktail', 'Guard Sandeep', 'First-aid applied, floor dried, guest attended by doctor', 'Resolved (No Injury)'],

      ['INC-109', '2026-10-12 14:10', 'Basement 1 Parking', 'Fender bender between two valet vehicles', 'Supervisor Rakesh', 'Valet insurance filed, minor polish repair initiated', 'Insurance Settled'],

      ['INC-110', '2026-10-08 03:20', 'Perimeter East Gate', 'Unauthorized stray animal entry attempted', 'K9 Handler Dinesh', 'K9 unit diverted animal back outside compound', 'Resolved Immediately'],

    ],

    buttons: ['File Incident Report', 'Export Incident Log', 'Filter by Date'],

  },

  '/security/surveillance-log': {

    title: 'CCTV & Surveillance Log',

    subtitle: 'Digital video recorder (DVR/NVR) status, footage review requests and retention archives',

    type: 'table',

    columns: ['Camera Zone / ID', 'Camera Model', 'Resolution & FPS', 'NVR Server', 'Storage Days Retained', 'Health Check', 'Status'],

    rows: [

      ['CAM-LOBBY-01 to 08', 'Hikvision 4K Ultra IP Dome', '3840x2160 @ 30fps', 'NVR-01 (Basement Server)', '90 Days Storage', '100% Signal Integrity', 'Recording Live'],

      ['CAM-ENTRY-GATE-01/02', 'Bosch ANPR License Plate Reader', '1080p @ 60fps IR', 'NVR-02 (Security Office)', '90 Days Storage', 'ANPR Capture Active', 'Recording Live'],

      ['CAM-CORRIDOR-FL1-FL6', 'Honeywell 5MP Panoramic', '2560x1920 @ 25fps', 'NVR-03 & 04 (Dual Redundant)', '90 Days Storage', '100% Operational', 'Recording Live'],

    ],

    buttons: ['Request Footage Review', 'Export Camera Health', 'Filter by Date'],

  },

  '/security/visitor-passes': {

    title: 'Visitor & Contractor Passes',

    subtitle: 'Visitor badging, contractor ID verification, temporary badge issuance and exit checkout',

    type: 'table',

    columns: ['Pass #', 'Visitor / Contractor Name', 'Company', 'Host / Meeting Person', 'Time In', 'Time Out', 'Pass Status'],

    rows: [

      ['VIS-5401', 'Manish Gupta (Technician)', 'Carrier Air-Conditioning', 'Naresh Kumar (Chief Eng)', '10:15 AM', 'In Premises', 'Active Pass'],

      ['VIS-5402', 'Reena Agarwal (Auditor)', 'Ernst & Young India', 'Finance Controller', '09:30 AM', 'In Premises', 'Active Pass'],

      ['VIS-5403', 'Ramesh Yadav (Delivery)', 'ITC Agro Foods', 'Mohan (Receiving Bay)', '08:00 AM', '09:15 AM', 'Checked Out (Pass Returned)'],

    ],

    buttons: ['Issue Visitor Pass', 'Export Visitor Register', 'Filter by Date'],

  },

  '/security/keycard-audits': {

    title: 'Keycard Audits & Access Logs',

    subtitle: 'RFID door lock interrogation, master key audit trails, unauthorized access attempts',

    type: 'table',

    columns: ['Audit Log ID', 'Room / Door ID', 'Keycard Type', 'Holder / User ID', 'Timestamp', 'Lock Result', 'Audit Flag'],

    rows: [

      ['AUD-9101', 'Room 402', 'Guest Keycard #402-A', 'Vikram Malhotra', '2026-10-17 14:12:05', 'Access Granted', 'Normal Entry'],

      ['AUD-9102', 'Presidential Suite 601', 'Butler Master Key', 'Butler Charles (EMP-1008)', '2026-10-17 13:45:22', 'Access Granted', 'Authorized Staff'],

      ['AUD-9103', 'Server Room IT Vault', 'Admin Staff Card', 'IT Executive Rahul', '2026-10-17 11:20:10', 'Access Granted', 'Authorized Entry'],

      ['AUD-9104', 'Room 214', 'Expired Card #214-B', 'Unidentified Guest', '2026-10-17 10:05:40', 'Access Denied (Card Expired)', 'Checkout Verification'],

    ],

    buttons: ['Interrogate Door Lock', 'Export Access Audit', 'Filter by Date'],

  },

  '/security/lost-keycards': {

    title: 'Lost Keycard Deactivation',

    subtitle: 'Instant RFID blacklist propagation, encoder reprogramming and replacement issuing',

    type: 'table',

    columns: ['Keycard UID', 'Assigned Room', 'Guest / Staff Name', 'Reported Lost Time', 'Encoder Blacklist Status', 'Replacement Card Issued'],

    rows: [

      ['RFID-8842-A', 'Room 305', 'Siddharth Rao', '2026-10-16 21:15', 'Blacklisted (VingCard Lock Sync)', 'Yes (New UID: RFID-9912-B)'],

      ['RFID-7719-C', 'Room 118', 'Priya Menon', '2026-10-15 16:30', 'Blacklisted (VingCard Lock Sync)', 'Yes (New UID: RFID-8820-D)'],

      ['RFID-MST-04', 'Master Floor 2', 'Housekeeping Runner Anita', '2026-10-10 18:00', 'Blacklisted Instantly Across All Locks', 'Master Re-keyed & Replaced'],

    ],

    buttons: ['Deactivate & Blacklist Card', 'Export Blacklist Log', 'Filter by Date'],

  },

  '/security/emergency-protocols': {

    title: 'Emergency Preparedness',

    subtitle: 'Standard Operating Procedures (SOP), fire alarm zones, emergency contacts and assembly areas',

    type: 'table',

    columns: ['Protocol Code', 'Emergency Scenario', 'Incident Commander', 'Primary Assembly Area', 'Notification Chain', 'Status'],

    rows: [

      ['SOP-EMG-01', 'Fire & Smoke Detection', 'Chief Security Officer / Chief Engineer', 'Front Lawn Assembly Zone A', 'Automatic Fire Dept Dispatch + Hotel P.A. System', 'Operational Ready'],

      ['SOP-EMG-02', 'Medical Emergency / Cardiac Arrest', 'Duty Doctor & Senior Guest Relations', 'Room / On-Site Infirmary', 'Apollo Hospital Ambulance Hotline (+91 40 2360 7777)', 'Operational Ready'],

      ['SOP-EMG-03', 'Severe Weather / City Power Blackout', 'Chief Engineer Naresh Kumar', 'Sheltered Main Lobby & Banquet Hall', 'Auto-start DG 1 & 2 within 10 seconds', 'Operational Ready'],

    ],

    buttons: ['Trigger Practice Drill', 'Export Emergency SOPs', 'Update Contacts'],

  },

  '/security/patrol-rounds': {

    title: 'Patrol & Guard Dispatch',

    subtitle: 'NFC patrol checkpoint wand checkpoints, guard shift routes and hourly inspection reports',

    type: 'table',

    columns: ['Patrol Route', 'Officer On Duty', 'Checkpoints Scanned', 'Start Time', 'Completion Time', 'Observations', 'Route Status'],

    rows: [

      ['Route A: Roof Terrace & Chiller Plant', 'Guard Rameshwar', '14 / 14 NFC Tags', '14:00', '14:35', 'All fire doors shut, chiller normal', 'Completed On-Time'],

      ['Route B: Guest Corridors Floors 1 to 6', 'Guard Manvendra', '24 / 24 NFC Tags', '15:00', '15:45', 'Corridors quiet, emergency lights ok', 'Completed On-Time'],

      ['Route C: Basement 1 & 2 + DG Yard', 'Guard Raghuvir', '18 / 18 NFC Tags', '16:00', 'In Progress', 'Patrolling perimeter fence', 'Active Patrol'],

    ],

    buttons: ['Dispatch Patrol', 'Export Wand Log', 'Filter by Date'],

  },

};



/* ── Rendering helpers ─────────────────────────────────────── */



function DetailView({ fields }) {

  if (!fields || fields.length === 0) {

    return <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>No records found in database.</div>;

  }

  return (

    <dl className="kv" style={{ fontSize: 14 }}>

      {fields.map((f) => (

        <Fragment key={f.label}>

          <dt style={f.highlight ? { fontWeight: 700 } : {}}>{f.label}</dt>

          <dd style={f.highlight ? { fontWeight: 700, fontSize: 16 } : {}}>

            {f.badge ? <span className={`badge b-${f.badge}`}>{f.value}</span> : f.value}

          </dd>

        </Fragment>

      ))}

    </dl>

  );

}



function TableView({ columns, rows, emptyMessage = 'No records found.' }) {

  if (!rows || rows.length === 0) {

    return <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>{emptyMessage}</div>;

  }

  return (

    <div className="tw">

      <table>

        <thead>

          <tr>{columns.map((c, i) => <th key={`${c}-${i}`}>{c}</th>)}</tr>

        </thead>

        <tbody>

          {rows.map((row, i) => (

            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell}</td>)}</tr>

          ))}

        </tbody>

      </table>

    </div>

  );

}



/* Any field that should render as a date picker. */

const isAnyDateField = (name) => {

  const l = String(name).toLowerCase();

  return l.includes('date') || l.includes('check-in') || l.includes('check-out');

};

/* Date fields that describe a stay or a future event: these can never be in the past.

   Birth dates, upload dates and other historical dates are left unrestricted. */

const isBookingDateField = (name) => {

  const l = String(name).toLowerCase();

  if (l.includes('birth') || l.includes('upload') || l.includes('last update') || l.includes('review date')) return false;

  return isAnyDateField(name);

};



/* Helper to parse diverse date strings into Date objects for date filtering */

const parseRowDate = (str) => {

  if (!str) return null;

  let s = String(str).trim();

  if (s.includes('–')) s = s.split('–')[0].trim();

  else if (s.includes(' - ')) s = s.split(' - ')[0].trim();



  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {

    const d = new Date(s);

    return isNaN(d.getTime()) ? null : d;

  }

  const ddmmyyyy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);

  if (ddmmyyyy) {

    const d = new Date(Number(ddmmyyyy[3]), Number(ddmmyyyy[2]) - 1, Number(ddmmyyyy[1]));

    return isNaN(d.getTime()) ? null : d;

  }

  if (/\b(20\d{2})\b/.test(s)) {

    const d = new Date(s);

    if (!isNaN(d.getTime())) return d;

  }

  const curYear = new Date().getFullYear();

  const withYear = `${s} ${curYear}`;

  const d = new Date(withYear);

  if (!isNaN(d.getTime())) return d;



  const fallback = new Date(s);

  return isNaN(fallback.getTime()) ? null : fallback;

};



function FormView({ formFields, pathname, notify, refresh, rooms, bookings = [], guests = [], addBooking, updateBooking, updateGuest, addRecord }) {

  const [values, setValues] = React.useState({});

  const [submitting, setSubmitting] = React.useState(false);

  const todayStr = todayISO();



  const roomOptions = rooms && rooms.length ? Array.from(new Set(rooms.map(r => r.type))) : ['Standard', 'Deluxe', 'Premium', 'Suite', 'Family Room'];



  const handleChange = (f, val) => {

    setValues((prev) => ({ ...prev, [f]: val }));

  };



  const handleSubmit = async (e) => {

    if (e && e.preventDefault) e.preventDefault();

    const pastField = formFields.find((f) => isBookingDateField(f) && values[f] && values[f] < todayISO());

    if (pastField) { notify(`${pastField} cannot be in the past. Choose today or a future date.`); return; }

    setSubmitting(true);

    try {

      if (pathname === '/bookings/walk-in' || pathname === '/front-desk/walk-in-checkin') {

        const guestName = values['Guest Name'] || values['Full Name'] || '';

        if (!guestName.trim()) { notify('Please enter guest name'); setSubmitting(false); return; }

        const roomType = values['Room Type'] || roomOptions[0] || 'Standard';

        const nights = Number(values['Duration (Nights)']) || 1;

        const inDate = values['Check-in'] || new Date().toISOString().slice(0, 10);

        const outDate = values['Check-out'] || new Date(Date.now() + nights * 86400000).toISOString().slice(0, 10);

        const phone = values['Phone Number'] || values['Phone'] || values['Contact'] || '';

        const idTypeValue = values['ID Proof Type'] === 'Others'

          ? (values['ID Proof Type_custom'] || 'Other ID')

          : (values['ID Proof Type'] || values['ID Type'] || 'Aadhaar Card');

        const idNumber = values['ID Number'] || values['ID Proof Number'] || '';

        if (!idNumber || !idNumber.trim()) {

          notify('ID Number is required.');

          setSubmitting(false);

          return;

        }

        if (idTypeValue.toLowerCase().includes('aadhaar')) {

          const cleanAadhaar = idNumber.trim().replace(/[\s-]/g, '');

          if (!/^\d{12}$/.test(cleanAadhaar)) {

            notify('Invalid Aadhaar Card number. Please enter a valid 12-digit Aadhaar number.');

            setSubmitting(false);

            return;

          }

        }

        const numGuests = Number(values['Number of Guests']) || 1;

        const specialRequests = values['Special Requests'] || '';

        const notesStr = [

          idTypeValue ? `ID: ${idTypeValue}${idNumber ? ` (${idNumber})` : ''}` : '',

          specialRequests ? `Special Requests: ${specialRequests}` : ''

        ].filter(Boolean).join(' | ');



        const saved = await addBooking({

          guest: guestName.trim(),

          phone: phone.trim() || undefined,

          identification_number: idNumber.trim() || undefined,

          notes: notesStr || undefined,

          room: roomType,

          src: 'Walk-in',

          in: inDate,

          out: outDate,

          nights,

          num_guests: numGuests,

          status: 'Confirmed'

        });



        if (!saved) {

          setSubmitting(false);

          return;

        }



        if (addRecord) {

          await addRecord({

            category: 'bookings_walk-in',

            title: `Walk-in: ${guestName.trim()} (${roomType})`,

            data: {

              ...values,

              'Guest Name': guestName.trim(),

              'Phone Number': phone.trim(),

              'Room Type': roomType,

              'ID Proof Type': idTypeValue,

              'ID Number': idNumber.trim(),

              'Number of Guests': numGuests,

              'Duration (Nights)': nights,

              'Check-in': inDate,

              'Check-out': outDate,

              'Special Requests': specialRequests,

              'Source': 'Walk-in',

              'Status': 'Confirmed',

            },

            status: 'Confirmed',

          });

        }



        setValues({});

        await refresh();

        notify(`Walk-in guest "${guestName}" registered and saved to database!`);

      } else if (pathname === '/front-desk/guest-registration') {
        const fullName = (values['Full Name'] || values['Guest Name'] || '').trim();
        if (!fullName || fullName.length < 2 || ['guest', 'add guest', 'new guest'].includes(fullName.toLowerCase())) {
          notify('Guest Name is required and cannot be empty or a placeholder.');
          setSubmitting(false);
          return;
        }
        const phone = (values['Phone Number'] || values['Phone'] || '').trim();
        if (!phone) {
          notify('Phone Number is required.');
          setSubmitting(false);
          return;
        }
        const phoneDigits = phone.replace(/[^\d+]/g, '');
        if (phoneDigits.length < 8) {
          notify('Please enter a valid phone number (at least 8 digits).');
          setSubmitting(false);
          return;
        }
        const idTypeValue = values['ID Proof Type'] === 'Others'
          ? (values['ID Proof Type_custom'] || 'Other ID')
          : (values['ID Proof Type'] || values['ID Type'] || 'Aadhaar Card');
        const idNumber = (values['ID Number'] || values['ID Proof Number'] || '').trim();
        if (!idNumber) {
          notify('ID Number is required.');
          setSubmitting(false);
          return;
        }
        if (idTypeValue.toLowerCase().includes('aadhaar')) {
          const cleanAadhaar = idNumber.replace(/[\s-]/g, '');
          if (!/^\d{12}$/.test(cleanAadhaar)) {
            notify('Invalid Aadhaar Card number. Please enter a valid 12-digit Aadhaar number.');
            setSubmitting(false);
            return;
          }
        }
        const email = (values['Email Address'] || values['Email'] || '').trim();
        if (email && (!email.includes('@') || !email.includes('.'))) {
          notify('Please enter a valid email address.');
          setSubmitting(false);
          return;
        }
        const fullId = `${idTypeValue}: ${idNumber}`;
        await api('/api/guests', {
          method: 'POST',
          body: JSON.stringify({
            full_name: fullName,
            email: email || null,
            phone: phone || null,
            identification_number: fullId,
            notes: `${values['Nationality'] ? 'Nationality: ' + values['Nationality'] + '. ' : ''}${values['Address'] ? 'Address: ' + values['Address'] + '. ' : ''}${values['Purpose of Visit'] ? 'Purpose: ' + values['Purpose of Visit'] : ''}`.trim(),
          }),
        });
        setValues({});
        await refresh();
        notify(`Guest registration for "${fullName}" saved to database`);
      } else if (pathname === '/front-desk/room-transfer') {
        const guestName = (values['Guest Name'] || '').trim();
        const currentRoomNum = (values['Current Room'] || '').trim();
        const newRoomNum = (values['New Room'] || '').trim();
        if (!guestName || !newRoomNum) {
          notify('Guest Name and New Room Number are required for room transfer.');
          setSubmitting(false);
          return;
        }
        const b = bookings.find(x => (guestName && x.guest.toLowerCase().includes(guestName.toLowerCase())) || (currentRoomNum && String(x.room_number) === currentRoomNum));
        const newRoom = rooms.find(r => String(r.n) === newRoomNum);
        if (b && newRoom && updateBooking) {
          await updateBooking(b.id, { room_id: newRoom.id });
          await api(`/api/rooms/${newRoom.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'occ' }) });
          notify(`Guest ${b.guest} transferred to Room ${newRoomNum}`);
        } else if (addRecord) {
          await addRecord({ category: 'front_desk_transfer', title: `Room Transfer: ${guestName} to Room ${newRoomNum}`, data: values });
          notify('Room transfer recorded in database');
        }
        setValues({});
        await refresh();
      } else if (pathname === '/front-desk/extend-stay') {
        const guestName = (values['Guest Name'] || '').trim();
        const newOut = values['New Check-out'] || values['Check-out'];
        if (!guestName || !newOut) {
          notify('Guest Name and New Check-out date are required.');
          setSubmitting(false);
          return;
        }
        const b = bookings.find(x => guestName && x.guest.toLowerCase().includes(guestName.toLowerCase()));
        if (b && newOut && updateBooking) {
          await updateBooking(b.id, { check_out: newOut });
          notify(`Stay extended for ${b.guest} until ${newOut}`);
        } else if (addRecord) {
          await addRecord({ category: 'front_desk_extend', title: `Extend Stay: ${guestName} to ${newOut}`, data: values });
          notify('Stay extension recorded in database');
        }
        setValues({});
        await refresh();
      } else if (pathname === '/guests/details') {
        const fullName = (values['Full Name'] || values['Guest Name'] || '').trim();
        if (!fullName || fullName.length < 2 || ['guest', 'add guest', 'new guest'].includes(fullName.toLowerCase())) {
          notify('Full Name is required and cannot be empty or a placeholder.');
          setSubmitting(false);
          return;
        }
        const phone = (values['Phone Number'] || values['Phone'] || '').trim();
        if (phone) {
          const phoneDigits = phone.replace(/[^\d+]/g, '');
          if (phoneDigits.length < 8) {
            notify('Please enter a valid phone number (at least 8 digits).');
            setSubmitting(false);
            return;
          }
        }
        const email = (values['Email'] || values['Email Address'] || '').trim();
        if (email && (!email.includes('@') || !email.includes('.'))) {
          notify('Please enter a valid email address.');
          setSubmitting(false);
          return;
        }
        const idNumber = (values['ID Number'] || '').trim();
        const g = guests.find(x => fullName && x.full_name.toLowerCase().includes(fullName.toLowerCase()));
        const guestDbId = g ? Number(g.id ?? g.guest_id) : null;
        if (g && guestDbId && updateGuest) {
          await updateGuest(guestDbId, {
            full_name: fullName,
            email: email || g.email,
            phone: phone || g.phone,
            identification_number: idNumber || g.identification_number,
            notes: `${values['Address'] ? values['Address'] + '. ' : ''}${values['Nationality'] ? 'Nationality: ' + values['Nationality'] : ''}`.trim()
          });
          notify(`Guest "${fullName}" updated in database`);
        } else {
          if (!idNumber) {
            notify('ID Number is required.');
            setSubmitting(false);
            return;
          }
          await api('/api/guests', {
            method: 'POST',
            body: JSON.stringify({
              full_name: fullName,
              email: email || null,
              phone: phone || null,
              identification_number: idNumber,
              notes: values['Address'] || '',
            })
          });
          notify(`Guest "${fullName}" saved to database`);
        }
        setValues({});
        await refresh();

      } else if (pathname === '/offers/create') {

        const name = values['Offer Name'] || values['Name'] || '';

        const code = values['Promo Code'] || values['Code'] || values['Offer Code'] || '';

        if (!name.trim() || !code.trim()) { notify('Please provide offer name and promo code'); setSubmitting(false); return; }

        const discTypeRaw = values['Discount Type'] || 'Percentage (%)';

        const isPercent = discTypeRaw.includes('Percentage') || discTypeRaw.includes('%') || !discTypeRaw.toLowerCase().includes('fix');

        const discType = isPercent ? 'percent' : 'fixed';

        let discVal = Number(values['Discount Value']);

        if (isNaN(discVal) || discVal <= 0) {

          notify('Discount value must be greater than 0');

          setSubmitting(false);

          return;

        }

        if (isPercent && discVal > 100) {

          notify('Percentage discount cannot exceed 100%');

          setSubmitting(false);

          return;

        }

        await api('/api/offers', {

          method: 'POST',

          body: JSON.stringify({

            name: name.trim(),

            code: code.trim().toUpperCase(),

            discount_type: discType,

            discount_value: discVal,

            starts_on: values['Starts on'] || values['Valid From'] || new Date().toISOString().slice(0, 10),

            ends_on: values['Ends on'] || values['Valid Until'] || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),

            usage_limit: values['Max Usage Limit'] || values['Usage Limit'] ? Number(values['Max Usage Limit'] || values['Usage Limit']) : null,

            active: true,

          }),

        });

        setValues({});

        await refresh();

        notify(`Offer "${code.toUpperCase()}" saved to database`);

      } else if (addRecord) {
        const primaryField = formFields[0] || 'Name';
        const primaryVal = (values[primaryField] || values['Name'] || values['Title'] || values['Guest Name'] || values['Hotel Name'] || values['Offer Name'] || values['Plan Name'] || '').trim();
        if (!primaryVal) {
          notify(`"${primaryField}" is required and cannot be empty.`);
          setSubmitting(false);
          return;
        }
        for (const [k, v] of Object.entries(values)) {
          const kLower = k.toLowerCase();
          const valStr = String(v || '').trim();
          if ((kLower.includes('phone') || kLower.includes('contact')) && valStr && !kLower.includes('name')) {
            const digits = valStr.replace(/[^\d+]/g, '');
            if (digits.length < 8) {
              notify(`Please enter a valid phone number (at least 8 digits) for "${k}".`);
              setSubmitting(false);
              return;
            }
          }
          if (kLower.includes('email') && valStr) {
            if (!valStr.includes('@') || !valStr.includes('.')) {
              notify(`Please enter a valid email address for "${k}".`);
              setSubmitting(false);
              return;
            }
          }
        }
        const cat = pathname.replace(/^\//, '').replace(/\//g, '_');
        await addRecord({
          category: cat,
          title: primaryVal,
          data: values,
          status: 'Active',
        });
        setValues({});
        await refresh();
        notify('Form saved successfully to database');

      } else if (pathname === '/front-desk/guest-registration') {
        const fullName = (values['Full Name'] || values['Guest Name'] || '').trim();
        if (!fullName || fullName.length < 2 || ['guest', 'add guest', 'new guest'].includes(fullName.toLowerCase())) {
          notify('Guest Name is required and cannot be empty or a placeholder.');
          setSubmitting(false);
          return;
        }
        const phone = (values['Phone Number'] || values['Phone'] || '').trim();
        if (!phone) {
          notify('Phone Number is required.');
          setSubmitting(false);
          return;
        }
        const phoneDigits = phone.replace(/[^\d+]/g, '');
        if (phoneDigits.length < 8) {
          notify('Please enter a valid phone number (at least 8 digits).');
          setSubmitting(false);
          return;
        }
        const idTypeValue = values['ID Proof Type'] === 'Others'
          ? (values['ID Proof Type_custom'] || 'Other ID')
          : (values['ID Proof Type'] || values['ID Type'] || 'Aadhaar Card');
        const idNumber = (values['ID Number'] || values['ID Proof Number'] || '').trim();
        if (!idNumber) {
          notify('ID Number is required.');
          setSubmitting(false);
          return;
        }
        if (idTypeValue.toLowerCase().includes('aadhaar')) {
          const cleanAadhaar = idNumber.replace(/[\s-]/g, '');
          if (!/^\d{12}$/.test(cleanAadhaar)) {
            notify('Invalid Aadhaar Card number. Please enter a valid 12-digit Aadhaar number.');
            setSubmitting(false);
            return;
          }
        }
        const email = (values['Email Address'] || values['Email'] || '').trim();
        if (email && (!email.includes('@') || !email.includes('.'))) {
          notify('Please enter a valid email address.');
          setSubmitting(false);
          return;
        }
        const fullId = `${idTypeValue}: ${idNumber}`;
        await api('/api/guests', {
          method: 'POST',
          body: JSON.stringify({
            full_name: fullName,
            email: email || null,
            phone: phone || null,
            identification_number: fullId,
            notes: `${values['Nationality'] ? 'Nationality: ' + values['Nationality'] + '. ' : ''}${values['Address'] ? 'Address: ' + values['Address'] + '. ' : ''}${values['Purpose of Visit'] ? 'Purpose: ' + values['Purpose of Visit'] : ''}`.trim(),
          }),
        });
        setValues({});
        await refresh();
        notify(`Guest registration for "${fullName}" saved to database`);
      } else if (pathname === '/front-desk/room-transfer') {
        const guestName = (values['Guest Name'] || '').trim();
        const currentRoomNum = (values['Current Room'] || '').trim();
        const newRoomNum = (values['New Room'] || '').trim();
        if (!guestName || !newRoomNum) {
          notify('Guest Name and New Room Number are required for room transfer.');
          setSubmitting(false);
          return;
        }
        const b = bookings.find(x => (guestName && x.guest.toLowerCase().includes(guestName.toLowerCase())) || (currentRoomNum && String(x.room_number) === currentRoomNum));
        const newRoom = rooms.find(r => String(r.n) === newRoomNum);
        if (b && newRoom && updateBooking) {
          await updateBooking(b.id, { room_id: newRoom.id });
          await api(`/api/rooms/${newRoom.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'occ' }) });
          notify(`Guest ${b.guest} transferred to Room ${newRoomNum}`);
        } else if (addRecord) {
          await addRecord({ category: 'front_desk_transfer', title: `Room Transfer: ${guestName} to Room ${newRoomNum}`, data: values });
          notify('Room transfer recorded in database');
        }
        setValues({});
        await refresh();
      } else if (pathname === '/front-desk/extend-stay') {
        const guestName = (values['Guest Name'] || '').trim();
        const newOut = values['New Check-out'] || values['Check-out'];
        if (!guestName || !newOut) {
          notify('Guest Name and New Check-out date are required.');
          setSubmitting(false);
          return;
        }
        const b = bookings.find(x => guestName && x.guest.toLowerCase().includes(guestName.toLowerCase()));
        if (b && newOut && updateBooking) {
          await updateBooking(b.id, { check_out: newOut });
          notify(`Stay extended for ${b.guest} until ${newOut}`);
        } else if (addRecord) {
          await addRecord({ category: 'front_desk_extend', title: `Extend Stay: ${guestName} to ${newOut}`, data: values });
          notify('Stay extension recorded in database');
        }
        setValues({});
        await refresh();
      } else if (pathname === '/guests/details') {
        const fullName = (values['Full Name'] || values['Guest Name'] || '').trim();
        if (!fullName || fullName.length < 2 || ['guest', 'add guest', 'new guest'].includes(fullName.toLowerCase())) {
          notify('Full Name is required and cannot be empty or a placeholder.');
          setSubmitting(false);
          return;
        }
        const phone = (values['Phone Number'] || values['Phone'] || '').trim();
        if (phone) {
          const phoneDigits = phone.replace(/[^\d+]/g, '');
          if (phoneDigits.length < 8) {
            notify('Please enter a valid phone number (at least 8 digits).');
            setSubmitting(false);
            return;
          }
        }
        const email = (values['Email'] || values['Email Address'] || '').trim();
        if (email && (!email.includes('@') || !email.includes('.'))) {
          notify('Please enter a valid email address.');
          setSubmitting(false);
          return;
        }
        const idNumber = (values['ID Number'] || '').trim();
        const g = guests.find(x => fullName && x.full_name.toLowerCase().includes(fullName.toLowerCase()));
        const guestDbId = g ? Number(g.id ?? g.guest_id) : null;
        if (g && guestDbId && updateGuest) {
          await updateGuest(guestDbId, {
            full_name: fullName,
            email: email || g.email,
            phone: phone || g.phone,
            identification_number: idNumber || g.identification_number,
            notes: `${values['Address'] ? values['Address'] + '. ' : ''}${values['Nationality'] ? 'Nationality: ' + values['Nationality'] : ''}`.trim()
          });
          notify(`Guest "${fullName}" updated in database`);
        } else {
          if (!idNumber) {
            notify('ID Number is required.');
            setSubmitting(false);
            return;
          }
          await api('/api/guests', {
            method: 'POST',
            body: JSON.stringify({
              full_name: fullName,
              email: email || null,
              phone: phone || null,
              identification_number: idNumber,
              notes: values['Address'] || '',
            })
          });
          notify(`Guest "${fullName}" saved to database`);
        }
        setValues({});
        await refresh();

      } else if (pathname === '/offers/create') {

        const name = values['Offer Name'] || values['Name'] || '';

        const code = values['Promo Code'] || values['Code'] || values['Offer Code'] || '';

        if (!name.trim() || !code.trim()) { notify('Please provide offer name and promo code'); setSubmitting(false); return; }

        const discTypeRaw = values['Discount Type'] || 'Percentage (%)';

        const isPercent = discTypeRaw.includes('Percentage') || discTypeRaw.includes('%') || !discTypeRaw.toLowerCase().includes('fix');

        const discType = isPercent ? 'percent' : 'fixed';

        let discVal = Number(values['Discount Value']);

        if (isNaN(discVal) || discVal <= 0) {

          notify('Discount value must be greater than 0');

          setSubmitting(false);

          return;

        }

        if (isPercent && discVal > 100) {

          notify('Percentage discount cannot exceed 100%');

          setSubmitting(false);

          return;

        }

        await api('/api/offers', {

          method: 'POST',

          body: JSON.stringify({

            name: name.trim(),

            code: code.trim().toUpperCase(),

            discount_type: discType,

            discount_value: discVal,

            starts_on: values['Starts on'] || values['Valid From'] || new Date().toISOString().slice(0, 10),

            ends_on: values['Ends on'] || values['Valid Until'] || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),

            usage_limit: values['Max Usage Limit'] || values['Usage Limit'] ? Number(values['Max Usage Limit'] || values['Usage Limit']) : null,

            active: true,

          }),

        });

        setValues({});

        await refresh();

        notify(`Offer "${code.toUpperCase()}" saved to database`);

      } else if (addRecord) {

        const cat = pathname.replace(/^\//, '').replace(/\//g, '_');

        await addRecord({

          category: cat,

          title: values['Name'] || values['Offer Name'] || values['Plan Name'] || values['Rule'] || values['Guest Name'] || values['Season'] || 'Form Entry',

          data: values,

          status: 'Active',

        });

        setValues({});

        await refresh();

        notify('Form saved successfully to database');

      } else {

        notify('Form submitted and saved to database');

      }

    } catch (err) {

      notify(err.message || 'Failed to submit form');

    } finally {

      setSubmitting(false);

    }

  };



  return (

    <form onSubmit={handleSubmit}>

      <div className="grid2">

        {formFields.map((f) => {

          const isRoomType = f.toLowerCase().includes('room type');

          const isDate = f.toLowerCase().includes('date') || f.toLowerCase().includes('check-in') || f.toLowerCase().includes('check-out') || f.toLowerCase().includes('valid from') || f.toLowerCase().includes('valid until');

          const isDiscountType = f.toLowerCase() === 'discount type' || f.toLowerCase().includes('discount type');

          const isDiscountValue = f.toLowerCase() === 'discount value' || f.toLowerCase().includes('discount value');

          const isIdType = f.toLowerCase() === 'id type' || f.toLowerCase() === 'id proof type' || f.toLowerCase().includes('id type') || f.toLowerCase().includes('id proof type');

          const isChargeType = f.toLowerCase() === 'charge type' || f.toLowerCase().includes('charge type');

          const isNumber = !f.toLowerCase().includes('type') && (f.toLowerCase().includes('number of') || f.toLowerCase().includes('duration') || f.toLowerCase().includes('amount') || f.toLowerCase().includes('price') || f.toLowerCase().includes('rate') || (f.toLowerCase().includes('charge') && !f.toLowerCase().includes('type')));

          const isEmail = f.toLowerCase().includes('email');

          const isPassword = f.toLowerCase().includes('password');



          const isGuestId = f.toLowerCase() === 'guest id' || f.toLowerCase().includes('guest id');

          if (isGuestId) {

            const currentGuest = guests && guests.length > 0 ? guests[0] : null;

            const guestCode = values[f] || (currentGuest ? (currentGuest.guest_code || `GST-${String(currentGuest.id).padStart(4, '0')}`) : 'GST-0001');

            return (

              <div className="field" key={f}>

                <label>{f} <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 500 }}>(System-Generated)</span></label>

                <input

                  type="text"

                  value={guestCode}

                  disabled

                  readOnly

                  style={{ opacity: 0.85, cursor: 'not-allowed', background: 'rgba(255,255,255,0.06)', fontWeight: 600 }}

                />

              </div>

            );

          }



          if (isDiscountType) {

            return (

              <div className="field" key={f}>

                <label>{f}</label>

                <select

                  value={values[f] || 'Percentage (%)'}

                  onChange={(e) => handleChange(f, e.target.value)}

                >

                  <option value="Percentage (%)">Percentage (%)</option>

                  <option value="Fixed Amount (₹)">Fixed Amount (₹)</option>

                </select>

              </div>

            );

          }



          if (isDiscountValue) {

            const currentDiscountType = values['Discount Type'] || 'Percentage (%)';

            const isFixed = currentDiscountType.includes('Fixed') || currentDiscountType.includes('₹');

            return (

              <div className="field" key={f}>

                <label>{f} ({isFixed ? '₹' : '%'})</label>

                <input

                  type="number"

                  min="0.01"

                  max={isFixed ? undefined : "100"}

                  step="0.01"

                  placeholder={isFixed ? 'Enter amount in ₹ (e.g. 500)' : 'Enter percentage (e.g. 15)'}

                  value={values[f] ?? ''}

                  onChange={(e) => handleChange(f, e.target.value)}

                  required

                />

              </div>

            );

          }



          if (isIdType) {

            const idOptions = ['Aadhaar Card', 'Driving Licence', 'Passport', 'Voter ID', 'Others'];

            const currentIdType = values[f] || idOptions[0];

            return (

              <div className="field" key={f}>

                <label>{f}</label>

                <select

                  value={currentIdType}

                  onChange={(e) => handleChange(f, e.target.value)}

                >

                  {idOptions.map((opt) => (

                    <option key={opt} value={opt}>{opt}</option>

                  ))}

                </select>

                {currentIdType === 'Others' && (

                  <input

                    type="text"

                    style={{ marginTop: 8 }}

                    placeholder="Specify ID type (e.g. PAN Card, Green Card)"

                    value={values[`${f}_custom`] || ''}

                    onChange={(e) => handleChange(`${f}_custom`, e.target.value)}

                    required

                  />

                )}

              </div>

            );

          }



          if (isChargeType) {

            const chargeOptions = ['Extra Bed', 'Laundry', 'Room Service', 'Late Check-out', 'Others'];

            const currentCharge = values[f] || chargeOptions[0];

            return (

              <div className="field" key={f}>

                <label>{f}</label>

                <select

                  value={currentCharge}

                  onChange={(e) => handleChange(f, e.target.value)}

                >

                  {chargeOptions.map((opt) => (

                    <option key={opt} value={opt}>{opt}</option>

                  ))}

                </select>

                {currentCharge === 'Others' && (

                  <input

                    type="text"

                    style={{ marginTop: 8 }}

                    placeholder="Specify charge type"

                    value={values[`${f}_custom`] || ''}

                    onChange={(e) => handleChange(`${f}_custom`, e.target.value)}

                    required

                  />

                )}

              </div>

            );

          }



          return (

            <div className="field" key={f}>

              <label>{f}</label>

              {isRoomType ? (

                <select value={values[f] || roomOptions[0]} onChange={(e) => handleChange(f, e.target.value)}>

                  {roomOptions.map((opt) => <option key={opt}>{opt}</option>)}

                </select>

              ) : (

                <input

                  type={isPassword ? 'password' : isEmail ? 'email' : isDate ? 'date' : isNumber ? 'number' : 'text'}

                  placeholder={`Enter ${f.toLowerCase()}`}

                  value={values[f] || ''}

                  onChange={(e) => handleChange(f, e.target.value)}

                  {...(isDate && isBookingDateField(f) ? { min: todayStr } : {})}

                />

              )}

            </div>

          );

        })}

      </div>

      <div className="actions" style={{ marginTop: 18 }}>

        <button className="btn" type="submit" disabled={submitting}>

          {submitting ? 'Saving…' : 'Submit & Save to Database'}

        </button>

      </div>

    </form>

  );

}



function CardView({ cards }) {

  if (!cards || cards.length === 0) {

    return <div className="panel"><div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>No records found in database.</div></div>;

  }

  return (

    <div className="row r-3">

      {cards.map((c) => (

        <div className="panel" key={c.name} style={{ marginBottom: 0 }}>

          <h2>{c.name}</h2>

          <div className="sub">{c.desc}</div>

          <b style={{ fontFamily: 'var(--head)', fontSize: 20 }}>{c.price}</b>

          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>

            {c.tags.map((t) => <span className="badge b-grey" key={t}>{t}</span>)}

          </div>

        </div>

      ))}

    </div>

  );

}



function SettingsView({ settings, notify, pathname, addRecord }) {

  const [items, setItems] = React.useState(settings || []);

  React.useEffect(() => { setItems(settings || []); }, [settings]);



  const toggle = async (index) => {

    const next = [...items];

    const target = { ...next[index], enabled: !next[index].enabled };

    next[index] = target;

    setItems(next);

    if (addRecord) {

      const cat = pathname.replace(/^\//, '').replace(/\//g, '_');

      await addRecord({

        category: cat,

        title: target.label,

        data: { enabled: target.enabled },

        status: target.enabled ? 'Enabled' : 'Disabled'

      });

    }

    notify(`${target.label} ${target.enabled ? 'enabled' : 'disabled'}`);

  };



  return (

    <div style={{ display: 'grid', gap: 12 }}>

      {items.map((s, idx) => (

        <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--line)' }}>

          <span style={{ fontWeight: 500 }}>{s.label}</span>

          {s.value ? (

            <span className="muted">{s.value}</span>

          ) : (

            <button

              className={`switch ${s.enabled ? 'on' : ''}`}

              role="switch"

              aria-checked={s.enabled}

              onClick={() => toggle(idx)}

            />

          )}

        </div>

      ))}

    </div>

  );

}



function CalendarView() {

  const { bookings, openBookingModal } = useStore();

  const [currentYear, setCurrentYear] = React.useState(new Date().getFullYear());

  const [selectedMonth, setSelectedMonth] = React.useState(new Date().getMonth());

  const [selectedDate, setSelectedDate] = React.useState(null);



  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];



  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();



  /* Get bookings for a specific date using real dates */

  const getBookingsForDate = (year, month, day) => {

    const target = new Date(year, month, day).setHours(0, 0, 0, 0);

    return (bookings || []).filter((b) => {

      const cinRaw = b.check_in || b.in;

      const coutRaw = b.check_out || b.out;

      if (!cinRaw || !coutRaw) return false;

      const cin = new Date(cinRaw.includes('-') ? cinRaw : `${cinRaw} ${year}`).setHours(0, 0, 0, 0);

      const cout = new Date(coutRaw.includes('-') ? coutRaw : `${coutRaw} ${year}`).setHours(0, 0, 0, 0);

      if (isNaN(cin) || isNaN(cout)) return false;

      return target >= cin && target < cout;

    });

  };



  /* Get bookings count for a month */

  const getBookingsForMonth = (year, month) => {

    let count = 0;

    const days = daysInMonth(year, month);

    for (let d = 1; d <= days; d++) {

      if (getBookingsForDate(year, month, d).length > 0) count++;

    }

    return count;

  };



  const getFirstDayOffset = (year, month) => {

    const d = new Date(year, month, 1).getDay();

    return d === 0 ? 6 : d - 1;

  };



  const isToday = (year, month, day) => {

    const now = new Date();

    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;

  };



  const isPastDate = (year, month, day) => {

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const target = new Date(year, month, day);

    target.setHours(0, 0, 0, 0);

    return target < today;

  };



  const formatDateYMD = (year, month, day) => {

    const y = String(year);

    const m = String(month + 1).padStart(2, '0');

    const d = String(day).padStart(2, '0');

    return `${y}-${m}-${d}`;

  };



  const statusColor = (st) => {

    const map = { Confirmed: 'var(--green)', Pending: 'var(--brass)', Cancelled: 'var(--red)', Modified: 'var(--blue)', 'Checked-in': 'var(--teal)', 'Checked-out': 'var(--muted)', 'No-show': 'var(--muted)' };

    return map[st] || 'var(--muted)';

  };



  const payColor = (p) => {

    const map = { Paid: 'var(--green)', 'Partially Paid': 'var(--brass)', Pending: 'var(--red)', Refunded: 'var(--blue)' };

    return map[p] || 'var(--muted)';

  };



  /* ── Year overview: 12 month cards ──────────────────── */

  const renderYearOverview = () => (

    <div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>

        <button className="btn ghost sm" onClick={() => setCurrentYear(currentYear - 1)} style={{ minWidth: 36 }}>←</button>

        <h2 style={{ margin: 0, fontSize: 22 }}>{currentYear}</h2>

        <button className="btn ghost sm" onClick={() => setCurrentYear(currentYear + 1)} style={{ minWidth: 36 }}>→</button>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>

        {MONTHS.map((name, mi) => {

          const bookCount = getBookingsForMonth(currentYear, mi);

          const days = daysInMonth(currentYear, mi);

          const offset = getFirstDayOffset(currentYear, mi);

          const now = new Date();

          const isCurrent = now.getFullYear() === currentYear && now.getMonth() === mi;

          return (

            <button

              key={mi}

              onClick={() => setSelectedMonth(mi)}

              style={{

                background: isCurrent ? 'var(--teal-soft)' : 'var(--panel)',

                border: isCurrent ? '2px solid var(--teal)' : '1px solid var(--line)',

                borderRadius: 12, padding: 14, cursor: 'pointer', textAlign: 'left',

                transition: 'transform .15s, box-shadow .15s', color: 'var(--ink)', font: 'inherit',

              }}

              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; }}

              onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}

            >

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>

                <b style={{ fontFamily: 'var(--head)', fontSize: 14 }}>{name}</b>

                {bookCount > 0 && (

                  <span style={{ background: 'var(--teal)', color: '#fff', borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>

                    {bookCount}

                  </span>

                )}

              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, fontSize: 9, textAlign: 'center' }}>

                {DAYS.map((d) => (

                  <span key={d} style={{ color: 'var(--muted)', fontWeight: 600, padding: '2px 0' }}>{d[0]}</span>

                ))}

                {Array.from({ length: offset }).map((_, i) => <span key={`e${i}`} />)}

                {Array.from({ length: days }, (_, i) => {

                  const day = i + 1;

                  const hasBooking = getBookingsForDate(currentYear, mi, day).length > 0;

                  const today = isToday(currentYear, mi, day);

                  const isPast = isPastDate(currentYear, mi, day);

                  return (

                    <span

                      key={day}

                      style={{

                        padding: '2px 0',

                        borderRadius: 3,

                        fontWeight: today ? 700 : 400,

                        opacity: isPast ? 0.45 : 1,

                        background: today ? 'var(--teal)' : hasBooking ? 'var(--teal-soft)' : 'transparent',

                        color: today ? '#fff' : hasBooking ? 'var(--teal)' : 'var(--ink)',

                      }}

                    >

                      {day}

                    </span>

                  );

                })}

              </div>

            </button>

          );

        })}

      </div>

    </div>

  );



  /* ── Month detail view ──────────────────────────────── */

  const renderMonthView = () => {

    const mi = selectedMonth;

    const days = daysInMonth(currentYear, mi);

    const offset = getFirstDayOffset(currentYear, mi);



    return (

      <div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>

          <button className="btn ghost sm" onClick={() => setSelectedMonth(null)} title="Back to year view" style={{ minWidth: 36 }}>

            ← Year

          </button>

          <button className="btn ghost sm" onClick={() => {

            if (mi === 0) { setCurrentYear(currentYear - 1); setSelectedMonth(11); }

            else setSelectedMonth(mi - 1);

          }} style={{ minWidth: 36 }}>‹</button>

          <h2 style={{ margin: 0, flex: 1, textAlign: 'center', fontSize: 20 }}>

            {MONTHS[mi]} {currentYear}

          </h2>

          <button className="btn ghost sm" onClick={() => {

            if (mi === 11) { setCurrentYear(currentYear + 1); setSelectedMonth(0); }

            else setSelectedMonth(mi + 1);

          }} style={{ minWidth: 36 }}>›</button>

        </div>



        {/* Day headers */}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>

          {DAYS.map((d) => (

            <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'var(--muted)', padding: '8px 0', fontFamily: 'var(--head)' }}>

              {d}

            </div>

          ))}



          {/* Empty cells before first day */}

          {Array.from({ length: offset }).map((_, i) => (

            <div key={`empty-${i}`} style={{ minHeight: 80 }} />

          ))}



          {/* Day cells */}

          {Array.from({ length: days }, (_, i) => {

            const day = i + 1;

            const dayBookings = getBookingsForDate(currentYear, mi, day);

            const today = isToday(currentYear, mi, day);

            const isPast = isPastDate(currentYear, mi, day);

            const isSelected = selectedDate && selectedDate.year === currentYear && selectedDate.month === mi && selectedDate.day === day;

            const dateObj = new Date(currentYear, mi, day);

            const isSun = dateObj.getDay() === 0;

            const isSat = dateObj.getDay() === 6;



            return (

              <button

                key={day}

                type="button"

                disabled={isPast}

                onClick={isPast ? undefined : () => setSelectedDate(isSelected ? null : { year: currentYear, month: mi, day })}

                style={{

                  minHeight: 80, padding: '6px 8px', borderRadius: 10,

                  border: isSelected ? '2px solid var(--teal)' : '1px solid var(--line)',

                  background: today ? 'var(--teal-soft)' : isSelected ? 'var(--teal-soft)' : 'var(--panel)',

                  opacity: isPast ? 0.42 : 1,

                  cursor: isPast ? 'default' : 'pointer',

                  textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 3,

                  transition: isPast ? 'none' : 'transform .12s, box-shadow .12s',

                  font: 'inherit', color: 'var(--ink)',

                }}

                onMouseEnter={isPast ? undefined : (e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(0,0,0,.06)'; }}

                onMouseLeave={isPast ? undefined : (e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}

              >

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                  <span style={{

                    fontFamily: 'var(--head)', fontWeight: 700, fontSize: 14,

                    background: today ? 'var(--teal)' : 'transparent',

                    color: today ? '#fff' : isSun ? 'var(--red)' : isSat ? 'var(--blue)' : 'var(--ink)',

                    width: today ? 26 : 'auto', height: today ? 26 : 'auto',

                    borderRadius: '50%', display: 'inline-grid', placeItems: 'center',

                  }}>

                    {day}

                  </span>

                  {dayBookings.length > 0 && (

                    <span style={{

                      background: 'var(--teal)', color: '#fff', borderRadius: 99,

                      padding: '0 6px', fontSize: 10, fontWeight: 700, lineHeight: '18px',

                    }}>

                      {dayBookings.length}

                    </span>

                  )}

                </div>

                {/* Show up to 2 bookings as small pills */}

                {dayBookings.slice(0, 2).map((b) => (

                  <div key={b.id} style={{

                    fontSize: 10, padding: '2px 6px', borderRadius: 4, fontWeight: 600,

                    background: statusColor(b.st), color: '#fff',

                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',

                  }}>

                    {b.guest.split(' ')[0]}

                  </div>

                ))}

                {dayBookings.length > 2 && (

                  <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>

                    +{dayBookings.length - 2} more

                  </div>

                )}

              </button>

            );

          })}

        </div>



        {/* ── Selected date booking details panel ──────────── */}

        {selectedDate && (

          <div style={{

            marginTop: 18, padding: 18, background: 'var(--panel)', border: '1px solid var(--line)',

            borderRadius: 12, animation: 'fadeSlideIn .2s ease-out',

          }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>

              <h3 style={{ margin: 0, fontFamily: 'var(--head)', fontSize: 16 }}>

                {selectedDate.day} {MONTHS[selectedDate.month]} {selectedDate.year}

                <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 13, marginLeft: 8 }}>

                  {new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString('en-US', { weekday: 'long' })}

                </span>

              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

                {!isPastDate(selectedDate.year, selectedDate.month, selectedDate.day) && (

                  <button

                    className="btn primary sm"

                    onClick={() => openBookingModal(formatDateYMD(selectedDate.year, selectedDate.month, selectedDate.day))}

                  >

                    + Book Room

                  </button>

                )}

                <button className="btn ghost sm" onClick={() => setSelectedDate(null)}>Close</button>

              </div>

            </div>

            {(() => {

              const dayBookings = getBookingsForDate(selectedDate.year, selectedDate.month, selectedDate.day);

              if (dayBookings.length === 0) {

                return (

                  <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)' }}>

                    <div style={{ fontSize: 28, marginBottom: 6 }}>📭</div>

                    <p style={{ margin: 0 }}>No bookings on this date</p>

                  </div>

                );

              }

              return (

                <div style={{ display: 'grid', gap: 10 }}>

                  {dayBookings.map((b) => (

                    <div key={b.id} style={{

                      display: 'grid', gridTemplateColumns: '1fr', gap: 0,

                      padding: 14, borderRadius: 10, border: '1px solid var(--line)',

                      background: 'var(--bg)',

                    }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>

                        <div>

                          <b style={{ fontSize: 15, fontFamily: 'var(--head)' }}>{b.guest}</b>

                          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>

                            <span className="tag" style={{ marginRight: 8 }}>{b.id}</span>

                            {b.src}

                          </div>

                        </div>

                        <span style={{

                          padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,

                          background: statusColor(b.st), color: '#fff',

                        }}>

                          {b.st}

                        </span>

                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, fontSize: 13 }}>

                        <div>

                          <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>Room Type</span>

                          <b>{b.room}</b>

                        </div>

                        <div>

                          <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>Check-in</span>

                          <b>{b.in}</b>

                        </div>

                        <div>

                          <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>Check-out</span>

                          <b>{b.out}</b>

                        </div>

                        <div>

                          <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>Amount</span>

                          <b>₹{b.amt.toLocaleString('en-IN')}</b>

                        </div>

                        <div>

                          <span style={{ color: 'var(--muted)', fontSize: 11, display: 'block' }}>Payment</span>

                          <span style={{ color: payColor(b.pay), fontWeight: 600 }}>{b.pay}</span>

                        </div>

                      </div>

                    </div>

                  ))}

                </div>

              );

            })()}

          </div>

        )}

      </div>

    );

  };



  return (

    <div>

      <style>{`

        @keyframes fadeSlideIn {

          from { opacity: 0; transform: translateY(8px); }

          to { opacity: 1; transform: translateY(0); }

        }

      `}</style>

      {selectedMonth === null ? renderYearOverview() : renderMonthView()}

    </div>

  );

}



/* ── Main SubPage Component ────────────────────────────────── */



export default function SubPage() {

  const {

    bookings, rooms, guests, payments, offers, channels,

    setBookingStatus, markRoomClean, addBooking, createGroupBooking, updateBooking, deleteBooking,

    updateGuest, deleteGuest, updatePayment, deletePayment, toggleOffer, deleteOffer,

    updateRoom, deleteRoom, updateUser, deleteUser,

    getRecords, addRecord, updateRecord, deleteRecord,

    openBookingModal, refresh, notify,

    activeTenantId, user, tenant, activeTenant,

    loading, loadError

  } = useStore();

  const hotelTimezone = activeTenant?.timezone || tenant?.timezone || 'Asia/Kolkata';



  const getWebhookLogsUrl = React.useCallback((baseLimit = 50) => {

    const tid = activeTenantId || user?.tenant_id || tenant?.id;

    return tid ? `/api/webhooks/logs?limit=${baseLimit}&hotel_id=${encodeURIComponent(tid)}` : `/api/webhooks/logs?limit=${baseLimit}`;

  }, [activeTenantId, user, tenant]);

  const { pathname } = useLocation();

  const navigate = useNavigate();

  const { canView, canCreate, canEdit, canDelete, canApprove, canExport, effectiveRole, activeRoleObj } = useRbac();



  const walkInBookings = React.useMemo(() => {

    return (bookings || []).filter(

      (b) => b && (b.reservation_type === 'Walk-in' || b.src === 'Walk-in')

    );

  }, [bookings]);



  const roomOptions = React.useMemo(() => {

    return rooms && rooms.length ? Array.from(new Set(rooms.map(r => r.type))) : ['Standard', 'Deluxe', 'Premium', 'Suite', 'Family Room'];

  }, [rooms]);



  const [dbRecords, setDbRecords] = React.useState([]);

  const [deletedRows, setDeletedRows] = React.useState({});

  const [modalOpen, setModalOpen] = React.useState(false);

  const [modalTitle, setModalTitle] = React.useState('');

  const [modalFields, setModalFields] = React.useState([]);

  const [modalValues, setModalValues] = React.useState({});

  const [modalErrors, setModalErrors] = React.useState({});

  const [showPassword, setShowPassword] = React.useState({});

  const [editingRecord, setEditingRecord] = React.useState(null);

  const [savingModal, setSavingModal] = React.useState(false);

  const [assignModalOpen, setAssignModalOpen] = React.useState(false);

  const [assigningBooking, setAssigningBooking] = React.useState(null);

  const [selectedRoomId, setSelectedRoomId] = React.useState('');

  const [deleteConfirm, setDeleteConfirm] = React.useState({ open: false, title: '', message: '', onConfirm: null });

  const [dateFilterModalOpen, setDateFilterModalOpen] = React.useState(false);

  const [dateFilterForm, setDateFilterForm] = React.useState({ fromDate: '', toDate: '' });

  const [activeDateFilter, setActiveDateFilter] = React.useState(null);

  const [dateFilterError, setDateFilterError] = React.useState('');

  const [dbStaffRoles, setDbStaffRoles] = React.useState([]);

  const [webhookLogs, setWebhookLogs] = React.useState([]);

  const [guestModalData, setGuestModalData] = React.useState(null);

  const [conciergeRoomStatus, setConciergeRoomStatus] = React.useState(null);

  const [manualRoomOverride, setManualRoomOverride] = React.useState(false);



  // Fetch roles and staff directory records from backend database

  React.useEffect(() => {

    let active = true;

    const fetchDbRoles = async () => {

      try {

        const [rbacRolesRes, staffRecordsRes] = await Promise.all([

          api('/api/rbac/roles').catch(() => []),

          api('/api/records?category=staff_directory').catch(() => []),

        ]);

        if (!active) return;

        const fetched = [];

        if (Array.isArray(rbacRolesRes)) {

          rbacRolesRes.forEach((r) => {

            if (r && r.name) fetched.push(r.name);

          });

        }

        if (Array.isArray(staffRecordsRes)) {

          staffRecordsRes.forEach((rec) => {

            const role = rec.data?.Role || rec.data?.role;

            if (role) fetched.push(role);

          });

        }

        setDbStaffRoles(fetched);

      } catch (err) {

        console.warn('Notice loading roles from DB:', err);

      }

    };

    fetchDbRoles();

    return () => { active = false; };

  }, [pathname]);



  // Dynamically computed, deduplicated, department-free role list

  const availableStaffRoles = React.useMemo(() => {

    const map = new Map();



    // 1. Base default operational roles (clean roles only, no department names)

    BASE_STAFF_ROLES.forEach((r) => {

      const key = r.toLowerCase().trim();

      if (!isDepartmentName(key)) {

        map.set(key, r);

      }

    });



    // 2. Roles loaded from backend database (/api/rbac/roles & staff records)

    dbStaffRoles.forEach((r) => {

      if (!r || typeof r !== 'string') return;

      const clean = r.trim();

      const key = clean.toLowerCase();

      // Exclude any department names

      if (!isDepartmentName(key)) {

        if (!map.has(key)) {

          map.set(key, clean);

        }

      }

    });



    return Array.from(map.values());

  }, [dbStaffRoles]);



  const cat = pathname.replace(/^\//, '').replace(/\//g, '_');



  /* Auto-generate unique sequential Concierge Ref ID (e.g. CON-101, CON-104) */

  const generateConciergeRefId = React.useCallback(() => {

    const existingNumbers = [];

    (dbRecords || []).forEach((r) => {

      const val = r?.data?.['Ref ID'] || r?.data?.ref_id || r?.title || '';

      const match = String(val).match(/CON-(\d+)/i);

      if (match) existingNumbers.push(parseInt(match[1], 10));

    });

    const templateRows = SECTION_CONFIG['/guest-services/concierge']?.rows || [];

    templateRows.forEach((row) => {

      const val = row[0];

      const match = String(val).match(/CON-(\d+)/i);

      if (match) existingNumbers.push(parseInt(match[1], 10));

    });

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 100;

    return `CON-${maxNum + 1}`;

  }, [dbRecords]);



  /* Auto-detect active room for guest in Concierge Desk */

  const handleConciergeGuestChange = React.useCallback(async (guestName) => {

    setModalValues(prev => ({ ...prev, 'Guest Name': guestName }));

    setManualRoomOverride(false);

    if (!guestName || !guestName.trim()) {

      setConciergeRoomStatus(null);

      setModalValues(prev => ({

        ...prev,

        'Room': '',

        room_id: null,

        room_number: null,

        guest_id: null,

        reservation_id: null,

        reservation_reference: null

      }));

      return;

    }



    const clean = guestName.trim().toLowerCase();



    // 1. Immediate client-side check across store's active reservations

    const today = new Date().toISOString().slice(0, 10);

    const matchedBookings = (bookings || []).filter(b => {

      const bGuest = (b.guest || '').toLowerCase();

      return bGuest === clean || bGuest.includes(clean) || clean.includes(bGuest);

    });



    let bestMatch = matchedBookings.find(b => (b.st || b.status) === 'Checked-in' && b.room_number);

    if (!bestMatch) {

      bestMatch = matchedBookings.find(b => {

        const inD = b.check_in || b.in;

        const outD = b.check_out || b.out;

        const st = b.st || b.status;

        return ['Checked-in', 'Confirmed', 'Modified', 'Pending'].includes(st) &&

          inD && outD && inD <= today && outD >= today && b.room_number;

      });

    }

    if (!bestMatch) {

      bestMatch = matchedBookings.find(b => ['Checked-in', 'Confirmed', 'Modified'].includes(b.st || b.status) && b.room_number);

    }



    if (bestMatch) {

      const rNum = String(bestMatch.room_number);

      const display = rNum.toLowerCase().startsWith('room') ? rNum : `Room ${rNum}`;

      setModalValues(prev => ({

        ...prev,

        'Room': display,

        room_id: bestMatch.room_id,

        room_number: rNum,

        guest_id: bestMatch.guest_id,

        reservation_id: bestMatch.reservation_id || bestMatch.id,

        reservation_reference: bestMatch.id || bestMatch.reference

      }));

      setConciergeRoomStatus({

        status: 'found',

        message: `✓ Auto-detected: ${display} (${bestMatch.st || bestMatch.status || 'Active'})`

      });

      return;

    }



    // 2. Query backend SQL database for verified active stay in authenticated hotel

    setConciergeRoomStatus({ status: 'searching', message: 'Detecting active room...' });

    try {

      const res = await api(`/api/guests/active-room?name=${encodeURIComponent(guestName.trim())}`);

      if (res && res.found) {

        setModalValues(prev => ({

          ...prev,

          'Room': res.room_display,

          room_id: res.room_id,

          room_number: res.room_number,

          guest_id: res.guest_id,

          reservation_id: res.reservation_id,

          reservation_reference: res.reservation_reference

        }));

        setConciergeRoomStatus({

          status: 'found',

          message: `✓ Auto-detected: ${res.room_display} (${res.reservation_status})`

        });

      } else {

        setModalValues(prev => ({ ...prev, Room: '', room_id: null, room_number: null }));

        setConciergeRoomStatus({

          status: 'not_found',

          message: 'No active room found'

        });

      }

    } catch {

      setModalValues(prev => ({ ...prev, Room: '', room_id: null, room_number: null }));

      setConciergeRoomStatus({

        status: 'not_found',

        message: 'No active room found'

      });

    }

  }, [bookings]);



  /* Helper to check RBAC permission for action buttons */

  const isButtonAuthorized = (btn) => {

    const b = (btn || '').toLowerCase();

    if (b.includes('export') || b.includes('download')) {

      return canExport(pathname);

    }

    if (b.includes('approve') || b.includes('sign-off') || b.includes('verify') || b.includes('authorize') || b.includes('reconcile')) {

      return canApprove(pathname);

    }

    if (b.includes('edit') || b.includes('update') || b.includes('modify') || b.includes('reset') || b.includes('switch')) {

      return canEdit(pathname);

    }

    if (b.includes('delete') || b.includes('remove') || b.includes('archive') || b.includes('void') || b.includes('cancel')) {

      return canDelete(pathname);

    }

    if (

      b.includes('new') || b.includes('create') || b.includes('add') ||

      b.includes('register') || b.includes('log') || b.includes('record') ||

      b.includes('assign') || b.includes('upload') || b.includes('generate') ||

      b.includes('trigger') || b.includes('post') || b.includes('dispatch') ||

      b.includes('schedule') || b.includes('invite') || b.includes('check-in') ||

      b.includes('extend') || b.includes('process')

    ) {

      return canCreate(pathname);

    }

    return true;

  };



  React.useEffect(() => {

    let active = true;

    setActiveDateFilter(null);

    setDateFilterForm({ fromDate: '', toDate: '' });

    setDateFilterError('');

    setDateFilterModalOpen(false);

    if (getRecords) {

      getRecords(cat).then((res) => {

        if (active) setDbRecords(res || []);

      });

    }

    if (pathname.startsWith('/webhooks')) {

      api(getWebhookLogsUrl(50)).then((logs) => {

        if (active && Array.isArray(logs)) setWebhookLogs(logs);

      }).catch(() => {});

    }

    return () => { active = false; };

  }, [pathname, getRecords, cat, getWebhookLogsUrl]);



  const openDateFilterModal = () => {

    setDateFilterForm(activeDateFilter ? { ...activeDateFilter } : { fromDate: '', toDate: '' });

    setDateFilterError('');

    setDateFilterModalOpen(true);

  };



  const handleApplyDateFilter = (e) => {

    if (e && e.preventDefault) e.preventDefault();

    const { fromDate, toDate } = dateFilterForm;



    if (!fromDate || !toDate) {

      const msg = 'Please provide both From Date and To Date.';

      setDateFilterError(msg);

      notify(msg);

      return;

    }



    if (new Date(fromDate) > new Date(toDate)) {

      const msg = 'From Date cannot be after To Date. Please select a valid date range.';

      setDateFilterError(msg);

      notify(msg);

      return;

    }



    setDateFilterError('');

    setActiveDateFilter({ fromDate, toDate });

    setDateFilterModalOpen(false);

    notify('Date filter applied successfully');

  };



  const handleResetDateFilter = () => {

    setDateFilterForm({ fromDate: '', toDate: '' });

    setActiveDateFilter(null);

    setDateFilterError('');

    setDateFilterModalOpen(false);

    notify('Date filter reset');

  };



  const handleCancelDateFilter = () => {

    setDateFilterForm(activeDateFilter ? { ...activeDateFilter } : { fromDate: '', toDate: '' });

    setDateFilterError('');

    setDateFilterModalOpen(false);

  };



  if (pathname === '/rooms/types-gallery' || pathname === '/rooms/types' || pathname === '/rooms/room-types') {

    return <RoomTypes />;

  }



  if (pathname === '/food-beverage/restaurant-pos') {

    return <RestaurantPosView />;

  }



  const amenityMatch = pathname.match(/^\/guest-services\/(wifi|ac|tv|swimming-pool|gym|parking|spa)$/);

  if (amenityMatch) {

    return <AmenitiesManagement amenityType={amenityMatch[1]} />;

  }



  if (pathname === '/settings/appearance' || pathname === '/settings/theme') {

    return <AppearanceSettings />;

  }



  const config = SECTION_CONFIG[pathname];



  /* Derive parent path and label for the back button */

  const parentPath = '/' + pathname.split('/').filter(Boolean)[0];

  let parentLabel = 'Back';

  for (const g of NAV) {

    const found = g.items.find((it) => it.to === parentPath);

    if (found) { parentLabel = found.label; break; }

  }



  /* RBAC Page-Level View Protection */

  if (!canView(pathname)) {

    return (

      <>

        {pathname !== '/guest-services' && (

          <button className="back-btn" onClick={() => navigate(parentPath)}>

            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>

            <span>{parentLabel}</span>

          </button>

        )}

        <PageHead

          title="Access Restricted"

          subtitle={`Your current role (${activeRoleObj?.name || effectiveRole}) does not have permission to view this section.`}

        />

        <div className="panel" style={{ textAlign: 'center', padding: '60px 24px' }}>

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

            Permission Denied

          </h2>

          <p style={{ maxWidth: 480, margin: '0 auto 24px', color: 'var(--sub, #9ca3af)', fontSize: 14, lineHeight: 1.6 }}>

            Access to <b>{config?.title || pathname}</b> requires View permissions for role <b>{activeRoleObj?.name || effectiveRole}</b>. Please contact a System Administrator or switch to an authorized role in the top header.

          </p>

          <button className="btn primary" onClick={() => navigate('/')}>

            Return to Dashboard

          </button>

        </div>

      </>

    );

  }



  if (!config) {

    return (

      <>

        {pathname !== '/guest-services' && (

          <button className="back-btn" onClick={() => navigate(parentPath)}>

            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>

            <span>{parentLabel}</span>

          </button>

        )}

        <PageHead

          title="Coming Soon"

          subtitle="This section is under development"

        />

        <div className="panel">

          <div className="empty">

            <h2 style={{ marginBottom: 8 }}>🚧 Under Construction</h2>

            <p className="muted">This page will be available soon. Navigate using the sidebar menu.</p>

          </div>

        </div>

      </>

    );

  }



  /* Export CSV helper */

  const exportDataAsCSV = () => {

    let csv = '';

    if (dynamicColumns && dynamicRows) {

      const exportCols = dynamicColumns.filter(c => c && !['Action', '', 'Actions'].includes(c));

      const header = exportCols.join(',');

      const body = dynamicRows.map(row => {

        return row.slice(0, exportCols.length).map(cell => {

          let text = '';

          if (React.isValidElement(cell)) {

            text = cell.props?.children || '';

            if (typeof text === 'object' && text !== null) {

              text = text.props?.children || JSON.stringify(text);

            }

          } else {

            text = String(cell ?? '');

          }

          return `"${String(text).replace(/"/g, '""')}"`;

        }).join(',');

      }).join('\n');

      csv = `${header}\n${body}`;

    } else if (config.fields) {

      csv = 'Field,Value\n' + config.fields.map(f => `"${f.label}","${f.value}"`).join('\n');

    } else {

      csv = `Section,${config.title}\nDescription,${config.subtitle}`;

    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;

    link.download = `${config.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_export.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    notify('Export downloaded successfully');

  };



  /* Modal Submit */

  const handleModalSubmit = async (e) => {

    if (e && e.preventDefault) e.preventDefault();

    const isBookingEdit = !!(editingRecord && editingRecord._isBooking);

    const originalIn = isBookingEdit ? String(editingRecord.check_in || '').slice(0, 10) : '';

    const originalOut = isBookingEdit ? String(editingRecord.check_out || '').slice(0, 10) : '';

    const pastField = modalFields.find((f) => {

      const v = modalValues[f];

      if (!v || !isBookingDateField(f) || !/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return false;

      if (isBookingEdit && ((f === 'Check-in' && v === originalIn) || (f === 'Check-out' && v === originalOut))) return false;

      return v < todayISO();

    });

    if (pastField) { notify(`${pastField} cannot be in the past. Choose today or a future date.`); return; }

    if (isBookingEdit && modalValues['Check-in'] && modalValues['Check-out'] && modalValues['Check-out'] <= modalValues['Check-in']) {

      notify('Check-out must be after check-in'); return;

    }



    // Validate passwords if password fields are present

    if (modalFields.some(f => f.toLowerCase().includes('password'))) {

      const passField = modalFields.find(f => f.toLowerCase().includes('password') && !f.toLowerCase().includes('confirm')) || 'Create New Password';

      const confirmField = modalFields.find(f => f.toLowerCase().includes('confirm')) || 'Confirm Password';

      const passVal = modalValues[passField] || '';

      const confirmVal = modalValues[confirmField] || '';



      if (!passVal.trim()) {

        notify('Please enter a password');

        return;

      }

      if (passVal.length < 6) {

        notify('Password must be at least 6 characters');

        return;

      }

      if (modalFields.some(f => f.toLowerCase().includes('confirm'))) {

        if (!confirmVal.trim()) {

          notify('Please confirm the password');

          return;

        }

        if (passVal !== confirmVal) {

          notify('Passwords do not match. Please verify and try again.');

          return;

        }

      }

    }



    // Validation for Payslip & Payroll

    if (modalTitle.toLowerCase().includes('payslip') || pathname === '/human-resources/payroll') {

      const isPayslip = modalTitle.toLowerCase().includes('payslip') || modalFields.includes('Employee Name') || modalFields.includes('Basic Salary (₹)');

      if (isPayslip) {

        const empName = (modalValues['Employee Name'] || modalValues['Name'] || '').trim();

        if (!empName) {

          notify('Employee Name is required and cannot be empty.');

          return;

        }

        const empId = (modalValues['Employee ID'] || modalValues['ID'] || '').trim();

        if (!empId) {

          notify('Employee ID is required and cannot be empty.');

          return;

        }

        const monthVal = (modalValues['Month'] || '').trim();

        if (!monthVal) {

          notify('Month / Pay Period is required and cannot be empty.');

          return;

        }

        const basicRaw = modalValues['Basic Salary (₹)'];

        if (basicRaw === undefined || String(basicRaw).trim() === '') {

          notify('Basic Salary is required.');

          return;

        }

        const basic = parseFloat(String(basicRaw).replace(/[^0-9.-]/g, ''));

        if (isNaN(basic) || basic < 0) {

          notify('Basic Salary must be a valid non-negative number (≥ 0).');

          return;

        }

        const allowances = parseFloat(String(modalValues['Allowances (₹)'] || '0').replace(/[^0-9.-]/g, '')) || 0;

        if (allowances < 0) {

          notify('Allowances cannot be negative.');

          return;

        }

        const deductions = parseFloat(String(modalValues['Deductions (₹)'] || '0').replace(/[^0-9.-]/g, '')) || 0;

        if (deductions < 0) {

          notify('Deductions cannot be negative.');

          return;

        }

        if (deductions > basic + allowances) {

          notify('Deductions cannot exceed Gross Salary (Basic Salary + Allowances).');

          return;

        }

      } else {

        const monthVal = (modalValues['Month'] || '').trim();

        if (!monthVal) {

          notify('Month is mandatory.');

          return;

        }

      }

    }



    // Validation for ID Type and Specify ID Type

    for (const f of modalFields) {

      const isId = f.toLowerCase() === 'id type' || f.toLowerCase() === 'id proof type';

      if (isId) {

        const selectedType = modalValues[f] || 'Aadhaar Card';

        if (selectedType === 'Others') {

          const customVal = (modalValues[`${f}_custom`] || modalValues['Specify ID Type'] || '').trim();

          if (!customVal) {

            notify('Specify ID Type is mandatory when Others is selected. Please enter the ID type.');

            return;

          }

        }

      }

    }



    // Validation for Asset Registry

    const isAssetPage = pathname === '/engineering/asset-registry' || modalTitle.toLowerCase().includes('asset');

    if (isAssetPage) {

      const tag = String(modalValues['Asset Tag'] || modalValues['Asset Tag #'] || '').trim();

      const name = String(modalValues['Asset Name'] || modalValues['Equipment Description'] || '').trim();

      const errors = {};

      if (!tag) {

        errors['Asset Tag'] = 'Asset Tag is required (e.g. AST-HVAC-01)';

      }

      if (!name) {

        errors['Asset Name'] = 'Asset Name / Equipment Description is required';

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Validation for Preventive Maintenance (PPM)

    const isPpmPage = pathname === '/engineering/preventive-maintenance' || modalTitle.toLowerCase().includes('ppm');

    if (isPpmPage) {

      const errors = {};

      const ppmId = String(modalValues['PPM Task ID'] || '').trim();

      const assetLoc = String(modalValues['Asset / Location'] || '').trim();

      const frequency = String(modalValues['Frequency'] || '').trim();

      const lastServiced = String(modalValues['Last Serviced'] || '').trim();

      const nextDue = String(modalValues['Next Due Date'] || '').trim();

      const checklist = String(modalValues['Checklist Items'] || '').trim();



      if (!ppmId) {

        errors['PPM Task ID'] = 'PPM Task ID is mandatory (e.g. PPM-204).';

      }

      if (!assetLoc) {

        errors['Asset / Location'] = 'Asset / Location is mandatory.';

      }

      if (!frequency || frequency.toLowerCase() === 'select frequency') {

        errors['Frequency'] = 'Frequency is mandatory (e.g. Monthly, Quarterly).';

      }

      if (!lastServiced) {

        errors['Last Serviced'] = 'Last Serviced date is mandatory (YYYY-MM-DD).';

      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(lastServiced) || isNaN(Date.parse(lastServiced))) {

        errors['Last Serviced'] = 'Please enter a valid Last Serviced date (YYYY-MM-DD).';

      }



      if (!nextDue) {

        errors['Next Due Date'] = 'Next Due Date is mandatory (YYYY-MM-DD).';

      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue) || isNaN(Date.parse(nextDue))) {

        errors['Next Due Date'] = 'Please enter a valid Next Due Date (YYYY-MM-DD).';

      } else if (lastServiced && /^\d{4}-\d{2}-\d{2}$/.test(lastServiced) && !isNaN(Date.parse(lastServiced))) {

        if (nextDue < lastServiced) {

          errors['Next Due Date'] = 'Next Due Date must be on or after Last Serviced date.';

        }

      }



      if (!checklist) {

        errors['Checklist Items'] = 'At least one valid checklist item is required.';

      }



      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        const firstMsg = Object.values(errors)[0];

        notify(firstMsg);

        return;

      }

      setModalErrors({});

    }



    // Validation for Safety & Fire Compliance

    const isSafetyPage = pathname === '/engineering/safety-compliance' || modalTitle.toLowerCase().includes('compliance') || modalTitle.toLowerCase().includes('fire');

    if (isSafetyPage) {

      const errors = {};

      const item = String(modalValues['Compliance Item'] || modalValues['compliance_item'] || '').trim();

      const authority = String(modalValues['Statutory Authority'] || modalValues['statutory_authority'] || '').trim();

      const inspDate = String(modalValues['Inspection Date'] || modalValues['inspection_date'] || '').trim();

      const validUntil = String(modalValues['Certificate Valid Until'] || modalValues['valid_until'] || '').trim();

      const officer = String(modalValues['Safety Officer'] || modalValues['safety_officer'] || '').trim();



      if (!item) {

        errors['Compliance Item'] = 'Compliance Item is mandatory (e.g. Fire Safety NOC Certificate).';

      }

      if (!authority) {

        errors['Statutory Authority'] = 'Statutory Authority is mandatory (e.g. State Fire & Emergency Services).';

      }

      if (!inspDate) {

        errors['Inspection Date'] = 'Inspection Date is mandatory (YYYY-MM-DD).';

      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(inspDate) || isNaN(Date.parse(inspDate))) {

        errors['Inspection Date'] = 'Please enter a valid Inspection Date (YYYY-MM-DD).';

      }

      if (!validUntil) {

        errors['Certificate Valid Until'] = 'Certificate Valid Until date is mandatory (YYYY-MM-DD).';

      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil) || isNaN(Date.parse(validUntil))) {

        errors['Certificate Valid Until'] = 'Please enter a valid Certificate Valid Until date (YYYY-MM-DD).';

      }

      if (!officer) {

        errors['Safety Officer'] = 'Safety Officer name is mandatory.';

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Validation for Security Keycard Audits

    const isKeycardPage = pathname === '/security/keycard-audits' || modalTitle.toLowerCase().includes('keycard') || modalTitle.toLowerCase().includes('door lock');

    if (isKeycardPage) {

      const errors = {};

      const auditId = String(modalValues['Audit Log ID'] || '').trim();

      const doorId = String(modalValues['Room / Door ID'] || '').trim();

      const holder = String(modalValues['Holder / User ID'] || '').trim();



      if (!auditId) {

        errors['Audit Log ID'] = 'Audit Log ID is mandatory (e.g. AUD-9105).';

      }

      if (!doorId) {

        errors['Room / Door ID'] = 'Room / Door ID is mandatory (e.g. Room 402, Server Room).';

      }

      if (!holder) {

        errors['Holder / User ID'] = 'Holder / User ID is mandatory.';

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    const FORM_TITLE_BLACKLIST = [

      'add employee', 'register new staff', 'staff details', 'add staff member', 'add admin user',

      'log work order', 'register new asset', 'schedule ppm task', 'record meter reading',

      'log room inspection', 'adjust setpoints', 'log fire drill', 'upload compliance cert',

      'interrogate door lock', 'new amenity request', 'create booking', 'new booking', 'walk-in booking',

      'sales & marketing overview', 'sales and marketing overview', 'sales & marketing', 'sales-marketing',

      'new sales lead', 'add corporate account', 'new group rfp', 'create campaign',

      'corporate accounts', 'group & event sales', 'group and event sales', 'campaigns',

      'travel agent contracts', 'marketing roi', 'leads & enquiries', 'loyalty campaigns',

      'edit entry'

    ];



    // Dedicated Validation for Sales & Marketing Modules

    const isSalesMarketing = pathname.startsWith('/sales-marketing') || modalTitle.toLowerCase().includes('sales') || modalTitle.toLowerCase().includes('marketing');

    if (isSalesMarketing) {

      const errors = {};

      if (pathname === '/sales-marketing' || modalTitle.toLowerCase().includes('sales lead')) {

        const seg = String(modalValues['Segment'] || '').trim();

        const contracts = String(modalValues['Active Contracts'] || '').trim();

        const nights = String(modalValues['Contracted Room Nights'] || '').trim();

        if (!seg || FORM_TITLE_BLACKLIST.includes(seg.toLowerCase())) {

          errors['Segment'] = 'Market Segment is mandatory and cannot be a form title.';

        } else if (seg.length < 2) {

          errors['Segment'] = 'Market Segment must be at least 2 characters.';

        }

        if (!contracts) {

          errors['Active Contracts'] = 'Active Contracts count is mandatory.';

        }

        if (!nights) {

          errors['Contracted Room Nights'] = 'Contracted Room Nights is mandatory.';

        }

      } else if (pathname === '/sales-marketing/group-sales' || modalTitle.toLowerCase().includes('group')) {

        const grp = String(modalValues['Event / Group Name'] || modalValues['Group Name'] || '').trim();

        const organizer = String(modalValues['Organizer'] || '').trim();

        const dates = String(modalValues['Block Dates'] || '').trim();

        if (!grp || FORM_TITLE_BLACKLIST.includes(grp.toLowerCase())) {

          errors['Event / Group Name'] = 'Event / Group Name is mandatory and cannot be a form title.';

        } else if (grp.length < 2) {

          errors['Event / Group Name'] = 'Event / Group Name must be at least 2 characters.';

        }

        if (!organizer || FORM_TITLE_BLACKLIST.includes(organizer.toLowerCase())) {

          errors['Organizer'] = 'Organizer name/company is mandatory.';

        } else if (organizer.length < 2) {

          errors['Organizer'] = 'Organizer must be at least 2 characters.';

        }

        if (!dates) {

          errors['Block Dates'] = 'Block Dates is mandatory.';

        }

      } else if (pathname === '/sales-marketing/corporate-accounts' || modalTitle.toLowerCase().includes('corporate')) {

        const comp = String(modalValues['Company Name'] || '').trim();

        const rate = String(modalValues['Corporate Rate (₹)'] || modalValues['Corporate Rate'] || '').trim();

        if (!comp || FORM_TITLE_BLACKLIST.includes(comp.toLowerCase())) {

          errors['Company Name'] = 'Company Name is mandatory.';

        } else if (comp.length < 2) {

          errors['Company Name'] = 'Company Name must be at least 2 characters.';

        }

        if (!rate) {

          errors['Corporate Rate (₹)'] = 'Corporate Rate is mandatory.';

        }

      } else if (pathname === '/sales-marketing/campaigns' || modalTitle.toLowerCase().includes('campaign')) {

        const camp = String(modalValues['Campaign Name'] || '').trim();

        const channel = String(modalValues['Channel'] || '').trim();

        const startDate = String(modalValues['Start Date'] || '').trim();

        if (!camp || FORM_TITLE_BLACKLIST.includes(camp.toLowerCase())) {

          errors['Campaign Name'] = 'Campaign Name is mandatory.';

        } else if (camp.length < 2) {

          errors['Campaign Name'] = 'Campaign Name must be at least 2 characters.';

        }

        if (!channel) {

          errors['Channel'] = 'Channel is mandatory.';

        }

        if (!startDate) {

          errors['Start Date'] = 'Start Date is mandatory.';

        }

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

    }



    // Dedicated Validation for Staff Directory & Admin Users

    const isStaffPage = pathname === '/staff/directory' || pathname === '/staff/admin-users' || modalTitle.toLowerCase().includes('staff member') || modalTitle.toLowerCase().includes('admin user');

    if (isStaffPage) {

      const errors = {};

      const nameVal = String(modalValues['Name'] || modalValues['Full Name'] || '').trim();

      const roleVal = String(modalValues['Role'] || '').trim();

      const deptVal = String(modalValues['Department'] || '').trim();

      const phoneVal = String(modalValues['Phone'] || modalValues['Phone Number'] || '').trim();

      const emailVal = String(modalValues['Email'] || '').trim();



      if (!nameVal || FORM_TITLE_BLACKLIST.includes(nameVal.toLowerCase())) {

        errors['Name'] = 'Staff Name is mandatory and cannot be a form title.';

      } else if (nameVal.length < 2) {

        errors['Name'] = 'Staff Name must be at least 2 characters.';

      }

      if (!roleVal) {

        errors['Role'] = 'Role is mandatory.';

      }

      if (!deptVal) {

        errors['Department'] = 'Department is mandatory.';

      }

      if (!phoneVal || FORM_TITLE_BLACKLIST.includes(phoneVal.toLowerCase())) {

        errors['Phone'] = 'Phone Number is mandatory.';

      } else {

        const digits = phoneVal.replace(/[^\d+]/g, '');

        if (digits.length < 8) {

          errors['Phone'] = 'Valid Phone Number is mandatory (at least 8 digits).';

        }

      }

      if (!emailVal) {

        errors['Email'] = 'Email address is mandatory.';

      } else if (!emailVal.includes('@') || !emailVal.includes('.')) {

        errors['Email'] = 'A valid email address (e.g. staff@hotel.com) is mandatory.';

      }



      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Validation for Human Resources Employees & Staff

    const isHrEmployeePage = (pathname === '/human-resources' || pathname === '/human-resources/employee-directory') && !modalTitle.toLowerCase().includes('payslip') && !pathname.includes('payroll');

    if (isHrEmployeePage) {

      const errors = {};

      const codeField = modalFields.find(f => f.toLowerCase().includes('code')) || (modalFields.includes('Emp Code') ? 'Emp Code' : 'Employee Code');

      const nameField = modalFields.find(f => f.toLowerCase().includes('name') && !f.toLowerCase().includes('holder')) || 'Full Name';

      const codeVal = String(modalValues[codeField] || '').trim();

      const nameVal = String(modalValues[nameField] || '').trim();

      const deptVal = String(modalValues['Department'] || '').trim();

      const desigVal = String(modalValues['Designation'] || modalValues['Role'] || '').trim();

      const phoneVal = String(modalValues['Phone'] || modalValues['Phone Number'] || '').trim();



      if (!codeVal || FORM_TITLE_BLACKLIST.includes(codeVal.toLowerCase())) {

        errors[codeField] = `${codeField} is mandatory (e.g. EMP-1010) and cannot be a form title.`;

      }

      if (!nameVal || FORM_TITLE_BLACKLIST.includes(nameVal.toLowerCase())) {

        errors[nameField] = `${nameField} is mandatory and cannot be a form title or placeholder.`;

      } else if (nameVal.length < 2) {

        errors[nameField] = `${nameField} must be at least 2 characters.`;

      }

      if (!deptVal) {

        errors['Department'] = 'Department is mandatory.';

      }

      if (!desigVal) {

        errors['Designation'] = 'Designation / Role is mandatory.';

      }

      if (!phoneVal || FORM_TITLE_BLACKLIST.includes(phoneVal.toLowerCase())) {

        errors['Phone'] = 'Phone Number is mandatory.';

      }



      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Validation for Work Orders & Repair Requests

    const isWorkOrderPage = pathname === '/engineering/work-orders' || modalTitle.toLowerCase().includes('work order');

    if (isWorkOrderPage) {

      const errors = {};

      const woNum = String(modalValues['WO #'] || modalValues['wo_number'] || '').trim();

      const loc = String(modalValues['Location'] || modalValues['location'] || '').trim();

      const desc = String(modalValues['Issue Description'] || modalValues['issue_description'] || '').trim();



      if (!woNum) {

        errors['WO #'] = 'Work Order # is mandatory (e.g. WO-1045).';

      }

      if (!loc) {

        errors['Location'] = 'Location is mandatory (e.g. Room 304, Lobby Restroom).';

      }

      if (!desc) {

        errors['Issue Description'] = 'Issue Description is mandatory.';

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Validation for Energy & Utility Monitoring

    const isEnergyPage = pathname === '/engineering/energy-utility' || modalTitle.toLowerCase().includes('meter reading') || modalTitle.toLowerCase().includes('energy');

    if (isEnergyPage) {

      const errors = {};

      const resource = String(modalValues['Utility Resource'] || modalValues['utility_resource'] || '').trim();

      const consumption = String(modalValues['Daily Consumption'] || modalValues['daily_consumption'] || '').trim();

      const benchmark = String(modalValues['Target Benchmark'] || modalValues['target_benchmark'] || '').trim();

      const unitCost = String(modalValues['Unit Cost (₹)'] || modalValues['Unit Cost'] || modalValues['unit_cost'] || '').trim();



      if (!resource) {

        errors['Utility Resource'] = 'Utility Resource is mandatory (e.g. Grid Power, Diesel Fuel).';

      }

      if (!consumption) {

        errors['Daily Consumption'] = 'Daily Consumption reading is mandatory.';

      }

      if (!benchmark) {

        errors['Target Benchmark'] = 'Target Benchmark is mandatory.';

      }

      if (!unitCost) {

        errors['Unit Cost (₹)'] = 'Unit Cost (₹) is mandatory.';

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Validation for Room Inspection Sign-off

    const isRoomInspectionPage = pathname === '/engineering/room-inspections' || modalTitle.toLowerCase().includes('room inspection');

    if (isRoomInspectionPage) {

      const errors = {};

      const inspId = String(modalValues['Inspection ID'] || modalValues['inspection_id'] || '').trim();

      const roomNum = String(modalValues['Room #'] || modalValues['Room'] || '').trim();

      const inspDate = String(modalValues['Inspect Date'] || modalValues['Date'] || '').trim();

      const inspector = String(modalValues['Inspector'] || modalValues['inspector'] || '').trim();



      if (!inspId) {

        errors['Inspection ID'] = 'Inspection ID is mandatory (e.g. RMI-604).';

      }

      if (!roomNum) {

        errors['Room #'] = 'Room # is mandatory.';

      }

      if (!inspDate) {

        errors['Inspect Date'] = 'Inspect Date is mandatory (YYYY-MM-DD).';

      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(inspDate) || isNaN(Date.parse(inspDate))) {

        errors['Inspect Date'] = 'Please enter a valid Inspect Date (YYYY-MM-DD).';

      }

      if (!inspector) {

        errors['Inspector'] = 'Inspector name is mandatory.';

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Validation for HVAC & Chillers Control

    const isHvacPage = pathname === '/engineering/hvac-controls' || modalTitle.toLowerCase().includes('hvac') || modalTitle.toLowerCase().includes('chiller') || modalTitle.toLowerCase().includes('setpoint');

    if (isHvacPage) {

      const errors = {};

      const unit = String(modalValues['AHU / Chiller Unit'] || modalValues['unit'] || '').trim();

      const zone = String(modalValues['Zone Monitored'] || modalValues['zone'] || '').trim();

      const setTemp = String(modalValues['Set Temperature'] || modalValues['set_temp'] || '').trim();



      if (!unit) {

        errors['AHU / Chiller Unit'] = 'AHU / Chiller Unit is mandatory (e.g. Chiller #1 (Lead)).';

      }

      if (!zone) {

        errors['Zone Monitored'] = 'Zone Monitored is mandatory.';

      }

      if (!setTemp) {

        errors['Set Temperature'] = 'Set Temperature is mandatory (e.g. 22.0°C).';

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Validation for Food & Beverage Overview

    const isFbOverviewPage = pathname === '/food-beverage' || modalTitle.toLowerCase().includes('food & beverage') || modalTitle.toLowerCase().includes('order / bill');

    if (isFbOverviewPage) {

      const errors = {};

      const outlet = String(modalValues['Outlet / Department'] || '').trim();

      const covers = String(modalValues['Today Covers'] || '').trim();

      const rev = String(modalValues['Today Revenue (₹)'] || modalValues['Today Revenue'] || '').trim();



      if (!outlet || FORM_TITLE_BLACKLIST.includes(outlet.toLowerCase())) {

        errors['Outlet / Department'] = 'Outlet / Department is mandatory and cannot be a form title.';

      } else if (outlet === '1' || /^\d$/.test(outlet) || outlet.length < 2) {

        errors['Outlet / Department'] = 'Outlet / Department cannot be a single digit ("1"). Please select a valid outlet name.';

      }

      if (!covers) {

        errors['Today Covers'] = 'Today Covers is mandatory.';

      }

      if (!rev) {

        errors['Today Revenue (₹)'] = 'Today Revenue (₹) is mandatory.';

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Validation for Banquet & Event Catering (BEO)

    const isBanquetPage = pathname === '/food-beverage/banquets' || modalTitle.toLowerCase().includes('beo') || modalTitle.toLowerCase().includes('banquet');

    if (isBanquetPage) {

      const errors = {};

      const beo = String(modalValues['BEO #'] || '').trim();

      const title = String(modalValues['Event Title'] || '').trim();

      const venue = String(modalValues['Banquet Venue'] || '').trim();

      const pax = String(modalValues['Pax Count'] || '').trim();

      const meal = String(modalValues['Meal Format'] || '').trim();

      const coord = String(modalValues['BEO Coordinator'] || '').trim();



      if (['f', 'h'].includes(beo.toLowerCase()) || (beo && beo.length <= 2)) {

        errors['BEO #'] = 'BEO # cannot be a single character ("f", "h"). It must follow BEO-XXX format.';

      }

      if (!title || FORM_TITLE_BLACKLIST.includes(title.toLowerCase())) {

        errors['Event Title'] = 'Event Title is mandatory.';

      } else if (title.length < 2) {

        errors['Event Title'] = 'Event Title must be at least 2 characters.';

      }

      if (!venue) {

        errors['Banquet Venue'] = 'Banquet Venue is mandatory.';

      }

      if (!pax) {

        errors['Pax Count'] = 'Pax Count is mandatory.';

      }

      if (!meal) {

        errors['Meal Format'] = 'Meal Format is mandatory.';

      }

      if (!coord) {

        errors['BEO Coordinator'] = 'BEO Coordinator is mandatory.';

      }

      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    // Universal Form Validation across all Hotel Management subpages & forms

    {

      const errors = {};

      const modalTitleLower = (modalTitle || '').toLowerCase().trim();



      // Check 1: Title leakage & placeholder prevention across all entered fields

      for (const f of modalFields) {

        const val = String(modalValues[f] || '').trim().toLowerCase();

        if (val && (FORM_TITLE_BLACKLIST.includes(val) || val === modalTitleLower)) {

          errors[f] = `"${f}" cannot be a form title or placeholder ("${modalValues[f]}"). Please enter a valid value.`;

        }

      }



      // Check 2: Mandatory field validation

      // All essential fields (identifying IDs, names, categories, types, rooms, dates, amounts, etc.) are required

      for (let i = 0; i < modalFields.length; i++) {

        const f = modalFields[i];

        const fLower = f.toLowerCase();

        const val = String(modalValues[f] || '').trim();



        // Optional fields pattern

        const isOptional = /notes|remarks|comment|description|feedback|special[ _]?request|override|variance|defects|allowances|deductions|amc|serial|manufacturer|model|provider|custom/i.test(fLower);

        // Essential field pattern: Primary column (i === 0) or essential business keywords

        const isEssential = i === 0 || /^(name|full[ _]?name|guest|staff|employee|code|title|resource|asset|room|table|unit|category|type|frequency|date|phone|contact|email|amount|cost|price|salary|rate)\b/i.test(fLower);



        if (isEssential && !isOptional && !fLower.includes('auto') && !fLower.includes('status')) {

          if (!val) {

            errors[f] = `${f} is required and cannot be empty.`;

          } else if (i === 0 && val.length < 2) {

            errors[f] = `"${f}" must be at least 2 characters.`;

          }

        }



        // Email format check

        if (fLower.includes('email') && val) {

          if (!val.includes('@') || !val.includes('.')) {

            errors[f] = `Please enter a valid email address for "${f}".`;

          }

        }



        // Phone format check

        if ((fLower.includes('phone') || fLower.includes('contact')) && val && !fLower.includes('name')) {

          const digits = val.replace(/[^\d+]/g, '');

          if (digits.length < 8) {

            errors[f] = `Please enter a valid phone number (at least 8 digits) for "${f}".`;

          }

        }



        // Numeric checks

        if ((fLower.includes('amount') || fLower.includes('price') || fLower.includes('cost') || fLower.includes('rate') || fLower.includes('consumption')) && val) {

          const num = parseFloat(val.replace(/[^0-9.-]/g, ''));

          if (isNaN(num) || num < 0) {

            errors[f] = `"${f}" must be a valid non-negative number.`;

          }

        }

      }



      // Check for ID Proof Type & ID Number conditional validation

      const idTypeField = modalFields.find(f => /id[ _]?(proof)?[ _]?type/i.test(f));

      const idNumField = modalFields.find(f => /id[ _]?(proof)?[ _]?(num|number)/i.test(f));

      if (idTypeField && idNumField) {

        const selectedType = String(modalValues[idTypeField] || '').trim();

        const enteredNum = String(modalValues[idNumField] || '').trim();

        if (!enteredNum) {

          errors[idNumField] = 'ID Number is required.';

        } else if (selectedType.toLowerCase().includes('aadhaar')) {

          const cleanAadhaar = enteredNum.replace(/[\s-]/g, '');

          if (!/^\d{12}$/.test(cleanAadhaar)) {

            errors[idNumField] = 'Invalid Aadhaar Card number. Please enter a valid 12-digit Aadhaar number.';

          }

        }

      }



      if (Object.keys(errors).length > 0) {

        setModalErrors(errors);

        notify(Object.values(errors)[0]);

        return;

      }

      setModalErrors({});

    }



    setSavingModal(true);

    try {

      const finalValues = { ...modalValues };

      if (isFbOverviewPage) {

        const outlet = finalValues['Outlet / Department'] || 'The Saffron Royale (Fine Dining)';

        finalValues['Outlet / Department'] = outlet;

        const covStr = String(finalValues['Today Covers'] || '');

        const revStr = String(finalValues['Today Revenue (₹)'] || finalValues['Today Revenue'] || '');

        const cNum = parseFloat(covStr.replace(/[^0-9.]/g, '')) || 0;

        const rNum = parseFloat(revStr.replace(/[^0-9.]/g, '')) || 0;

        if ((!finalValues['Average Check (₹)'] || finalValues['Average Check (₹)'] === '—') && cNum > 0 && rNum > 0) {

          finalValues['Average Check (₹)'] = `₹${Math.round(rNum / cNum).toLocaleString('en-IN')}`;

        }

        if (!finalValues['Labor Cost %']) finalValues['Labor Cost %'] = '18.0%';

        if (!finalValues['Food Cost %']) finalValues['Food Cost %'] = '28.0%';

        if (!finalValues['Status']) finalValues['Status'] = 'Open';

      }



      if (isBanquetPage) {

        let beo = String(finalValues['BEO #'] || '').trim();

        if (!beo || ['f', 'h', 'auto'].includes(beo.toLowerCase()) || beo.length <= 2) {

          beo = generateNextBeoNumber();

        }

        finalValues['BEO #'] = beo;

        if (!finalValues['Status']) finalValues['Status'] = 'Kitchen Ready';

      }



      if (pathname === '/engineering/asset-registry' || modalTitle.toLowerCase().includes('asset')) {

        const tag = String(finalValues['Asset Tag'] || finalValues['Asset Tag #'] || '').trim();

        const name = String(finalValues['Asset Name'] || finalValues['Equipment Description'] || '').trim();

        const loc = String(finalValues['Asset / Location'] || finalValues['Location'] || '').trim();

        const warranty = String(finalValues['Warranty Details'] || finalValues['Warranty Status'] || '').trim();

        const mfg = String(finalValues['Manufacturer'] || '').trim();

        const model = String(finalValues['Model Number'] || '').trim();

        const mfgModel = finalValues['Manufacturer / Model'] || [mfg, model].filter(Boolean).join(' ') || mfg;



        finalValues['Asset Tag'] = tag;

        finalValues['Asset Tag #'] = tag;

        finalValues['Asset Name'] = name;

        finalValues['Equipment Description'] = name;

        finalValues['Asset / Location'] = loc;

        finalValues['Location'] = loc;

        finalValues['Warranty Details'] = warranty;

        finalValues['Warranty Status'] = warranty;

        finalValues['Manufacturer'] = mfg;

        finalValues['Model Number'] = model;

        finalValues['Manufacturer / Model'] = mfgModel;

      }

      if (pathname === '/bookings/group') {

        if (!finalValues['Status']) finalValues['Status'] = 'Confirmed';

      } else if (pathname === '/bookings/refund') {

        if (!finalValues['Status']) finalValues['Status'] = 'Pending';

      } else if (pathname.startsWith('/bookings')) {

        if (!finalValues['Status']) finalValues['Status'] = 'Confirmed';

      } else if (pathname === '/guest-services/concierge' || modalTitle.toLowerCase().includes('concierge')) {

        if (!finalValues['Status']) finalValues['Status'] = 'Confirmed';

        if (!editingRecord) {

          const existingRef = finalValues['Ref ID'] || finalValues['ref_id'];

          // Ensure Ref ID is auto-generated by the system and never uses Guest ID (GST-...)

          if (!existingRef || String(existingRef).trim() === '' || String(existingRef).startsWith('GST-')) {

            finalValues['Ref ID'] = generateConciergeRefId();

          }

        }

        // Save actual room relationship

        if (finalValues['Room']) {

          const roomStr = String(finalValues['Room']);

          const matched = rooms.find(r => 

            String(r.id) === String(finalValues['room_id']) ||

            `Room ${r.n}`.toLowerCase() === roomStr.toLowerCase() ||

            String(r.n) === roomStr.replace(/\D/g, '') ||

            String(r.number) === roomStr.replace(/\D/g, '')

          );

          if (matched) {

            finalValues['room_id'] = matched.id;

            finalValues['room_number'] = String(matched.n || matched.number);

          }

        }

      }



      if (pathname === '/bookings/group' && !editingRecord) {

        const groupName = finalValues['Group Name'] || 'Group Reservation';

        const contactRaw = finalValues['Contact Name'] || finalValues['Contact'] || 'Group Contact';

        const contactPhoneMatch = contactRaw.match(/(\+?\d[\d -]{8,15}\d)/);

        const contactEmailMatch = contactRaw.match(/([\w.-]+@[\w.-]+\.\w+)/);

        const contactPhone = finalValues['Contact Phone'] || finalValues['Phone'] || (contactPhoneMatch ? contactPhoneMatch[0] : null);

        const contactEmail = finalValues['Contact Email'] || finalValues['Email'] || (contactEmailMatch ? contactEmailMatch[0] : null);

        const contactName = contactRaw.replace(contactPhone || '', '').replace(contactEmail || '', '').replace(/[(),]/g, '').trim() || contactRaw;



        const numRooms = parseInt(String(finalValues['Rooms'] || '').replace(/\D/g, ''), 10) || 2;

        const checkIn = finalValues['Check-in'] || todayISO();

        const checkOut = finalValues['Check-out'] || addDaysISO(checkIn, 1);

        const status = finalValues['Status'] || 'Confirmed';

        const roomType = finalValues['Room Type'] || (rooms[0] ? rooms[0].type : 'Standard');

        const numGuests = parseInt(finalValues['Guests Count'] || finalValues['Number of Guests'] || finalValues['Guests'] || '', 10) || (numRooms * 2);



        if (createGroupBooking) {

          const res = await createGroupBooking({

            group_name: groupName.trim(),

            contact_name: contactName.trim(),

            contact_phone: contactPhone ? String(contactPhone).trim() : null,

            contact_email: contactEmail ? String(contactEmail).trim() : null,

            room_type: roomType,

            num_rooms: numRooms,

            num_guests: numGuests,

            check_in: checkIn,

            check_out: checkOut,

            status: status,

          });

          if (res) {

            await refresh();

            setModalOpen(false);

            setEditingRecord(null);

            setSavingModal(false);

            return;

          }

        }

      } else if (pathname === '/bookings/walk-in' && !editingRecord) {

        const guestName = finalValues['Guest Name'] || finalValues['Full Name'] || '';

        if (!guestName.trim()) { notify('Please enter guest name'); setSavingModal(false); return; }

        const roomType = finalValues['Room Type'] || (rooms[0] ? rooms[0].type : 'Standard');

        const nights = Number(finalValues['Duration (Nights)']) || 1;

        const inDate = finalValues['Check-in'] || todayISO();

        const outDate = finalValues['Check-out'] || addDaysISO(inDate, nights);

        const phone = finalValues['Phone Number'] || finalValues['Phone'] || finalValues['Contact'] || '';

        const idTypeValue = finalValues['ID Proof Type'] || 'Aadhaar Card';

        const idNumber = finalValues['ID Number'] || '';

        if (!idNumber || !idNumber.trim()) {

          notify('ID Number is required.');

          setSavingModal(false);

          return;

        }

        if (idTypeValue.toLowerCase().includes('aadhaar')) {

          const cleanAadhaar = idNumber.trim().replace(/[\s-]/g, '');

          if (!/^\d{12}$/.test(cleanAadhaar)) {

            notify('Invalid Aadhaar Card number. Please enter a valid 12-digit Aadhaar number.');

            setSavingModal(false);

            return;

          }

        }

        const numGuests = Number(finalValues['Number of Guests']) || 1;

        const specialRequests = finalValues['Special Requests'] || '';

        const notesStr = [

          idTypeValue ? `ID: ${idTypeValue}${idNumber ? ` (${idNumber})` : ''}` : '',

          specialRequests ? `Special Requests: ${specialRequests}` : ''

        ].filter(Boolean).join(' | ');



        const saved = await addBooking({

          guest: guestName.trim(),

          phone: phone.trim() || undefined,

          identification_number: idNumber.trim() || undefined,

          notes: notesStr || undefined,

          room: roomType,

          src: 'Walk-in',

          in: inDate,

          out: outDate,

          nights,

          num_guests: numGuests,

          status: 'Confirmed'

        });



        if (saved && addRecord) {

          await addRecord({

            category: 'bookings_walk-in',

            title: `Walk-in: ${guestName.trim()} (${roomType})`,

            data: {

              ...finalValues,

              'Guest Name': guestName.trim(),

              'Phone Number': phone.trim(),

              'Room Type': roomType,

              'ID Proof Type': idTypeValue,

              'ID Number': idNumber.trim(),

              'Number of Guests': numGuests,

              'Duration (Nights)': nights,

              'Check-in': inDate,

              'Check-out': outDate,

              'Special Requests': specialRequests,

              'Source': 'Walk-in',

              'Status': 'Confirmed',

            },

            status: 'Confirmed',

          });

        }

        await refresh();

        setModalOpen(false);

        setEditingRecord(null);

        setSavingModal(false);

        notify(`Walk-in guest "${guestName}" registered and saved to database!`);

        return;

      }



      if (editingRecord && editingRecord._isRefundBooking) {

        await addRecord({

          category: 'bookings_refund',

          title: finalValues['Request ID'] || `Refund: ${editingRecord.id}`,

          data: finalValues,

          status: finalValues['Status'] || 'Pending',

        });

        const updated = await getRecords(cat);

        setDbRecords(updated || []);

        notify('Refund request saved to database');

      } else if (editingRecord && editingRecord._isBooking) {

        await updateBooking(editingRecord.id, {

          room_id: finalValues['room_id'] || editingRecord.room_id,

          check_in: finalValues['Check-in'] || finalValues['check_in'] || editingRecord.check_in,

          check_out: finalValues['Check-out'] || finalValues['check_out'] || editingRecord.check_out,

          status: finalValues['Status'] || finalValues['st'] || editingRecord.st,

          total_amount: Number(finalValues['Amount'] || finalValues['Total Amount'] || finalValues['amt'] || editingRecord.amt),

        });

        await refresh();

        notify(`Booking ${editingRecord.id} updated`);

      } else if (editingRecord && editingRecord._isGuest) {

        const guestDbId = Number(editingRecord.id ?? editingRecord.guest_id);

        await updateGuest(!isNaN(guestDbId) && guestDbId > 0 ? guestDbId : editingRecord.id, {

          full_name: finalValues['Guest Name'] || finalValues['Full Name'] || editingRecord.full_name,

          phone: finalValues['Contact'] || finalValues['Phone'] || finalValues['Phone Number'] || editingRecord.phone,

          email: finalValues['Email'] || editingRecord.email,

          notes: finalValues['Notes'] || editingRecord.notes,

        });

        await refresh();

        notify(`Guest details updated`);

      } else if (editingRecord && editingRecord._isDbRecord) {

        const titleVal = finalValues[modalFields[0]] || editingRecord.title;

        const sReqId = editingRecord.data?.['Service Request ID'] || editingRecord.data?.request_id;

        if (sReqId && (cat === 'guest_services' || pathname === '/guest-services')) {

          await api(`/api/service-requests/${sReqId}`, {

            method: 'PUT',

            body: JSON.stringify({

              status: finalValues['Status'] || editingRecord.status || 'In Progress',

              assigned_to: finalValues['Assigned To'] || '',

              priority: finalValues['Priority'] || 'Normal',

              notes: finalValues['Notes'] || '',

              payment_status: finalValues['Payment Status'],

            })

          }).catch(() => null);

        }

        if (pathname === '/webhooks/api-key-management') {

          if (editingRecord.data?.['API Key']) finalValues['API Key'] = editingRecord.data['API Key'];

          if (editingRecord.data?.['full_key']) finalValues['full_key'] = editingRecord.data['full_key'];

          if (editingRecord.data?.['Created'] && !finalValues['Created']) finalValues['Created'] = editingRecord.data['Created'];

          if (editingRecord.data?.['Last Used'] && !finalValues['Last Used']) finalValues['Last Used'] = editingRecord.data['Last Used'];

        }

        await updateRecord(editingRecord.id, {

          category: cat,

          title: titleVal,

          data: finalValues,

          status: finalValues['Status'] || editingRecord.status || 'Active',

        });

        const updated = await getRecords(cat);

        setDbRecords(updated || []);

        notify('Record updated in database');

      } else if (editingRecord && editingRecord._isDefaultRow) {

        const titleVal = finalValues[modalFields[0]] || 'Entry';

        await addRecord({

          category: cat,

          title: titleVal,

          data: finalValues,

          status: finalValues['Status'] || 'Active',

        });

        // Remove the default template row from view

        setDeletedRows(prev => ({

          ...prev,

          [pathname]: [...(prev[pathname] || []), editingRecord._defaultIndex]

        }));

        const updated = await getRecords(cat);

        setDbRecords(updated || []);

        notify('Record updated and saved to database');

      } else if (pathname.startsWith('/offers')) {

        const name = finalValues['Offer Name'] || finalValues['Name'] || finalValues['Offer'] || finalValues['Title'] || modalTitle || 'Promotional Offer';

        let code = finalValues['Promo Code'] || finalValues['Code'] || finalValues['Offer Code'] || '';

        if (!code.trim()) {

          code = (name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'PROMO') + Math.floor(10 + Math.random() * 90);

        }

        const discTypeRaw = finalValues['Discount Type'] || '';

        const isFixed = discTypeRaw.toLowerCase().includes('fix') || discTypeRaw.includes('₹') || String(finalValues['Discount'] || '').includes('₹');

        const discType = isFixed ? 'fixed' : 'percent';

        let discVal = Number(finalValues['Discount Value'] || String(finalValues['Discount'] || '').replace(/[^0-9.]/g, '') || 10);

        if (isNaN(discVal) || discVal <= 0) {

          notify('Discount value must be greater than 0');

          setSavingModal(false);

          return;

        }

        if (!isFixed && discVal > 100) {

          notify('Percentage discount cannot exceed 100%');

          setSavingModal(false);

          return;

        }

        const start = finalValues['Valid From'] || finalValues['Starts on'] || new Date().toISOString().slice(0, 10);

        const end = finalValues['Valid Until'] || finalValues['Ends on'] || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

        const limit = finalValues['Max Usage Limit'] || finalValues['Usage Limit'] ? Number(finalValues['Max Usage Limit'] || finalValues['Usage Limit']) : null;



        await api('/api/offers', {

          method: 'POST',

          body: JSON.stringify({

            name: name.trim(),

            code: code.trim().toUpperCase(),

            discount_type: discType,

            discount_value: discVal,

            starts_on: start,

            ends_on: end,

            usage_limit: limit,

            active: true,

          }),

        });

        await refresh();

        notify(`Offer "${code.trim().toUpperCase()}" created and saved to database!`);

      } else if (pathname === '/guest-services' || modalTitle.toLowerCase().includes('service request')) {

        const sRes = await api('/api/service-requests', {

          method: 'POST',

          body: JSON.stringify({

            guest_name: finalValues['Guest Name'] || 'Resident Guest',

            room_number: finalValues['Room'] || 'General Area',

            service_type: finalValues['Service Type'] || 'General Service',

            assigned_to: finalValues['Assigned To'] || 'Guest Services Officer',

            priority: finalValues['Priority'] || 'Normal',

            status: finalValues['Status'] || 'Pending',

            notes: finalValues['Notes'] || '',

          })

        });

        notify(`Service Request ${sRes.request_id} created with auto-assigned ID!`);

        const updated = await getRecords(cat);

        setDbRecords(updated || []);

      } else if (pathname === '/webhooks/api-key-management') {

        const keyName = finalValues['Key Name'] || modalTitle || 'New API Key';

        const rawPrefix = finalValues['Key Prefix'] || 'sf_live';

        const prefix = rawPrefix.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10) || 'sf_live';

        

        // Cryptographically secure 24-byte hex random key (48 hex chars)

        const randomBytes = new Uint8Array(24);

        window.crypto.getRandomValues(randomBytes);

        const randomHex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

        const newFullKey = `${prefix}_${randomHex}`;



        finalValues['Key Name'] = keyName;

        finalValues['API Key'] = newFullKey;

        finalValues['full_key'] = newFullKey;

        finalValues['Key Prefix'] = prefix;

        if (!finalValues['Created']) finalValues['Created'] = new Date().toISOString().slice(0, 10);

        if (!finalValues['Last Used']) finalValues['Last Used'] = 'Never';

        if (!finalValues['Permissions']) finalValues['Permissions'] = 'bookings:read,bookings:write';

        if (!finalValues['Status']) finalValues['Status'] = 'Active';



        const res = await addRecord({

          category: cat,

          title: keyName,

          data: finalValues,

          status: finalValues['Status'] || 'Active',

        });



        if (res) {

          if (navigator.clipboard?.writeText) {

            await navigator.clipboard.writeText(newFullKey).catch(() => {});

          }

          notify(`✓ API key "${keyName}" created and copied to clipboard! (${newFullKey.slice(0, 4)}••••${newFullKey.slice(-4)})`);

          const updated = await getRecords(cat);

          setDbRecords(updated || []);

        }

      } else if (modalTitle.toLowerCase().includes('filter')) {

        notify('Filter applied');

      } else {

        if (finalValues['ID Type'] === 'Others' && finalValues['ID Type_custom']) {

          finalValues['ID Type'] = finalValues['ID Type_custom'];

        }

        if (finalValues['ID Proof Type'] === 'Others' && finalValues['ID Proof Type_custom']) {

          finalValues['ID Proof Type'] = finalValues['ID Proof Type_custom'];

        }

        if (finalValues['Charge Type'] === 'Others' && finalValues['Charge Type_custom']) {

          finalValues['Charge Type'] = finalValues['Charge Type_custom'];

        }

        if (pathname === '/staff/directory' || pathname === '/staff/admin-users') {

          if (finalValues['Email'] && (finalValues['Create New Password'] || finalValues['Password'])) {

            try {

              const roleInput = (finalValues['Role'] || '').toLowerCase().trim();

              const deptInput = (finalValues['Department'] || '').toLowerCase().trim();

              const combined = `${roleInput} ${deptInput}`;

              let roleCode = 'FRONT_DESK';

              if (combined.includes('super admin')) roleCode = 'SUPER_ADMIN';

              else if (combined.includes('admin') && !combined.includes('night audit')) roleCode = 'ADMIN';

              else if (combined.includes('housekeep') || combined.includes('clean') || combined.includes('room attendant') || combined.includes('laundry')) roleCode = 'HOUSEKEEPING';

              else if (combined.includes('finance') || combined.includes('account') || combined.includes('cashier') || combined.includes('billing')) roleCode = 'FINANCE';

              else if (combined.includes('hr') || combined.includes('human resource') || combined.includes('personnel')) roleCode = 'HUMAN_RESOURCES';

              else if (combined.includes('food') || combined.includes('beverage') || combined.includes('f&b') || combined.includes('fb') || combined.includes('kitchen') || combined.includes('chef') || combined.includes('restaurant') || combined.includes('bar') || combined.includes('server') || combined.includes('waiter')) roleCode = 'FOOD_BEVERAGE';

              else if (combined.includes('sales') || combined.includes('marketing')) roleCode = 'SALES_MARKETING';

              else if (combined.includes('engineering') || combined.includes('maintenance') || combined.includes('technician') || combined.includes('tech')) roleCode = 'ENGINEERING';

              else if (combined.includes('procurement') || combined.includes('purchas') || combined.includes('store') || combined.includes('inventory')) roleCode = 'PROCUREMENT';

              else if (combined.includes('security') || combined.includes('guard') || combined.includes('safety')) roleCode = 'SECURITY';

              else if (combined.includes('guest service') || combined.includes('concierge') || combined.includes('bell') || combined.includes('valet')) roleCode = 'GUEST_SERVICES';

              else if (combined.includes('revenue')) roleCode = 'REVENUE_MANAGER';

              else if (combined.includes('reservation')) roleCode = 'RESERVATION_MANAGER';

              else if (combined.includes('front desk') || combined.includes('reception') || combined.includes('front office') || combined.includes('night audit') || combined.includes('front')) roleCode = 'FRONT_DESK';

              else if (combined.includes('general manager') || combined.includes('hotel manager') || combined.includes('gm') || combined.includes('management') || combined.includes('manager')) roleCode = 'GENERAL_MANAGER';

              else roleCode = 'FRONT_DESK';



              await api('/api/admin/users', {

                method: 'POST',

                body: JSON.stringify({

                  email: finalValues['Email'].trim(),

                  full_name: (finalValues['Name'] || 'Staff Member').trim(),

                  password: finalValues['Create New Password'] || finalValues['Password'],

                  role: roleCode,

                }),

              });

            } catch (_) {

              // Best-effort user sync; operational DB record is safely preserved below

            }

          }

        }

        let titleVal = finalValues['Outlet / Department'] || finalValues['BEO #'] || finalValues['Asset Tag'] || finalValues['Asset Tag #'] || finalValues['Compliance Item'] || finalValues['Audit Log ID'] || finalValues['Employee Code'] || finalValues['Emp Code'] || finalValues[modalFields[0]];

        if (!titleVal || FORM_TITLE_BLACKLIST.includes(String(titleVal).toLowerCase().trim())) {

          titleVal = finalValues['Full Name'] || finalValues['Name'] || finalValues['WO #'] || `REC-${Math.floor(1000 + Math.random() * 9000)}`;

        }

        const res = await addRecord({

          category: cat,

          title: titleVal,

          data: finalValues,

          status: finalValues['Status'] || 'Active',

        });

        if (res) {

          const updated = await getRecords(cat);

          setDbRecords(updated || []);

        }

      }

      setModalOpen(false);

      setEditingRecord(null);

      setModalValues({});

      setModalErrors({});

      setShowPassword({});

    } catch (err) {

      notify(err.message || 'Failed to save record');

    } finally {

      setSavingModal(false);

    }

  };



  /* Edit booking modal */

  const handleEditBooking = (b) => {

    setModalTitle(`Edit Reservation: ${b.id}`);

    setModalFields(['Guest Name', 'Room', 'Check-in', 'Check-out', 'Amount', 'Status']);

    setModalValues({

      'Guest Name': b.guest,

      'Room': b.room,

      'Check-in': b.check_in || b.in,

      'Check-out': b.check_out || b.out,

      'Amount': b.amt,

      'Status': b.st,

    });

    setEditingRecord({ ...b, _isBooking: true });

    setModalOpen(true);

  };



  /* Edit guest modal */

  const handleEditGuest = (g) => {

    const guestDbId = Number(g.id ?? g.guest_id);

    setGuestModalData({ ...g, id: (!isNaN(guestDbId) && guestDbId > 0) ? guestDbId : g.id });

  };



  /* Edit DB record */

  const handleEditDbRecord = (rec) => {

    setModalTitle(`Edit: ${rec.title}`);

    let fields = config.columns ? config.columns.filter(c => !['Action', '', 'Actions'].includes(c)) : Object.keys(rec.data || {});

    if (pathname === '/guest-services/amenities-requests') {

      fields = ['Guest Name', 'Room', 'Requested Items', 'Status'];

    } else if (pathname === '/engineering/safety-compliance') {

      fields = ['Compliance Item', 'Statutory Authority', 'Inspection Date', 'Certificate Valid Until', 'Safety Officer', 'Audit Status'];

    } else if (pathname === '/security/keycard-audits') {

      fields = ['Audit Log ID', 'Room / Door ID', 'Keycard Type', 'Holder / User ID', 'Timestamp', 'Lock Result', 'Audit Flag'];

    } else if (pathname === '/human-resources/employee-directory') {

      fields = ['Emp Code', 'Full Name', 'Department', 'Designation', 'Joining Date', 'Phone', 'Employment Status'];

    } else if (pathname === '/human-resources') {

      fields = ['Employee Code', 'Full Name', 'Department', 'Designation', 'Joining Date', 'Phone', 'Email', 'Employment Status'];

    } else if (pathname === '/engineering/work-orders') {

      fields = ['WO #', 'Location', 'Issue Description', 'Reported By', 'Assigned Tech', 'Priority', 'Status'];

    } else if (pathname === '/engineering/energy-utility') {

      fields = ['Utility Resource', 'Daily Consumption', 'Target Benchmark', 'Unit Cost (₹)', 'Power Factor / Quality', 'Variance vs Budget'];

    } else if (pathname === '/engineering/room-inspections') {

      fields = ['Inspection ID', 'Room #', 'Inspect Date', 'Inspector', 'Tested Systems', 'Defects Found', 'Handover Sign-off'];

    } else if (pathname === '/engineering/hvac-controls') {

      fields = ['AHU / Chiller Unit', 'Zone Monitored', 'Set Temperature', 'Actual Temp', 'Chilled Water In/Out', 'VFD Fan Speed', 'Status'];

    } else if (pathname === '/engineering/asset-registry') {

      fields = [

        'Asset Tag',

        'Asset Name',

        'Asset Category',

        'Asset Type',

        'Asset / Location',

        'Manufacturer',

        'Model Number',

        'Serial Number',

        'Purchase Date',

        'Warranty Details',

        'AMC Provider',

        'Status'

      ];

    }

    setModalFields(fields.length ? fields : ['Title', 'Status', 'Notes']);

    const vals = { ...(rec.data || {}) };

    const PREDEFINED_ID_TYPES = ['Aadhaar Card', 'Driving Licence', 'Passport', 'Voter ID'];

    Object.keys(vals).forEach(k => {

      if (k.toLowerCase() === 'id type' || k.toLowerCase() === 'id proof type') {

        const currentType = vals[k];

        if (currentType && !PREDEFINED_ID_TYPES.includes(currentType)) {

          vals[`${k}_custom`] = currentType;

          vals['Specify ID Type'] = currentType;

          vals[k] = 'Others';

        }

      }

    });

    const d = rec.data || {};

    // Ensure every form field is initialized independently from the record data, never inheriting other fields

    fields.forEach((f) => {

      if (vals[f] === undefined) {

        vals[f] = d[f] ?? '';

      }

    });



    if (pathname === '/engineering/safety-compliance') {

      vals['Compliance Item'] = d['Compliance Item'] || '';

      vals['Statutory Authority'] = d['Statutory Authority'] || '';

      vals['Inspection Date'] = d['Inspection Date'] || '';

      vals['Certificate Valid Until'] = d['Certificate Valid Until'] || '';

      vals['Safety Officer'] = d['Safety Officer'] || '';

      vals['Audit Status'] = d['Audit Status'] || rec.status || 'Fully Compliant';

    } else if (pathname === '/security/keycard-audits') {

      vals['Audit Log ID'] = d['Audit Log ID'] || '';

      vals['Room / Door ID'] = d['Room / Door ID'] || '';

      vals['Keycard Type'] = d['Keycard Type'] || 'Guest Keycard';

      vals['Holder / User ID'] = d['Holder / User ID'] || '';

      vals['Timestamp'] = d['Timestamp'] || '';

      vals['Lock Result'] = d['Lock Result'] || rec.status || 'Access Granted';

      vals['Audit Flag'] = d['Audit Flag'] || 'Normal Entry';

    } else if (pathname === '/human-resources/employee-directory') {

      vals['Emp Code'] = d['Emp Code'] || d['Employee Code'] || '';

      vals['Full Name'] = d['Full Name'] || d['Name'] || '';

      vals['Department'] = d['Department'] || '';

      vals['Designation'] = d['Designation'] || d['Role'] || '';

      vals['Joining Date'] = d['Joining Date'] || '';

      vals['Phone'] = d['Phone'] || d['Phone Number'] || '';

      vals['Employment Status'] = d['Employment Status'] || rec.status || 'Active';

    } else if (pathname === '/human-resources') {

      vals['Employee Code'] = d['Employee Code'] || d['Emp Code'] || '';

      vals['Full Name'] = d['Full Name'] || d['Name'] || '';

      vals['Department'] = d['Department'] || '';

      vals['Designation'] = d['Designation'] || d['Role'] || '';

      vals['Joining Date'] = d['Joining Date'] || '';

      vals['Phone'] = d['Phone'] || d['Phone Number'] || '';

      vals['Email'] = d['Email'] || '';

      vals['Employment Status'] = d['Employment Status'] || rec.status || 'Active';

    } else if (pathname === '/engineering/work-orders') {

      vals['WO #'] = d['WO #'] || d['wo_number'] || '';

      vals['Location'] = d['Location'] || d['location'] || '';

      vals['Issue Description'] = d['Issue Description'] || d['issue_description'] || '';

      vals['Reported By'] = d['Reported By'] || d['reported_by'] || '';

      vals['Assigned Tech'] = d['Assigned Tech'] || d['assigned_tech'] || '';

      vals['Priority'] = d['Priority'] || d['priority'] || 'Normal';

      vals['Status'] = d['Status'] || d['status'] || rec.status || 'In Progress';

    } else if (pathname === '/engineering/energy-utility') {

      vals['Utility Resource'] = d['Utility Resource'] || '';

      vals['Daily Consumption'] = d['Daily Consumption'] || '';

      vals['Target Benchmark'] = d['Target Benchmark'] || '';

      vals['Unit Cost (₹)'] = d['Unit Cost (₹)'] || '';

      vals['Power Factor / Quality'] = d['Power Factor / Quality'] || '';

      vals['Variance vs Budget'] = d['Variance vs Budget'] || '';

    } else if (pathname === '/engineering/room-inspections') {

      vals['Inspection ID'] = d['Inspection ID'] || '';

      vals['Room #'] = d['Room #'] || '';

      vals['Inspect Date'] = d['Inspect Date'] || '';

      vals['Inspector'] = d['Inspector'] || '';

      vals['Tested Systems'] = d['Tested Systems'] || '';

      vals['Defects Found'] = d['Defects Found'] || '';

      vals['Handover Sign-off'] = d['Handover Sign-off'] || rec.status || 'Approved for Guest';

    } else if (pathname === '/engineering/hvac-controls') {

      vals['AHU / Chiller Unit'] = d['AHU / Chiller Unit'] || '';

      vals['Zone Monitored'] = d['Zone Monitored'] || '';

      vals['Set Temperature'] = d['Set Temperature'] || '';

      vals['Actual Temp'] = d['Actual Temp'] || '';

      vals['Chilled Water In/Out'] = d['Chilled Water In/Out'] || '';

      vals['VFD Fan Speed'] = d['VFD Fan Speed'] || '';

      vals['Status'] = d['Status'] || rec.status || 'Running Optimal';

    } else if (pathname === '/engineering/asset-registry') {

      vals['Asset Tag'] = d['Asset Tag'] || d['Asset Tag #'] || '';

      vals['Asset Name'] = d['Asset Name'] || d['Equipment Description'] || '';

      vals['Asset Category'] = d['Asset Category'] || d['Category'] || '';

      vals['Asset Type'] = d['Asset Type'] || d['Type'] || '';

      vals['Asset / Location'] = d['Asset / Location'] || d['Location'] || '';

      vals['Manufacturer'] = d['Manufacturer'] || (d['Manufacturer / Model'] ? String(d['Manufacturer / Model']).split(' ')[0] : '');

      vals['Model Number'] = d['Model Number'] || (d['Manufacturer / Model'] ? String(d['Manufacturer / Model']).split(' ').slice(1).join(' ') : '');

      vals['Serial Number'] = d['Serial Number'] || d['Serial #'] || '';

      vals['Purchase Date'] = d['Purchase Date'] || '';

      vals['Warranty Details'] = d['Warranty Details'] || d['Warranty Status'] || '';

      vals['AMC Provider'] = d['AMC Provider'] || '';

      vals['Status'] = d['Status'] || rec.status || 'Under Active AMC';

    } else if (pathname === '/staff/directory' || pathname === '/staff/admin-users') {

      vals['Name'] = d['Name'] || d['Full Name'] || '';

      vals['Role'] = d['Role'] || '';

      vals['Department'] = d['Department'] || '';

      vals['Phone'] = d['Phone'] || d['Phone Number'] || '';

      vals['Email'] = d['Email'] || '';

      vals['Status'] = d['Status'] || rec.status || 'Active';

    }

    if (!vals['Status'] && rec.status) vals['Status'] = rec.status;

    if (pathname === '/bookings/group' && !vals['Status']) vals['Status'] = 'Confirmed';

    if (pathname === '/bookings/refund' && !vals['Status']) vals['Status'] = 'Pending';

    if (pathname === '/guest-services/amenities-requests' && !vals['Status']) vals['Status'] = rec.status || 'Pending';

    setModalValues(vals);

    setModalErrors({});

    setEditingRecord({ ...rec, _isDbRecord: true });

    setModalOpen(true);

  };



  /* Delete DB record */

  const handleDeleteDbRecord = (recId) => {

    setDeleteConfirm({

      open: true,

      title: 'Confirm Deletion',

      message: 'Are you sure you want to delete this record from the database? This action cannot be undone.',

      onConfirm: async () => {

        await deleteRecord(recId);

        const updated = await getRecords(cat);

        setDbRecords(updated || []);

      }

    });

  };



  /* Edit default row */

  const handleEditDefaultRow = (row, idx) => {

    const fields = (config.columns || []).filter(c => !['Action', '', 'Actions'].includes(c));

    const vals = {};

    fields.forEach((f, i) => {

      vals[f] = typeof row[i] === 'string' ? row[i] : (row[i]?.props?.children || '');

    });

    const PREDEFINED_ID_TYPES_DEF = ['Aadhaar Card', 'Driving Licence', 'Passport', 'Voter ID'];

    Object.keys(vals).forEach(k => {

      if (k.toLowerCase() === 'id type' || k.toLowerCase() === 'id proof type') {

        const currentType = vals[k];

        if (currentType && !PREDEFINED_ID_TYPES_DEF.includes(currentType)) {

          vals[`${k}_custom`] = currentType;

          vals['Specify ID Type'] = currentType;

          vals[k] = 'Others';

        }

      }

    });

    if (pathname === '/bookings/group' && !vals['Status']) vals['Status'] = 'Confirmed';

    if (pathname === '/bookings/refund' && !vals['Status']) vals['Status'] = 'Pending';

    setModalTitle(`Edit Entry`);

    setModalFields(fields);

    setModalValues(vals);

    setModalErrors({});

    setEditingRecord({ _isDefaultRow: true, _defaultIndex: idx });

    setModalOpen(true);

  };



  /* Auto-generate sequential BEO number (e.g. BEO-513) */

  const generateNextBeoNumber = () => {

    let maxNum = 512;

    (config.rows || []).forEach(row => {

      const match = String(row[0] || '').match(/BEO-(\d+)/i);

      if (match) {

        const n = parseInt(match[1], 10);

        if (n > maxNum) maxNum = n;

      }

    });

    dbRecords.forEach(rec => {

      const str = `${rec.title || ''} ${rec.data?.['BEO #'] || ''}`;

      const match = str.match(/BEO-(\d+)/i);

      if (match) {

        const n = parseInt(match[1], 10);

        if (n > maxNum) maxNum = n;

      }

    });

    return `BEO-${maxNum + 1}`;

  };



  /* Delete default row */

  const handleDeleteDefaultRow = (idx) => {

    setDeleteConfirm({

      open: true,

      title: 'Confirm Deletion',

      message: 'Are you sure you want to delete this record? This action cannot be undone.',

      onConfirm: () => {

        setDeletedRows(prev => ({

          ...prev,

          [pathname]: [...(prev[pathname] || []), idx]

        }));

        notify('Record removed from display');

      }

    });

  };



  /* API Key Management Helpers */

  const handleCopyApiKey = async (fullKey, keyName) => {

    if (!fullKey) {

      notify('API key is unavailable');

      return;

    }

    try {

      if (navigator.clipboard && navigator.clipboard.writeText) {

        await navigator.clipboard.writeText(fullKey);

      } else {

        const ta = document.createElement('textarea');

        ta.value = fullKey;

        ta.style.position = 'fixed';

        ta.style.opacity = '0';

        document.body.appendChild(ta);

        ta.select();

        document.execCommand('copy');

        document.body.removeChild(ta);

      }

      notify(`✓ Full API key for "${keyName || 'integration'}" copied to clipboard!`);

    } catch (err) {

      notify('Failed to copy API key: ' + err.message);

    }

  };



  const handleRegenerateKey = async (rec) => {

    try {

      const rawPrefix = rec.data?.['Key Prefix'] || rec.title || 'sf_live';

      const prefix = rawPrefix.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 10) || 'sf_live';

      

      // Cryptographically secure 24-byte hex random key (48 hex chars)

      const randomBytes = new Uint8Array(24);

      window.crypto.getRandomValues(randomBytes);

      const randomHex = Array.from(randomBytes).map((b) => b.toString(16).padStart(2, '0')).join('');

      const newFullKey = `${prefix}_${randomHex}`;



      const updatedData = {

        ...(rec.data || {}),

        'API Key': newFullKey,

        'full_key': newFullKey,

        'Key Prefix': prefix,

        'Last Used': 'Never',

        'Created': new Date().toISOString().slice(0, 10),

        'Status': 'Active'

      };



      const res = await updateRecord(rec.id, {

        ...rec,

        data: updatedData,

        status: 'Active'

      });



      if (res) {

        if (navigator.clipboard && navigator.clipboard.writeText) {

          await navigator.clipboard.writeText(newFullKey).catch(() => {});

        }

        notify(`✓ Secure API key regenerated for "${rec.title}" and copied to clipboard! (${newFullKey.slice(0, 4)}••••${newFullKey.slice(-4)})`);

        const updated = await getRecords(cat);

        setDbRecords(updated || []);

      }

    } catch (err) {

      notify('Failed to regenerate API key: ' + err.message);

    }

  };



  const handleRevokeKey = (rec) => {

    setDeleteConfirm({

      open: true,

      title: 'Revoke API Key',

      message: `Are you sure you want to revoke API key "${rec.title}"? Applications using this key will immediately lose access.`,

      onConfirm: async () => {

        await updateRecord(rec.id, {

          ...rec,

          status: 'Revoked',

          data: { ...(rec.data || {}), 'Status': 'Revoked' }

        });

        const updated = await getRecords(cat);

        setDbRecords(updated || []);

        notify(`API key "${rec.title}" has been revoked.`);

      }

    });

  };



  /* Auto-assign rooms */

  const handleAutoAssign = async () => {

    const unassigned = bookings.filter(b => ['Confirmed', 'Checked-in'].includes(b.st) && !b.room_number);

    let assignedCount = 0;

    const availableRooms = rooms.filter(r => r.s === 'vac');

    for (const b of unassigned) {

      const match = availableRooms.find(r => r.type === b.room && !r._used);

      if (match) {

        match._used = true;

        await updateBooking(b.id, { room_id: match.id });

        await api(`/api/rooms/${match.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'occ' }) });

        assignedCount++;

      }

    }

    await refresh();

    notify(`Auto-assigned rooms to ${assignedCount} reservation(s)`);

  };



  /* Room Assignment modal open */

  const openAssignModal = (booking) => {

    setAssigningBooking(booking);

    const available = rooms.filter(r => r.s === 'vac');

    setSelectedRoomId(available.length > 0 ? String(available[0].id) : (rooms[0] ? String(rooms[0].id) : ''));

    setAssignModalOpen(true);

  };



  const handleConfirmAssignment = async (e) => {

    if (e && e.preventDefault) e.preventDefault();

    if (!assigningBooking || !selectedRoomId) return;

    try {

      const roomObj = rooms.find(r => String(r.id) === String(selectedRoomId));

      await updateBooking(assigningBooking.id, { room_id: Number(selectedRoomId) });

      if (roomObj) {

        await api(`/api/rooms/${roomObj.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'occ' }) });

      }

      await refresh();

      notify(`Assigned Room ${roomObj ? roomObj.n : selectedRoomId} to ${assigningBooking.guest}`);

      setAssignModalOpen(false);

      setAssigningBooking(null);

    } catch (err) {

      notify(err.message || 'Failed to assign room');

    }

  };



  /* Header button click handler */

  const handleButtonClick = (btn) => {

    if (!isButtonAuthorized(btn)) {

      notify(`Action "${btn}" is not permitted for your current role (${activeRoleObj?.name || effectiveRole})`);

      return;

    }

    const btnLower = btn.toLowerCase();

    if (btn === 'Filter by Date' || btnLower === 'filter by date' || btnLower.includes('filter by date')) {

      openDateFilterModal();

      return;

    }

    if (btnLower.includes('export') || btnLower.includes('download')) {

      exportDataAsCSV();

      return;

    }

    if (btnLower.includes('print')) {

      window.print();

      return;

    }

    if (btn === 'New Booking') {

      openBookingModal();

      return;

    }

    if ((pathname === '/guests/directory' || pathname.startsWith('/guests')) && (btn === 'Add Guest' || btnLower.includes('add guest'))) {

      setGuestModalData({ full_name: '', phone: '', email: '', identification_number: '', tier: 'Silver', notes: '' });

      return;

    }

    if (btnLower.includes('refresh')) {

      refresh();

      if (getRecords) getRecords(cat).then(setDbRecords);

      notify('Refreshed data from database');

      return;

    }

    if (btn === 'Auto-Assign Rooms') {

      handleAutoAssign();

      return;

    }

    if (btn === 'Edit Reservation') {

      if (bookings.length > 0) {

        handleEditBooking(bookings[0]);

      } else {

        notify('No reservation available to edit');

      }

      return;

    }

    if (btnLower.includes('send to guest')) {

      notify('Confirmation sent to guest email and phone');

      return;

    }

    if (btn === 'Filter by Date' || btnLower === 'filter by date') {

      openDateFilterModal();

      return;

    }



    if (pathname === '/webhooks/api-key-management' && (btn === 'Revoke Key' || btnLower.includes('revoke'))) {

      const activeKeys = dbRecords.filter(r => r.status !== 'Revoked' && r.data?.['Status'] !== 'Revoked');

      if (activeKeys.length > 0) {

        handleRevokeKey(activeKeys[0]);

      } else {

        notify('No active API keys found to revoke.');

      }

      return;

    }



    if (pathname === '/webhooks/retry-queue' && (btn === 'Retry All' || btnLower.includes('retry all'))) {

      const tid = activeTenantId || user?.tenant_id || tenant?.id;

      const qUrl = tid ? `/api/webhooks/retry-queue/process?hotel_id=${encodeURIComponent(tid)}` : '/api/webhooks/retry-queue/process';

      api(qUrl, { method: 'POST' }).then((res) => {

        notify(`✓ ${res.message || 'Processed pending retry queue'}`);

        api(getWebhookLogsUrl(50)).then((logs) => {

          if (Array.isArray(logs)) setWebhookLogs(logs);

        });

      }).catch((err) => notify(`Notice: ${err.message}`));

      return;

    }



    if (pathname === '/webhooks/retry-queue' && (btn === 'Clear Queue' || btnLower.includes('clear'))) {

      const tid = activeTenantId || user?.tenant_id || tenant?.id;

      const cUrl = tid ? `/api/webhooks/retry-queue/clear?hotel_id=${encodeURIComponent(tid)}` : '/api/webhooks/retry-queue/clear';

      api(cUrl, { method: 'POST' }).then((res) => {

        notify(`✓ ${res.message || 'Cleared retry queue'}`);

        api(getWebhookLogsUrl(50)).then((logs) => {

          if (Array.isArray(logs)) setWebhookLogs(logs);

        });

      }).catch((err) => notify(`Notice: ${err.message}`));

      return;

    }



    if (pathname === '/webhooks/outgoing-logs' && (btn === 'Resend Event' || btnLower.includes('resend'))) {

      const failedOutgoing = webhookLogs.find((l) => l.direction === 'outgoing' && l.status !== 'Success');

      if (failedOutgoing) {

        api(`/api/webhooks/logs/${failedOutgoing.id}/retry`, { method: 'POST' }).then((res) => {

          notify(`✓ Resent event #${failedOutgoing.id}: ${res.delivery?.status}`);

          api(getWebhookLogsUrl(50)).then((logs) => {

            if (Array.isArray(logs)) setWebhookLogs(logs);

          });

        }).catch((err) => notify(`Notice: ${err.message}`));

      } else {

        notify('No failed outgoing deliveries to resend.');

      }

      return;

    }



    // Dedicated handlers for Identification and Payroll

    if (pathname === '/guests/identification' || btn === 'New Entry' || btn === 'Upload New ID') {

      const idFields = ['Guest', 'ID Type', 'ID Number', 'Upload Date', 'Verified'];

      setModalTitle(btn === 'New Entry' ? 'New Identification Record' : btn);

      setModalFields(idFields);

      setModalValues({

        'Guest': '',

        'ID Type': 'Aadhaar Card',

        'ID Number': '',

        'Upload Date': todayISO(),

        'Verified': 'Yes',

      });

      setEditingRecord(null);

      setModalOpen(true);

      return;

    }



    if (pathname === '/human-resources/payroll' && (btn === 'Generate Payslip' || btn === 'Generate Payslips' || btn.toLowerCase().includes('payslip'))) {

      const payslipFields = [

        'Employee Name',

        'Employee ID',

        'Department',

        'Month',

        'Basic Salary (₹)',

        'Allowances (₹)',

        'Deductions (₹)',

        'Net Salary (₹)',

        'Payment Method',

        'Payment Status',

      ];

      setModalTitle('Generate Payslip');

      setModalFields(payslipFields);

      setModalValues({

        'Employee Name': '',

        'Employee ID': '',

        'Department': 'Front Desk',

        'Month': new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }),

        'Basic Salary (₹)': '',

        'Allowances (₹)': '0',

        'Deductions (₹)': '0',

        'Net Salary (₹)': '0',

        'Payment Method': 'Direct Bank Transfer',

        'Payment Status': 'Processed',

      });

      setEditingRecord(null);

      setModalOpen(true);

      return;

    }



    // Modal creation button

    let fields = [];

    if (pathname === '/bookings/group') {

      fields = ['Group Name', 'Rooms', 'Room Type', 'Check-in', 'Check-out', 'Contact Name', 'Contact Phone', 'Guests Count', 'Status'];

    } else if (pathname === '/bookings/walk-in') {

      fields = ['Guest Name', 'Phone Number', 'ID Proof Type', 'ID Number', 'Room Type', 'Number of Guests', 'Duration (Nights)', 'Special Requests'];

    } else if (pathname === '/guest-services/amenities-requests' || btn === 'New Amenity Request') {

      fields = ['Guest Name', 'Room', 'Requested Items', 'Status'];

    } else if (pathname === '/guest-services' || btn.toLowerCase().includes('service request')) {

      fields = ['Guest Name', 'Room', 'Service Type', 'Assigned To', 'Priority', 'Status'];

    } else if (pathname === '/webhooks/api-key-management') {

      fields = ['Key Name', 'Key Prefix', 'Permissions', 'Status'];

    } else if (pathname === '/staff/directory' || btn === 'Add Staff Member') {

      fields = ['Name', 'Role', 'Department', 'Phone', 'Email', 'Status', 'Create New Password', 'Confirm Password'];

    } else if (pathname === '/staff/admin-users' || btn === 'Add Admin User') {

      fields = ['Name', 'Role', 'Email', 'Phone', 'Create New Password', 'Confirm Password', 'Status'];

    } else if (pathname === '/engineering/safety-compliance' || btn === 'Log Fire Drill' || btn === 'Upload Compliance Cert' || btn.toLowerCase().includes('compliance')) {

      fields = ['Compliance Item', 'Statutory Authority', 'Inspection Date', 'Certificate Valid Until', 'Safety Officer', 'Audit Status'];

    } else if (pathname === '/security/keycard-audits' || btn === 'Interrogate Door Lock' || btn.toLowerCase().includes('door lock') || btn.toLowerCase().includes('keycard')) {

      fields = ['Audit Log ID', 'Room / Door ID', 'Keycard Type', 'Holder / User ID', 'Timestamp', 'Lock Result', 'Audit Flag'];

    } else if (pathname === '/human-resources/employee-directory' || btn === 'Register New Staff' || btn.toLowerCase().includes('register new staff')) {

      fields = ['Emp Code', 'Full Name', 'Department', 'Designation', 'Joining Date', 'Phone', 'Employment Status'];

    } else if (pathname === '/human-resources' || btn === 'Add Employee' || btn.toLowerCase().includes('add employee')) {

      fields = ['Employee Code', 'Full Name', 'Department', 'Designation', 'Joining Date', 'Phone', 'Email', 'Employment Status'];

    } else if (pathname === '/food-beverage' || btn === 'New Order / Bill' || btn.toLowerCase().includes('order / bill')) {

      fields = ['Outlet / Department', 'Today Covers', 'Today Revenue (₹)', 'Average Check (₹)', 'Labor Cost %', 'Food Cost %', 'Status'];

    } else if (pathname === '/food-beverage/banquets' || btn === 'Create New BEO' || btn.toLowerCase().includes('beo')) {

      fields = ['BEO #', 'Event Title', 'Banquet Venue', 'Pax Count', 'Meal Format', 'BEO Coordinator', 'Status'];

    } else if (pathname === '/engineering/work-orders' || btn === 'Log Work Order' || btn.toLowerCase().includes('work order')) {

      fields = ['WO #', 'Location', 'Issue Description', 'Reported By', 'Assigned Tech', 'Priority', 'Status'];

    } else if (pathname === '/engineering/energy-utility' || btn === 'Record Meter Reading' || btn.toLowerCase().includes('meter reading')) {

      fields = ['Utility Resource', 'Daily Consumption', 'Target Benchmark', 'Unit Cost (₹)', 'Power Factor / Quality', 'Variance vs Budget'];

    } else if (pathname === '/engineering/room-inspections' || btn === 'Log Room Inspection' || btn.toLowerCase().includes('room inspection')) {

      fields = ['Inspection ID', 'Room #', 'Inspect Date', 'Inspector', 'Tested Systems', 'Defects Found', 'Handover Sign-off'];

    } else if (pathname === '/engineering/hvac-controls' || btn === 'Adjust Setpoints' || btn.toLowerCase().includes('setpoint')) {

      fields = ['AHU / Chiller Unit', 'Zone Monitored', 'Set Temperature', 'Actual Temp', 'Chilled Water In/Out', 'VFD Fan Speed', 'Status'];

    } else if (pathname === '/engineering/asset-registry' || btn === 'Register New Asset' || btn.toLowerCase().includes('asset')) {

      fields = [

        'Asset Tag',

        'Asset Name',

        'Asset Category',

        'Asset Type',

        'Asset / Location',

        'Manufacturer',

        'Model Number',

        'Serial Number',

        'Purchase Date',

        'Warranty Details',

        'AMC Provider',

        'Status'

      ];

    } else if (config.type === 'form' && config.formFields) {

      fields = config.formFields;

    } else if (config.columns) {

      fields = config.columns.filter(c => !['Action', '', 'Actions'].includes(c));

    } else {

      fields = ['Title', 'Description', 'Category', 'Notes'];

    }

    const activeFields = fields.length ? fields : ['Title', 'Status', 'Notes'];

    setModalTitle(btn);

    setModalFields(activeFields);

    const initVals = {};

    activeFields.forEach((f) => {

      if (f.toLowerCase() === 'status') {

        initVals[f] = 'Active';

      } else if (/date|check-in|arrival/i.test(f)) {

        initVals[f] = todayISO();

      } else {

        initVals[f] = '';

      }

    });



    if (pathname === '/food-beverage' || btn === 'New Order / Bill' || btn.toLowerCase().includes('order / bill')) {

      initVals['Outlet / Department'] = 'The Saffron Royale (Fine Dining)';

      initVals['Today Covers'] = '';

      initVals['Today Revenue (₹)'] = '';

      initVals['Average Check (₹)'] = '';

      initVals['Labor Cost %'] = '18.0%';

      initVals['Food Cost %'] = '28.0%';

      initVals['Status'] = 'Open';

    } else if (pathname === '/food-beverage/banquets' || btn === 'Create New BEO' || btn.toLowerCase().includes('beo')) {

      initVals['BEO #'] = generateNextBeoNumber();

      initVals['Event Title'] = '';

      initVals['Banquet Venue'] = 'Kohinoor Ballroom';

      initVals['Pax Count'] = '';

      initVals['Meal Format'] = '';

      initVals['BEO Coordinator'] = '';

      initVals['Status'] = 'Kitchen Ready';

    } else if (pathname === '/engineering/safety-compliance' || btn === 'Log Fire Drill' || btn === 'Upload Compliance Cert' || btn.toLowerCase().includes('compliance')) {

      initVals['Compliance Item'] = '';

      initVals['Statutory Authority'] = '';

      initVals['Inspection Date'] = todayISO();

      initVals['Certificate Valid Until'] = addDaysISO(todayISO(), 365);

      initVals['Safety Officer'] = '';

      initVals['Audit Status'] = 'Fully Compliant';

    } else if (pathname === '/security/keycard-audits' || btn === 'Interrogate Door Lock' || btn.toLowerCase().includes('door lock') || btn.toLowerCase().includes('keycard')) {

      initVals['Audit Log ID'] = `AUD-${Math.floor(1000 + Math.random() * 9000)}`;

      initVals['Room / Door ID'] = rooms && rooms.length > 0 ? `Room ${rooms[0].n}` : '';

      initVals['Keycard Type'] = 'Guest Keycard';

      initVals['Holder / User ID'] = '';

      initVals['Timestamp'] = new Date().toISOString().replace('T', ' ').slice(0, 19);

      initVals['Lock Result'] = 'Access Granted';

      initVals['Audit Flag'] = 'Normal Entry';

    } else if (pathname === '/human-resources/employee-directory' || btn === 'Register New Staff' || btn.toLowerCase().includes('register new staff')) {

      initVals['Emp Code'] = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

      initVals['Full Name'] = '';

      initVals['Department'] = 'Front Office';

      initVals['Designation'] = '';

      initVals['Joining Date'] = todayISO();

      initVals['Phone'] = '';

      initVals['Employment Status'] = 'Active';

    } else if (pathname === '/human-resources' || btn === 'Add Employee' || btn.toLowerCase().includes('add employee')) {

      initVals['Employee Code'] = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;

      initVals['Full Name'] = '';

      initVals['Department'] = 'Front Office';

      initVals['Designation'] = '';

      initVals['Joining Date'] = todayISO();

      initVals['Phone'] = '';

      initVals['Email'] = '';

      initVals['Employment Status'] = 'Active';

    } else if (pathname === '/bookings/group') {

      initVals['Group Name'] = '';

      initVals['Rooms'] = '2';

      initVals['Room Type'] = roomOptions[0] || 'Standard';

      initVals['Check-in'] = todayISO();

      initVals['Check-out'] = addDaysISO(todayISO(), 2);

      initVals['Contact Name'] = '';

      initVals['Contact Phone'] = '';

      initVals['Guests Count'] = '4';

      initVals['Status'] = 'Confirmed';

    } else if (pathname === '/bookings/walk-in') {

      initVals['ID Proof Type'] = 'Aadhaar Card';

      initVals['Room Type'] = roomOptions[0] || 'Standard';

      initVals['Number of Guests'] = '1';

      initVals['Duration (Nights)'] = '1';

      initVals['Check-in'] = todayISO();

      initVals['Status'] = 'Confirmed';

    } else if (pathname === '/bookings/refund') {

      initVals['Status'] = 'Pending';

      initVals['Request ID'] = `REF-${Math.floor(1000 + Math.random() * 9000)}`;

    } else if (pathname === '/guest-services/concierge' || btn === 'Add Concierge Booking') {

      initVals['Ref ID'] = generateConciergeRefId();

      initVals['Guest Name'] = '';

      initVals['Room'] = '';

      initVals['Status'] = 'Confirmed';

      setConciergeRoomStatus(null);

      setManualRoomOverride(false);

    } else if (pathname === '/guest-services/amenities-requests' || btn === 'New Amenity Request') {

      initVals['Guest Name'] = '';

      initVals['Room'] = '';

      initVals['Requested Items'] = '';

      initVals['Status'] = 'Pending';

    } else if (pathname === '/guest-services' || btn.toLowerCase().includes('service request')) {

      initVals['Guest Name'] = '';

      initVals['Room'] = '101';

      initVals['Service Type'] = 'In-Room Assistance';

      initVals['Assigned To'] = 'Guest Services Officer';

      initVals['Priority'] = 'Normal';

      initVals['Status'] = 'Pending';

    } else if (pathname === '/engineering/asset-registry' || btn === 'Register New Asset' || btn.toLowerCase().includes('asset')) {

      initVals['Asset Tag'] = '';

      initVals['Asset Name'] = '';

      initVals['Asset Category'] = '';

      initVals['Asset Type'] = '';

      initVals['Asset / Location'] = '';

      initVals['Manufacturer'] = '';

      initVals['Model Number'] = '';

      initVals['Serial Number'] = '';

      initVals['Purchase Date'] = todayISO();

      initVals['Warranty Details'] = 'Under Active AMC';

      initVals['AMC Provider'] = '';

      initVals['Status'] = 'Under Active AMC';

    } else if (pathname === '/engineering/work-orders' || btn === 'Log Work Order' || btn.toLowerCase().includes('work order')) {

      initVals['WO #'] = '';

      initVals['Location'] = '';

      initVals['Issue Description'] = '';

      initVals['Reported By'] = 'Front Desk (Staff)';

      initVals['Assigned Tech'] = 'Duty Engineer';

      initVals['Priority'] = 'Normal';

      initVals['Status'] = 'In Progress';

    } else if (pathname === '/engineering/energy-utility' || btn === 'Record Meter Reading' || btn.toLowerCase().includes('meter reading')) {

      initVals['Utility Resource'] = '';

      initVals['Daily Consumption'] = '';

      initVals['Target Benchmark'] = '';

      initVals['Unit Cost (₹)'] = '';

      initVals['Power Factor / Quality'] = '0.998 (Unity PF)';

      initVals['Variance vs Budget'] = '0.0%';

    } else if (pathname === '/engineering/room-inspections' || btn === 'Log Room Inspection' || btn.toLowerCase().includes('room inspection')) {

      initVals['Inspection ID'] = '';

      initVals['Room #'] = rooms && rooms.length > 0 ? `Room ${rooms[0].n}` : '';

      initVals['Inspect Date'] = todayISO();

      initVals['Inspector'] = '';

      initVals['Tested Systems'] = 'A/C chill, TV HDMI, shower mixer, socket load';

      initVals['Defects Found'] = '0 Defects';

      initVals['Handover Sign-off'] = 'Approved for Guest';

    } else if (pathname === '/engineering/hvac-controls' || btn === 'Adjust Setpoints' || btn.toLowerCase().includes('setpoint')) {

      initVals['AHU / Chiller Unit'] = '';

      initVals['Zone Monitored'] = '';

      initVals['Set Temperature'] = '22.0°C';

      initVals['Actual Temp'] = '22.0°C';

      initVals['Chilled Water In/Out'] = 'In: 7.4°C / Out: 12.0°C';

      initVals['VFD Fan Speed'] = '80% Speed';

      initVals['Status'] = 'Running Optimal';

    } else if (pathname === '/engineering/preventive-maintenance' || btn === 'Schedule PPM Task' || btn.toLowerCase().includes('ppm')) {

      initVals['PPM Task ID'] = '';

      initVals['Asset / Location'] = '';

      initVals['Frequency'] = '';

      initVals['Last Serviced'] = '';

      initVals['Next Due Date'] = '';

      initVals['Checklist Items'] = '';

      initVals['Status'] = 'Scheduled';

    } else if (pathname === '/webhooks/api-key-management') {

      initVals['Key Name'] = '';

      initVals['Key Prefix'] = 'sf_live';

      initVals['Permissions'] = 'bookings:read,bookings:write,webhooks:manage';

      initVals['Status'] = 'Active';

    } else if (pathname.startsWith('/bookings')) {

      initVals['Status'] = 'Confirmed';

    } else if (pathname === '/staff/directory' || btn === 'Add Staff Member' || pathname === '/staff/admin-users' || btn === 'Add Admin User') {

      initVals['Name'] = '';

      initVals['Status'] = 'Active';

      initVals['Role'] = btn === 'Add Admin User' ? 'Hotel Manager' : 'Front Desk Associate';

      initVals['Department'] = btn === 'Add Admin User' ? 'Executive Management' : 'Front Office';

      initVals['Phone'] = '';

      initVals['Email'] = '';

      initVals['Create New Password'] = '';

      initVals['Confirm Password'] = '';

    }

    setModalValues(initVals);

    setModalErrors({});

    setShowPassword({});

    setEditingRecord(null);

    setModalOpen(true);

  };



  let dynamicColumns = config.columns;

  let dynamicRows = null;

  let dynamicFields = config.fields;

  let dynamicCards = null;



  if (pathname === '/bookings/history') {

    dynamicColumns = ['Booking ID', 'Guest', 'Room', 'Source', 'Stay', 'Amount', 'Payment', 'Status', 'Action'];

    let bRows = bookings;

    if (activeDateFilter) {

      const fromTime = new Date(`${activeDateFilter.fromDate}T00:00:00`).getTime();

      const toTime = new Date(`${activeDateFilter.toDate}T23:59:59.999`).getTime();

      bRows = bRows.filter((b) => {

        const cinRaw = b.check_in || b.in;

        const d = parseRowDate(cinRaw);

        if (!d) return true;

        const t = d.getTime();

        return t >= fromTime && t <= toTime;

      });

    }

    dynamicRows = bRows.map((b) => [

      <span className="tag" key={b.id}>{b.id}</span>, b.guest, b.room, b.src, `${b.in} – ${b.out}`, inr(b.amt),

      <StatusBadge key={`p-${b.id}`} status={b.pay} />, <StatusBadge key={`s-${b.id}`} status={b.st} />,

      <div style={{ display: 'flex', gap: 6 }} key={`act-${b.id}`}>

        <button className="btn sm ghost" onClick={() => handleEditBooking(b)}>Edit</button>

        <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => {

          setDeleteConfirm({

            open: true,

            title: 'Confirm Deletion',

            message: `Are you sure you want to delete reservation ${b.id}? This action cannot be undone.`,

            onConfirm: async () => { await deleteBooking(b.id); }

          });

        }}>Delete</button>

      </div>

    ]);

  } else if (pathname === '/bookings/details') {

    if (bookings.length > 0) {

      const b = bookings[0];

      dynamicFields = [

        { label: 'Booking ID', value: b.id },

        { label: 'Guest Name', value: b.guest },

        { label: 'Room Type', value: b.room },

        { label: 'Check-in', value: b.in },

        { label: 'Check-out', value: b.out },

        { label: 'Total Amount', value: inr(b.amt) },

        { label: 'Payment Status', value: b.pay, badge: b.pay === 'Paid' ? 'green' : 'brass' },

        { label: 'Booking Source', value: b.src },

        { label: 'Status', value: b.st, badge: 'teal' },

      ];

    } else {

      dynamicFields = [];

    }

  } else if (pathname === '/front-desk/final-bill') {

    const latestBooking = bookings.find((b) => b.st === 'Checked-in') || bookings[0];

    if (latestBooking) {

      const roomCharges = Number(latestBooking.amt || 0);

      const tax = Math.round(roomCharges * 0.12);

      const total = roomCharges + tax;

      const paid = latestBooking.pay === 'Paid' ? total : latestBooking.pay === 'Partial' ? Math.round(total / 2) : 0;

      const due = total - paid;

      dynamicFields = [

        { label: 'Guest', value: latestBooking.guest },

        { label: 'Room', value: `${latestBooking.room_number ? `Room ${latestBooking.room_number} – ` : ''}${latestBooking.room}` },

        { label: 'Stay', value: `${latestBooking.in} – ${latestBooking.out} (${latestBooking.nights || 1} nights)` },

        { label: 'Room Charges', value: inr(roomCharges) },

        { label: 'GST (12%)', value: inr(tax) },

        { label: 'Total', value: inr(total), highlight: true },

        { label: 'Paid', value: inr(paid) },

        { label: 'Balance Due', value: inr(due), badge: due > 0 ? 'red' : 'green' },

      ];

    } else {

      dynamicFields = [];

    }

  } else if (pathname === '/guests/profile') {

    if (guests.length > 0) {

      const g = guests[0];

      const guestCode = g.guest_code || `GST-${String(g.id).padStart(4, '0')}`;

      const gBookings = bookings.filter((b) => String(b.guest_id) === String(g.id) || b.guest === g.full_name);

      dynamicFields = [

        { label: 'Guest ID', value: guestCode, badge: 'teal' },

        { label: 'Full Name', value: g.full_name },

        { label: 'Phone', value: g.phone || '—' },

        { label: 'Email', value: g.email || '—' },

        { label: 'ID Number', value: g.identification_number || '—' },

        { label: 'Total Stays', value: String(gBookings.length) },

        { label: 'Status / Tier', value: g.tier || (g.notes && g.notes.toLowerCase().includes('vip') ? 'VIP Tier' : 'Standard'), badge: 'teal' },

        { label: 'Notes', value: g.notes || '—' },

      ];

    } else {

      dynamicFields = [];

    }

  } else if (pathname === '/guests/preferences') {

    if (guests.length > 0) {

      const g = guests[0];

      const guestCode = g.guest_code || `GST-${String(g.id).padStart(4, '0')}`;

      dynamicFields = [

        { label: 'Guest ID', value: guestCode, badge: 'teal' },

        { label: 'Guest Name', value: g.full_name },

        { label: 'Phone', value: g.phone || '—' },

        { label: 'Email', value: g.email || '—' },

        { label: 'Registered Preferences', value: g.notes || 'Standard guest profile preferences.' },

      ];

    } else {

      dynamicFields = [];

    }

  } else if (pathname === '/guests/vip') {

    dynamicColumns = ['Guest ID', 'Guest Name', 'Contact', 'Email', 'Tier', 'Total Stays', 'Special Notes'];

    const vipList = guests.filter((g) => {

      const n = (g.notes || '').toLowerCase();

      const t = (g.tier || '').toLowerCase();

      return t === 'vip' || n.includes('vip') || n.includes('gold') || n.includes('platinum') || n.includes('elite');

    });

    dynamicRows = vipList.map((g) => [

      <span className="tag" key={`gid-${g.id}`}>{g.guest_code || `GST-${String(g.id).padStart(4, '0')}`}</span>,

      <b key={g.id}>{g.full_name}</b>,

      g.phone || '—',

      g.email || '—',

      g.tier || 'VIP',

      bookings.filter((b) => String(b.guest_id) === String(g.id) || b.guest === g.full_name).length,

      g.notes || 'VIP',

    ]);

  } else if (pathname === '/guests/identification') {

    dynamicColumns = ['Guest ID', 'Guest Name', 'Contact', 'ID Number', 'Notes', 'Action'];

    dynamicRows = guests.filter((g) => g.identification_number).map((g) => [

      <span className="tag" key={`gid-${g.id}`}>{g.guest_code || `GST-${String(g.id).padStart(4, '0')}`}</span>,

      <b key={g.id}>{g.full_name}</b>,

      g.phone || '—',

      <span className="tag" key={`id-${g.id}`}>{g.identification_number}</span>,

      g.notes || '—',

      <button key={`v-${g.id}`} className="btn sm ghost" onClick={() => handleEditGuest(g)}>Edit</button>

    ]);

  } else if (pathname === '/rooms/availability') {

    dynamicColumns = ['Room Type', 'Total', 'Occupied', 'Available', 'Reserved', 'Out of Order'];

    const typeMap = {};

    rooms.forEach((r) => {

      const t = r.type || 'Standard';

      if (!typeMap[t]) typeMap[t] = { total: 0, occ: 0, vac: 0, res: 0, ooo: 0 };

      typeMap[t].total += 1;

      if (r.s === 'occ') typeMap[t].occ += 1;

      else if (r.s === 'vac') typeMap[t].vac += 1;

      else if (r.s === 'res') typeMap[t].res += 1;

      else if (r.s === 'ooo') typeMap[t].ooo += 1;

    });

    dynamicRows = Object.entries(typeMap).map(([t, s]) => [

      <b key={t}>{t}</b>,

      s.total,

      <span key={`occ-${t}`} style={{ color: 'var(--red)', fontWeight: 600 }}>{s.occ}</span>,

      <span key={`vac-${t}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{s.vac}</span>,

      s.res,

      s.ooo > 0 ? <span key={`ooo-${t}`} style={{ color: 'var(--brass)' }}>{s.ooo}</span> : 0,

    ]);

  } else if (pathname === '/rooms/floor-management') {

    dynamicColumns = ['Floor', 'Total Rooms', 'Occupied', 'Vacant', 'Maintenance', 'Status'];

    const floorMap = {};

    rooms.forEach((r) => {

      const fl = `Floor ${r.f || 1}`;

      if (!floorMap[fl]) floorMap[fl] = { total: 0, occ: 0, vac: 0, ooo: 0 };

      floorMap[fl].total += 1;

      if (r.s === 'occ') floorMap[fl].occ += 1;

      else if (r.s === 'vac') floorMap[fl].vac += 1;

      else if (r.s === 'ooo') floorMap[fl].ooo += 1;

    });

    dynamicRows = Object.entries(floorMap).map(([fl, s]) => [

      <b key={fl}>{fl}</b>,

      s.total,

      s.occ,

      s.vac,

      s.ooo,

      <Badge key={fl} color="teal">Active</Badge>

    ]);

  } else if (pathname === '/rooms/out-of-order') {

    dynamicColumns = ['Room', 'Floor', 'Type', 'Status', 'Action'];

    dynamicRows = rooms.filter((r) => r.s === 'ooo').map((r) => [

      <b key={r.n}>Room {r.n}</b>,

      `Floor ${r.f}`,

      r.type,

      <Badge key={`b-${r.n}`} color="red">Out of Order</Badge>,

      <button key={`act-${r.n}`} className="btn sm" onClick={async () => { await markRoomClean(r.n); notify(`Room ${r.n} returned to service and marked clean`); }}>Return to Service</button>

    ]);

  } else if (pathname === '/rooms/types-gallery') {

    const typeMap = {};

    rooms.forEach((r) => {

      const t = r.type || 'Standard';

      if (!typeMap[t]) {

        typeMap[t] = {

          name: t,

          desc: `${t} room accommodation with premium amenities and comfort`,

          tags: ['Wi-Fi', 'AC', 'TV'],

          price: r.price ? `${inr(r.price)}/night` : (r.rate ? `${inr(r.rate)}/night` : '₹2,500/night'),

          count: 0

        };

      }

      typeMap[t].count += 1;

    });

    dynamicCards = Object.values(typeMap).map((c) => ({

      ...c,

      tags: [...c.tags, `${c.count} rooms in inventory`]

    }));

  } else if (pathname === '/guests/stay-history') {

    dynamicColumns = ['Booking ID', 'Guest ID', 'Guest Name', 'Room', 'Check-in', 'Check-out', 'Amount', 'Status'];

    dynamicRows = bookings.map((b) => {

      const matchedGuest = guests.find((g) => String(g.id) === String(b.guest_id) || (g.full_name && g.full_name.toLowerCase() === (b.guest || '').toLowerCase()));

      const guestCode = matchedGuest ? (matchedGuest.guest_code || `GST-${String(matchedGuest.id).padStart(4, '0')}`) : (b.guest_id ? `GST-${String(b.guest_id).padStart(4, '0')}` : '—');

      return [

        <span className="tag" key={b.id}>{b.id}</span>,

        <span className="tag" key={`gid-${b.id}`}>{guestCode}</span>,

        b.guest,

        b.room,

        `${b.in} – ${b.out}`,

        inr(b.amt),

        <StatusBadge key={`s-${b.id}`} status={b.st} />,

      ];

    });

  } else if (pathname === '/bookings/group') {

    dynamicColumns = ['Group Name', 'Rooms', 'Check-in', 'Check-out', 'Contact', 'Status', 'Action'];

    const groupMap = new Map();

    (bookings || []).forEach((b) => {

      const isGroup = b.reservation_type === 'Group' || b.group_ref || b.group_name || b.src === 'Group';

      if (!isGroup) return;

      const key = b.group_ref || b.group_name || b.id;

      if (!groupMap.has(key)) {

        groupMap.set(key, {

          key,

          group_ref: b.group_ref,

          name: b.group_name || b.guest || 'Group',

          rooms: b.associated_rooms && b.associated_rooms.length > 0 ? b.associated_rooms : [b.room_number ? `Rm ${b.room_number}` : b.room].filter(Boolean),

          check_in: b.in,

          check_out: b.out,

          contact: b.phone ? `${b.guest} (${b.phone})` : b.guest,

          status: b.st,

          rawBookings: [b],

        });

      } else {

        const item = groupMap.get(key);

        const roomStr = b.room_number ? `Rm ${b.room_number}` : b.room;

        if (roomStr && !item.rooms.includes(roomStr)) {

          item.rooms.push(roomStr);

        }

        item.rawBookings.push(b);

      }

    });



    const groupBookingRows = Array.from(groupMap.values()).map((g) => [

      <div key={`gn-${g.key}`}>

        <b>{g.name}</b>

        {g.group_ref && <span className="tag" style={{ marginLeft: 8, fontSize: 11 }}>{g.group_ref.slice(0, 8)}</span>}

      </div>,

      <span key={`rm-${g.key}`} className="badge b-blue">{g.rooms.length > 0 ? `${g.rooms.length} Rooms (${g.rooms.join(', ')})` : 'Rooms Pending'}</span>,

      g.check_in,

      g.check_out,

      g.contact,

      <StatusBadge key={`st-${g.key}`} status={g.status} />,

      <div style={{ display: 'flex', gap: 6 }} key={`act-${g.key}`}>

        {g.status !== 'Checked-in' && g.status !== 'Checked-out' && (

          <button className="btn sm" onClick={async () => {

            for (const b of g.rawBookings) {

              await setBookingStatus(b.id, 'Checked-in');

            }

            notify(`Group "${g.name}" checked in`);

          }}>Check in</button>

        )}

        {g.status === 'Checked-in' && (

          <button className="btn sm brass" onClick={async () => {

            for (const b of g.rawBookings) {

              await setBookingStatus(b.id, 'Checked-out');

            }

            notify(`Group "${g.name}" checked out`);

          }}>Check out</button>

        )}

        <button className="btn sm ghost" onClick={() => handleEditBooking(g.rawBookings[0])}>Edit</button>

        <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => {

          setDeleteConfirm({

            open: true,

            title: 'Delete Group Booking',

            message: `Are you sure you want to delete group booking "${g.name}"? This will cancel all ${g.rawBookings.length} room reservation(s).`,

            onConfirm: async () => {

              for (const b of g.rawBookings) {

                await deleteBooking(b.id);

              }

              notify(`Group booking "${g.name}" deleted`);

            }

          });

        }}>Delete</button>

      </div>

    ]);



    const dbGroupRows = dbRecords

      .filter((rec) => !Array.from(groupMap.values()).some(g => g.name === (rec.data?.['Group Name'] || rec.title)))

      .map((rec) => [

        <b key={`db-gn-${rec.id}`}>{rec.data?.['Group Name'] || rec.title}</b>,

        rec.data?.['Rooms'] ? `${rec.data['Rooms']} Rooms` : '—',

        rec.data?.['Check-in'] || '—',

        rec.data?.['Check-out'] || '—',

        rec.data?.['Contact Name'] ? `${rec.data['Contact Name']} ${rec.data['Contact Phone'] ? `(${rec.data['Contact Phone']})` : ''}` : (rec.data?.['Contact'] || '—'),

        <StatusBadge key={`db-st-${rec.id}`} status={rec.status || rec.data?.['Status'] || 'Confirmed'} />,

        <div style={{ display: 'flex', gap: 6 }} key={`db-act-${rec.id}`}>

          <button className="btn sm ghost" onClick={() => handleEditDbRecord(rec)}>Edit</button>

          <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => handleDeleteDbRecord(rec.id)}>Delete</button>

        </div>

      ]);



    dynamicRows = [...groupBookingRows, ...dbGroupRows];

  } else if (pathname === '/bookings/refund') {

    dynamicColumns = ['Request ID', 'Booking ID', 'Guest', 'Amount', 'Reason', 'Status', 'Action'];

    const dbRefundRows = dbRecords.map((rec) => [

      <span className="tag" key={`r-${rec.id}`}>{rec.data?.['Request ID'] || `REF-${rec.id}`}</span>,

      rec.data?.['Booking ID'] || '—',

      rec.data?.['Guest'] || '—',

      rec.data?.['Amount'] ? (String(rec.data['Amount']).startsWith('₹') ? rec.data['Amount'] : inr(rec.data['Amount'])) : '—',

      rec.data?.['Reason'] || '—',

      <StatusBadge key={`st-${rec.id}`} status={rec.status || rec.data?.['Status'] || 'Pending'} />,

      <div style={{ display: 'flex', gap: 6 }} key={`db-${rec.id}`}>

        <button className="btn sm ghost" onClick={() => handleEditDbRecord(rec)}>Edit</button>

        <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => handleDeleteDbRecord(rec.id)}>Delete</button>

      </div>

    ]);

    const bookingRefundRows = bookings

      .filter((b) => ['Cancelled', 'No-show'].includes(b.st))

      .map((b) => [

        <span className="tag" key={`ref-${b.id}`}>REF-{b.id.replace(/\D/g, '') || b.id}</span>,

        <span className="tag" key={b.id}>{b.id}</span>,

        b.guest,

        inr(b.amt),

        b.st === 'Cancelled' ? 'Reservation Cancelled' : 'Guest No-Show',

        <StatusBadge key={`s-${b.id}`} status="Pending" />,

        <div style={{ display: 'flex', gap: 6 }} key={`act-${b.id}`}>

          <button className="btn sm ghost" onClick={() => {

            setModalTitle(`Refund Request: ${b.id}`);

            setModalFields(['Request ID', 'Booking ID', 'Guest', 'Amount', 'Reason', 'Status']);

            setModalValues({

              'Request ID': `REF-${b.id.replace(/\D/g, '') || b.id}`,

              'Booking ID': b.id,

              'Guest': b.guest,

              'Amount': b.amt,

              'Reason': b.st === 'Cancelled' ? 'Reservation Cancelled' : 'Guest No-Show',

              'Status': 'Pending',

            });

            setEditingRecord({ ...b, _isRefundBooking: true });

            setModalOpen(true);

          }}>Edit</button>

        </div>

      ]);

    dynamicRows = [...dbRefundRows, ...bookingRefundRows];

  } else if (pathname === '/finance/payment-requests') {

    dynamicColumns = ['Guest', 'Booking', 'Amount', 'Payment Status', 'Stay', 'Action'];

    dynamicRows = bookings

      .filter((b) => b.pay !== 'Paid')

      .map((b) => [

        b.guest,

        <span className="tag" key={b.id}>{b.id}</span>,

        inr(b.amt),

        <StatusBadge key={`p-${b.id}`} status={b.pay} />,

        `${b.in} – ${b.out}`,

        <button key={`act-${b.id}`} className="btn sm ghost" onClick={() => handleEditBooking(b)}>Update</button>

      ]);

  } else if (pathname === '/front-desk/pending-checkin') {

    dynamicColumns = ['Guest', 'Room Type', 'Booking ID', 'Check-in', 'Payment', 'Action'];

    dynamicRows = bookings

      .filter((b) => ['Confirmed', 'Pending', 'Modified'].includes(b.st))

      .map((b) => [

        b.guest, b.room, <span className="tag" key={b.id}>{b.id}</span>, b.in, <StatusBadge key={`p-${b.id}`} status={b.pay} />,

        <button key={`act-${b.id}`} className="btn sm" onClick={async () => { await setBookingStatus(b.id, 'Checked-in'); notify(`${b.guest} checked in`); }}>Check in</button>

      ]);

  } else if (pathname === '/front-desk/checkout') {

    dynamicColumns = ['Guest', 'Room', 'Stay', 'Bill', 'Payment', 'Action'];

    dynamicRows = bookings

      .filter((b) => b.st === 'Checked-in')

      .map((b) => [

        b.guest, b.room, `${b.in} – ${b.out}`, inr(b.amt), <StatusBadge key={`p-${b.id}`} status={b.pay} />,

        <button key={`act-${b.id}`} className="btn sm brass" onClick={async () => { await setBookingStatus(b.id, 'Checked-out'); notify(`${b.guest} checked out`); }}>Check out</button>

      ]);

  } else if (pathname === '/front-desk/room-assignment') {

    dynamicColumns = ['Guest', 'Requested Type', 'Room Number', 'Floor', 'Status', 'Action'];

    dynamicRows = bookings

      .filter((b) => ['Confirmed', 'Checked-in'].includes(b.st))

      .map((b) => [

        b.guest, b.room, b.room_number ? `Room ${b.room_number}` : 'Unassigned', b.floor || '1', <StatusBadge key={`s-${b.id}`} status={b.st} />,

        <button key={`act-${b.id}`} className="btn sm ghost" onClick={() => openAssignModal(b)}>

          {b.room_number ? 'Change Room' : 'Assign Room'}

        </button>

      ]);

  } else if (pathname === '/front-desk/history') {

    dynamicColumns = ['Date', 'Guest', 'Room Number', 'Type', 'Handled By', 'Notes'];



    const historyEvents = [];



    // 1. Process operational records in dbRecords if staff logged custom records

    (dbRecords || []).forEach((rec) => {

      const recData = rec.data || {};

      const roomNum = recData['Room Number'] || recData['Room'] || recData['room_number'] || '—';

      const typeVal = recData['Type'] || rec.status || 'Check-in';

      const isCheckout = String(typeVal).toLowerCase().includes('out');

      historyEvents.push({

        rawDate: rec.created_at || recData['Date'],

        dateStr: recData['Date'] || (rec.created_at ? new Date(rec.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'),

        guest: recData['Guest'] || recData['Guest Name'] || 'Guest',

        roomNumber: roomNum,

        type: typeVal,

        typeBadge: <span className={`badge ${isCheckout ? 'b-blue' : 'b-teal'}`} key={`rec-${rec.id}`}>{typeVal}</span>,

        handledBy: recData['Handled By'] || recData['Staff'] || 'Front Desk Staff',

        notes: recData['Notes'] || '—',

      });

    });



    // 2. Process check-in and check-out events from existing tenant-scoped bookings

    (bookings || []).forEach((b) => {

      const roomNum = b.room_number ? String(b.room_number) : (b.room || '—');



      if (b.st === 'Checked-in') {

        const checkinTime = b.checked_in_at

          ? new Date(b.checked_in_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })

          : (b.in ? `${b.in}, 2:00 PM` : '—');

        historyEvents.push({

          rawDate: b.checked_in_at || b.check_in || b.in,

          dateStr: checkinTime,

          guest: b.guest,

          roomNumber: roomNum,

          type: 'Check-in',

          typeBadge: <span className="badge b-teal" key={`cin-${b.id}`}>Check-in</span>,

          handledBy: 'Front Desk Staff',

          notes: b.id ? `Booking ${b.id}` : '—',

        });

      } else if (b.st === 'Checked-out') {

        const checkoutTime = b.checked_out_at

          ? new Date(b.checked_out_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })

          : (b.out ? `${b.out}, 11:00 AM` : '—');

        const checkinTime = b.checked_in_at

          ? new Date(b.checked_in_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })

          : (b.in ? `${b.in}, 2:00 PM` : '—');



        historyEvents.push({

          rawDate: b.checked_out_at || b.check_out || b.out,

          dateStr: checkoutTime,

          guest: b.guest,

          roomNumber: roomNum,

          type: 'Check-out',

          typeBadge: <span className="badge b-blue" key={`cout-${b.id}`}>Check-out</span>,

          handledBy: 'Front Desk Staff',

          notes: `Stay completed · ${b.id}`,

        });



        historyEvents.push({

          rawDate: b.checked_in_at || b.check_in || b.in,

          dateStr: checkinTime,

          guest: b.guest,

          roomNumber: roomNum,

          type: 'Check-in',

          typeBadge: <span className="badge b-teal" key={`cin-prior-${b.id}`}>Check-in</span>,

          handledBy: 'Front Desk Staff',

          notes: `Arrived · ${b.id}`,

        });

      }

    });



    // 3. Sort chronologically descending (newest activity first)

    historyEvents.sort((a, b) => {

      const dateA = a.rawDate ? new Date(a.rawDate).getTime() : 0;

      const dateB = b.rawDate ? new Date(b.rawDate).getTime() : 0;

      return dateB - dateA;

    });



    // 4. Date filtering support using activeDateFilter

    let filteredEvents = historyEvents;

    if (activeDateFilter && activeDateFilter.fromDate && activeDateFilter.toDate) {

      const fromTime = new Date(`${activeDateFilter.fromDate}T00:00:00`).getTime();

      const toTime = new Date(`${activeDateFilter.toDate}T23:59:59.999`).getTime();

      filteredEvents = filteredEvents.filter((ev) => {

        const d = parseRowDate(ev.rawDate || ev.dateStr);

        if (!d) return true;

        const t = d.getTime();

        return t >= fromTime && t <= toTime;

      });

    }



    dynamicRows = filteredEvents.map((ev, idx) => [

      ev.dateStr,

      ev.guest,

      <span className="tag" key={`rm-${idx}`} style={{ fontWeight: 600 }}>{ev.roomNumber}</span>,

      ev.typeBadge || ev.type,

      ev.handledBy,

      ev.notes

    ]);

  } else if (pathname === '/guests/directory') {

    dynamicColumns = ['Guest ID', 'Guest Name', 'Phone', 'Email', 'Total Stays', 'Last Visit', 'Tier', 'Action'];

    dynamicRows = guests.map((g) => {

      const guestStays = (bookings || []).filter((b) => b && (String(b.guest_id) === String(g.id) || (b.guest && b.guest === g.full_name)));

      const totalStays = g.total_stays != null ? g.total_stays : guestStays.length;

      const lastStay = guestStays.at(-1);

      const lastVisit = g.last_visit && g.last_visit !== '—'

        ? g.last_visit

        : (lastStay ? (lastStay.check_out || lastStay.out || lastStay.check_in || lastStay.in || '—') : '—');

      const tierVal = g.tier || (totalStays >= 6 ? 'VIP' : (totalStays >= 3 ? 'Gold' : 'Silver'));



      return [

        <span className="tag" key={`gid-${g.id}`}>GST-{String(g.id).padStart(4, '0')}</span>,

        <strong key={`name-${g.id}`}>{g.full_name}</strong>,

        g.phone || '—',

        g.email || '—',

        <span key={`stays-${g.id}`} style={{ fontWeight: 600 }}>{totalStays}</span>,

        lastVisit,

        <span

          key={`tier-${g.id}`}

          className="tag"

          style={{

            background: tierVal === 'VIP' ? 'rgba(0, 209, 178, 0.15)' : (tierVal === 'Platinum' ? 'rgba(156, 39, 176, 0.15)' : (tierVal === 'Gold' ? 'rgba(255, 179, 0, 0.15)' : 'rgba(255, 255, 255, 0.08)')),

            color: tierVal === 'VIP' ? 'var(--teal)' : (tierVal === 'Platinum' ? '#ba68c8' : (tierVal === 'Gold' ? '#ffb300' : 'var(--text)')),

            fontWeight: 700,

          }}

        >

          {tierVal}

        </span>,

        <div style={{ display: 'flex', gap: 6 }} key={`g-act-${g.id}`}>

          <button className="btn sm ghost" onClick={() => handleEditGuest(g)}>Edit</button>

          <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => {

            setDeleteConfirm({

              open: true,

              title: 'Confirm Deletion',

              message: `Are you sure you want to delete guest "${g.full_name}" from database? This action cannot be undone.`,

              onConfirm: async () => { await deleteGuest(g.id); }

            });

          }}>Delete</button>

        </div>

      ];

    });

  } else if (pathname === '/housekeeping/dirty-rooms') {

    dynamicColumns = ['Room Number', 'Floor', 'Type', 'Status', 'Action'];

    dynamicRows = rooms

      .filter((r) => r.s === 'dirty')

      .map((r) => [

        <b key={r.n}>Room {r.n}</b>, r.f, r.type, <Badge key={`b-${r.n}`} color="red">Needs cleaning</Badge>,

        <button key={`act-${r.n}`} className="btn sm" onClick={async () => { await markRoomClean(r.n); notify(`Room ${r.n} marked clean`); }}>Mark clean</button>

      ]);

  } else if (pathname === '/housekeeping/clean-rooms') {

    dynamicColumns = ['Room Number', 'Floor', 'Type', 'Status'];

    dynamicRows = rooms

      .filter((r) => r.s === 'vac')

      .map((r) => [

        <b key={r.n}>Room {r.n}</b>, r.f, r.type, <Badge key={`b-${r.n}`} color="green">Ready to sell</Badge>

      ]);

  } else if (pathname === '/housekeeping/room-readiness') {

    dynamicColumns = ['Room Number', 'Floor', 'Type', 'Status'];

    dynamicRows = rooms.map((r) => [

      <b key={r.n}>Room {r.n}</b>, r.f, r.type, <StatusBadge key={`s-${r.n}`} status={r.s} />

    ]);

  } else if (pathname === '/finance/booking-payments') {

    dynamicColumns = ['Booking', 'Guest', 'Amount', 'Method', 'Status', 'Action'];

    dynamicRows = payments.map((p) => {

      const b = bookings.find((x) => x.reservation_id === p.reservation_id);

      return [

        <span className="tag" key={p.id}>{b?.id || `#${p.reservation_id}`}</span>,

        b?.guest || '—', inr(p.amount), p.method, <StatusBadge key={`s-${p.id}`} status={p.status} />,

        <div style={{ display: 'flex', gap: 6 }} key={`p-act-${p.id}`}>

          {p.status !== 'Completed' && (

            <button className="btn sm ghost" onClick={async () => { await updatePayment(p.id, { status: 'Completed' }); }}>Mark Paid</button>

          )}

          <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => {

            setDeleteConfirm({

              open: true,

              title: 'Confirm Deletion',

              message: 'Are you sure you want to delete this payment record? This action cannot be undone.',

              onConfirm: async () => { await deletePayment(p.id); }

            });

          }}>Delete</button>

        </div>

      ];

    });

  } else if (pathname.startsWith('/offers/') && pathname !== '/offers/create') {

    dynamicColumns = ['Offer Name', 'Code', 'Discount', 'Valid Until', 'Status', 'Action'];

    dynamicRows = offers.map((o) => [

      o.name, o.code, o.discount_type === 'percent' ? `${o.discount_value}%` : inr(o.discount_value),

      o.ends_on, o.active ? <Badge key={`o-${o.id}`} color="green">Active</Badge> : <Badge key={`o-${o.id}`}>Inactive</Badge>,

      <div style={{ display: 'flex', gap: 6 }} key={`o-act-${o.id}`}>

        <button className="btn sm ghost" onClick={() => toggleOffer(o.id, !o.active)}>

          {o.active ? 'Deactivate' : 'Activate'}

        </button>

        <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => {

          setDeleteConfirm({

            open: true,

            title: 'Confirm Deletion',

            message: `Are you sure you want to delete offer "${o.name}"? This action cannot be undone.`,

            onConfirm: async () => { await deleteOffer(o.id); }

          });

        }}>Delete</button>

      </div>

    ]);

  } else if (pathname.startsWith('/channels/')) {

    dynamicColumns = ['Channel Name', 'Enabled', 'Sync Status'];

    dynamicRows = channels.map((c) => [

      c.n, c.on ? <Badge key={`c-${c.n}`} color="green">Enabled</Badge> : <Badge key={`c-${c.n}`}>Disabled</Badge>, c.sync

    ]);

  } else if (pathname === '/webhooks/incoming-logs') {

    dynamicColumns = ['Time', 'Source / Channel', 'Event Type', 'HTTP Status', 'Latency', 'Result / Details'];

    const incoming = webhookLogs.filter((l) => l.direction === 'incoming');

    dynamicRows = incoming.map((l) => [

      formatHotelTime(l.created_at, hotelTimezone),

      <b key={`ch-${l.id}`}>{l.channel}</b>,

      <span className="tag" key={`ev-${l.id}`}>{l.event_type}</span>,

      <Badge key={`st-${l.id}`} color={l.response_code >= 200 && l.response_code < 300 ? 'green' : (l.response_code === 400 ? 'brass' : 'red')}>

        {l.response_code ? `HTTP ${l.response_code}` : 'Pending'}

      </Badge>,

      `${l.latency_ms || 35}ms`,

      l.error_message ? <span key={`err-${l.id}`} style={{ color: 'var(--red)', fontSize: '12px' }}>{l.error_message}</span> : (l.status === 'Success' ? <Badge key={`s-${l.id}`} color="green">Success</Badge> : l.status)

    ]);

  } else if (pathname === '/webhooks/retry-queue') {

    dynamicColumns = ['Delivery ID', 'Channel / Destination', 'Event Type', 'Attempts', 'Next Retry', 'Error Details', 'Action'];

    const queued = webhookLogs.filter((l) => l.direction === 'outgoing' && (l.status === 'Retrying' || (l.status === 'Failed' && (l.retry_count || 0) < (l.max_retries || 3))));

    dynamicRows = queued.map((l) => [

      <span className="tag" key={`id-${l.id}`} title={`Created: ${formatHotelTime(l.created_at, hotelTimezone)}`}>#{l.id}</span>,

      <div key={`ch-${l.id}`}>

        <b>{l.channel}</b>

        {l.endpoint && <div style={{ fontSize: '11px', color: 'var(--muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.endpoint}</div>}

      </div>,

      <span className="tag" key={`ev-${l.id}`}>{l.event_type}</span>,

      <Badge key={`att-${l.id}`} color="brass" title={l.last_attempt_at ? `Last Attempt: ${formatHotelTime(l.last_attempt_at, hotelTimezone)}` : `Created: ${formatHotelTime(l.created_at, hotelTimezone)}`}>

        {l.retry_count || 0} / {l.max_retries || 3}

      </Badge>,

      l.next_retry_at ? formatHotelTime(l.next_retry_at, hotelTimezone) : 'Immediate',

      <span key={`err-${l.id}`} style={{ color: 'var(--red)', fontSize: '12px' }}>{l.error_message || (l.response_code ? `HTTP ${l.response_code}` : 'Pending retry')}</span>,

      <button key={`act-${l.id}`} className="btn sm brass" onClick={async () => {

        try {

          const res = await api(`/api/webhooks/logs/${l.id}/retry`, { method: 'POST' });

          notify(`✓ Delivery #${l.id} retried: status is now ${res.delivery?.status || 'updated'}`);

          const updated = await api(getWebhookLogsUrl(50)).catch(() => []);

          if (Array.isArray(updated)) setWebhookLogs(updated);

        } catch (err) {

          notify(`Retry notice: ${err.message}`);

        }

      }}>Retry Now</button>

    ]);

  } else if (pathname === '/webhooks/outgoing-logs') {

    dynamicColumns = ['Time', 'Event Type', 'Channel / URL', 'HTTP Status', 'Attempts', 'Result', 'Action'];

    const outgoing = webhookLogs.filter((l) => l.direction === 'outgoing');

    dynamicRows = outgoing.map((l) => [

      <span key={`tm-${l.id}`} title={l.last_attempt_at && l.retry_count > 0 ? `Original Event: ${formatHotelTime(l.created_at, hotelTimezone)}\nLast Attempt: ${formatHotelTime(l.last_attempt_at, hotelTimezone)}` : `Event Time: ${formatHotelTime(l.created_at, hotelTimezone)}`}>

        {formatHotelTime(l.created_at, hotelTimezone)}

      </span>,

      <span className="tag" key={`ev-${l.id}`}>{l.event_type}</span>,

      <div key={`ch-${l.id}`}>

        <b>{l.channel}</b>

        {l.endpoint && <div style={{ fontSize: '11px', color: 'var(--muted)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.endpoint}</div>}

      </div>,

      <Badge key={`st-${l.id}`} color={l.response_code >= 200 && l.response_code < 300 ? 'green' : (l.status === 'Retrying' ? 'brass' : 'red')}>

        {l.status === 'Retrying' ? 'HTTP 500 (Retrying)' : (l.response_code ? `HTTP ${l.response_code}` : 'Pending')}

      </Badge>,

      <Badge key={`att-${l.id}`} color={l.retry_count > 0 ? (l.status === 'Retrying' ? 'brass' : 'red') : 'grey'}>

        {l.retry_count || 0} / {l.max_retries || 3}

      </Badge>,

      <span key={`res-${l.id}`} style={{ fontSize: '12px', color: l.status === 'Success' ? 'var(--green)' : (l.status === 'Retrying' ? 'var(--brass)' : 'var(--red)') }}>

        {l.error_message || l.status}

      </span>,

      l.status !== 'Success' ? (

        <button key={`act-${l.id}`} className="btn sm brass" onClick={async () => {

          try {

            const res = await api(`/api/webhooks/logs/${l.id}/retry`, { method: 'POST' });

            notify(`✓ Delivery #${l.id} manual retry: ${res.delivery?.status}`);

            const updated = await api(getWebhookLogsUrl(50)).catch(() => []);

            if (Array.isArray(updated)) setWebhookLogs(updated);

          } catch (err) {

            notify(`Retry notice: ${err.message}`);

          }

        }}>Retry</button>

      ) : <span key={`ok-${l.id}`} style={{ color: 'var(--green)', fontSize: '12px' }}>✓ Delivered</span>

    ]);

  } else if (pathname === '/webhooks/failed-queue') {

    dynamicColumns = ['Delivery ID', 'Channel / URL', 'Event Type', 'Attempts', 'Error Details', 'Status', 'Action'];

    const failed = webhookLogs.filter((l) => l.status === 'Failed' || (l.response_code && l.response_code >= 400));

    dynamicRows = failed.map((l) => [

      <span className="tag" key={`id-${l.id}`} title={`Failed at: ${formatHotelTime(l.last_attempt_at || l.created_at, hotelTimezone)}`}>#{l.id}</span>,

      <b key={`ch-${l.id}`}>{l.channel}</b>,

      <span className="tag" key={`ev-${l.id}`}>{l.event_type}</span>,

      <Badge key={`att-${l.id}`} color="red" title={l.last_attempt_at ? `Last Attempt: ${formatHotelTime(l.last_attempt_at, hotelTimezone)}` : `Created: ${formatHotelTime(l.created_at, hotelTimezone)}`}>

        {l.retry_count || 0} / {l.max_retries || 3}

      </Badge>,

      <span key={`err-${l.id}`} style={{ color: 'var(--red)', fontSize: '12px' }}>{l.error_message || `HTTP ${l.response_code} Error`}</span>,

      <div key={`st-${l.id}`}>

        <Badge color="red">{l.status}</Badge>

        {(l.last_attempt_at || l.created_at) && (

          <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: 2 }}>

            {formatHotelTime(l.last_attempt_at || l.created_at, hotelTimezone)}

          </div>

        )}

      </div>,

      <button key={`act-${l.id}`} className="btn sm brass" onClick={async () => {

        try {

          const res = await api(`/api/webhooks/logs/${l.id}/retry`, { method: 'POST' });

          notify(`✓ Delivery #${l.id} re-attempted: ${res.delivery?.status}`);

          const updated = await api(getWebhookLogsUrl(50)).catch(() => []);

          if (Array.isArray(updated)) setWebhookLogs(updated);

        } catch (err) {

          notify(`Notice: ${err.message}`);

        }

      }}>Retry</button>

    ]);



  } else if (pathname === '/webhooks/api-key-management') {

    dynamicColumns = ['Key Name', 'API Key', 'Created', 'Last Used', 'Permissions', 'Status', 'Actions'];

    dynamicRows = dbRecords.map((rec) => {

      const fullKey = rec.data?.['API Key'] || rec.data?.['full_key'] || rec.data?.['key'] || rec.data?.['api_key'] || '';

      const isRevoked = (rec.status === 'Revoked' || rec.data?.['Status'] === 'Revoked');

      const keyName = rec.data?.['Key Name'] || rec.title || 'API Key';

      const created = rec.data?.['Created'] || (rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-GB') : '—');

      const lastUsed = rec.data?.['Last Used'] || 'Never';

      const perms = rec.data?.['Permissions'] || 'bookings:read,bookings:write';



      let keyElement;

      if (fullKey && fullKey.length >= 8) {

        const first4 = fullKey.slice(0, 4);

        const last4 = fullKey.slice(-4);

        keyElement = (

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} key={`key-${rec.id}`}>

            <code

              style={{

                fontFamily: 'monospace',

                fontSize: '12px',

                background: 'var(--grey-soft)',

                padding: '3px 8px',

                borderRadius: '6px',

                letterSpacing: '1px',

                color: isRevoked ? 'var(--muted)' : 'var(--ink)',

                textDecoration: isRevoked ? 'line-through' : 'none',

              }}

              title={isRevoked ? 'Revoked API Key' : `API Key: ${first4}...${last4}`}

            >

              {first4}••••••••••••{last4}

            </code>

            <button

              type="button"

              className="btn sm ghost"

              style={{ padding: '2px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}

              onClick={() => handleCopyApiKey(fullKey, keyName)}

              title="Copy complete original API key to clipboard"

            >

              📋 Copy

            </button>

          </div>

        );

      } else {

        const prefix = rec.data?.['Key Prefix'] || 'sf_live';

        keyElement = (

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }} key={`key-${rec.id}`}>

            <code

              style={{

                fontFamily: 'monospace',

                fontSize: '12px',

                background: 'var(--grey-soft)',

                padding: '3px 8px',

                borderRadius: '6px',

                color: 'var(--muted)',

              }}

              title="Full key not available"

            >

              {prefix.slice(0, 4)}•••• (Unavailable)

            </code>

            <button

              type="button"

              className="btn sm brass"

              style={{ padding: '2px 8px', fontSize: '11px', whiteSpace: 'nowrap' }}

              onClick={() => handleRegenerateKey(rec)}

              title="Securely generate and store complete API key"

            >

              ⚡ Generate & Copy Key

            </button>

          </div>

        );

      }



      return [

        <b key={`title-${rec.id}`}>{keyName}</b>,

        keyElement,

        created,

        lastUsed,

        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }} key={`perms-${rec.id}`}>

          {perms.split(',').map((p) => (

            <span

              key={p.trim()}

              style={{

                fontSize: '11px',

                background: 'var(--grey-soft)',

                padding: '1px 6px',

                borderRadius: '4px',

                fontFamily: 'monospace',

              }}

            >

              {p.trim()}

            </span>

          ))}

        </div>,

        <Badge

          key={`status-${rec.id}`}

          color={isRevoked ? 'red' : 'green'}

        >

          {isRevoked ? 'Revoked' : (rec.status || 'Active')}

        </Badge>,

        <div style={{ display: 'flex', gap: '6px' }} key={`act-${rec.id}`}>

          <button

            type="button"

            className="btn sm ghost"

            disabled={!canEdit(pathname)}

            onClick={() => handleEditDbRecord(rec)}

            title="Edit Key Details"

          >

            Edit

          </button>

          <button

            type="button"

            className="btn sm ghost"

            onClick={() => handleRegenerateKey(rec)}

            title="Regenerate a new secure key"

          >

            Regenerate

          </button>

          {!isRevoked ? (

            <button

              type="button"

              className="btn sm ghost"

              style={{ color: 'var(--red)' }}

              onClick={() => handleRevokeKey(rec)}

              title="Revoke this API Key"

            >

              Revoke

            </button>

          ) : (

            <button

              type="button"

              className="btn sm ghost"

              style={{ color: 'var(--red)' }}

              disabled={!canDelete(pathname)}

              onClick={() => handleDeleteDbRecord(rec.id)}

              title="Delete Revoked Key"

            >

              Delete

            </button>

          )}

        </div>

      ];

    });

  } else if (config.type === 'table') {

    // Universal table combining DB operational records and default rows

    const baseCols = (config.columns || []).filter((c) => !['Action', 'Actions', ''].includes(c));

    dynamicColumns = [...baseCols, 'Action'];



    const dbRows = dbRecords.map((rec) => {

      const rowCells = baseCols.map((col) => {

        if (col.toLowerCase() === 'status') {

          return <StatusBadge key={col} status={rec.status || rec.data?.['Status'] || 'Active'} />;

        }

        if (pathname === '/guest-services/amenities-requests') {

          if (col === 'Request ID') {

            const reqId = rec.data?.['Request ID'] || rec.data?.['request_id'] || rec.title?.split(' - ')?.[0] || `AMN-${rec.id}`;

            return <span className="tag" key={col} style={{ fontFamily: 'monospace', fontWeight: 600 }}>{reqId}</span>;

          }

          if (col === 'Time Logged') {

            const timeLogged = rec.data?.['Time Logged'] || (rec.created_at ? new Date(rec.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '—');

            return <span key={col} style={{ color: 'var(--ink)' }}>{timeLogged}</span>;

          }

          if (col === 'Turnaround') {

            const st = (rec.status || rec.data?.['Status'] || '').toLowerCase();

            const isComp = ['completed', 'delivered'].includes(st);

            const val = rec.data?.['Turnaround'] || rec.data?.['turnaround'];

            if (isComp) {

              return <span key={col} style={{ fontWeight: 600, color: 'var(--green, #10B981)' }}>{val || '< 1 min'}</span>;

            }

            return <span key={col} style={{ color: 'var(--brass, #D97706)', fontStyle: 'italic', fontWeight: 500 }}>{val || '— (In Progress)'}</span>;

          }

        }

        if (rec.data) {

          if (rec.data[col] !== undefined && rec.data[col] !== '') return rec.data[col];

          // Check aliases for asset registry

          if (pathname === '/engineering/asset-registry') {

            if ((col === 'Asset Tag #' || col === 'Asset Tag') && (rec.data['Asset Tag'] || rec.data['Asset Tag #'] || rec.title)) {

              return rec.data['Asset Tag'] || rec.data['Asset Tag #'] || rec.title;

            }

            if ((col === 'Equipment Description' || col === 'Asset Name') && (rec.data['Asset Name'] || rec.data['Equipment Description'])) {

              return rec.data['Asset Name'] || rec.data['Equipment Description'];

            }

            if ((col === 'Location' || col === 'Asset / Location') && (rec.data['Asset / Location'] || rec.data['Location'])) {

              return rec.data['Asset / Location'] || rec.data['Location'];

            }

            if ((col === 'Warranty Status' || col === 'Warranty Details') && (rec.data['Warranty Details'] || rec.data['Warranty Status'])) {

              return rec.data['Warranty Details'] || rec.data['Warranty Status'];

            }

            if (col === 'Manufacturer / Model') {

              const m = rec.data['Manufacturer / Model'] || [rec.data['Manufacturer'], rec.data['Model Number']].filter(Boolean).join(' ');

              if (m) return m;

            }

            return '—';

          }

        }

        if (col.toLowerCase().includes('status')) return <StatusBadge key={col} status={rec.status || 'Active'} />;

        if (col.toLowerCase().includes('date') || col.toLowerCase().includes('time')) return rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-GB') : '—';

        return rec.data?.[col] ?? '—';

      });

      rowCells.push(

        <div style={{ display: 'flex', gap: 6 }} key={`db-${rec.id}`}>

          <button

            className="btn sm ghost"

            disabled={!canEdit(pathname)}

            style={!canEdit(pathname) ? { opacity: 0.45, cursor: 'not-allowed' } : {}}

            title={!canEdit(pathname) ? `Edit disabled for ${activeRoleObj?.name || effectiveRole}` : 'Edit record'}

            onClick={() => { if (canEdit(pathname)) handleEditDbRecord(rec); }}

          >

            Edit

          </button>

          <button

            className="btn sm ghost"

            style={{ color: 'var(--red)', ...(!canDelete(pathname) ? { opacity: 0.45, cursor: 'not-allowed' } : {}) }}

            disabled={!canDelete(pathname)}

            title={!canDelete(pathname) ? `Delete disabled for ${activeRoleObj?.name || effectiveRole}` : 'Delete record'}

            onClick={() => { if (canDelete(pathname)) handleDeleteDbRecord(rec.id); }}

          >

            Delete

          </button>

        </div>

      );

      return rowCells;

    });



    const isOperationalTable = Boolean(

      config.formFields ||

      (config.buttons && config.buttons.some(b => /new|create|add|register|log|record|assign|schedule|post|dispatch|issue|file|manual|apply|initiate/i.test(b)))

    );



    if (isOperationalTable) {

      dynamicRows = dbRows;

    } else {

      const deletedIdxs = new Set(deletedRows[pathname] || []);

      const persistedPrimaryValues = new Set(

        dbRecords.map((r) => String(r.data?.[baseCols[0]] || r.title || '').trim().toLowerCase())

      );



      const defaultTableRows = (config.rows || [])

        .map((row, idx) => ({ row, idx }))

        .filter(({ row, idx }) => {

          if (deletedIdxs.has(idx)) return false;

          const primaryVal = String(row[0] || '').trim().toLowerCase();

          if (primaryVal && persistedPrimaryValues.has(primaryVal)) return false;

          return true;

        })

        .map(({ row, idx }) => {

          const rowCells = baseCols.map((col, colIdx) => {

            const val = row[colIdx];

            if (col.toLowerCase() === 'status') {

              return <StatusBadge key={`def-${idx}-${col}`} status={typeof val === 'string' ? val : 'Active'} />;

            }

            return val !== undefined && val !== null ? val : '—';

          });

          rowCells.push(

            <div style={{ display: 'flex', gap: 6 }} key={`def-${idx}`}>

              <button

                className="btn sm ghost"

                disabled={!canEdit(pathname)}

                style={!canEdit(pathname) ? { opacity: 0.45, cursor: 'not-allowed' } : {}}

                title={!canEdit(pathname) ? `Edit disabled for ${activeRoleObj?.name || effectiveRole}` : 'Edit record'}

                onClick={() => { if (canEdit(pathname)) handleEditDefaultRow(row, idx); }}

              >

                Edit

              </button>

              <button

                className="btn sm ghost"

                style={{ color: 'var(--red)', ...(!canDelete(pathname) ? { opacity: 0.45, cursor: 'not-allowed' } : {}) }}

                disabled={!canDelete(pathname)}

                title={!canDelete(pathname) ? `Delete disabled for ${activeRoleObj?.name || effectiveRole}` : 'Delete record'}

                onClick={() => { if (canDelete(pathname)) handleDeleteDefaultRow(idx); }}

              >

                Delete

              </button>

            </div>

          );

          return rowCells;

        });



      dynamicRows = [...dbRows, ...defaultTableRows];

    }

  }



  /* Apply Date Filter if active */

  if (activeDateFilter && dynamicRows && dynamicRows.length > 0) {

    const fromTime = new Date(`${activeDateFilter.fromDate}T00:00:00`).getTime();

    const toTime = new Date(`${activeDateFilter.toDate}T23:59:59.999`).getTime();

    const cols = dynamicColumns || config.columns || [];

    let dateIdx = cols.findIndex((c) => /date|check-in|arrival|stay|time/i.test(String(c)));

    if (dateIdx < 0) dateIdx = 0;



    dynamicRows = dynamicRows.filter((row) => {

      let rawVal = row[dateIdx];

      if (React.isValidElement(rawVal)) {

        rawVal = rawVal.props?.children || '';

        if (typeof rawVal === 'object' && rawVal !== null) {

          rawVal = rawVal.props?.children || '';

        }

      }

      const parsed = parseRowDate(rawVal);

      if (!parsed) return true;

      const t = parsed.getTime();

      return t >= fromTime && t <= toTime;

    });

  }



  if (pathname === '/webhooks/incoming-logs') {

    return <IncomingWebhookLogs />;

  }



  return (

    <>

      {pathname !== '/guest-services' && (

        <button className="back-btn" onClick={() => navigate(parentPath)}>

          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>

          <span>{parentLabel}</span>

        </button>

      )}

      <PageHead title={config.title} subtitle={config.subtitle}>

        {config.buttons && config.buttons.length > 0 && (

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>

            {config.buttons.map((btn, i) => {

              const allowed = isButtonAuthorized(btn);

              return (

                <button

                  key={btn}

                  className={`btn ${i === 0 ? '' : 'ghost'}`}

                  disabled={!allowed}

                  title={!allowed ? `Permission denied for role: ${activeRoleObj?.name || effectiveRole}` : ''}

                  style={!allowed ? { opacity: 0.45, cursor: 'not-allowed' } : {}}

                  onClick={() => {

                    if (allowed) handleButtonClick(btn);

                  }}

                >

                  {!allowed ? '🔒 ' : ''}{btn}

                </button>

              );

            })}

          </div>

        )}

      </PageHead>



      <SubNav parentPath={parentPath} />



      {config.restricted && (

        <div style={{ marginBottom: 18, padding: '12px 16px', background: 'var(--red-soft)', color: 'var(--red)', borderRadius: 10, fontSize: 13, fontWeight: 600 }}>

          🔒 Restricted Access — This section is visible only to authorized staff with security clearance.

        </div>

      )}



      {pathname === '/guest-services' && (

        <AmenitiesOverviewSection />

      )}



      <div className="panel">

        {activeDateFilter && (

          <div style={{

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'space-between',

            padding: '10px 16px',

            background: 'rgba(201, 158, 77, 0.1)',

            border: '1px solid var(--brass, #c99e4d)',

            borderRadius: 8,

            marginBottom: 16,

            fontSize: 13,

          }}>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

              <span>📅</span>

              <span>

                Filtered by date: <b>{activeDateFilter.fromDate}</b> to <b>{activeDateFilter.toDate}</b>

                {' '}({dynamicRows ? dynamicRows.length : 0} {dynamicRows && dynamicRows.length === 1 ? 'record' : 'records'} found)

              </span>

            </div>

            <div style={{ display: 'flex', gap: 8 }}>

              <button type="button" className="btn sm ghost" onClick={openDateFilterModal}>Edit Filter</button>

              <button type="button" className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={handleResetDateFilter}>Reset</button>

            </div>

          </div>

        )}

        {loading ? (

          <div className="empty" style={{ padding: '48px 16px', textAlign: 'center' }}>

            <div className="spinner" style={{ margin: '0 auto 12px' }} />

            <p style={{ color: 'var(--sub, #9ca3af)', fontSize: 14 }}>

              Loading {config.title.toLowerCase()}…

            </p>

          </div>

        ) : loadError ? (

          <div className="empty" style={{ padding: '36px 16px', textAlign: 'center' }}>

            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>

            <h3 style={{ fontSize: 16, color: 'var(--head-color, #fff)', marginBottom: 6 }}>

              Failed to load records

            </h3>

            <p style={{ color: 'var(--red, #ef4444)', fontSize: 13, marginBottom: 16 }}>

              {loadError}

            </p>

            <button className="btn sm primary" onClick={() => refresh()}>

              Retry

            </button>

          </div>

        ) : (

          <>

            {config.type === 'detail' && <DetailView fields={dynamicFields !== undefined ? dynamicFields : []} />}

            {config.type === 'table' && (

              <TableView

                columns={dynamicColumns || config.columns}

                rows={dynamicRows !== null ? dynamicRows : []}

                emptyMessage={

                  pathname === '/front-desk/history'

                    ? (activeDateFilter

                        ? `No check-in or check-out records found between ${activeDateFilter.fromDate} and ${activeDateFilter.toDate}.`

                        : 'No check-in or check-out history recorded yet for this property.')

                    : 'No records found.'

                }

              />

            )}

        {config.type === 'form' && (

          <>

            <FormView

              formFields={config.formFields}

              pathname={pathname}

              notify={notify}

              refresh={refresh}

              rooms={rooms}

              bookings={bookings}

              guests={guests}

              addBooking={addBooking}

              updateBooking={updateBooking}

              updateGuest={updateGuest}

              addRecord={addRecord}

            />

            {pathname === '/bookings/walk-in' && (

              <div style={{ marginTop: 28, borderTop: '1px solid var(--line)', paddingTop: 20 }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

                  <div>

                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Walk-in Reservations</h3>

                    <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>

                      Active and recent walk-in reservations saved in database ({walkInBookings.length} total)

                    </p>

                  </div>

                </div>

                <TableView

                  columns={['Booking ID', 'Guest', 'Room', 'Stay', 'Amount', 'Payment', 'Status', 'Action']}

                  rows={walkInBookings.map((b) => [

                    <span className="tag" key={b.id}>{b.id}</span>,

                    <div key={`g-${b.id}`}>

                      <b>{b.guest}</b>

                      {b.phone && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{b.phone}</span>}

                    </div>,

                    <div key={`r-${b.id}`}>

                      <b>{b.room}</b>

                      {b.room_number && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>Rm {b.room_number}</span>}

                    </div>,

                    `${b.in} – ${b.out}`,

                    inr(b.amt),

                    <StatusBadge key={`p-${b.id}`} status={b.pay} />,

                    <StatusBadge key={`s-${b.id}`} status={b.st} />,

                    <div style={{ display: 'flex', gap: 6 }} key={`act-${b.id}`}>

                      {b.st !== 'Checked-in' && b.st !== 'Checked-out' && (

                        <button className="btn sm" onClick={async () => {

                          await setBookingStatus(b.id, 'Checked-in');

                          notify(`${b.guest} checked in`);

                        }}>Check in</button>

                      )}

                      {b.st === 'Checked-in' && (

                        <button className="btn sm brass" onClick={async () => {

                          await setBookingStatus(b.id, 'Checked-out');

                          notify(`${b.guest} checked out`);

                        }}>Check out</button>

                      )}

                      <button className="btn sm ghost" onClick={() => handleEditBooking(b)}>Edit</button>

                      <button className="btn sm ghost" style={{ color: 'var(--red)' }} onClick={() => {

                        setDeleteConfirm({

                          open: true,

                          title: 'Delete Walk-in Reservation',

                          message: `Are you sure you want to delete reservation ${b.id} for ${b.guest}?`,

                          onConfirm: async () => {

                            await deleteBooking(b.id);

                            notify(`Reservation ${b.id} deleted`);

                          }

                        });

                      }}>Delete</button>

                    </div>

                  ])}

                  emptyMessage="No walk-in reservations recorded yet."

                />

              </div>

            )}

          </>

        )}

        {config.type === 'calendar' && <CalendarView />}

        {config.type === 'settings' && (

          <SettingsView

            settings={config.settings}

            notify={notify}

            pathname={pathname}

            addRecord={addRecord}

          />

        )}

          </>

        )}

      </div>



      {config.type === 'cards' && <CardView cards={dynamicCards !== null ? dynamicCards : []} />}



      {/* ── Guest Modal (Add & Edit Guest in Guest Directory) ── */}

      {guestModalData && (

        <GuestModal

          guest={guestModalData}

          onClose={() => setGuestModalData(null)}

          onSaved={() => {

            setGuestModalData(null);

            refresh();

          }}

        />

      )}



      {/* ── Interactive Modal for Action Buttons & Row Edits ── */}

      {modalOpen && (

        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 16 }}>

          <div className="panel" style={{ width: '100%', maxWidth: 560, background: 'var(--panel)', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

              <h2 style={{ margin: 0, fontSize: 18 }}>{modalTitle}</h2>

              <button type="button" className="btn sm ghost" onClick={() => setModalOpen(false)}>Back</button>

            </div>

            {modalTitle.toLowerCase().includes('service request') && !editingRecord && (

              <div style={{

                background: 'rgba(56, 189, 248, 0.1)',

                border: '1px solid rgba(56, 189, 248, 0.25)',

                borderRadius: 8,

                padding: '10px 14px',

                marginBottom: 16,

                fontSize: 13,

                color: '#38bdf8',

                display: 'flex',

                alignItems: 'center',

                gap: 10

              }}>

                <span style={{ fontSize: 16 }}>ℹ️</span>

                <span><b>Automatic ID:</b> Service Request ID (e.g. SR-2026-00001) will be uniquely generated upon creation by the backend.</span>

              </div>

            )}

            <form onSubmit={handleModalSubmit}>

              <div style={{ display: 'grid', gridTemplateColumns: modalFields.length > 3 ? 'repeat(2, 1fr)' : '1fr', gap: 12 }}>

                {modalFields.map((f) => {

                  const isStatus = f.toLowerCase() === 'status';

                  const isGroupPage = pathname === '/bookings/group';

                  const isRefundPage = pathname === '/bookings/refund';

                  const isPpmPage = pathname === '/engineering/preventive-maintenance' || modalTitle.toLowerCase().includes('ppm');

                  const isAssetPage = pathname === '/engineering/asset-registry' || modalTitle.toLowerCase().includes('asset');

                  const isSafetyPage = pathname === '/engineering/safety-compliance' || modalTitle.toLowerCase().includes('compliance') || modalTitle.toLowerCase().includes('fire');

                  const isKeycardPage = pathname === '/security/keycard-audits' || modalTitle.toLowerCase().includes('keycard') || modalTitle.toLowerCase().includes('door lock');

                  const isHrEmployeePage = (pathname === '/human-resources' || pathname === '/human-resources/employee-directory') || ((modalTitle.toLowerCase().includes('employee') || modalTitle.toLowerCase().includes('staff')) && !modalTitle.toLowerCase().includes('payslip'));

                  const isWorkOrderPage = pathname === '/engineering/work-orders' || modalTitle.toLowerCase().includes('work order');

                  const isEnergyPage = pathname === '/engineering/energy-utility' || modalTitle.toLowerCase().includes('meter reading') || modalTitle.toLowerCase().includes('energy');

                  const isRoomInspectionPage = pathname === '/engineering/room-inspections' || modalTitle.toLowerCase().includes('room inspection');

                  const isHvacPage = pathname === '/engineering/hvac-controls' || modalTitle.toLowerCase().includes('hvac') || modalTitle.toLowerCase().includes('chiller') || modalTitle.toLowerCase().includes('setpoint');

                  const isFbOverviewPage = pathname === '/food-beverage' || modalTitle.toLowerCase().includes('food & beverage') || modalTitle.toLowerCase().includes('order / bill');

                  const isBanquetPage = pathname === '/food-beverage/banquets' || modalTitle.toLowerCase().includes('beo') || modalTitle.toLowerCase().includes('banquet');



                  // Food & Beverage Overview Outlet Dropdown

                  if (isFbOverviewPage && f === 'Outlet / Department') {

                    const outlets = [

                      'The Saffron Royale (Fine Dining)',

                      'Café Heritage (All-Day Dining)',

                      'In-Room Dining (IRD)',

                      'The Polo Bar & Cellar',

                      'Grand Kohinoor Banquets'

                    ];

                    const hasError = Boolean(modalErrors[f]);

                    return (

                      <div className="field" key={f}>

                        <label>

                          {f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span>

                        </label>

                        <select

                          id="fb-field-outlet"

                          name={f}

                          value={modalValues[f] ?? outlets[0]}

                          style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)' } : undefined}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        >

                          {outlets.map(o => <option key={o} value={o}>{o}</option>)}

                        </select>

                        {hasError && (

                          <span style={{ color: 'var(--red, #ef4444)', fontSize: '11px', marginTop: 4, display: 'block', fontWeight: 500 }}>

                            {modalErrors[f]}

                          </span>

                        )}

                      </div>

                    );

                  }



                  // Banquet Venue Dropdown

                  if (isBanquetPage && f === 'Banquet Venue') {

                    const venues = [

                      'Kohinoor Ballroom',

                      'Gulmohar Hall',

                      'Royal Lawn & Poolside',

                      'Sheesh Mahal Banquet',

                      'Summit Boardroom'

                    ];

                    return (

                      <div className="field" key={f}>

                        <label>{f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span></label>

                        <select

                          id="banquet-field-venue"

                          name={f}

                          value={modalValues[f] ?? venues[0]}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {venues.map(v => <option key={v} value={v}>{v}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // Banquet Status Dropdown

                  if (isBanquetPage && f === 'Status') {

                    const statuses = ['Kitchen Ready', 'Setup Complete', 'Menu Finalized', 'In Progress', 'Completed'];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id="banquet-field-status"

                          name={f}

                          value={modalValues[f] ?? 'Kitchen Ready'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // Safety & Fire Compliance Audit Status Dropdown

                  if (isSafetyPage && f === 'Audit Status') {

                    const statuses = ['Fully Compliant', 'Valid License', 'Renewal Pending', 'Notice Issued', 'Non-Compliant'];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`safety-field-status`}

                          name={f}

                          value={modalValues[f] ?? 'Fully Compliant'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // Security Keycard Audit Lock Result Dropdown

                  if (isKeycardPage && f === 'Lock Result') {

                    const lockResults = ['Access Granted', 'Access Denied (Card Expired)', 'Access Denied (Invalid Room)', 'Access Denied (Blacklisted)'];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`keycard-field-lock-result`}

                          name={f}

                          value={modalValues[f] ?? 'Access Granted'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {lockResults.map(lr => <option key={lr} value={lr}>{lr}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // Security Keycard Audit Keycard Type Dropdown

                  if (isKeycardPage && f === 'Keycard Type') {

                    const cardTypes = ['Guest Keycard', 'Butler Master Key', 'Admin Staff Card', 'Housekeeping Master', 'Vendor Card'];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`keycard-field-card-type`}

                          name={f}

                          value={modalValues[f] ?? 'Guest Keycard'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {cardTypes.map(ct => <option key={ct} value={ct}>{ct}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // Security Keycard Audit Room / Door ID Select (Scoped to Tenant's Rooms)

                  if (isKeycardPage && (f === 'Room / Door ID' || f === 'Room')) {

                    const hasError = Boolean(modalErrors[f]);

                    return (

                      <div className="field" key={f}>

                        <label>

                          {f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span>

                        </label>

                        <select

                          id={`keycard-field-room`}

                          name={f}

                          value={modalValues[f] ?? ''}

                          style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)' } : undefined}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        >

                          <option value="">Select Room / Door ID</option>

                          <option value="Main Hotel Gate & Porch">Main Hotel Gate & Porch</option>

                          <option value="Server Room IT Vault">Server Room IT Vault</option>

                          <option value="Basement Plant Room">Basement Plant Room</option>

                          <option value="Executive Lounge Access">Executive Lounge Access</option>

                          {rooms && rooms.map(r => (

                            <option key={r.id} value={`Room ${r.n}`}>Room {r.n} — Floor {r.f} ({r.type})</option>

                          ))}

                        </select>

                        {hasError && (

                          <span style={{ color: 'var(--red, #ef4444)', fontSize: '11px', marginTop: 4, display: 'block', fontWeight: 500 }}>

                            {modalErrors[f]}

                          </span>

                        )}

                      </div>

                    );

                  }



                  // HR Employee Department Dropdown

                  if (isHrEmployeePage && f === 'Department') {

                    const depts = [

                      'Front Office',

                      'Food & Beverage Service',

                      'Culinary / Kitchen',

                      'Housekeeping',

                      'Engineering',

                      'Security',

                      'Finance',

                      'Human Resources',

                      'Sales & Marketing',

                      'Management'

                    ];

                    return (

                      <div className="field" key={f}>

                        <label>{f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span></label>

                        <select

                          id={`hr-field-dept`}

                          name={f}

                          value={modalValues[f] ?? 'Front Office'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {depts.map(d => <option key={d} value={d}>{d}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // HR Employee Status Dropdown

                  if (isHrEmployeePage && (f === 'Employment Status' || f === 'Status')) {

                    const statuses = ['Active', 'On Probation', 'On Leave', 'Contract', 'Resigned'];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`hr-field-status`}

                          name={f}

                          value={modalValues[f] ?? 'Active'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // Work Order Priority Dropdown

                  if (isWorkOrderPage && f === 'Priority') {

                    const priorities = ['Low', 'Normal', 'Medium', 'High', 'Urgent'];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`wo-field-priority`}

                          name={f}

                          value={modalValues[f] ?? 'Normal'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {priorities.map(p => <option key={p} value={p}>{p}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // Work Order Status Dropdown

                  if (isWorkOrderPage && f === 'Status') {

                    const statuses = ['In Progress', 'Pending Parts', 'Completed', 'Cancelled'];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`wo-field-status`}

                          name={f}

                          value={modalValues[f] ?? 'In Progress'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {statuses.map(s => <option key={s} value={s}>{s}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // Work Order Issue Description Textarea

                  if (isWorkOrderPage && f === 'Issue Description') {

                    const hasError = Boolean(modalErrors[f]);

                    return (

                      <div className="field" key={f} style={{ gridColumn: '1 / -1' }}>

                        <label>

                          {f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span>

                        </label>

                        <textarea

                          id={`wo-field-desc`}

                          name={f}

                          rows={2}

                          value={modalValues[f] ?? ''}

                          placeholder="Detailed description of the issue"

                          style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)', width: '100%', boxSizing: 'border-box' } : { width: '100%', boxSizing: 'border-box' }}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        />

                        {hasError && (

                          <span style={{ color: 'var(--red, #ef4444)', fontSize: '11px', marginTop: 4, display: 'block', fontWeight: 500 }}>

                            {modalErrors[f]}

                          </span>

                        )}

                      </div>

                    );

                  }



                  // Energy Utility Resource Select

                  if (isEnergyPage && f === 'Utility Resource') {

                    const resources = [

                      'Grid Power (Main HT Meter)',

                      'Diesel Fuel (DG Backup Testing)',

                      'Municipal Fresh Water Supply',

                      'STP Recycled Water (Gardening/Flushing)',

                      'Commercial LPG / Natural Gas',

                      'Solar PV Power Generation'

                    ];

                    const hasError = Boolean(modalErrors[f]);

                    return (

                      <div className="field" key={f}>

                        <label>

                          {f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span>

                        </label>

                        <select

                          id={`energy-field-resource`}

                          name={f}

                          value={modalValues[f] ?? ''}

                          style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)' } : undefined}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        >

                          <option value="">Select Utility Resource</option>

                          {resources.map(r => <option key={r} value={r}>{r}</option>)}

                        </select>

                        {hasError && (

                          <span style={{ color: 'var(--red, #ef4444)', fontSize: '11px', marginTop: 4, display: 'block', fontWeight: 500 }}>

                            {modalErrors[f]}

                          </span>

                        )}

                      </div>

                    );

                  }



                  // Room Inspection Room Select (Scoped to Current Hotel Rooms)

                  if (isRoomInspectionPage && f === 'Room #') {

                    const hasError = Boolean(modalErrors[f]);

                    return (

                      <div className="field" key={f}>

                        <label>

                          {f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span>

                        </label>

                        <select

                          id={`room-insp-field-room`}

                          name={f}

                          value={modalValues[f] ?? ''}

                          style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)' } : undefined}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        >

                          <option value="">Select Room</option>

                          {rooms && rooms.map(r => (

                            <option key={r.id} value={`Room ${r.n}`}>Room {r.n} — Floor {r.f} ({r.type})</option>

                          ))}

                        </select>

                        {hasError && (

                          <span style={{ color: 'var(--red, #ef4444)', fontSize: '11px', marginTop: 4, display: 'block', fontWeight: 500 }}>

                            {modalErrors[f]}

                          </span>

                        )}

                      </div>

                    );

                  }



                  // Room Inspection Handover Sign-off Dropdown

                  if (isRoomInspectionPage && f === 'Handover Sign-off') {

                    const signoffs = ['Approved for Guest', 'Pending Maintenance', 'Rejected'];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`room-insp-field-signoff`}

                          name={f}

                          value={modalValues[f] ?? 'Approved for Guest'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {signoffs.map(s => <option key={s} value={s}>{s}</option>)}

                        </select>

                      </div>

                    );

                  }



                  // HVAC Status Dropdown

                  if (isHvacPage && f === 'Status') {

                    const hvacStatuses = ['Running Optimal', 'Auto Mode', 'Manual Setpoint', 'Standby', 'Under Maintenance'];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`hvac-field-status`}

                          name={f}

                          value={modalValues[f] ?? 'Running Optimal'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                          }}

                        >

                          {hvacStatuses.map(s => <option key={s} value={s}>{s}</option>)}

                        </select>

                      </div>

                    );

                  }



                  if (isAssetPage && f === 'Asset Category') {

                    const categories = [

                      'HVAC & Climate Control',

                      'Electrical & Power (DG/UPS)',

                      'Plumbing & Water Systems',

                      'Kitchen & F&B Equipment',

                      'Elevators & Escalators',

                      'Fire & Life Safety',

                      'IT & Telecommunications',

                      'Laundry Equipment',

                      'Building Automation & BMS',

                      'General Facility Assets'

                    ];

                    const hasError = Boolean(modalErrors[f]);

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`asset-field-${f.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}

                          name={f}

                          value={modalValues[f] ?? ''}

                          style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)' } : undefined}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        >

                          <option value="">Select Asset Category</option>

                          {categories.map((cat) => (

                            <option key={cat} value={cat}>{cat}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  if (isAssetPage && (f === 'Warranty Details' || f === 'Warranty Status')) {

                    const warrantyOptions = [

                      'Under Active AMC',

                      'Under Manufacturer Warranty',

                      'Under Extended Warranty',

                      'Out of Warranty',

                      'Under Repair',

                      'Decommissioned'

                    ];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`asset-field-${f.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}

                          name={f}

                          value={modalValues[f] ?? 'Under Active AMC'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        >

                          {warrantyOptions.map((opt) => (

                            <option key={opt} value={opt}>{opt}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  if (isAssetPage && f === 'Status') {

                    const statusOptions = [

                      'Under Active AMC',

                      'Active',

                      'Operational',

                      'Under Maintenance',

                      'Standby',

                      'Decommissioned'

                    ];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          id={`asset-field-${f.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}

                          name={f}

                          value={modalValues[f] ?? 'Under Active AMC'}

                          onChange={(e) => {

                            const val = e.target.value;

                            setModalValues(prev => ({ ...prev, [f]: val }));

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        >

                          {statusOptions.map((st) => (

                            <option key={st} value={st}>{st}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  if (isStatus && isPpmPage) {

                    const ppmStatuses = ['Scheduled', 'Due Today', 'In Progress', 'Completed', 'Overdue'];

                    const currentStatus = ppmStatuses.find(s => s.toLowerCase() === (modalValues[f] || '').toLowerCase()) || modalValues[f] || 'Scheduled';

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          value={currentStatus}

                          onChange={(e) => {

                            setModalValues({ ...modalValues, [f]: e.target.value });

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        >

                          {ppmStatuses.map((st) => (

                            <option key={st} value={st}>{st}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  if (isPpmPage && f === 'Frequency') {

                    const frequencies = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Bi-Annual', 'Annual'];

                    const hasError = Boolean(modalErrors[f]);

                    return (

                      <div className="field" key={f}>

                        <label>

                          {f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span>

                        </label>

                        <select

                          value={modalValues[f] ?? ''}

                          style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)' } : undefined}

                          onChange={(e) => {

                            setModalValues({ ...modalValues, [f]: e.target.value });

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        >

                          <option value="" disabled>Select Frequency</option>

                          {frequencies.map((freq) => (

                            <option key={freq} value={freq}>{freq}</option>

                          ))}

                        </select>

                        {hasError && (

                          <span style={{ color: 'var(--red, #ef4444)', fontSize: '11px', marginTop: 4, display: 'block', fontWeight: 500 }}>

                            {modalErrors[f]}

                          </span>

                        )}

                      </div>

                    );

                  }



                  if (isPpmPage && (f === 'Last Serviced' || f === 'Next Due Date')) {

                    const hasError = Boolean(modalErrors[f]);

                    const isNextDue = f === 'Next Due Date';

                    return (

                      <div className="field" key={f}>

                        <label>

                          {f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span>

                        </label>

                        <input

                          type="date"

                          value={modalValues[f] ?? ''}

                          min={isNextDue ? (modalValues['Last Serviced'] || undefined) : undefined}

                          style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)' } : undefined}

                          onChange={(e) => {

                            setModalValues({ ...modalValues, [f]: e.target.value });

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        />

                        {hasError && (

                          <span style={{ color: 'var(--red, #ef4444)', fontSize: '11px', marginTop: 4, display: 'block', fontWeight: 500 }}>

                            {modalErrors[f]}

                          </span>

                        )}

                      </div>

                    );

                  }



                  if (isPpmPage && f === 'Checklist Items') {

                    const hasError = Boolean(modalErrors[f]);

                    return (

                      <div className="field" key={f} style={{ gridColumn: '1 / -1' }}>

                        <label>

                          {f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span>

                        </label>

                        <textarea

                          rows={2}

                          value={modalValues[f] ?? ''}

                          placeholder="e.g. Refrigerant pressure check, oil filter replacement, coil rinse"

                          style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)', width: '100%', boxSizing: 'border-box' } : { width: '100%', boxSizing: 'border-box' }}

                          onChange={(e) => {

                            setModalValues({ ...modalValues, [f]: e.target.value });

                            if (modalErrors[f]) {

                              setModalErrors(prev => { const n = { ...prev }; delete n[f]; return n; });

                            }

                          }}

                        />

                        {hasError && (

                          <span style={{ color: 'var(--red, #ef4444)', fontSize: '11px', marginTop: 4, display: 'block', fontWeight: 500 }}>

                            {modalErrors[f]}

                          </span>

                        )}

                      </div>

                    );

                  }



                  if (isStatus && isGroupPage) {

                    const groupStatuses = ['Confirmed', 'Pending', 'Cancelled'];

                    const currentStatus = groupStatuses.find(s => s.toLowerCase() === (modalValues[f] || '').toLowerCase()) || modalValues[f] || groupStatuses[0];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          value={currentStatus}

                          onChange={(e) => setModalValues({ ...modalValues, [f]: e.target.value })}

                        >

                          {modalValues[f] && !groupStatuses.map(s => s.toLowerCase()).includes((modalValues[f] || '').toLowerCase()) && (

                            <option value={modalValues[f]}>{modalValues[f]}</option>

                          )}

                          {groupStatuses.map((st) => (

                            <option key={st} value={st}>{st}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  if (isStatus && isRefundPage) {

                    const refundStatuses = ['Pending', 'Under review', 'Processed'];

                    const currentStatus = refundStatuses.find(s => s.toLowerCase() === (modalValues[f] || '').toLowerCase()) || modalValues[f] || refundStatuses[0];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          value={currentStatus}

                          onChange={(e) => setModalValues({ ...modalValues, [f]: e.target.value })}

                        >

                          {modalValues[f] && !refundStatuses.map(s => s.toLowerCase()).includes((modalValues[f] || '').toLowerCase()) && (

                            <option value={modalValues[f]}>{modalValues[f]}</option>

                          )}

                          {refundStatuses.map((st) => (

                            <option key={st} value={st}>{st}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  if (isStatus && pathname === '/front-desk/additional-charges') {

                    const chargeStatuses = ['Pending', 'Added to Bill', 'Paid'];

                    const currentStatus = chargeStatuses.find(s => s.toLowerCase() === (modalValues[f] || '').toLowerCase()) || modalValues[f] || chargeStatuses[0];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          value={currentStatus}

                          onChange={(e) => setModalValues({ ...modalValues, [f]: e.target.value })}

                        >

                          {modalValues[f] && !chargeStatuses.map(s => s.toLowerCase()).includes((modalValues[f] || '').toLowerCase()) && (

                            <option value={modalValues[f]}>{modalValues[f]}</option>

                          )}

                          {chargeStatuses.map((st) => (

                            <option key={st} value={st}>{st}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  if (isStatus) {

                    const isAmenityPage = pathname === '/guest-services/amenities-requests';

                    const isBookingContext = Boolean(editingRecord?._isBooking || pathname.startsWith('/bookings') || pathname.startsWith('/front-desk'));

                    const validStatuses = isAmenityPage

                      ? ['Pending', 'In Progress', 'Dispatched', 'Completed', 'Cancelled']

                      : isBookingContext

                      ? ['Confirmed', 'Pending', 'Cancelled', 'Checked-in', 'Checked-out', 'Modified', 'No-show']

                      : ['Active', 'Inactive', 'Pending', 'Confirmed'];

                    const currentStatus = validStatuses.find(s => s.toLowerCase() === (modalValues[f] || '').toLowerCase()) || modalValues[f] || validStatuses[0];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          value={currentStatus}

                          onChange={(e) => setModalValues({ ...modalValues, [f]: e.target.value })}

                        >

                          {modalValues[f] && !validStatuses.map(s => s.toLowerCase()).includes((modalValues[f] || '').toLowerCase()) && (

                            <option value={modalValues[f]}>{modalValues[f]}</option>

                          )}

                          {validStatuses.map((st) => (

                            <option key={st} value={st}>{st}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  const isRoomType = f.toLowerCase().includes('room type');

                  if (isRoomType) {

                    const currentVal = modalValues[f] || roomOptions[0];

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          value={currentVal}

                          onChange={(e) => setModalValues({ ...modalValues, [f]: e.target.value })}

                        >

                          {roomOptions.map((opt) => (

                            <option key={opt} value={opt}>{opt}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  const isRoleField = f.toLowerCase() === 'role' || (pathname.startsWith('/staff') && f.toLowerCase().includes('role'));

                  if (isRoleField) {

                    const currentVal = availableStaffRoles.find(r => r.toLowerCase() === (modalValues[f] || '').toLowerCase()) || modalValues[f] || availableStaffRoles[0];



                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          value={currentVal}

                          onChange={(e) => {

                            const chosen = e.target.value;

                            const deptMatch = getDepartmentForRole(chosen);

                            setModalValues(prev => ({

                              ...prev,

                              [f]: chosen,

                              Role: chosen,

                              Department: deptMatch,

                              department: deptMatch

                            }));

                          }}

                        >

                          {modalValues[f] && !availableStaffRoles.map(r => r.toLowerCase()).includes((modalValues[f] || '').toLowerCase()) && (

                            <option value={modalValues[f]}>{modalValues[f]}</option>

                          )}

                          {availableStaffRoles.map((r) => (

                            <option key={r} value={r}>{r}</option>

                          ))}

                        </select>

                      </div>

                    );

                  }



                  const isDeptField = f.toLowerCase() === 'department' && (pathname.startsWith('/staff') || (modalTitle && modalTitle.toLowerCase().includes('staff')));

                  if (isDeptField) {

                    const currentRole = modalValues['Role'] || modalValues['role'] || '';

                    const defaultDept = getDepartmentForRole(currentRole);

                    const currentVal = modalValues[f] !== undefined && modalValues[f] !== '' ? modalValues[f] : defaultDept;

                    return (

                      <div className="field" key={f}>

                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                          <span>{f}</span>

                          <span style={{ fontSize: 11, color: 'var(--teal, #14b8a6)', fontWeight: 600 }}>

                            ⚡ Auto-detected

                          </span>

                        </label>

                        <input

                          type="text"

                          value={currentVal}

                          onChange={(e) => setModalValues(prev => ({ ...prev, [f]: e.target.value, Department: e.target.value }))}

                          placeholder="Auto-detected department"

                          required

                        />

                      </div>

                    );

                  }



                  const isChargeType = f.toLowerCase() === 'charge type' || f.toLowerCase().includes('charge type');

                  if (isChargeType) {

                    const chargeOptions = ['Extra Bed', 'Laundry', 'Room Service', 'Late Check-out', 'Others'];

                    const currentVal = chargeOptions.find(o => o.toLowerCase() === (modalValues[f] || '').toLowerCase()) || (modalValues[f] ? 'Others' : chargeOptions[0]);

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          value={currentVal}

                          onChange={(e) => setModalValues({ ...modalValues, [f]: e.target.value })}

                        >

                          {chargeOptions.map((opt) => (

                            <option key={opt} value={opt}>{opt}</option>

                          ))}

                        </select>

                        {currentVal === 'Others' && (

                          <input

                            type="text"

                            style={{ marginTop: 8 }}

                            placeholder="Specify charge type"

                            value={modalValues[`${f}_custom`] || (chargeOptions.includes(modalValues[f]) ? '' : modalValues[f]) || ''}

                            onChange={(e) => setModalValues({ ...modalValues, [`${f}_custom`]: e.target.value })}

                            required

                          />

                        )}

                      </div>

                    );

                  }



                  const isIdType = f.toLowerCase() === 'id type' || f.toLowerCase() === 'id proof type' || f.toLowerCase().includes('id type') || f.toLowerCase().includes('id proof type');

                  if (isIdType) {

                    const idOptions = ['Aadhaar Card', 'Driving Licence', 'Passport', 'Voter ID', 'Others'];

                    const PREDEFINED_OPTS = ['Aadhaar Card', 'Driving Licence', 'Passport', 'Voter ID'];

                    const rawVal = modalValues[f];

                    let currentVal = 'Aadhaar Card';

                    if (rawVal) {

                      if (PREDEFINED_OPTS.some(o => o.toLowerCase() === rawVal.toLowerCase())) {

                        currentVal = PREDEFINED_OPTS.find(o => o.toLowerCase() === rawVal.toLowerCase()) || rawVal;

                      } else {

                        currentVal = 'Others';

                      }

                    }

                    const customVal = modalValues[`${f}_custom`] || modalValues['Specify ID Type'] || (!PREDEFINED_OPTS.some(o => o.toLowerCase() === (rawVal || '').toLowerCase()) && rawVal !== 'Others' ? rawVal : '') || '';

                    return (

                      <div className="field" key={f}>

                        <label>{f} <span style={{ color: 'var(--red, #ef4444)' }}>*</span></label>

                        <select

                          value={currentVal}

                          onChange={(e) => {

                            const newType = e.target.value;

                            const nextVals = { ...modalValues, [f]: newType };

                            if (newType !== 'Others') {

                              delete nextVals[`${f}_custom`];

                              delete nextVals['Specify ID Type'];

                            }

                            setModalValues(nextVals);

                          }}

                        >

                          {idOptions.map((opt) => (

                            <option key={opt} value={opt}>{opt}</option>

                          ))}

                        </select>

                        {currentVal === 'Others' && (

                          <div style={{ marginTop: 8 }}>

                            <label style={{ fontSize: 12, fontWeight: 600 }}>Specify ID Type <span style={{ color: 'var(--red, #ef4444)' }}>*</span></label>

                            <input

                              type="text"

                              style={{ marginTop: 4 }}

                              placeholder="Specify ID type (e.g. PAN Card, Green Card)"

                              value={customVal}

                              onChange={(e) => setModalValues({ ...modalValues, [f]: 'Others', [`${f}_custom`]: e.target.value, 'Specify ID Type': e.target.value })}

                              required

                            />

                          </div>

                        )}

                      </div>

                    );

                  }



                  const isDiscountType = f.toLowerCase() === 'discount type' || f.toLowerCase().includes('discount type');

                  if (isDiscountType) {

                    const currentVal = (modalValues[f] || '').toLowerCase().includes('fix') ? 'Fixed Amount (₹)' : 'Percentage (%)';

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <select

                          value={currentVal}

                          onChange={(e) => setModalValues({ ...modalValues, [f]: e.target.value })}

                        >

                          <option value="Percentage (%)">Percentage (%)</option>

                          <option value="Fixed Amount (₹)">Fixed Amount (₹)</option>

                        </select>

                      </div>

                    );

                  }



                  const isDiscountValue = f.toLowerCase() === 'discount value' || (pathname.startsWith('/offers') && f.toLowerCase().includes('discount') && !f.toLowerCase().includes('type'));

                  if (isDiscountValue) {

                    const dt = modalValues['Discount Type'] || modalValues['discount_type'] || '';

                    const isFixed = dt.includes('Fixed') || dt.includes('₹') || String(modalValues[f] || '').includes('₹');

                    return (

                      <div className="field" key={f}>

                        <label>{f} ({isFixed ? '₹' : '%'})</label>

                        <input

                          type="number"

                          min="0.01"

                          max={isFixed ? undefined : "100"}

                          step="0.01"

                          placeholder={isFixed ? 'Enter amount in ₹ (e.g. 500)' : 'Enter percentage (e.g. 15)'}

                          value={modalValues[f] !== undefined ? String(modalValues[f]).replace(/[^0-9.]/g, '') : ''}

                          onChange={(e) => setModalValues({ ...modalValues, [f]: e.target.value })}

                          required

                        />

                      </div>

                    );

                  }



                  const isGuestId = f.toLowerCase() === 'guest id' || f.toLowerCase().includes('guest id');

                  if (isGuestId) {

                    return (

                      <div className="field" key={f}>

                        <label>{f} <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 500 }}>(Auto-Generated)</span></label>

                        <input

                          type="text"

                          value={modalValues[f] || ''}

                          disabled

                          readOnly

                          style={{ opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255,255,255,0.06)' }}

                        />

                      </div>

                    );

                  }



                  const isRequestId = f.toLowerCase().includes('service request id') || f.toLowerCase() === 'request id';

                  if (isRequestId) {

                    return (

                      <div className="field" key={f}>

                        <label>{f} <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 500 }}>(Auto-Generated)</span></label>

                        <input

                          type="text"

                          value={modalValues[f] || ''}

                          disabled

                          readOnly

                          style={{ opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255,255,255,0.06)' }}

                        />

                      </div>

                    );

                  }



                  const isRefId = (f.toLowerCase() === 'ref id' || f.toLowerCase() === 'reference id' || f.toLowerCase().includes('ref id')) && (pathname === '/guest-services/concierge' || (modalTitle && modalTitle.toLowerCase().includes('concierge')));

                  if (isRefId) {

                    const currentRefVal = modalValues[f] || (editingRecord?.data?.['Ref ID'] || editingRecord?.title) || generateConciergeRefId();

                    return (

                      <div className="field" key={f}>

                        <label>{f} <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 500 }}>(Auto-Generated)</span></label>

                        <input

                          type="text"

                          value={currentRefVal}

                          disabled

                          readOnly

                          style={{ opacity: 0.8, cursor: 'not-allowed', background: 'rgba(255,255,255,0.06)' }}

                        />

                      </div>

                    );

                  }



                  const isConcierge = pathname === '/guest-services/concierge' || (modalTitle && modalTitle.toLowerCase().includes('concierge'));



                  if (isConcierge && f.toLowerCase() === 'guest name') {

                    const guestSuggestions = Array.from(new Set([

                      ...(guests || []).map(g => g.full_name).filter(Boolean),

                      ...(bookings || []).map(b => b.guest).filter(Boolean)

                    ])).slice(0, 100);



                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <input

                          type="text"

                          list="concierge-guest-suggestions"

                          value={modalValues[f] || ''}

                          onChange={(e) => handleConciergeGuestChange(e.target.value)}

                          placeholder="Select or enter guest name"

                          autoComplete="off"

                          required

                        />

                        <datalist id="concierge-guest-suggestions">

                          {guestSuggestions.map((name) => (

                            <option key={name} value={name} />

                          ))}

                        </datalist>

                      </div>

                    );

                  }



                  if (isConcierge && f.toLowerCase() === 'room') {

                    const isFound = conciergeRoomStatus?.status === 'found' && !manualRoomOverride;

                    const isNotFound = conciergeRoomStatus?.status === 'not_found' || (!modalValues[f] && conciergeRoomStatus?.status);

                    const isSearching = conciergeRoomStatus?.status === 'searching';



                    if (isFound && modalValues[f]) {

                      return (

                        <div className="field" key={f}>

                          <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                            <span>{f}</span>

                            <span style={{ fontSize: 11, color: 'var(--teal, #14b8a6)', fontWeight: 600 }}>

                              ⚡ Auto-Detected Active Stay

                            </span>

                          </label>

                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>

                            <input

                              type="text"

                              value={modalValues[f]}

                              disabled

                              readOnly

                              style={{

                                opacity: 0.95,

                                background: 'rgba(20, 184, 166, 0.08)',

                                borderColor: 'var(--teal, #14b8a6)',

                                fontWeight: 600,

                                flex: 1,

                                cursor: 'default'

                              }}

                            />

                            <button

                              type="button"

                              className="btn sm ghost"

                              onClick={() => setManualRoomOverride(true)}

                              title="Override or change room"

                              style={{ fontSize: 11, padding: '6px 10px', whiteSpace: 'nowrap' }}

                            >

                              Change Room

                            </button>

                          </div>

                          {conciergeRoomStatus?.message && (

                            <div style={{ fontSize: 11, color: 'var(--teal, #14b8a6)', marginTop: 4, fontWeight: 500 }}>

                              {conciergeRoomStatus.message}

                            </div>

                          )}

                        </div>

                      );

                    }



                    // Not found or manual selection mode

                    return (

                      <div className="field" key={f}>

                        <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

                          <span>{f}</span>

                          {isSearching ? (

                            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>

                              Detecting active room...

                            </span>

                          ) : (

                            <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600 }}>

                              ⚠️ No active room found

                            </span>

                          )}

                        </label>

                        <select

                          value={modalValues[f] || ''}

                          onChange={(e) => {

                            const val = e.target.value;

                            const matched = rooms.find(r => `Room ${r.n}` === val || String(r.id) === val || String(r.n) === val);

                            setModalValues(prev => ({

                              ...prev,

                              [f]: val,

                              room_id: matched ? matched.id : null,

                              room_number: matched ? String(matched.n || matched.number) : null

                            }));

                          }}

                          style={{

                            borderColor: isNotFound ? '#f59e0b' : undefined,

                            background: isNotFound ? 'rgba(245, 158, 11, 0.05)' : undefined

                          }}

                          required

                        >

                          <option value="">-- No active room found (Select Room or Non-Resident) --</option>

                          <option value="Non-Resident / No Room">Non-Resident / No Room</option>

                          {rooms.map((r) => (

                            <option key={r.id} value={`Room ${r.n}`}>

                              Room {r.n} — Floor {r.f} ({r.type})

                            </option>

                          ))}

                        </select>

                        <div style={{ fontSize: 11, color: isSearching ? 'var(--muted)' : '#f59e0b', marginTop: 4 }}>

                          {isSearching ? 'Checking guest active reservation…' : 'Guest has no active stay. Select an assigned room from the hotel or select Non-Resident.'}

                        </div>

                      </div>

                    );

                  }



                  const isPassword = f.toLowerCase().includes('password');

                  if (isPassword) {

                    const isShown = Boolean(showPassword[f]);

                    const isConfirm = f.toLowerCase().includes('confirm');

                    return (

                      <div className="field" key={f}>

                        <label>{f}</label>

                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>

                          <input

                            type={isShown ? 'text' : 'password'}

                            value={modalValues[f] || ''}

                            onChange={(e) => setModalValues({ ...modalValues, [f]: e.target.value })}

                            placeholder={isConfirm ? 'Confirm password' : 'Enter new password'}

                            autoComplete="new-password"

                            required

                            style={{ width: '100%', paddingRight: 38 }}

                          />

                          <button

                            type="button"

                            onClick={() => setShowPassword((p) => ({ ...p, [f]: !p[f] }))}

                            style={{

                              position: 'absolute',

                              right: 10,

                              background: 'transparent',

                              border: 'none',

                              cursor: 'pointer',

                              padding: 4,

                              display: 'flex',

                              alignItems: 'center',

                              justifyContent: 'center',

                              color: 'var(--sub, #9ca3af)',

                              opacity: 0.75,

                              transition: 'opacity 0.2s',

                            }}

                            onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}

                            onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.75')}

                            title={isShown ? 'Hide password' : 'Show password'}

                            aria-label={isShown ? 'Hide password' : 'Show password'}

                          >

                            {isShown ? (

                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

                                <path d="M17.94 17.94A10 10 0 0 1 12 20C5 20 1 12 1 12a17 17 0 0 1 5.06-5.94M9.9 4.24A9 9 0 0 1 12 4c7 0 11 8 11 8a17 17 0 0 1-2.16 3.19" />

                                <line x1="1" y1="1" x2="23" y2="23" />

                              </svg>

                            ) : (

                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">

                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />

                                <circle cx="12" cy="12" r="3" />

                              </svg>

                            )}

                          </button>

                        </div>

                      </div>

                    );

                  }



                  const isNumber = !f.toLowerCase().includes('type') && (f.toLowerCase().includes('amount') || f.toLowerCase().includes('rate') || (f.toLowerCase().includes('charge') && !f.toLowerCase().includes('type')) || f.toLowerCase().includes('rooms') || f.toLowerCase().includes('stays'));

                  const isDate = f.toLowerCase().includes('date') || f.toLowerCase().includes('check-in') || f.toLowerCase().includes('check-out');

                  const isEmail = f.toLowerCase().includes('email') || f.toLowerCase().includes('contact');

                  // When editing an existing booking, its original (possibly past) dates must stay valid; any change is checked on save.

                  const lockMin = !isDate || !isBookingDateField(f) || (editingRecord && editingRecord._isBooking && f === 'Check-in');



                  const isNetSalary = f === 'Net Salary (₹)';

                  const isPpmMandatory = isPpmPage && ['PPM Task ID', 'Asset / Location', 'Frequency', 'Last Serviced', 'Next Due Date', 'Checklist Items'].includes(f);

                  const isAssetMandatory = isAssetPage && ['Asset Tag', 'Asset Tag #', 'Asset Name', 'Equipment Description'].includes(f);

                  const isWorkOrderMandatory = isWorkOrderPage && ['WO #', 'Location', 'Issue Description'].includes(f);

                  const isEnergyMandatory = isEnergyPage && ['Utility Resource', 'Daily Consumption', 'Target Benchmark', 'Unit Cost (₹)'].includes(f);

                  const isRoomInspectionMandatory = isRoomInspectionPage && ['Inspection ID', 'Room #', 'Inspect Date', 'Inspector'].includes(f);

                  const isHvacMandatory = isHvacPage && ['AHU / Chiller Unit', 'Zone Monitored', 'Set Temperature'].includes(f);

                  const isSafetyMandatory = isSafetyPage && ['Compliance Item', 'Statutory Authority', 'Inspection Date', 'Certificate Valid Until', 'Safety Officer'].includes(f);

                  const isKeycardMandatory = isKeycardPage && ['Audit Log ID', 'Room / Door ID', 'Holder / User ID'].includes(f);

                  const isHrMandatory = isHrEmployeePage && ['Employee Code', 'Emp Code', 'Full Name', 'Name', 'Department', 'Designation', 'Role', 'Phone'].includes(f);



                  const isRequiredField = isPpmMandatory || isAssetMandatory || isWorkOrderMandatory || isEnergyMandatory || isRoomInspectionMandatory || isHvacMandatory || isSafetyMandatory || isKeycardMandatory || isHrMandatory || f.toLowerCase().includes('name') || f.toLowerCase().includes('id') || f.toLowerCase().includes('salary') || f.toLowerCase().includes('month') || f.toLowerCase().includes('amount') || f.toLowerCase().includes('department');

                  const hasError = Boolean(modalErrors[f]);

                  return (

                    <div className="field" key={f}>

                      <label>

                        {f} {isRequiredField && <span style={{ color: 'var(--red, #ef4444)' }}>*</span>}

                        {isNetSalary && <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 500, marginLeft: 6 }}>(Auto-Calculated)</span>}

                      </label>

                      <input

                        id={`field-${f.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}

                        name={f}

                        type={isEmail ? 'email' : isDate ? 'date' : isNumber ? 'number' : 'text'}

                        value={modalValues[f] ?? ''}

                        readOnly={isNetSalary}

                        style={hasError ? { borderColor: 'var(--red, #ef4444)', boxShadow: '0 0 0 1px var(--red, #ef4444)' } : undefined}

                        onChange={(e) => {

                          const val = e.target.value;

                          setModalValues(prev => {

                            const next = { ...prev, [f]: val };

                            if (['Basic Salary (₹)', 'Allowances (₹)', 'Deductions (₹)'].includes(f)) {

                              const basic = parseFloat(f === 'Basic Salary (₹)' ? val : (next['Basic Salary (₹)'] || 0)) || 0;

                              const allowances = parseFloat(f === 'Allowances (₹)' ? val : (next['Allowances (₹)'] || 0)) || 0;

                              const deductions = parseFloat(f === 'Deductions (₹)' ? val : (next['Deductions (₹)'] || 0)) || 0;

                              const net = Math.max(0, basic + allowances - deductions);

                              next['Net Salary (₹)'] = String(net);

                            }

                            return next;

                          });

                          if (modalErrors[f]) {

                            setModalErrors(prev => {

                              const updated = { ...prev };

                              delete updated[f];

                              return updated;

                            });

                          }

                        }}

                        placeholder={`Enter ${f.toLowerCase()}`}

                        required={isRequiredField && !isNetSalary}

                        {...(isNumber ? { min: '0', step: '0.01' } : (!lockMin ? { min: todayISO() } : {}))}

                      />

                      {hasError && (

                        <span style={{ color: 'var(--red, #ef4444)', fontSize: '11px', marginTop: 4, display: 'block', fontWeight: 500 }}>

                          {modalErrors[f]}

                        </span>

                      )}

                    </div>

                  );

                })}

              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>

                <button type="button" className="btn ghost" onClick={() => { setModalOpen(false); setModalErrors({}); }}>Cancel</button>

                <button type="submit" className="btn" disabled={savingModal}>

                  {savingModal ? 'Saving…' : (modalTitle.toLowerCase().includes('filter') ? 'Apply Filter' : 'Save to Database')}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}



      {/* ── Assign Room Modal ── */}

      {assignModalOpen && assigningBooking && (

        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'grid', placeItems: 'center', zIndex: 9999, padding: 16 }}>

          <div className="panel" style={{ width: '100%', maxWidth: 440, background: 'var(--panel)', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

              <h2 style={{ margin: 0, fontSize: 18 }}>Assign Room: {assigningBooking.guest}</h2>

              <button type="button" className="btn sm ghost" onClick={() => setAssignModalOpen(false)}>Back</button>

            </div>

            <form onSubmit={handleConfirmAssignment}>

              <div className="field" style={{ marginBottom: 14 }}>

                <label>Select Room ({assigningBooking.room})</label>

                <select

                  value={selectedRoomId}

                  onChange={(e) => setSelectedRoomId(e.target.value)}

                  required

                >

                  {rooms.map((r) => (

                    <option key={r.id} value={r.id}>

                      Room {r.n} — Floor {r.f} ({r.type}) [{r.s === 'vac' ? 'Vacant' : r.s}]

                    </option>

                  ))}

                </select>

              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>

                <button type="button" className="btn ghost" onClick={() => setAssignModalOpen(false)}>Cancel</button>

                <button type="submit" className="btn">Confirm Assignment</button>

              </div>

            </form>

          </div>

        </div>

      )}





      {/* ── Delete Confirmation Dialog ── */}

      {deleteConfirm.open && (

        <div

          className="modal-backdrop"

          onClick={() => setDeleteConfirm({ open: false, title: '', message: '', onConfirm: null })}

          style={{

            position: 'fixed',

            inset: 0,

            background: 'rgba(0,0,0,0.6)',

            display: 'flex',

            alignItems: 'center',

            justifyContent: 'center',

            zIndex: 99999

          }}

        >

          <div

            className="modal-card"

            onClick={(e) => e.stopPropagation()}

            style={{

              background: 'var(--bg-panel, #1e222d)',

              padding: 24,

              borderRadius: 12,

              width: '90%',

              maxWidth: 440,

              border: '1px solid var(--border, #333)',

              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'

            }}

          >

            <h3 style={{ margin: '0 0 10px', fontSize: 18, color: 'var(--head-color, #fff)' }}>

              {deleteConfirm.title || 'Confirm Deletion'}

            </h3>

            <p style={{ margin: '0 0 20px', color: 'var(--sub, #9ca3af)', fontSize: 14, lineHeight: 1.5 }}>

              {deleteConfirm.message || 'Are you sure you want to delete this record? This action cannot be undone.'}

            </p>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>

              <button

                type="button"

                className="btn ghost"

                onClick={() => setDeleteConfirm({ open: false, title: '', message: '', onConfirm: null })}

              >

                Cancel

              </button>

              <button

                type="button"

                className="btn danger"

                style={{ background: 'var(--red, #e53e3e)', color: '#fff', border: 'none' }}

                onClick={async () => {

                  const fn = deleteConfirm.onConfirm;

                  setDeleteConfirm({ open: false, title: '', message: '', onConfirm: null });

                  if (fn) await fn();

                }}

              >

                Delete

              </button>

            </div>

          </div>

        </div>

      )}



      {/* ── Interactive Date Filter Modal ── */}

      {dateFilterModalOpen && (

        <div

          className="modal-backdrop"

          style={{

            position: 'fixed',

            inset: 0,

            background: 'rgba(0,0,0,0.5)',

            display: 'grid',

            placeItems: 'center',

            zIndex: 9999,

            padding: 16,

          }}

        >

          <div

            className="panel"

            style={{

              width: '100%',

              maxWidth: 460,

              background: 'var(--panel)',

              borderRadius: 12,

              boxShadow: '0 10px 40px rgba(0,0,0,0.2)',

            }}

          >

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>

              <h2 style={{ margin: 0, fontSize: 18 }}>Filter by Date</h2>

              <button

                type="button"

                className="btn sm ghost"

                onClick={handleCancelDateFilter}

                aria-label="Back"

              >

                Back

              </button>

            </div>

            <form onSubmit={handleApplyDateFilter}>

              {dateFilterError && (

                <div

                  style={{

                    padding: '10px 14px',

                    background: 'rgba(239, 68, 68, 0.12)',

                    border: '1px solid var(--red, #ef4444)',

                    color: 'var(--red, #ef4444)',

                    borderRadius: 8,

                    fontSize: 13,

                    marginBottom: 16,

                    display: 'flex',

                    alignItems: 'center',

                    gap: 8,

                  }}

                >

                  <span>⚠️</span>

                  <span>{dateFilterError}</span>

                </div>

              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>

                <div className="field">

                  <label htmlFor="filter-from-date">From Date</label>

                  <input

                    id="filter-from-date"

                    type="date"

                    value={dateFilterForm.fromDate}

                    onChange={(e) => {

                      setDateFilterForm((prev) => ({ ...prev, fromDate: e.target.value }));

                      setDateFilterError('');

                    }}

                  />

                </div>

                <div className="field">

                  <label htmlFor="filter-to-date">To Date</label>

                  <input

                    id="filter-to-date"

                    type="date"

                    value={dateFilterForm.toDate}

                    onChange={(e) => {

                      setDateFilterForm((prev) => ({ ...prev, toDate: e.target.value }));

                      setDateFilterError('');

                    }}

                  />

                </div>

              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>

                <button

                  type="button"

                  className="btn ghost"

                  onClick={handleCancelDateFilter}

                >

                  Cancel

                </button>

                <button

                  type="button"

                  className="btn ghost"

                  onClick={handleResetDateFilter}

                >

                  Reset

                </button>

                <button

                  type="submit"

                  className="btn primary"

                >

                  Apply Filter

                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </>

  );

}

