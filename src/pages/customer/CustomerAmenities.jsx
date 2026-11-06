import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../../services/api';
import { useStore } from '../../context/StoreContext';
import { StatusBadge } from '../../components/Badge';
import { loadRazorpayScript } from '../../utils/razorpay';

const AC_UNIT_IMAGES = [
  '/split_ac_unit.jpg',
  '/air_conditioner_unit.jpg',
];

export default function CustomerAmenities({ defaultTab = 'my-reservation' } = {}) {
  const { user, notify } = useStore();

  const [activeTab, setActiveTab] = useState(defaultTab || 'my-reservation');

  useEffect(() => {
    if (defaultTab) {
      if (defaultTab === 'requests') setActiveTab('my-requests');
      else if (defaultTab === 'billing' || defaultTab === 'my-reservation') setActiveTab('my-reservation');
      else setActiveTab(defaultTab);
    }
  }, [defaultTab]);
  const [amenities, setAmenities] = useState([]);
  const [activeBookings, setActiveBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [myRequests, setMyRequests] = useState([]);
  const [loadingAmenities, setLoadingAmenities] = useState(true);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // My Reservation & Billing State
  const [reservationBilling, setReservationBilling] = useState(null);
  const [loadingBilling, setLoadingBilling] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState('');
  const [payError, setPayError] = useState('');

  // Search and filter in Explore tab
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Booking Modal State
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    request_date: new Date().toISOString().slice(0, 10),
    time_slot: '10:00 AM - 12:00 PM',
    guest_count: 1,
    vehicle_count: 1,
    vehicle_type: 'Sedan',
    vehicle_registration: '',
    specific_params: {},
    notes: '',
  });
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);

  // Cancellation Modal State
  const [cancelModal, setCancelModal] = useState({ open: false, request: null, reason: '' });
  const [cancelling, setCancelling] = useState(false);

  // Filter in My Requests tab
  const [requestFilter, setRequestFilter] = useState('ALL');
  const [requestSearch, setRequestSearch] = useState('');

  // 1. Fetch Customer Amenities
  const fetchAmenities = useCallback(async () => {
    setLoadingAmenities(true);
    try {
      const data = await api('/api/customer/amenities');
      if (Array.isArray(data)) {
        const mapped = data.map((item, idx) => {
          const isAc = item.amenity_type === 'ac' || (item.name && item.name.toLowerCase().includes('ac'));
          if (isAc) {
            return {
              ...item,
              image_url: AC_UNIT_IMAGES[(item.id || idx) % AC_UNIT_IMAGES.length],
            };
          }
          return item;
        });
        setAmenities(mapped);
      }
    } catch (err) {
      console.error('Failed to load amenities:', err);
    } finally {
      setLoadingAmenities(false);
    }
  }, []);

  // 2. Fetch Active Bookings for Customer
  const fetchReservationBilling = useCallback(async (ref) => {
    if (!ref) return;
    setLoadingBilling(true);
    setBillingError('');
    try {
      const res = await api(`/api/customer/bookings/${encodeURIComponent(ref)}/billing`);
      setReservationBilling(res);
      setPayAmount('');
    } catch (err) {
      console.error('Failed to load reservation billing:', err);
      setBillingError(err.message || 'Could not retrieve billing details.');
    } finally {
      setLoadingBilling(false);
    }
  }, []);

  const fetchActiveBookings = useCallback(async () => {
    try {
      const data = await api('/api/customer/active-bookings');
      if (Array.isArray(data) && data.length > 0) {
        setActiveBookings(data);
        setSelectedBooking(data[0]);
        fetchReservationBilling(data[0].reference);
      }
    } catch (err) {
      console.error('Failed to load bookings:', err);
    }
  }, [fetchReservationBilling]);

  const handleCustomerRazorpayPayment = async (customAmt) => {
    const bookingRef = selectedBooking?.reference || reservationBilling?.booking_reference;
    if (!bookingRef) {
      setPayError('Please select a valid booking first.');
      return;
    }

    const balDue = Number(reservationBilling?.billing?.balance_due || 0);
    const amtToPay = Number(customAmt !== null && customAmt !== undefined ? customAmt : (payAmount || balDue));

    if (!amtToPay || amtToPay <= 0) {
      setPayError('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (amtToPay > balDue) {
      setPayError(`Payment amount (₹${amtToPay.toFixed(2)}) cannot exceed outstanding balance of ₹${balDue.toFixed(2)}.`);
      return;
    }

    setPaying(true);
    setPayError('');
    setPaySuccess('');

    try {
      const orderRes = await api('/api/customer/payments/razorpay/create-order', {
        method: 'POST',
        body: JSON.stringify({
          booking_reference: bookingRef,
          amount: amtToPay
        })
      });

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay payment gateway SDK.');
      }

      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: orderRes.hotel_name || 'StayFlow Hotel',
        description: `Booking #${bookingRef} - Online Settlement`,
        order_id: orderRes.order_id,
        prefill: {
          name: orderRes.guest_name || user?.full_name || 'Guest',
          email: orderRes.guest_email || user?.email || '',
          contact: orderRes.guest_phone || ''
        },
        theme: { color: '#0F172A' },
        handler: async function (response) {
          try {
            const verifyRes = await api('/api/customer/payments/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_reference: bookingRef
              })
            });

            setPaySuccess(`✓ Payment of ₹${verifyRes.amount.toFixed(2)} captured successfully! (Ref: ${verifyRes.transaction_id})`);
            await fetchReservationBilling(bookingRef);
            await fetchActiveBookings();
            notify(`✓ Razorpay payment of ₹${verifyRes.amount.toFixed(2)} verified!`);
          } catch (vErr) {
            setPayError(`Payment verification failed: ${vErr.message}`);
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
            api('/api/customer/payments/razorpay/failed', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: orderRes.order_id,
                error_description: 'Guest cancelled or dismissed checkout window'
              })
            }).then(() => {
              fetchReservationBilling(bookingRef);
            }).catch(() => {});
            setPayError('Payment checkout window was cancelled. No charges were deducted.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setPaying(false);
        api('/api/customer/payments/razorpay/failed', {
          method: 'POST',
          body: JSON.stringify({
            razorpay_order_id: orderRes.order_id,
            error_code: resp?.error?.code,
            error_description: resp?.error?.description
          })
        }).then(() => {
          fetchReservationBilling(bookingRef);
        }).catch(() => {});
        setPayError(`Payment declined: ${resp?.error?.description || 'Transaction failed'}`);
      });
      rzp.open();
    } catch (err) {
      setPayError(err.message || 'Failed to initiate Razorpay payment');
      setPaying(false);
    }
  };

  // 3. Fetch My Requests
  const fetchMyRequests = useCallback(async () => {
    setLoadingRequests(true);
    try {
      const data = await api('/api/customer/my-requests');
      if (Array.isArray(data)) {
        setMyRequests(data);
      }
    } catch (err) {
      console.error('Failed to load my requests:', err);
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    fetchAmenities();
    fetchActiveBookings();
    fetchMyRequests();
  }, [fetchAmenities, fetchActiveBookings, fetchMyRequests]);

  // Open Booking Modal for an Amenity
  const handleOpenBooking = (amenity) => {
    setSelectedAmenity(amenity);
    const today = new Date().toISOString().slice(0, 10);
    
    // Set default parameters per amenity type
    let defaultSpecific = {};
    let defaultSlot = '10:00 AM - 12:00 PM';

    if (amenity.amenity_type === 'ac') {
      defaultSpecific = {
        issue_type: 'Temperature Adjustment',
        target_temp: '22°C',
        urgency: 'Normal',
      };
    } else if (amenity.amenity_type === 'tv') {
      defaultSpecific = {
        issue_type: 'Streaming / OTT App Setup',
        channel_or_app: 'Netflix / Hotstar',
      };
    } else if (amenity.amenity_type === 'swimming_pool') {
      defaultSlot = 'Morning Sunrise 06:00 - 09:00 AM';
      defaultSpecific = {
        session_type: 'Leisure & Swimming',
        requires_towels: true,
      };
    } else if (amenity.amenity_type === 'gym') {
      defaultSlot = 'Morning Workout 07:00 - 09:00 AM';
      defaultSpecific = {
        trainer_assistance: false,
        locker_required: true,
      };
    } else if (amenity.amenity_type === 'parking') {
      defaultSlot = 'Full Day Valet (24 Hours)';
      defaultSpecific = {
        valet_assistance: true,
      };
    } else if (amenity.amenity_type === 'spa') {
      defaultSlot = '11:00 AM - 12:00 PM';
      defaultSpecific = {
        service_selection: amenity.name,
        therapist_preference: 'Any Certified Specialist',
        steam_bath_included: true,
      };
    } else if (amenity.amenity_type === 'wifi') {
      defaultSpecific = {
        request_type: 'Device Connection Assistance',
        device_type: 'Laptop / Mobile',
      };
    }

    setBookingForm({
      request_date: today,
      time_slot: defaultSlot,
      guest_count: 1,
      vehicle_count: 1,
      vehicle_type: 'Sedan',
      vehicle_registration: '',
      specific_params: defaultSpecific,
      notes: '',
    });
    setConfirmationData(null);
    setBookingModalOpen(true);
  };

  // Dynamic Price Preview Calculation (matching trusted backend rules)
  const pricePreview = useMemo(() => {
    if (!selectedAmenity) return { unitPrice: 0, total: 0, pricingType: 'included_in_tariff', isFree: true };
    const pType = (selectedAmenity.pricing_type || 'included_in_tariff').toLowerCase().strip?.() || selectedAmenity.pricing_type || 'included_in_tariff';
    const unit = parseFloat(selectedAmenity.price || 0);

    if (pType === 'included_in_tariff' || pType === 'complimentary' || unit <= 0) {
      return {
        unitPrice: 0,
        quantity: 1,
        total: 0,
        pricingType: pType,
        isFree: true,
        label: pType === 'complimentary' ? 'Complimentary' : 'Included in Room Tariff'
      };
    }

    let qty = 1;
    if (pType === 'per_guest') {
      qty = Math.max(1, parseInt(bookingForm.guest_count) || 1);
    } else if (pType === 'per_vehicle') {
      qty = Math.max(1, parseInt(bookingForm.vehicle_count) || 1);
    } else if (pType === 'per_day' && selectedAmenity.amenity_type === 'gym') {
      qty = Math.max(1, parseInt(bookingForm.guest_count) || 1);
    }

    const total = roundToTwo(unit * qty);
    return {
      unitPrice: unit,
      quantity: qty,
      total,
      pricingType: pType,
      isFree: false,
      label: `₹${total.toFixed(2)} (${pType.replace('_', ' ')})`
    };
  }, [selectedAmenity, bookingForm.guest_count, bookingForm.vehicle_count]);

  function roundToTwo(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  // Submit Booking Request
  const handleSubmitBooking = async (e) => {
    e.preventDefault();
    if (!selectedAmenity) return;

    if (!selectedBooking) {
      notify('An active hotel reservation is required to book amenities', 'error');
      return;
    }

    setSubmittingBooking(true);
    try {
      const payload = {
        amenity_id: selectedAmenity.id,
        reservation_id: selectedBooking.id,
        booking_reference: selectedBooking.reference,
        room_number: selectedBooking.room_number,
        request_date: bookingForm.request_date,
        time_slot: bookingForm.time_slot,
        guest_count: parseInt(bookingForm.guest_count) || 1,
        vehicle_count: parseInt(bookingForm.vehicle_count) || 1,
        vehicle_type: bookingForm.vehicle_type,
        vehicle_registration: bookingForm.vehicle_registration,
        specific_params: bookingForm.specific_params,
        notes: bookingForm.notes,
      };

      const res = await api('/api/customer/amenity-booking', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setConfirmationData(res);
      notify(`Service request ${res.request_id} created successfully!`);
      fetchMyRequests();
    } catch (err) {
      notify(err.message || 'Failed to submit amenity booking request', 'error');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Submit Cancellation
  const handleConfirmCancel = async () => {
    if (!cancelModal.request) return;
    setCancelling(true);
    try {
      const res = await api(`/api/service-requests/${cancelModal.request.request_id}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancelModal.reason || 'Guest requested cancellation via portal' })
      });
      notify(res.message || 'Service request cancelled successfully');
      setCancelModal({ open: false, request: null, reason: '' });
      fetchMyRequests();
    } catch (err) {
      notify(err.message || 'Failed to cancel request', 'error');
    } finally {
      setCancelling(false);
    }
  };

  // Filter amenities by category and search
  const filteredAmenities = useMemo(() => {
    return amenities.filter((a) => {
      if (selectedCategory !== 'all' && a.amenity_type !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (a.name || '').toLowerCase().includes(q);
        const matchType = (a.amenity_type || '').toLowerCase().includes(q);
        const matchRules = (a.rules || '').toLowerCase().includes(q);
        return matchName || matchType || matchRules;
      }
      return true;
    });
  }, [amenities, selectedCategory, searchQuery]);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return myRequests.filter((r) => {
      if (requestFilter !== 'ALL') {
        if (requestFilter === 'ACTIVE' && ['Completed', 'Cancelled', 'Rejected'].includes(r.status)) return false;
        if (requestFilter === 'COMPLETED' && r.status !== 'Completed') return false;
        if (requestFilter === 'CANCELLED' && r.status !== 'Cancelled') return false;
      }
      if (requestSearch.trim()) {
        const q = requestSearch.toLowerCase();
        return (
          (r.request_id || '').toLowerCase().includes(q) ||
          (r.amenity_name || '').toLowerCase().includes(q) ||
          (r.service_type || '').toLowerCase().includes(q) ||
          (r.room_number || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [myRequests, requestFilter, requestSearch]);

  const categoryIcons = {
    all: '✨',
    wifi: '📶',
    ac: '❄️',
    tv: '📺',
    swimming_pool: '🏊',
    gym: '🏋️',
    parking: '🚗',
    spa: '💆',
  };

  return (
    <div className="customer-amenities-page" style={{ padding: '24px 20px', maxWidth: 1240, margin: '0 auto' }}>
      
      {/* ── Active Stay Header Card ── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))',
        border: '1px solid rgba(226, 199, 134, 0.25)',
        borderRadius: 16,
        padding: '24px',
        marginBottom: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 20
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 24 }}>🏨</span>
            <h1 style={{ margin: 0, fontSize: 22, color: '#FAF5EE', fontWeight: 600, letterSpacing: '0.02em' }}>
              Guest Amenities Booking
            </h1>
            <span style={{
              background: 'rgba(230, 199, 134, 0.15)',
              color: '#E6C786',
              padding: '3px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              border: '1px solid rgba(230, 199, 134, 0.3)'
            }}>
              In-House Guest Portal
            </span>
          </div>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>
            Welcome, <b>{user?.full_name || 'Resident Guest'}</b>! Browse hotel amenities, book pool or spa slots, request room climate assistance, and track live service requests.
          </p>
        </div>

        {/* Active Booking Badge & Selector */}
        {activeBookings.length > 0 ? (
          <div style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 12,
            padding: '12px 18px',
            minWidth: 260
          }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 4 }}>
              Current Active Stay
            </div>
            {activeBookings.length === 1 ? (
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#38bdf8' }}>
                  Room {selectedBooking?.room_number || '101'}
                </div>
                <div style={{ fontSize: 12, color: '#cbd5e1' }}>
                  Booking Ref: <b>{selectedBooking?.reference}</b> ({selectedBooking?.status})
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('my-reservation');
                    if (selectedBooking?.reference) fetchReservationBilling(selectedBooking.reference);
                  }}
                  style={{
                    marginTop: 6,
                    padding: '3px 10px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    background: '#2563EB',
                    color: '#FFF',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  💳 View Bill & Settle Online
                </button>
              </div>
            ) : (
              <select
                value={selectedBooking?.id || ''}
                onChange={(e) => {
                  const b = activeBookings.find(x => String(x.id) === String(e.target.value));
                  if (b) setSelectedBooking(b);
                }}
                style={{
                  background: '#0f172a',
                  color: '#FAF5EE',
                  border: '1px solid #334155',
                  borderRadius: 6,
                  padding: '6px 10px',
                  fontSize: 13,
                  width: '100%',
                  cursor: 'pointer'
                }}
              >
                {activeBookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    Room {b.room_number} • Ref: {b.reference} ({b.status})
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: 10,
            padding: '10px 16px',
            fontSize: 13,
            color: '#fca5a5'
          }}>
            ⚠️ No checked-in booking found. Active booking ref will be linked automatically upon booking.
          </div>
        )}
      </div>

      {/* ── Tabs Navigation ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: 24,
        gap: 16,
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('explore')}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === 'explore' ? '#E6C786' : '#94a3b8',
              borderBottom: activeTab === 'explore' ? '3px solid #E6C786' : '3px solid transparent',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>✨</span> Explore & Book Amenities ({amenities.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('my-reservation');
              if (selectedBooking?.reference) {
                fetchReservationBilling(selectedBooking.reference);
              }
            }}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === 'my-reservation' ? '#E6C786' : '#94a3b8',
              borderBottom: activeTab === 'my-reservation' ? '3px solid #E6C786' : '3px solid transparent',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>💳</span> My Reservation & Billing
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('my-requests');
              fetchMyRequests();
            }}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              color: activeTab === 'my-requests' ? '#E6C786' : '#94a3b8',
              borderBottom: activeTab === 'my-requests' ? '3px solid #E6C786' : '3px solid transparent',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span>📋</span> My Service Requests ({myRequests.length})
          </button>
        </div>

        {activeTab === 'explore' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search amenities, wifi, spa..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: 8,
                fontSize: 13,
                width: 220
              }}
            />
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 1: EXPLORE & BOOK AMENITIES                             */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'explore' && (
        <>
          {/* Category Filter Pills */}
          <div style={{
            display: 'flex',
            gap: 8,
            overflowX: 'auto',
            paddingBottom: 14,
            marginBottom: 20
          }}>
            {[
              { id: 'all', label: 'All Amenities' },
              { id: 'wifi', label: 'Wi-Fi Networks' },
              { id: 'ac', label: 'Air Conditioning' },
              { id: 'tv', label: 'Television (TV)' },
              { id: 'swimming_pool', label: 'Swimming Pool' },
              { id: 'gym', label: 'Gym & Fitness' },
              { id: 'parking', label: 'Parking & Valet' },
              { id: 'spa', label: 'Spa & Wellness' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  background: selectedCategory === cat.id ? 'var(--brass, #E6C786)' : 'rgba(30, 41, 59, 0.7)',
                  color: selectedCategory === cat.id ? '#0f172a' : '#cbd5e1',
                  border: '1px solid',
                  borderColor: selectedCategory === cat.id ? '#E6C786' : 'rgba(255, 255, 255, 0.1)',
                  borderRadius: 24,
                  padding: '7px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{categoryIcons[cat.id]}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Amenities Grid */}
          {loadingAmenities ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <p>Loading available hotel amenities…</p>
            </div>
          ) : filteredAmenities.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 16,
              border: '1px dashed rgba(255, 255, 255, 0.15)'
            }}>
              <span style={{ fontSize: 40, display: 'block', marginBottom: 12 }}>🔍</span>
              <h3 style={{ margin: '0 0 6px', color: '#fff' }}>No Amenities Found</h3>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>Try clearing search keywords or selecting another category.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: 20
            }}>
              {filteredAmenities.map((amenity) => {
                const isFree = amenity.pricing_type === 'included_in_tariff' || amenity.pricing_type === 'complimentary' || parseFloat(amenity.price || 0) === 0;
                const priceFormatted = isFree
                  ? (amenity.pricing_type === 'complimentary' ? 'Complimentary' : 'Included in Tariff')
                  : `₹${parseFloat(amenity.price).toFixed(2)} / ${amenity.pricing_type.replace('per_', '')}`;

                return (
                  <div
                    key={amenity.id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.75)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 14,
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 6px 20px rgba(0,0,0,0.2)',
                      transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                  >
                    {/* Header Image or Icon Banner */}
                    <div style={{
                      height: 160,
                      position: 'relative',
                      background: (() => {
                        const isAc = amenity.amenity_type === 'ac' || (amenity.name && amenity.name.toLowerCase().includes('ac'));
                        if (isAc) {
                          const acImg = AC_UNIT_IMAGES[(amenity.id || 0) % AC_UNIT_IMAGES.length];
                          return `url(${acImg}) center/cover no-repeat`;
                        }
                        return amenity.image_url ? `url(${amenity.image_url}) center/cover no-repeat` : 'linear-gradient(135deg, #1e293b, #0f172a)';
                      })(),
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      padding: 12
                    }}>
                      <div style={{
                        background: 'rgba(15, 23, 42, 0.85)',
                        backdropFilter: 'blur(6px)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#E6C786',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        <span>{categoryIcons[amenity.amenity_type] || '✨'}</span>
                        <span style={{ textTransform: 'capitalize' }}>{amenity.amenity_type.replace('_', ' ')}</span>
                      </div>

                      <div style={{
                        background: isFree ? 'rgba(34, 197, 94, 0.85)' : 'rgba(56, 189, 248, 0.85)',
                        color: '#fff',
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {priceFormatted}
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '18px 20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <h3 style={{ margin: 0, fontSize: 17, color: '#FAF5EE', fontWeight: 600 }}>
                          {amenity.name}
                        </h3>
                        <span style={{
                          fontSize: 11,
                          padding: '2px 8px',
                          borderRadius: 12,
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#4ade80',
                          fontWeight: 600
                        }}>
                          ● {amenity.status}
                        </span>
                      </div>

                      {/* Wi-Fi specific details */}
                      {amenity.amenity_type === 'wifi' && (
                        <div style={{ fontSize: 13, color: '#cbd5e1', margin: '8px 0', lineHeight: 1.5 }}>
                          <div><b>Coverage:</b> {amenity.details?.coverage_area || 'Entire Hotel'}</div>
                          <div><b>Speed:</b> {amenity.details?.speed || 'High-Speed Wi-Fi 6'}</div>
                          <div style={{ marginTop: 4, color: '#38bdf8' }}>
                            🔒 <b>Access:</b> {amenity.details?.access_instructions || 'Connect directly via room portal'}
                          </div>
                        </div>
                      )}

                      {/* Pool specific details */}
                      {amenity.amenity_type === 'swimming_pool' && (
                        <div style={{ fontSize: 13, color: '#cbd5e1', margin: '8px 0', lineHeight: 1.5 }}>
                          <div><b>Hours:</b> {amenity.details?.opening_time || '06:00 AM'} - {amenity.details?.closing_time || '10:00 PM'}</div>
                          <div><b>Capacity:</b> {amenity.details?.capacity || '35 Guests'}</div>
                        </div>
                      )}

                      {/* Gym specific details */}
                      {amenity.amenity_type === 'gym' && (
                        <div style={{ fontSize: 13, color: '#cbd5e1', margin: '8px 0', lineHeight: 1.5 }}>
                          <div><b>Hours:</b> {amenity.details?.opening_time || '05:30 AM'} - {amenity.details?.closing_time || '11:00 PM'}</div>
                          <div><b>Facilities:</b> {amenity.details?.equipment ? `${String(amenity.details.equipment).slice(0, 60)}…` : 'Cardio & Strength'}</div>
                        </div>
                      )}

                      {/* Parking specific details */}
                      {amenity.amenity_type === 'parking' && (
                        <div style={{ fontSize: 13, color: '#cbd5e1', margin: '8px 0', lineHeight: 1.5 }}>
                          <div><b>Location:</b> {amenity.details?.parking_location || 'Basement / Surface Bay'}</div>
                          <div><b>Available Bays:</b> {amenity.details?.available_spaces || '20+'} spaces</div>
                        </div>
                      )}

                      {/* Spa specific details */}
                      {amenity.amenity_type === 'spa' && (
                        <div style={{ fontSize: 13, color: '#cbd5e1', margin: '8px 0', lineHeight: 1.5 }}>
                          <div><b>Duration:</b> {amenity.details?.duration || '60 Mins'}</div>
                          <div><b>Therapy:</b> {amenity.details?.service_description ? `${String(amenity.details.service_description).slice(0, 70)}…` : 'Holistic therapy'}</div>
                        </div>
                      )}

                      {/* Usage Rules */}
                      {amenity.rules && (
                        <div style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          borderLeft: '3px solid #E6C786',
                          padding: '6px 10px',
                          margin: '10px 0 14px',
                          fontSize: 12,
                          color: '#94a3b8',
                          lineHeight: 1.4,
                          borderRadius: '0 6px 6px 0'
                        }}>
                          <b>Rules:</b> {amenity.rules}
                        </div>
                      )}

                      <div style={{ marginTop: 'auto', paddingTop: 10 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenBooking(amenity)}
                          style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, #E6C786, #c5a867)',
                            color: '#0f172a',
                            border: 'none',
                            borderRadius: 8,
                            padding: '10px 14px',
                            fontWeight: 700,
                            fontSize: 13,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          <span>{amenity.amenity_type === 'wifi' ? '📶 View Wi-Fi & Support' : '📅 Book / Request Amenity →'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB 2: MY SERVICE REQUESTS                                  */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'my-requests' && (
        <div>
          {/* Controls Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
            gap: 12,
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              {['ALL', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setRequestFilter(st)}
                  style={{
                    background: requestFilter === st ? '#38bdf8' : 'rgba(30, 41, 59, 0.8)',
                    color: requestFilter === st ? '#0f172a' : '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {st}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search by Request ID, room..."
              value={requestSearch}
              onChange={(e) => setRequestSearch(e.target.value)}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '7px 12px',
                borderRadius: 6,
                fontSize: 13,
                width: 240
              }}
            />
          </div>

          {loadingRequests ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
              Loading your service requests…
            </div>
          ) : filteredRequests.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(15, 23, 42, 0.5)',
              borderRadius: 16,
              border: '1px dashed rgba(255, 255, 255, 0.15)'
            }}>
              <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>📭</span>
              <h3 style={{ margin: '0 0 6px', color: '#fff' }}>No Service Requests Found</h3>
              <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: 14 }}>
                You have not submitted any service requests or amenity bookings yet.
              </p>
              <button
                type="button"
                className="btn primary"
                onClick={() => setActiveTab('explore')}
                style={{ background: '#E6C786', color: '#0f172a', fontWeight: 600 }}
              >
                Browse & Book Amenities Now →
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredRequests.map((req) => {
                const isPaidOrFree = req.total_charge === 0 || req.payment_status === 'included in room tariff' || req.payment_status === 'paid';
                return (
                  <div
                    key={req.id || req.request_id}
                    style={{
                      background: 'rgba(30, 41, 59, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 12,
                      padding: '18px 22px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 16
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{
                          fontFamily: 'monospace',
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#38bdf8',
                          background: 'rgba(56, 189, 248, 0.12)',
                          padding: '2px 8px',
                          borderRadius: 4
                        }}>
                          {req.request_id}
                        </span>
                        <h4 style={{ margin: 0, fontSize: 16, color: '#FAF5EE' }}>
                          {req.amenity_name || req.service_type}
                        </h4>
                        <StatusBadge status={req.status} />
                      </div>

                      <div style={{ fontSize: 13, color: '#94a3b8', display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 6 }}>
                        <span>🏨 Room: <b style={{ color: '#fff' }}>{req.room_number || '101'}</b></span>
                        {req.booking_reference && <span>Ref: <b style={{ color: '#cbd5e1' }}>{req.booking_reference}</b></span>}
                        {req.details?.request_date && <span>📅 Date: <b style={{ color: '#cbd5e1' }}>{req.details.request_date}</b></span>}
                        {req.details?.time_slot && <span>⏱️ Slot: <b style={{ color: '#cbd5e1' }}>{req.details.time_slot}</b></span>}
                        {req.assigned_to && <span>👤 Assigned: <b style={{ color: '#cbd5e1' }}>{req.assigned_to}</b></span>}
                      </div>

                      {req.cancellation_reason && (
                        <div style={{ marginTop: 8, fontSize: 12, color: '#f87171' }}>
                          <b>Cancellation Reason:</b> {req.cancellation_reason}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Charges Breakdown Pill */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: req.total_charge > 0 ? '#E6C786' : '#4ade80' }}>
                          {req.total_charge > 0 ? `₹${parseFloat(req.total_charge).toFixed(2)}` : 'Complimentary'}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase' }}>
                          {req.payment_status}
                        </div>
                      </div>

                      {/* Cancel Action */}
                      {req.can_cancel ? (
                        <button
                          type="button"
                          onClick={() => setCancelModal({ open: true, request: req, reason: '' })}
                          style={{
                            background: 'rgba(239, 68, 68, 0.12)',
                            color: '#f87171',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            padding: '7px 14px',
                            borderRadius: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Cancel Request
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          {req.status === 'Completed' ? 'Completed' : 'Cancelled'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB: MY RESERVATION & BILLING                                */}
      {/* ──────────────────────────────────────────────────────────── */}
      {activeTab === 'my-reservation' && (
        <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0, 1fr)' }}>
          {loadingBilling ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🔄</div>
              <div>Loading real-time invoice and billing breakdown…</div>
            </div>
          ) : billingError ? (
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 10, padding: 20, color: '#fca5a5' }}>
              ⚠️ {billingError}
            </div>
          ) : reservationBilling ? (
            <>
              {/* Stay Header & Status Banner */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 14,
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16
              }}>
                <div>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 4 }}>
                    {reservationBilling.hotel_name || 'StayFlow Hotel'} • Official Stay Folio
                  </div>
                  <h2 style={{ margin: 0, fontSize: 20, color: '#FAF5EE' }}>
                    Room {reservationBilling.room_number} • {reservationBilling.room_type}
                  </h2>
                  <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>
                    Guest: <b style={{ color: '#FAF5EE' }}>{reservationBilling.guest_name}</b> • Ref: <code>{reservationBilling.booking_reference}</code>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Folio Payment Status</div>
                    <StatusBadge status={reservationBilling.billing?.payment_status || 'Pending'} />
                  </div>
                  <a
                    href={`/api/invoices/${encodeURIComponent(reservationBilling.booking_reference)}/pdf`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn ghost"
                    style={{ fontSize: 12, padding: '8px 14px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <span>📄</span> Download PDF
                  </a>
                </div>
              </div>

              {/* 3-Column Key Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16
              }}>
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Total Invoice Amount</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#FAF5EE' }}>
                    ₹{Number(reservationBilling.billing?.total_bill || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <small style={{ color: '#64748B', fontSize: 11 }}>Includes Room Charges + 12% GST</small>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 12, padding: 18 }}>
                  <div style={{ fontSize: 12, color: '#10B981', marginBottom: 4 }}>Total Paid Amount</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10B981' }}>
                    ₹{Number(reservationBilling.billing?.amount_paid || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <small style={{ color: '#10B981', fontSize: 11 }}>Captured & Verified Payments</small>
                </div>

                <div style={{
                  background: (reservationBilling.billing?.balance_due || 0) > 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)',
                  border: `1px solid ${(reservationBilling.billing?.balance_due || 0) > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.2)'}`,
                  borderRadius: 12,
                  padding: 18
                }}>
                  <div style={{ fontSize: 12, color: (reservationBilling.billing?.balance_due || 0) > 0 ? '#F87171' : '#10B981', marginBottom: 4 }}>
                    Remaining Outstanding Balance
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: (reservationBilling.billing?.balance_due || 0) > 0 ? '#EF4444' : '#10B981' }}>
                    ₹{Number(reservationBilling.billing?.balance_due || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <small style={{ color: (reservationBilling.billing?.balance_due || 0) > 0 ? '#F87171' : '#10B981', fontSize: 11 }}>
                    {(reservationBilling.billing?.balance_due || 0) > 0 ? 'Pending Settlement' : '✓ Settle Zero Balance'}
                  </small>
                </div>
              </div>

              {/* Online Payment Settlement Panel */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid #3B82F6',
                borderRadius: 14,
                padding: '22px 24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>⚡</span>
                    <h3 style={{ margin: 0, fontSize: 17, color: '#FAF5EE' }}>Pay Online via Razorpay</h3>
                  </div>
                  <span style={{ background: '#1E3A8A', color: '#93C5FD', padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
                    TEST MODE ACTIVE
                  </span>
                </div>

                {paySuccess && (
                  <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10B981', color: '#34D399', padding: '12px 16px', borderRadius: 8, fontSize: 14, marginBottom: 14, fontWeight: 600 }}>
                    {paySuccess}
                  </div>
                )}
                {payError && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #EF4444', color: '#F87171', padding: '12px 16px', borderRadius: 8, fontSize: 14, marginBottom: 14 }}>
                    ⚠️ {payError}
                  </div>
                )}

                {Number(reservationBilling.billing?.balance_due || 0) > 0 ? (
                  <div>
                    <p style={{ margin: '0 0 16px', color: '#94a3b8', fontSize: 14 }}>
                      Settle your remaining balance securely using Razorpay (Cards, UPI, Netbanking).
                    </p>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ position: 'relative', width: 200 }}>
                        <span style={{ position: 'absolute', left: 10, top: 10, color: '#64748B', fontSize: 14 }}>₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="1"
                          max={reservationBilling.billing?.balance_due}
                          style={{
                            width: '100%',
                            padding: '9px 12px 9px 24px',
                            borderRadius: 8,
                            border: '1px solid #334155',
                            background: '#0F172A',
                            color: '#FFF',
                            fontSize: 15,
                            fontWeight: 700
                          }}
                          value={payAmount !== '' ? payAmount : (reservationBilling.billing?.balance_due || '')}
                          onChange={(e) => setPayAmount(e.target.value)}
                          placeholder="Amount (₹)"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => setPayAmount(String(reservationBilling.billing?.balance_due || ''))}
                        className="btn ghost"
                        style={{ fontSize: 12, padding: '9px 14px', borderRadius: 8, color: '#38BDF8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                      >
                        ⚡ Settle Full Balance (₹{Number(reservationBilling.billing?.balance_due || 0).toFixed(2)})
                      </button>

                      <button
                        type="button"
                        className="btn primary"
                        style={{ padding: '9px 22px', fontSize: 14, borderRadius: 8, background: '#2563EB', borderColor: '#1D4ED8', fontWeight: 600 }}
                        onClick={() => handleCustomerRazorpayPayment()}
                        disabled={paying}
                      >
                        {paying ? 'Connecting to Gateway…' : `💳 Pay ₹${Number(payAmount || reservationBilling.billing?.balance_due || 0).toFixed(2)} with Razorpay`}
                      </button>
                    </div>

                    <small style={{ display: 'block', marginTop: 10, color: '#64748B', fontSize: 12 }}>
                      🔒 Supports full balance settlement or partial payment. In Test Mode, use Razorpay test card <code>4012 0000 0000 0002</code> or UPI simulator.
                    </small>
                  </div>
                ) : (
                  <div style={{ padding: '16px 20px', background: 'rgba(16, 185, 129, 0.08)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.25)', color: '#34D399', fontSize: 14, fontWeight: 600 }}>
                    ✓ This reservation is fully settled! Outstanding balance is ₹0.00. Thank you for your stay.
                  </div>
                )}
              </div>

              {/* Itemized Billing Breakdown & Payment History */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: 20
              }}>
                {/* Daily Charges & Services */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 20 }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: 15, color: '#FAF5EE' }}>Detailed Room & Stay Breakdown</h4>
                  <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '8px 0', color: '#94a3b8' }}>Room Rate ({reservationBilling.billing?.nights || 1} Night(s))</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#FAF5EE' }}>
                          ₹{Number(reservationBilling.billing?.room_charges || 0).toFixed(2)}
                        </td>
                      </tr>
                      {Number(reservationBilling.billing?.additional_charges || 0) > 0 && (
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <td style={{ padding: '8px 0', color: '#94a3b8' }}>Additional Amenities & Services</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#FAF5EE' }}>
                            ₹{Number(reservationBilling.billing?.additional_charges || 0).toFixed(2)}
                          </td>
                        </tr>
                      )}
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <td style={{ padding: '8px 0', color: '#94a3b8' }}>GST / Taxes ({reservationBilling.billing?.gst_percent || 12}%)</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600, color: '#FAF5EE' }}>
                          ₹{Number(reservationBilling.billing?.tax_amount || 0).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '12px 0 4px', fontWeight: 700, color: '#FAF5EE', fontSize: 14 }}>Total Invoice Amount</td>
                        <td style={{ padding: '12px 0 4px', textAlign: 'right', fontWeight: 700, color: '#FAF5EE', fontSize: 15 }}>
                          ₹{Number(reservationBilling.billing?.total_bill || 0).toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Payment History Ledger */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: 12, padding: 20 }}>
                  <h4 style={{ margin: '0 0 14px', fontSize: 15, color: '#FAF5EE' }}>Payment History</h4>
                  {reservationBilling.payments && reservationBilling.payments.length > 0 ? (
                    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', fontSize: 11, textAlign: 'left' }}>
                          <th style={{ padding: '6px 0' }}>Method</th>
                          <th style={{ padding: '6px 8px' }}>Amount</th>
                          <th style={{ padding: '6px 8px' }}>Status</th>
                          <th style={{ padding: '6px 0', textAlign: 'right' }}>Reference</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reservationBilling.payments.map((p) => (
                          <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '8px 0', color: '#FAF5EE' }}>{p.method}</td>
                            <td style={{ padding: '8px 8px', fontWeight: 600, color: p.status === 'Paid' ? '#10B981' : '#FAF5EE' }}>
                              ₹{Number(p.amount).toFixed(2)}
                            </td>
                            <td style={{ padding: '8px 8px' }}>
                              <StatusBadge status={p.status} />
                            </td>
                            <td style={{ padding: '8px 0', textAlign: 'right', fontSize: 11, color: '#64748B' }}>
                              {p.transaction_reference ? p.transaction_reference.slice(0, 14) + '…' : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '20px 0', color: '#64748B', fontSize: 13, textAlign: 'center' }}>
                      No payments recorded yet for this booking.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
              No active reservation selected.
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL: AMENITY-SPECIFIC BOOKING FORM                         */}
      {/* ──────────────────────────────────────────────────────────── */}
      {bookingModalOpen && selectedAmenity && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 9999,
          padding: 16,
          overflowY: 'auto'
        }}>
          <div className="panel amenity-booking-modal" style={{
            background: '#1e293b',
            border: '1px solid rgba(226, 199, 134, 0.3)',
            borderRadius: 16,
            width: '100%',
            maxWidth: 580,
            maxHeight: 'calc(100dvh - 32px)',
            overflowY: 'auto',
            padding: '24px 28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            color: '#fff',
            boxSizing: 'border-box'
          }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 14 }}>
              <div>
                <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#E6C786' }}>
                  {selectedAmenity.amenity_type.replace('_', ' ')}
                </span>
                <h2 style={{ margin: '2px 0 0', fontSize: 20, color: '#FAF5EE' }}>
                  {selectedAmenity.name}
                </h2>
              </div>
              <button
                type="button"
                className="btn sm ghost"
                onClick={() => setBookingModalOpen(false)}
                style={{ fontSize: 16 }}
              >
                ✕
              </button>
            </div>

            {/* CONFIRMATION SCREEN AFTER SUBMISSION */}
            {confirmationData ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#4ade80',
                  fontSize: 28,
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 16px'
                }}>
                  ✓
                </div>
                <h3 style={{ margin: '0 0 6px', fontSize: 20, color: '#FAF5EE' }}>
                  Service Request Confirmed!
                </h3>
                <p style={{ margin: '0 0 20px', color: '#94a3b8', fontSize: 14 }}>
                  Your amenity booking has been registered with the Guest Services desk.
                </p>

                {/* Details Card */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 12,
                  padding: 16,
                  textAlign: 'left',
                  fontSize: 13,
                  lineHeight: 1.8,
                  marginBottom: 24
                }}>
                  <div><b>Service Request ID:</b> <span style={{ color: '#38bdf8', fontWeight: 700, fontFamily: 'monospace' }}>{confirmationData.request_id}</span></div>
                  <div><b>Amenity:</b> {confirmationData.amenity_name}</div>
                  <div><b>Resident Room:</b> Room {confirmationData.room_number} (Ref: {confirmationData.booking_reference})</div>
                  <div><b>Total Charges:</b> <span style={{ color: '#E6C786', fontWeight: 700 }}>₹{confirmationData.total_charge?.toFixed(2)}</span> ({confirmationData.pricing_type})</div>
                  <div><b>Payment Status:</b> <span style={{ textTransform: 'capitalize' }}>{confirmationData.payment_status}</span></div>
                  <div><b>Request Status:</b> <span style={{ color: '#4ade80', fontWeight: 600 }}>{confirmationData.status}</span></div>
                </div>

                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn primary"
                    onClick={() => {
                      setBookingModalOpen(false);
                      setActiveTab('my-requests');
                    }}
                    style={{ background: '#E6C786', color: '#0f172a', fontWeight: 600 }}
                  >
                    View in My Service Requests →
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setBookingModalOpen(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* FORM CONTENT */
              <form onSubmit={handleSubmitBooking}>
                
                {/* Linked Reservation Display */}
                <div style={{
                  background: 'rgba(15, 23, 42, 0.7)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 8,
                  padding: '10px 14px',
                  marginBottom: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 13
                }}>
                  <div>
                    <span style={{ color: '#94a3b8' }}>Booking Stay: </span>
                    <b>Room {selectedBooking?.room_number || '101'}</b> • Ref: {selectedBooking?.reference}
                  </div>
                  <span style={{ color: '#4ade80', fontWeight: 600, fontSize: 12 }}>● Verified Stay</span>
                </div>

                {/* ── 1. Wi-Fi Specific Form ── */}
                {selectedAmenity.amenity_type === 'wifi' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 13, marginBottom: 8, lineHeight: 1.6 }}>
                      <div><b>Network Name (SSID):</b> <code style={{ color: '#38bdf8' }}>{selectedAmenity.details?.network_name || selectedAmenity.name}</code></div>
                      <div><b>Coverage Area:</b> {selectedAmenity.details?.coverage_area || 'Entire Hotel'}</div>
                      <div><b>Access Instructions:</b> {selectedAmenity.details?.access_instructions || 'Connect to the SSID. A captive portal will prompt for Room Number and Guest Name.'}</div>
                      <div style={{ color: '#4ade80', marginTop: 4 }}>✓ High-speed complimentary connectivity. No manual password required.</div>
                    </div>
                    <div className="field" style={{ marginTop: 10 }}>
                      <label>Need Connection Assistance?</label>
                      <select
                        value={bookingForm.specific_params?.issue_type || 'Device Connection Setup'}
                        onChange={(e) => setBookingForm({
                          ...bookingForm,
                          specific_params: { ...bookingForm.specific_params, issue_type: e.target.value }
                        })}
                      >
                        <option value="Device Connection Setup">Request Setup Assistance for Laptop/Phone</option>
                        <option value="Bandwidth / Speed Issue">Report Speed or Signal Issue</option>
                        <option value="Smart TV / Gaming Console Pairing">Pair Smart Device / Console</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* ── 2. AC Specific Form ── */}
                {selectedAmenity.amenity_type === 'ac' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="grid2" style={{ marginBottom: 12 }}>
                      <div className="field">
                        <label>Request / Issue Type *</label>
                        <select
                          value={bookingForm.specific_params?.issue_type || 'Temperature Adjustment'}
                          onChange={(e) => setBookingForm({
                            ...bookingForm,
                            specific_params: { ...bookingForm.specific_params, issue_type: e.target.value }
                          })}
                        >
                          <option value="Temperature Adjustment">Temperature Adjustment</option>
                          <option value="Remote Controller Help">Remote Not Working / Missing</option>
                          <option value="Cooling Issue">Not Cooling Sufficiently</option>
                          <option value="Noise Issue">Unusual Fan / Unit Noise</option>
                          <option value="Filter Clean Request">Filter Inspection / Air Freshening</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>Preferred Temperature</label>
                        <select
                          value={bookingForm.specific_params?.target_temp || '22°C'}
                          onChange={(e) => setBookingForm({
                            ...bookingForm,
                            specific_params: { ...bookingForm.specific_params, target_temp: e.target.value }
                          })}
                        >
                          {['18°C', '19°C', '20°C', '21°C', '22°C', '23°C', '24°C', '25°C', '26°C'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      Unit Status: <b>{selectedAmenity.details?.maintenance_status || 'Operational'}</b> • Climate technicians respond within 15 minutes.
                    </div>
                  </div>
                )}

                {/* ── 3. TV Specific Form ── */}
                {selectedAmenity.amenity_type === 'tv' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="grid2" style={{ marginBottom: 12 }}>
                      <div className="field">
                        <label>TV Service / Issue Type *</label>
                        <select
                          value={bookingForm.specific_params?.issue_type || 'Streaming App Login Assistance'}
                          onChange={(e) => setBookingForm({
                            ...bookingForm,
                            specific_params: { ...bookingForm.specific_params, issue_type: e.target.value }
                          })}
                        >
                          <option value="Streaming App Login Assistance">Streaming / OTT Setup (Netflix, Prime)</option>
                          <option value="Cable / Channel Request">Specific Channel Request (Sports, News)</option>
                          <option value="Remote Controller Issue">Remote Control Not Pairing / Battery</option>
                          <option value="No Signal / HDMI Connection">No Signal / HDMI Connection</option>
                          <option value="Audio / Soundbar Help">Audio / Soundbar Assistance</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>Channel or App Requested</label>
                        <input
                          type="text"
                          placeholder="e.g. Sony Sports, Disney+, YouTube"
                          value={bookingForm.specific_params?.channel_or_app || ''}
                          onChange={(e) => setBookingForm({
                            ...bookingForm,
                            specific_params: { ...bookingForm.specific_params, channel_or_app: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      Screen Model: <b>{selectedAmenity.details?.tv_type || 'Smart UHD TV'}</b> • Remote: <b>{selectedAmenity.details?.remote_status || 'Paired'}</b>
                    </div>
                  </div>
                )}

                {/* ── 4. Swimming Pool Form ── */}
                {selectedAmenity.amenity_type === 'swimming_pool' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="grid2" style={{ marginBottom: 12 }}>
                      <div className="field">
                        <label>Date *</label>
                        <input
                          type="date"
                          value={bookingForm.request_date}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setBookingForm({ ...bookingForm, request_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="field">
                        <label>Session Time Slot *</label>
                        <select
                          value={bookingForm.time_slot}
                          onChange={(e) => setBookingForm({ ...bookingForm, time_slot: e.target.value })}
                        >
                          <option value="Morning Sunrise 06:00 - 08:30 AM">Morning Sunrise (06:00 - 08:30 AM)</option>
                          <option value="Mid-Morning 09:00 - 11:30 AM">Mid-Morning (09:00 - 11:30 AM)</option>
                          <option value="Afternoon Calm 02:00 - 04:30 PM">Afternoon Calm (02:00 - 04:30 PM)</option>
                          <option value="Sunset Splash 05:00 - 07:30 PM">Sunset Splash (05:00 - 07:30 PM)</option>
                          <option value="Night Starlight 08:00 - 10:00 PM">Night Starlight (08:00 - 10:00 PM)</option>
                        </select>
                      </div>
                    </div>

                    <div className="field">
                      <label>Number of Guests (Max 8 per reservation)</label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={bookingForm.guest_count}
                        onChange={(e) => setBookingForm({ ...bookingForm, guest_count: e.target.value })}
                        required
                      />
                    </div>
                    <div style={{ fontSize: 12, color: '#38bdf8', marginTop: 6 }}>
                      Pool Capacity: {selectedAmenity.details?.capacity || '35 persons'} • Lifeguard on duty.
                    </div>
                  </div>
                )}

                {/* ── 5. Gym Form ── */}
                {selectedAmenity.amenity_type === 'gym' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="grid2" style={{ marginBottom: 12 }}>
                      <div className="field">
                        <label>Workout Date *</label>
                        <input
                          type="date"
                          value={bookingForm.request_date}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setBookingForm({ ...bookingForm, request_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="field">
                        <label>Preferred Visit Slot *</label>
                        <select
                          value={bookingForm.time_slot}
                          onChange={(e) => setBookingForm({ ...bookingForm, time_slot: e.target.value })}
                        >
                          <option value="Early Bird 06:00 - 08:00 AM">Early Bird (06:00 - 08:00 AM)</option>
                          <option value="Morning 08:30 - 10:30 AM">Morning (08:30 - 10:30 AM)</option>
                          <option value="Noon 12:00 - 02:00 PM">Noon (12:00 - 02:00 PM)</option>
                          <option value="Evening Prime 05:00 - 07:30 PM">Evening Prime (05:00 - 07:30 PM)</option>
                          <option value="Late Night 08:00 - 10:30 PM">Late Night (08:00 - 10:30 PM)</option>
                        </select>
                      </div>
                    </div>

                    <div className="field">
                      <label>Number of Guests</label>
                      <input
                        type="number"
                        min="1"
                        max="4"
                        value={bookingForm.guest_count}
                        onChange={(e) => setBookingForm({ ...bookingForm, guest_count: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                {/* ── 6. Parking Form ── */}
                {selectedAmenity.amenity_type === 'parking' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="grid2" style={{ marginBottom: 12 }}>
                      <div className="field">
                        <label>Vehicle Type *</label>
                        <select
                          value={bookingForm.vehicle_type}
                          onChange={(e) => setBookingForm({ ...bookingForm, vehicle_type: e.target.value })}
                        >
                          <option value="Sedan">Sedan</option>
                          <option value="SUV">SUV</option>
                          <option value="Hatchback">Hatchback</option>
                          <option value="Electric Vehicle (EV)">Electric Vehicle (EV)</option>
                          <option value="Motorcycle / Two-Wheeler">Motorcycle / Two-Wheeler</option>
                        </select>
                      </div>

                      <div className="field">
                        <label>Vehicle Reg Number *</label>
                        <input
                          type="text"
                          placeholder="e.g. MH 02 CZ 1234"
                          value={bookingForm.vehicle_registration}
                          onChange={(e) => setBookingForm({ ...bookingForm, vehicle_registration: e.target.value.toUpperCase() })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid2" style={{ marginBottom: 12 }}>
                      <div className="field">
                        <label>Arrival / Parking Date *</label>
                        <input
                          type="date"
                          value={bookingForm.request_date}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setBookingForm({ ...bookingForm, request_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="field">
                        <label>Duration / Slot *</label>
                        <select
                          value={bookingForm.time_slot}
                          onChange={(e) => setBookingForm({ ...bookingForm, time_slot: e.target.value })}
                        >
                          <option value="Overnight Valet (24 Hours)">Overnight Valet (24 Hours)</option>
                          <option value="Day Parking (08:00 AM - 08:00 PM)">Day Parking (08:00 AM - 08:00 PM)</option>
                          <option value="EV Fast Charging Session (4 Hours)">EV Fast Charging Session (4 Hours)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── 7. Spa Form ── */}
                {selectedAmenity.amenity_type === 'spa' && (
                  <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: 14, borderRadius: 10, marginBottom: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="grid2" style={{ marginBottom: 12 }}>
                      <div className="field">
                        <label>Appointment Date *</label>
                        <input
                          type="date"
                          value={bookingForm.request_date}
                          min={new Date().toISOString().slice(0, 10)}
                          onChange={(e) => setBookingForm({ ...bookingForm, request_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="field">
                        <label>Appointment Slot *</label>
                        <select
                          value={bookingForm.time_slot}
                          onChange={(e) => setBookingForm({ ...bookingForm, time_slot: e.target.value })}
                        >
                          <option value="10:00 AM - 11:15 AM">10:00 AM - 11:15 AM</option>
                          <option value="11:30 AM - 12:45 PM">11:30 AM - 12:45 PM</option>
                          <option value="02:00 PM - 03:15 PM">02:00 PM - 03:15 PM</option>
                          <option value="03:30 PM - 04:45 PM">03:30 PM - 04:45 PM</option>
                          <option value="05:30 PM - 06:45 PM">05:30 PM - 06:45 PM</option>
                          <option value="07:00 PM - 08:15 PM">07:00 PM - 08:15 PM</option>
                        </select>
                      </div>
                    </div>

                    <div className="field">
                      <label>Therapist Preference</label>
                      <select
                        value={bookingForm.specific_params?.therapist_preference || 'Any Certified Specialist'}
                        onChange={(e) => setBookingForm({
                          ...bookingForm,
                          specific_params: { ...bookingForm.specific_params, therapist_preference: e.target.value }
                        })}
                      >
                        <option value="Any Certified Specialist">Any Certified Specialist</option>
                        <option value="Female Therapist">Female Therapist</option>
                        <option value="Male Therapist">Male Therapist</option>
                        <option value="Senior Ayurvedic Doctor">Senior Ayurvedic Practitioner</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                <div className="field" style={{ marginBottom: 16 }}>
                  <label>Special Requests / Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Quiet corner, extra towels, allergies..."
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  />
                </div>

                {/* Real-time Pricing Preview Card */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.9))',
                  border: '1px solid rgba(226, 199, 134, 0.25)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  marginBottom: 20
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>Tariff & Charge Calculation:</span>
                    <span style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: pricePreview.isFree ? '#4ade80' : '#E6C786'
                    }}>
                      {pricePreview.isFree ? '₹0.00 (Complimentary)' : `₹${pricePreview.total.toFixed(2)}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {pricePreview.isFree
                      ? '✓ Marked as included in your room tariff. No additional charges will be added to your bill.'
                      : `Pricing Basis: ₹${pricePreview.unitPrice.toFixed(2)} × ${pricePreview.quantity} (${pricePreview.pricingType.replace('_', ' ')}). Calculated securely via database rates.`}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="actions" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setBookingModalOpen(false)}
                    disabled={submittingBooking}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn primary"
                    disabled={submittingBooking}
                    style={{
                      background: 'linear-gradient(135deg, #E6C786, #c5a867)',
                      color: '#0f172a',
                      fontWeight: 700,
                      padding: '10px 22px'
                    }}
                  >
                    {submittingBooking ? 'Submitting Request...' : (pricePreview.isFree ? 'Confirm Free Request' : `Confirm & Pay at Folio (₹${pricePreview.total.toFixed(2)})`)}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODAL: CANCELLATION DIALOG                                   */}
      {/* ──────────────────────────────────────────────────────────── */}
      {cancelModal.open && cancelModal.request && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 10000,
          padding: 16
        }}>
          <div style={{
            background: '#1e293b',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 14,
            width: '100%',
            maxWidth: 440,
            padding: '24px',
            color: '#fff'
          }}>
            <h3 style={{ margin: '0 0 10px', fontSize: 18, color: '#f87171' }}>
              Cancel Service Request?
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
              Are you sure you want to cancel request <b style={{ color: '#38bdf8' }}>{cancelModal.request.request_id}</b> ({cancelModal.request.amenity_name || cancelModal.request.service_type})?
              {cancelModal.request.payment_status === 'paid' && ' Any paid amounts will be automatically set to refunded.'}
            </p>

            <div className="field" style={{ marginBottom: 18 }}>
              <label>Reason for Cancellation (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Schedule changed, requested by mistake..."
                value={cancelModal.reason}
                onChange={(e) => setCancelModal({ ...cancelModal, reason: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setCancelModal({ open: false, request: null, reason: '' })}
                disabled={cancelling}
              >
                Keep Request
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                style={{ background: '#ef4444', color: '#fff', fontWeight: 600 }}
              >
                {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
