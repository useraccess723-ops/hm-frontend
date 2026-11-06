import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import { useRbac } from '../../context/RbacContext';
import PageHead from '../../components/PageHead';
import SubNav from '../../components/SubNav';
import { StatusBadge } from '../../components/Badge';

// Amenity configuration details
export const AMENITY_CONFIGS = {
  wifi: {
    key: 'wifi',
    apiType: 'wifi',
    name: 'Wi-Fi',
    fullName: 'Wi-Fi Networks & Internet',
    subtitle: 'Manage guest and public Wi-Fi networks, access credentials, speeds and coverage zones',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
        <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
    ),
    columns: ['Network / SSID', 'Coverage Area', 'Access & Credentials', 'Bandwidth Speed', 'Status', 'Notes', 'Actions'],
    defaultValues: {
      network_name: '',
      coverage_area: 'Lobby & Public Areas',
      password: '',
      speed: '100 Mbps High-Speed',
      status: 'Available',
      notes: ''
    }
  },
  ac: {
    key: 'ac',
    apiType: 'ac',
    name: 'Air Conditioning (AC)',
    fullName: 'Air Conditioning (AC) Management',
    subtitle: 'Room climate control, temperature calibration, HVAC maintenance and status',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20"></path>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    ),
    isRoomSpecific: true,
    columns: ['Room Number', 'AC Unit Type', 'Temp Setting', 'Maintenance Status', 'Availability Status', 'Notes', 'Actions'],
    defaultValues: {
      room_number: '',
      ac_type: 'Split Inverter AC (1.5 Ton)',
      temperature_setting: '22°C',
      maintenance_status: 'Operational - Filter Clean',
      status: 'Available',
      notes: ''
    }
  },
  tv: {
    key: 'tv',
    apiType: 'tv',
    name: 'Television (TV)',
    fullName: 'Television (TV) Systems',
    subtitle: 'In-room smart TVs, entertainment streaming packages, remotes and hardware diagnostics',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
        <polyline points="17 2 12 7 7 2"></polyline>
      </svg>
    ),
    isRoomSpecific: true,
    columns: ['Room Number', 'TV Screen & Model', 'Channels & OTT Services', 'Remote Status', 'Maintenance Status', 'Availability Status', 'Actions'],
    defaultValues: {
      room_number: '',
      tv_type: 'Samsung 55" 4K UHD Smart TV',
      channels_services: 'Tata Play HD, Netflix, Prime Video, YouTube',
      remote_status: 'Working (Magic Remote)',
      maintenance_status: 'Operational',
      status: 'Available',
      notes: ''
    }
  },
  'swimming-pool': {
    key: 'swimming-pool',
    apiType: 'swimming_pool',
    name: 'Swimming Pool',
    fullName: 'Swimming Pool & Aquatic Facilities',
    subtitle: 'Rooftop, lap and recreational pools, water quality parameters, lifeguards and safety logs',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c1.66 0 3-1.34 3-3s1.34-3 3-3 3 1.34 3 3 1.34 3 3 3 3-1.34 3-3 1.34-3 3-3 3 1.34 3 3"></path>
        <path d="M2 18c1.66 0 3-1.34 3-3s1.34-3 3-3 3 1.34 3 3 1.34 3 3 3 3-1.34 3-3 1.34-3 3-3 3 1.34 3 3"></path>
      </svg>
    ),
    columns: ['Pool Name', 'Pool Type', 'Operating Hours', 'Capacity', 'Safety & Water Status', 'Availability Status', 'Maintenance Notes', 'Actions'],
    defaultValues: {
      pool_name: '',
      pool_type: 'Infinity Rooftop Pool',
      opening_time: '06:00 AM',
      closing_time: '10:00 PM',
      capacity: '35 Persons',
      safety_status: 'Lifeguard On Duty • pH 7.4 Balanced',
      status: 'Available',
      maintenance_notes: ''
    }
  },
  gym: {
    key: 'gym',
    apiType: 'gym',
    name: 'Gym',
    fullName: 'Gym & Fitness Center',
    subtitle: 'Cardio equipment, strength training stations, personal trainer schedules and sanitization',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6.5 6.5h11"></path>
        <path d="M6.5 17.5h11"></path>
        <path d="M6 3v18"></path>
        <path d="M18 3v18"></path>
        <path d="M3 7v10"></path>
        <path d="M21 7v10"></path>
      </svg>
    ),
    columns: ['Gym Center Name', 'Available Equipment', 'Operating Hours', 'Capacity', 'Availability Status', 'Maintenance Notes', 'Actions'],
    defaultValues: {
      gym_name: '',
      equipment: 'Treadmills (4x), Dumbbells (2-35kg), Cable Crossover, Smith Machine, Exercise Bikes',
      opening_time: '05:30 AM',
      closing_time: '11:00 PM',
      capacity: '30 Persons',
      status: 'Available',
      maintenance_notes: ''
    }
  },
  parking: {
    key: 'parking',
    apiType: 'parking',
    name: 'Parking',
    fullName: 'Valet & Parking Facilities',
    subtitle: 'Underground bays, outdoor valet lots, EV rapid charging stations and availability counts',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <path d="M9 17V7h4a3 3 0 0 1 0 6H9"></path>
      </svg>
    ),
    columns: ['Parking Facility Type', 'Total Bays', 'Available Bays', 'Location / Level', 'Tariff / Charges', 'Status', 'Notes', 'Actions'],
    defaultValues: {
      parking_type: 'Covered Basement Parking',
      total_spaces: '50',
      available_spaces: '22',
      parking_location: 'Basement Level B1 & B2',
      parking_charges: 'Complimentary for Residents / ₹150 Day Pass',
      status: 'Available',
      notes: ''
    }
  },
  spa: {
    key: 'spa',
    apiType: 'spa',
    name: 'Spa',
    fullName: 'Spa & Wellness Services',
    subtitle: 'Ayurvedic rituals, Swedish massages, beauty therapies, therapist scheduling and pricing',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
      </svg>
    ),
    columns: ['Service Name', 'Duration', 'Price', 'Available Time Slots', 'Booking Status', 'Availability Status', 'Notes', 'Actions'],
    defaultValues: {
      service_name: '',
      description: 'Relaxing holistic body therapy using certified organic essential botanical extracts.',
      duration: '60 Mins',
      price: '₹3,500',
      time_slots: '10:00 AM, 12:30 PM, 03:00 PM, 05:30 PM, 08:00 PM',
      booking_status: 'Available',
      status: 'Available',
      notes: ''
    }
  }
};

export default function AmenitiesManagement({ amenityType }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { notify } = useStore();
  const { canCreate, canEdit, canDelete } = useRbac();

  // Resolve config for this amenity
  const currentKey = amenityType || (pathname.split('/')[2] || 'wifi');
  const config = AMENITY_CONFIGS[currentKey] || AMENITY_CONFIGS.wifi;

  // Data states
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [roomFilter, setRoomFilter] = useState('ALL');

  // Modal states
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | 'view' | 'ticket' | null
  const [activeItem, setActiveItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState({});

  // Ticket modal form
  const [ticketForm, setTicketForm] = useState({
    guest_name: '',
    room_number: '',
    service_type: '',
    priority: 'Normal',
    assigned_to: 'Guest Services Officer',
    request_details: ''
  });

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState({ open: false, item: null });

  // Fetch rooms for room-specific amenities
  useEffect(() => {
    let isMounted = true;
    api('/api/rooms')
      .then((res) => {
        if (isMounted && Array.isArray(res)) {
          setRooms(res);
        }
      })
      .catch((err) => console.error('Failed to load rooms:', err));
    return () => { isMounted = false; };
  }, []);

  // Fetch amenities from backend
  const fetchAmenities = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = config.apiType;
      const data = await api(`/api/amenities?type=${typeParam}`);
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.error('Failed to load amenities:', err);
      notify(err.message || 'Error loading amenities from database', 'error');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [config.apiType, notify]);

  useEffect(() => {
    fetchAmenities();
  }, [fetchAmenities]);

  // Derived KPI statistics
  const stats = useMemo(() => {
    const total = items.length;
    const available = items.filter(i => (i.status || '').toLowerCase() === 'available' || (i.status || '').toLowerCase() === 'active').length;
    const maintenance = items.filter(i => (i.status || '').toLowerCase().includes('maint')).length;
    const other = total - available - maintenance;
    return { total, available, maintenance, other };
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const details = item.details || {};
      const status = item.status || 'Available';
      
      // Status filter
      if (statusFilter !== 'ALL') {
        if (status.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }

      // Room filter (if applicable)
      if (config.isRoomSpecific && roomFilter !== 'ALL') {
        const itemRoom = String(item.room_number || details.room_number || '');
        if (itemRoom !== roomFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const strFields = [
          item.name,
          item.room_number,
          item.status,
          details.network_name,
          details.coverage_area,
          details.speed,
          details.ac_type,
          details.maintenance_status,
          details.tv_type,
          details.channels_services,
          details.pool_name,
          details.gym_name,
          details.parking_type,
          details.parking_location,
          details.service_name,
          details.notes,
          details.maintenance_notes
        ].filter(Boolean).map(v => String(v).toLowerCase());

        return strFields.some(v => v.includes(q));
      }

      return true;
    });
  }, [items, searchQuery, statusFilter, roomFilter, config.isRoomSpecific]);

  // Form handling: Open Add
  const handleOpenAdd = () => {
    const initial = {
      ...config.defaultValues,
      pricing_type: 'included_in_tariff',
      price: 0,
      rules: '',
      image_url: ''
    };
    if (config.isRoomSpecific && rooms.length > 0) {
      initial.room_number = rooms[0].number;
      initial.room_id = rooms[0].id;
    }
    setFormData(initial);
    setFormErrors({});
    setActiveItem(null);
    setModalMode('add');
  };

  // Form handling: Open Edit
  const handleOpenEdit = (item) => {
    const details = item.details || {};
    const populated = {
      ...details,
      name: item.name,
      status: item.status,
      room_number: item.room_number || details.room_number || '',
      room_id: item.room_id || null,
      pricing_type: item.pricing_type || details.pricing_type || 'included_in_tariff',
      price: item.price !== undefined ? item.price : (details.price ? String(details.price).replace(/[^0-9.]/g, '') : 0),
      rules: item.rules || details.rules || '',
      image_url: item.image_url || details.image_url || ''
    };
    setFormData(populated);
    setFormErrors({});
    setActiveItem(item);
    setModalMode('edit');
  };

  // Form handling: Open View
  const handleOpenView = (item) => {
    setActiveItem(item);
    setModalMode('view');
  };

  // Form handling: Open Ticket/Request
  const handleOpenTicket = (item) => {
    const details = item.details || {};
    setActiveItem(item);
    setTicketForm({
      guest_name: '',
      room_number: item.room_number || details.room_number || '',
      service_type: `${config.name} Service & Assistance`,
      priority: 'Normal',
      assigned_to: 'Duty Concierge',
      request_details: `Guest requested service assistance for ${item.name} (${config.name}).`
    });
    setFormErrors({});
    setModalMode('ticket');
  };

  // Validate Form
  const validateForm = () => {
    const errors = {};
    if (config.key === 'wifi') {
      if (!formData.network_name?.trim()) errors.network_name = 'Wi-Fi Network / SSID name is required';
      if (!formData.coverage_area?.trim()) errors.coverage_area = 'Coverage Area is required';
      if (!formData.speed?.trim()) errors.speed = 'Speed indicator is required';
    } else if (config.key === 'ac') {
      if (!formData.room_number?.trim()) errors.room_number = 'Room Number selection is required';
      if (!formData.ac_type?.trim()) errors.ac_type = 'AC Type is required';
      if (!formData.temperature_setting?.trim()) errors.temperature_setting = 'Temperature Setting is required';
    } else if (config.key === 'tv') {
      if (!formData.room_number?.trim()) errors.room_number = 'Room Number selection is required';
      if (!formData.tv_type?.trim()) errors.tv_type = 'TV Model & Type is required';
      if (!formData.channels_services?.trim()) errors.channels_services = 'Available channels/services are required';
    } else if (config.key === 'swimming-pool') {
      if (!formData.pool_name?.trim()) errors.pool_name = 'Pool Name is required';
      if (!formData.capacity?.trim()) errors.capacity = 'Capacity is required';
    } else if (config.key === 'gym') {
      if (!formData.gym_name?.trim()) errors.gym_name = 'Gym Name is required';
      if (!formData.equipment?.trim()) errors.equipment = 'Equipment details are required';
    } else if (config.key === 'parking') {
      if (!formData.parking_type?.trim()) errors.parking_type = 'Parking Type is required';
      if (!formData.total_spaces || Number(formData.total_spaces) <= 0) errors.total_spaces = 'Valid total spaces required';
      if (formData.available_spaces === undefined || Number(formData.available_spaces) < 0) errors.available_spaces = 'Valid available spaces required';
    } else if (config.key === 'spa') {
      if (!formData.service_name?.trim()) errors.service_name = 'Spa Service Name is required';
      if (!formData.price?.trim()) errors.price = 'Price is required';
      if (!formData.duration?.trim()) errors.duration = 'Duration is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save Add / Edit
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      notify('Please resolve highlighted form errors', 'error');
      return;
    }

    setSubmitting(true);
    try {
      // Build amenity name and payload
      let finalName = '';
      if (config.key === 'wifi') finalName = formData.network_name.trim();
      else if (config.key === 'ac') finalName = `Room ${formData.room_number} AC`;
      else if (config.key === 'tv') finalName = `Room ${formData.room_number} TV`;
      else if (config.key === 'swimming-pool') finalName = formData.pool_name.trim();
      else if (config.key === 'gym') finalName = formData.gym_name.trim();
      else if (config.key === 'parking') finalName = formData.parking_type.trim();
      else if (config.key === 'spa') finalName = formData.service_name.trim();

      // Find room id if room-specific
      let matchedRoomId = formData.room_id || null;
      if (config.isRoomSpecific && formData.room_number) {
        const found = rooms.find(r => String(r.number) === String(formData.room_number));
        if (found) matchedRoomId = found.id;
      }

      const payload = {
        amenity_type: config.apiType,
        name: finalName,
        room_id: matchedRoomId,
        room_number: formData.room_number || null,
        status: formData.status || 'Available',
        pricing_type: formData.pricing_type || 'included_in_tariff',
        price: parseFloat(formData.price || 0) || 0.0,
        rules: formData.rules || '',
        image_url: formData.image_url || '',
        details: {
          ...formData,
          availability_status: formData.status || 'Available'
        }
      };

      if (modalMode === 'add') {
        await api('/api/amenities', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        notify(`"${finalName}" successfully added to ${config.name}`);
      } else if (modalMode === 'edit') {
        await api(`/api/amenities/${activeItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        notify(`"${finalName}" successfully updated in database`);
      }

      setModalMode(null);
      await fetchAmenities();
    } catch (err) {
      console.error('Failed to save amenity:', err);
      notify(err.message || 'Error saving amenity to database', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Item
  const handleDeleteConfirm = async () => {
    if (!deleteModal.item) return;
    setSubmitting(true);
    try {
      await api(`/api/amenities/${deleteModal.item.id}`, { method: 'DELETE' });
      notify(`"${deleteModal.item.name}" deleted successfully`);
      setDeleteModal({ open: false, item: null });
      await fetchAmenities();
    } catch (err) {
      console.error('Delete error:', err);
      notify(err.message || 'Error deleting amenity record', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Guest Request
  const handleSubmitTicket = async (e) => {
    e.preventDefault();
    if (!ticketForm.guest_name.trim()) {
      setFormErrors({ guest_name: 'Guest Name is required to log a service ticket' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await api(`/api/amenities/${activeItem.id}/request`, {
        method: 'POST',
        body: JSON.stringify(ticketForm)
      });
      notify(`Service Ticket #${res.request_id || ''} logged in Guest Services workflow!`);
      setModalMode(null);
    } catch (err) {
      console.error('Ticket error:', err);
      notify(err.message || 'Error logging guest service ticket', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle show/hide password
  const togglePass = (id) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="amenities-management-page">
      <style>{`
        .amenities-management-page .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .amenities-management-page .stat-card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          transition: transform 0.15s ease, border-color 0.15s ease;
        }
        .amenities-management-page .stat-card:hover {
          transform: translateY(-2px);
          border-color: var(--brass);
        }
        .amenities-management-page .stat-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(180, 133, 47, 0.12);
          color: var(--brass);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .amenities-management-page .stat-content b {
          font-family: var(--head);
          font-size: 24px;
          line-height: 1.1;
          display: block;
          color: var(--ink);
        }
        .amenities-management-page .stat-content span {
          font-size: 12px;
          color: var(--muted);
          font-weight: 500;
        }
        .amenities-filter-bar {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 12px 12px 0 0;
          border-bottom: none;
        }
        .amenities-filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          align-items: center;
        }
        .amenities-search-box {
          position: relative;
          min-width: 260px;
        }
        .amenities-search-box input {
          width: 100%;
          padding: 8px 32px 8px 12px;
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 8px;
          color: var(--ink);
          font-size: 13px;
        }
        .amenities-search-box .clear-btn {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
          font-size: 12px;
        }
        .amenity-table-panel {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 0 0 12px 12px;
          overflow: hidden;
        }
        .amenity-tag {
          font-weight: 600;
          font-size: 13px;
          color: var(--teal);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .amenity-badge-avail {
          background: var(--green-soft);
          color: var(--green);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
        }
        .amenity-badge-maint {
          background: var(--brass-soft);
          color: var(--brass);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
        }
        .amenity-badge-off {
          background: var(--red-soft);
          color: var(--red);
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
        }
        .amenity-action-btns {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        /* Modal Backdrop */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 18, 27, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .amenity-modal-content {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 14px;
          width: 100%;
          max-width: 640px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          animation: popModal 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes popModal {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .modal-header {
          padding: 18px 24px;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .modal-header h3 {
          font-size: 18px;
          font-family: var(--head);
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .modal-close-btn {
          background: none;
          border: none;
          font-size: 20px;
          color: var(--muted);
          cursor: pointer;
          line-height: 1;
        }
        .modal-body {
          padding: 24px;
        }
        .modal-footer {
          padding: 16px 24px;
          border-top: 1px solid var(--line);
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          background: rgba(0,0,0,0.02);
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }
        .form-group {
          margin-bottom: 16px;
        }
        .form-group label {
          display: block;
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 9px 12px;
          background: var(--bg);
          border: 1px solid var(--line);
          border-radius: 8px;
          color: var(--ink);
          font-family: inherit;
          font-size: 13px;
        }
        .form-group textarea {
          min-height: 70px;
          resize: vertical;
        }
        .form-error-msg {
          color: var(--red);
          font-size: 11px;
          margin-top: 4px;
          display: block;
        }
        .pwd-reveal-row {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .kv-view-grid {
          display: grid;
          grid-template-columns: 140px 1fr;
          gap: 12px 16px;
          font-size: 13px;
        }
        .kv-view-grid dt {
          color: var(--muted);
          font-weight: 600;
        }
        .kv-view-grid dd {
          color: var(--ink);
          margin: 0;
          word-break: break-word;
        }
      `}</style>

      {/* Page Header */}
      <PageHead
        title={config.fullName}
        subtitle={config.subtitle}
      >
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn ghost sm"
            onClick={() => navigate('/guest-services')}
            title="Return to Guest Services Overview"
          >
            ← Guest Services Overview
          </button>
          <button
            className="btn ghost sm"
            onClick={fetchAmenities}
            disabled={loading}
          >
            {loading ? 'Refreshing...' : '🔄 Refresh Data'}
          </button>
          {canCreate('/guest-services') && (
            <button
              className="btn primary sm"
              onClick={handleOpenAdd}
              style={{ background: 'var(--brass)', borderColor: 'var(--brass)', color: '#13243A', fontWeight: 600 }}
            >
              + Add {config.name}
            </button>
          )}
        </div>
      </PageHead>

      {/* Sub-Navigation Bar */}
      <SubNav parentPath="/guest-services" />

      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            {config.icon}
          </div>
          <div className="stat-content">
            <b>{stats.total}</b>
            <span>Total {config.name} Units</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
            ✓
          </div>
          <div className="stat-content">
            <b>{stats.available}</b>
            <span>Available & Active</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--brass-soft)', color: 'var(--brass)' }}>
            ⚙
          </div>
          <div className="stat-content">
            <b>{stats.maintenance}</b>
            <span>In Maintenance</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--blue-soft)', color: 'var(--blue)' }}>
            ★
          </div>
          <div className="stat-content">
            <b>{items.length > 0 ? `${Math.round((stats.available / (items.length || 1)) * 100)}%` : '100%'}</b>
            <span>Service Operational Rate</span>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="amenities-filter-bar">
        <div className="amenities-search-box">
          <input
            type="text"
            placeholder={`Search ${config.name} records (Name, Room, Status, Notes)...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-btn" onClick={() => setSearchQuery('')}>✕</button>
          )}
        </div>

        <div className="amenities-filter-group">
          {config.isRoomSpecific && (
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}
            >
              <option value="ALL">All Rooms</option>
              {rooms.map(r => (
                <option key={r.id} value={r.number}>Room {r.number} ({r.type})</option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink)' }}
          >
            <option value="ALL">All Availability Statuses</option>
            <option value="Available">Available / Active</option>
            <option value="Maintenance">Maintenance / Servicing</option>
            <option value="Unavailable">Unavailable / Offline</option>
          </select>

          <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
            Showing <b>{filteredItems.length}</b> of {items.length} records
          </span>
        </div>
      </div>

      {/* Dynamic Data Table */}
      <div className="amenity-table-panel">
        <div className="tw">
          <table>
            <thead>
              <tr>
                {config.columns.map((col, idx) => (
                  <th key={idx}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={config.columns.length} style={{ textAlign: 'center', padding: '36px', color: 'var(--muted)' }}>
                    Fetching {config.name} records from database...
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={config.columns.length} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                    No {config.name} records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const d = item.details || {};
                  const isAvail = (item.status || '').toLowerCase() === 'available' || (item.status || '').toLowerCase() === 'active';
                  const isMaint = (item.status || '').toLowerCase().includes('maint');
                  const statusCls = isAvail ? 'amenity-badge-avail' : isMaint ? 'amenity-badge-maint' : 'amenity-badge-off';

                  return (
                    <tr key={item.id}>
                      {/* WI-FI Specific Columns */}
                      {config.key === 'wifi' && (
                        <>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ color: 'var(--brass)' }}>📶</span>
                              <b>{d.network_name || item.name}</b>
                            </div>
                          </td>
                          <td>{d.coverage_area || 'Entire Hotel'}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <code>
                                {showPassword[item.id] ? (d.password || 'Open Access') : '••••••••••••'}
                              </code>
                              <button
                                type="button"
                                className="btn ghost sm"
                                style={{ padding: '2px 6px', fontSize: 11 }}
                                onClick={() => togglePass(item.id)}
                              >
                                {showPassword[item.id] ? 'Hide' : 'Show'}
                              </button>
                            </div>
                          </td>
                          <td>
                            <span className="amenity-tag">⚡ {d.speed || '100 Mbps'}</span>
                          </td>
                          <td>
                            <span className={statusCls}>{item.status}</span>
                          </td>
                          <td style={{ maxWidth: 220, fontSize: 12, color: 'var(--muted)' }}>
                            {d.notes || '—'}
                          </td>
                        </>
                      )}

                      {/* AC Specific Columns */}
                      {config.key === 'ac' && (
                        <>
                          <td>
                            <span className="tag" style={{ fontWeight: 700 }}>
                              Room {item.room_number || d.room_number || 'General'}
                            </span>
                          </td>
                          <td>{d.ac_type || 'Split Inverter'}</td>
                          <td>
                            <b style={{ color: 'var(--teal)' }}>{d.temperature_setting || '22°C'}</b>
                          </td>
                          <td>
                            <span style={{ fontSize: 12, color: d.maintenance_status?.includes('Due') ? 'var(--red)' : 'inherit' }}>
                              {d.maintenance_status || 'Operational'}
                            </span>
                          </td>
                          <td>
                            <span className={statusCls}>{item.status}</span>
                          </td>
                          <td style={{ maxWidth: 200, fontSize: 12, color: 'var(--muted)' }}>
                            {d.notes || '—'}
                          </td>
                        </>
                      )}

                      {/* TV Specific Columns */}
                      {config.key === 'tv' && (
                        <>
                          <td>
                            <span className="tag" style={{ fontWeight: 700 }}>
                              Room {item.room_number || d.room_number || 'General'}
                            </span>
                          </td>
                          <td>
                            <b>{d.tv_type || item.name}</b>
                          </td>
                          <td style={{ maxWidth: 260, fontSize: 12 }}>
                            {d.channels_services || 'Standard HD Cable'}
                          </td>
                          <td>
                            <span className="amenity-tag">🎮 {d.remote_status || 'Working'}</span>
                          </td>
                          <td>
                            <span style={{ fontSize: 12 }}>{d.maintenance_status || 'Operational'}</span>
                          </td>
                          <td>
                            <span className={statusCls}>{item.status}</span>
                          </td>
                        </>
                      )}

                      {/* SWIMMING POOL Columns */}
                      {config.key === 'swimming-pool' && (
                        <>
                          <td>
                            <b>{d.pool_name || item.name}</b>
                          </td>
                          <td>{d.pool_type || 'Outdoor'}</td>
                          <td>
                            {d.opening_time || '06:00 AM'} – {d.closing_time || '10:00 PM'}
                          </td>
                          <td>
                            <span className="amenity-tag">🏊 {d.capacity || '40'}</span>
                          </td>
                          <td style={{ fontSize: 12 }}>
                            {d.safety_status || 'Certified Lifeguard'}
                          </td>
                          <td>
                            <span className={statusCls}>{item.status}</span>
                          </td>
                          <td style={{ maxWidth: 180, fontSize: 12, color: 'var(--muted)' }}>
                            {d.maintenance_notes || '—'}
                          </td>
                        </>
                      )}

                      {/* GYM Columns */}
                      {config.key === 'gym' && (
                        <>
                          <td>
                            <b>{d.gym_name || item.name}</b>
                          </td>
                          <td style={{ maxWidth: 280, fontSize: 12 }}>
                            {d.equipment || 'Full Cardio & Weights'}
                          </td>
                          <td>
                            {d.opening_time || '05:30 AM'} – {d.closing_time || '11:00 PM'}
                          </td>
                          <td>
                            <span className="amenity-tag">🏋 {d.capacity || '30'}</span>
                          </td>
                          <td>
                            <span className={statusCls}>{item.status}</span>
                          </td>
                          <td style={{ maxWidth: 180, fontSize: 12, color: 'var(--muted)' }}>
                            {d.maintenance_notes || '—'}
                          </td>
                        </>
                      )}

                      {/* PARKING Columns */}
                      {config.key === 'parking' && (
                        <>
                          <td>
                            <b>{d.parking_type || item.name}</b>
                          </td>
                          <td>
                            <b>{d.total_spaces || '—'}</b>
                          </td>
                          <td>
                            <b style={{ color: 'var(--green)' }}>{d.available_spaces || '—'}</b>
                          </td>
                          <td>{d.parking_location || 'Basement B1'}</td>
                          <td style={{ fontSize: 12 }}>{d.parking_charges || 'Complimentary'}</td>
                          <td>
                            <span className={statusCls}>{item.status}</span>
                          </td>
                          <td style={{ maxWidth: 160, fontSize: 12, color: 'var(--muted)' }}>
                            {d.notes || '—'}
                          </td>
                        </>
                      )}

                      {/* SPA Columns */}
                      {config.key === 'spa' && (
                        <>
                          <td>
                            <div>
                              <b>{d.service_name || item.name}</b>
                              {d.description && <span style={{ display: 'block', fontSize: 11, color: 'var(--muted)' }}>{d.description}</span>}
                            </div>
                          </td>
                          <td>
                            <span className="amenity-tag">⏱ {d.duration || '60 Mins'}</span>
                          </td>
                          <td>
                            <b style={{ color: 'var(--brass)' }}>{d.price || '₹2,500'}</b>
                          </td>
                          <td style={{ maxWidth: 220, fontSize: 12 }}>
                            {d.time_slots || 'Hourly bookings'}
                          </td>
                          <td>
                            <span style={{ fontSize: 12 }}>{d.booking_status || 'Available'}</span>
                          </td>
                          <td>
                            <span className={statusCls}>{item.status}</span>
                          </td>
                        </>
                      )}

                      {/* Universal Actions Column */}
                      <td>
                        <div className="amenity-action-btns">
                          <button
                            className="btn ghost sm"
                            onClick={() => handleOpenView(item)}
                            title="View all details"
                          >
                            View
                          </button>
                          {canEdit('/guest-services') && (
                            <button
                              className="btn ghost sm"
                              onClick={() => handleOpenEdit(item)}
                              title="Edit this amenity"
                            >
                              Edit
                            </button>
                          )}
                          <button
                            className="btn ghost sm"
                            style={{ color: 'var(--teal)', borderColor: 'var(--teal-soft)' }}
                            onClick={() => handleOpenTicket(item)}
                            title="Raise Guest Request for this amenity"
                          >
                            + Ticket
                          </button>
                          {canDelete('/guest-services') && (
                            <button
                              className="btn ghost sm"
                              style={{ color: 'var(--red)' }}
                              onClick={() => setDeleteModal({ open: true, item })}
                              title="Delete amenity"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT MODAL */}
      {(modalMode === 'add' || modalMode === 'edit') && (
        <div className="modal-overlay">
          <div className="amenity-modal-content">
            <div className="modal-header">
              <h3>
                {config.icon}
                {modalMode === 'add' ? `Add New ${config.name}` : `Edit ${config.name}`}
              </h3>
              <button className="modal-close-btn" onClick={() => setModalMode(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {/* WI-FI FIELDS */}
                {config.key === 'wifi' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Wi-Fi Name / Network SSID *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. StayFlow_Guest_HighSpeed"
                          value={formData.network_name || ''}
                          onChange={(e) => setFormData({ ...formData, network_name: e.target.value })}
                        />
                        {formErrors.network_name && <span className="form-error-msg">{formErrors.network_name}</span>}
                      </div>
                      <div className="form-group">
                        <label>Coverage Area *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. All Guest Rooms & Lobby"
                          value={formData.coverage_area || ''}
                          onChange={(e) => setFormData({ ...formData, coverage_area: e.target.value })}
                        />
                        {formErrors.coverage_area && <span className="form-error-msg">{formErrors.coverage_area}</span>}
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Password or Access Instructions</label>
                        <input
                          type="text"
                          placeholder="e.g. StayFlow@2026 or Room# + Last Name"
                          value={formData.password || ''}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Speed Bandwidth *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 300 Mbps Dedicated"
                          value={formData.speed || ''}
                          onChange={(e) => setFormData({ ...formData, speed: e.target.value })}
                        />
                        {formErrors.speed && <span className="form-error-msg">{formErrors.speed}</span>}
                      </div>
                    </div>
                  </>
                )}

                {/* AIR CONDITIONING (AC) FIELDS */}
                {config.key === 'ac' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Room Number *</label>
                        <select
                          required
                          value={formData.room_number || ''}
                          onChange={(e) => {
                            const selectedNumber = e.target.value;
                            const found = rooms.find(r => String(r.number) === String(selectedNumber));
                            setFormData({
                              ...formData,
                              room_number: selectedNumber,
                              room_id: found ? found.id : null
                            });
                          }}
                        >
                          <option value="">-- Select Room --</option>
                          {rooms.map(r => (
                            <option key={r.id} value={r.number}>Room {r.number} ({r.type})</option>
                          ))}
                        </select>
                        {formErrors.room_number && <span className="form-error-msg">{formErrors.room_number}</span>}
                      </div>
                      <div className="form-group">
                        <label>AC Type *</label>
                        <select
                          value={formData.ac_type || 'Split Inverter AC (1.5 Ton)'}
                          onChange={(e) => setFormData({ ...formData, ac_type: e.target.value })}
                        >
                          <option value="Split Inverter AC (1.5 Ton)">Split Inverter AC (1.5 Ton)</option>
                          <option value="Central Chilled Water FCU">Central Chilled Water FCU</option>
                          <option value="VRF Inverter Multi-Split">VRF Inverter Multi-Split</option>
                          <option value="Smart Climate Control Suite AC">Smart Climate Control Suite AC</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Temperature Setting *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 21°C (Default: 22°C)"
                          value={formData.temperature_setting || ''}
                          onChange={(e) => setFormData({ ...formData, temperature_setting: e.target.value })}
                        />
                        {formErrors.temperature_setting && <span className="form-error-msg">{formErrors.temperature_setting}</span>}
                      </div>
                      <div className="form-group">
                        <label>Maintenance Status *</label>
                        <select
                          value={formData.maintenance_status || 'Operational - Filter Clean'}
                          onChange={(e) => setFormData({ ...formData, maintenance_status: e.target.value })}
                        >
                          <option value="Operational - Filter Clean">Operational - Filter Clean</option>
                          <option value="Servicing Due">Servicing Due</option>
                          <option value="Gas Refill Scheduled">Gas Refill Scheduled</option>
                          <option value="Thermostat Calibration Needed">Thermostat Calibration Needed</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* TELEVISION (TV) FIELDS */}
                {config.key === 'tv' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Room Number *</label>
                        <select
                          required
                          value={formData.room_number || ''}
                          onChange={(e) => {
                            const selectedNumber = e.target.value;
                            const found = rooms.find(r => String(r.number) === String(selectedNumber));
                            setFormData({
                              ...formData,
                              room_number: selectedNumber,
                              room_id: found ? found.id : null
                            });
                          }}
                        >
                          <option value="">-- Select Room --</option>
                          {rooms.map(r => (
                            <option key={r.id} value={r.number}>Room {r.number} ({r.type})</option>
                          ))}
                        </select>
                        {formErrors.room_number && <span className="form-error-msg">{formErrors.room_number}</span>}
                      </div>
                      <div className="form-group">
                        <label>TV Model & Screen Type *</label>
                        <input
                          type="text"
                          required
                          placeholder='e.g. Samsung 55" 4K UHD Smart TV'
                          value={formData.tv_type || ''}
                          onChange={(e) => setFormData({ ...formData, tv_type: e.target.value })}
                        />
                        {formErrors.tv_type && <span className="form-error-msg">{formErrors.tv_type}</span>}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Available Channels & Streaming Services *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Tata Play HD (180+ Channels), Netflix, Prime Video, Disney+ Hotstar"
                        value={formData.channels_services || ''}
                        onChange={(e) => setFormData({ ...formData, channels_services: e.target.value })}
                      />
                      {formErrors.channels_services && <span className="form-error-msg">{formErrors.channels_services}</span>}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Remote Status *</label>
                        <select
                          value={formData.remote_status || 'Working (Magic Remote)'}
                          onChange={(e) => setFormData({ ...formData, remote_status: e.target.value })}
                        >
                          <option value="Working (Magic Remote)">Working (Magic Remote)</option>
                          <option value="Batteries Replaced Recently">Batteries Replaced Recently</option>
                          <option value="Replacement Pending">Replacement Pending</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Maintenance Status *</label>
                        <select
                          value={formData.maintenance_status || 'Operational'}
                          onChange={(e) => setFormData({ ...formData, maintenance_status: e.target.value })}
                        >
                          <option value="Operational">Operational</option>
                          <option value="Firmware Update Pending">Firmware Update Pending</option>
                          <option value="HDMI Port Check Needed">HDMI Port Check Needed</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {/* SWIMMING POOL FIELDS */}
                {config.key === 'swimming-pool' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Pool Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Azure Horizon Infinity Pool"
                          value={formData.pool_name || ''}
                          onChange={(e) => setFormData({ ...formData, pool_name: e.target.value })}
                        />
                        {formErrors.pool_name && <span className="form-error-msg">{formErrors.pool_name}</span>}
                      </div>
                      <div className="form-group">
                        <label>Pool Type *</label>
                        <select
                          value={formData.pool_type || 'Infinity Rooftop Pool'}
                          onChange={(e) => setFormData({ ...formData, pool_type: e.target.value })}
                        >
                          <option value="Infinity Rooftop Pool">Infinity Rooftop Pool</option>
                          <option value="Heated Indoor Lap Pool">Heated Indoor Lap Pool</option>
                          <option value="Kids Splash Pool & Whirlpool">Kids Splash Pool & Whirlpool</option>
                          <option value="Outdoor Lagoon Pool">Outdoor Lagoon Pool</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Opening Time *</label>
                        <input
                          type="text"
                          required
                          placeholder="06:00 AM"
                          value={formData.opening_time || '06:00 AM'}
                          onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Closing Time *</label>
                        <input
                          type="text"
                          required
                          placeholder="10:00 PM"
                          value={formData.closing_time || '10:00 PM'}
                          onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Bather Capacity *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 40 Persons"
                          value={formData.capacity || ''}
                          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        />
                        {formErrors.capacity && <span className="form-error-msg">{formErrors.capacity}</span>}
                      </div>
                      <div className="form-group">
                        <label>Safety & Water Status *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Lifeguard On Duty • pH 7.4 • Chlorinated"
                          value={formData.safety_status || ''}
                          onChange={(e) => setFormData({ ...formData, safety_status: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* GYM FIELDS */}
                {config.key === 'gym' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Gym Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. StayFlow Pulse Fitness Centre"
                          value={formData.gym_name || ''}
                          onChange={(e) => setFormData({ ...formData, gym_name: e.target.value })}
                        />
                        {formErrors.gym_name && <span className="form-error-msg">{formErrors.gym_name}</span>}
                      </div>
                      <div className="form-group">
                        <label>Max Capacity *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 30 Persons"
                          value={formData.capacity || ''}
                          onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Available Equipment *</label>
                      <textarea
                        required
                        placeholder="e.g. Treadmills (4x), Ellipticals, Dumbbell Rack (2-35kg), Cable Crossover, Smith Machine, Yoga Mats"
                        value={formData.equipment || ''}
                        onChange={(e) => setFormData({ ...formData, equipment: e.target.value })}
                      />
                      {formErrors.equipment && <span className="form-error-msg">{formErrors.equipment}</span>}
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Opening Time *</label>
                        <input
                          type="text"
                          required
                          placeholder="05:30 AM"
                          value={formData.opening_time || '05:30 AM'}
                          onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Closing Time *</label>
                        <input
                          type="text"
                          required
                          placeholder="11:00 PM"
                          value={formData.closing_time || '11:00 PM'}
                          onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* PARKING FIELDS */}
                {config.key === 'parking' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Parking Facility Type *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Valet & Covered Basement Parking"
                          value={formData.parking_type || ''}
                          onChange={(e) => setFormData({ ...formData, parking_type: e.target.value })}
                        />
                        {formErrors.parking_type && <span className="form-error-msg">{formErrors.parking_type}</span>}
                      </div>
                      <div className="form-group">
                        <label>Parking Location *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Basement Level B1 & B2, Gate 2"
                          value={formData.parking_location || ''}
                          onChange={(e) => setFormData({ ...formData, parking_location: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Total Spaces *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          placeholder="50"
                          value={formData.total_spaces || ''}
                          onChange={(e) => setFormData({ ...formData, total_spaces: e.target.value })}
                        />
                        {formErrors.total_spaces && <span className="form-error-msg">{formErrors.total_spaces}</span>}
                      </div>
                      <div className="form-group">
                        <label>Available Spaces *</label>
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="25"
                          value={formData.available_spaces || ''}
                          onChange={(e) => setFormData({ ...formData, available_spaces: e.target.value })}
                        />
                        {formErrors.available_spaces && <span className="form-error-msg">{formErrors.available_spaces}</span>}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Parking Charges / Tariff *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Complimentary for in-house guests / ₹150 per day for visitors"
                        value={formData.parking_charges || ''}
                        onChange={(e) => setFormData({ ...formData, parking_charges: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* SPA FIELDS */}
                {config.key === 'spa' && (
                  <>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Spa Service Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Ayurvedic Abhyanga Full Body Massage"
                          value={formData.service_name || ''}
                          onChange={(e) => setFormData({ ...formData, service_name: e.target.value })}
                        />
                        {formErrors.service_name && <span className="form-error-msg">{formErrors.service_name}</span>}
                      </div>
                      <div className="form-group">
                        <label>Duration *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. 60 Mins / 90 Mins"
                          value={formData.duration || ''}
                          onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        />
                        {formErrors.duration && <span className="form-error-msg">{formErrors.duration}</span>}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Service Description</label>
                      <textarea
                        placeholder="Full body relaxation therapy using warm herbal Ayurvedic oils to relieve fatigue."
                        value={formData.description || ''}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Price (₹) *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. ₹3,500"
                          value={formData.price || ''}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                        />
                        {formErrors.price && <span className="form-error-msg">{formErrors.price}</span>}
                      </div>
                      <div className="form-group">
                        <label>Booking Status *</label>
                        <select
                          value={formData.booking_status || 'Available'}
                          onChange={(e) => setFormData({ ...formData, booking_status: e.target.value })}
                        >
                          <option value="Available">Available</option>
                          <option value="Booked">Fully Booked</option>
                          <option value="Fast Filling">Fast Filling</option>
                        </select>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Available Time Slots *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 10:00 AM, 12:30 PM, 03:00 PM, 05:30 PM, 08:00 PM"
                        value={formData.time_slots || ''}
                        onChange={(e) => setFormData({ ...formData, time_slots: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {/* UNIVERSAL FIELDS: Availability Status & Notes */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Availability Status *</label>
                    <select
                      value={formData.status || 'Available'}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="Available">Available / Active</option>
                      <option value="Maintenance">Under Maintenance</option>
                      <option value="Unavailable">Unavailable / Offline</option>
                    </select>
                  </div>
                </div>

                {/* PRICING & USAGE RULES CONFIGURATION */}
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="form-group">
                    <label>Pricing Structure</label>
                    <select
                      value={formData.pricing_type || 'included_in_tariff'}
                      onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value })}
                    >
                      <option value="included_in_tariff">Included in Room Tariff (No Charge)</option>
                      <option value="complimentary">Complimentary / Free</option>
                      <option value="per_guest">Per Guest</option>
                      <option value="per_session">Per Session</option>
                      <option value="per_day">Per Day</option>
                      <option value="per_vehicle">Per Vehicle / Day</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Unit Price (₹ INR)</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="0 for complimentary"
                      value={formData.price !== undefined ? formData.price : ''}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      disabled={formData.pricing_type === 'included_in_tariff' || formData.pricing_type === 'complimentary'}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Usage Rules & Guidelines</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Proper swimwear required, advance booking notice, cancellation policy..."
                    value={formData.rules || ''}
                    onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Amenity Photo / Image URL</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... (optional)"
                    value={formData.image_url || ''}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>{config.key.includes('pool') || config.key === 'gym' ? 'Maintenance Notes' : 'Notes & Instructions'}</label>
                  <textarea
                    placeholder="Enter operational notes, special care instructions, or comments..."
                    value={formData.notes || formData.maintenance_notes || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      notes: e.target.value,
                      maintenance_notes: e.target.value
                    })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setModalMode(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={submitting}
                  style={{ background: 'var(--brass)', borderColor: 'var(--brass)', color: '#13243A', fontWeight: 600 }}
                >
                  {submitting ? 'Saving to Database...' : modalMode === 'add' ? 'Create Amenity' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {modalMode === 'view' && activeItem && (
        <div className="modal-overlay">
          <div className="amenity-modal-content">
            <div className="modal-header">
              <h3>
                {config.icon}
                {activeItem.name} — Details
              </h3>
              <button className="modal-close-btn" onClick={() => setModalMode(null)}>✕</button>
            </div>
            <div className="modal-body">
              <dl className="kv-view-grid">
                <dt>Amenity Name</dt>
                <dd><b>{activeItem.name}</b></dd>

                <dt>Category</dt>
                <dd>{config.fullName}</dd>

                {config.isRoomSpecific && (
                  <>
                    <dt>Associated Room</dt>
                    <dd>
                      <span className="tag" style={{ fontWeight: 700 }}>
                        Room {activeItem.room_number || activeItem.details?.room_number || 'General Area'}
                      </span>
                    </dd>
                  </>
                )}

                <dt>Availability Status</dt>
                <dd>
                  <span className="badge b-blue">{activeItem.status}</span>
                </dd>

                {activeItem.details && Object.entries(activeItem.details).map(([k, v]) => {
                  if (k === 'availability_status' || k === 'room_number') return null;
                  const label = k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  return (
                    <React.Fragment key={k}>
                      <dt>{label}</dt>
                      <dd>
                        {k === 'password' ? (
                          <div className="pwd-reveal-row">
                            <code>{showPassword[activeItem.id] ? String(v) : '••••••••••••'}</code>
                            <button
                              type="button"
                              className="btn ghost sm"
                              style={{ padding: '2px 6px', fontSize: 11 }}
                              onClick={() => togglePass(activeItem.id)}
                            >
                              {showPassword[activeItem.id] ? 'Hide' : 'Show'}
                            </button>
                          </div>
                        ) : (
                          String(v || '—')
                        )}
                      </dd>
                    </React.Fragment>
                  );
                })}

                <dt>System ID</dt>
                <dd><code>#{activeItem.id} (Hotel #{activeItem.hotel_id || 1})</code></dd>
              </dl>
            </div>
            <div className="modal-footer">
              <button
                className="btn ghost"
                onClick={() => setModalMode(null)}
              >
                Close
              </button>
              {canEdit('/guest-services') && (
                <button
                  className="btn primary"
                  onClick={() => {
                    handleOpenEdit(activeItem);
                  }}
                >
                  Edit Record
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RAISE GUEST REQUEST / TICKET MODAL */}
      {modalMode === 'ticket' && activeItem && (
        <div className="modal-overlay">
          <div className="amenity-modal-content">
            <div className="modal-header">
              <h3>
                <span>🛎</span>
                Raise Guest Request for {activeItem.name}
              </h3>
              <button className="modal-close-btn" onClick={() => setModalMode(null)}>✕</button>
            </div>
            <form onSubmit={handleSubmitTicket}>
              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0, marginBottom: 16 }}>
                  Directly dispatch a service request or guest inquiry to the Guest Services ledger and notify the duty team.
                </p>
                <div className="form-row">
                  <div className="form-group">
                    <label>Guest Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Elena Rostova"
                      value={ticketForm.guest_name}
                      onChange={(e) => setTicketForm({ ...ticketForm, guest_name: e.target.value })}
                    />
                    {formErrors.guest_name && <span className="form-error-msg">{formErrors.guest_name}</span>}
                  </div>
                  <div className="form-group">
                    <label>Room / Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Room 402 or Main Pool Deck"
                      value={ticketForm.room_number}
                      onChange={(e) => setTicketForm({ ...ticketForm, room_number: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority *</label>
                    <select
                      value={ticketForm.priority}
                      onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    >
                      <option value="Normal">Normal</option>
                      <option value="High">High</option>
                      <option value="Urgent">Urgent (VIP)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Assign To Staff</label>
                    <input
                      type="text"
                      value={ticketForm.assigned_to}
                      onChange={(e) => setTicketForm({ ...ticketForm, assigned_to: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Request Details & Instructions *</label>
                  <textarea
                    required
                    placeholder="Describe specific guest request or troubleshooting required..."
                    value={ticketForm.request_details}
                    onChange={(e) => setTicketForm({ ...ticketForm, request_details: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setModalMode(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={submitting}
                  style={{ background: 'var(--teal)', borderColor: 'var(--teal)' }}
                >
                  {submitting ? 'Dispatching Ticket...' : 'Dispatch Service Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal.open && deleteModal.item && (
        <div className="modal-overlay">
          <div className="amenity-modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 style={{ color: 'var(--red)' }}>Delete Amenity Record</h3>
              <button className="modal-close-btn" onClick={() => setDeleteModal({ open: false, item: null })}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ margin: 0, fontSize: 14 }}>
                Are you sure you want to permanently delete <b>"{deleteModal.item.name}"</b> from the database?
              </p>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
                This record and its configuration will be removed from your hotel's inventory.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn ghost"
                onClick={() => setDeleteModal({ open: false, item: null })}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn primary"
                style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
                onClick={handleDeleteConfirm}
                disabled={submitting}
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
