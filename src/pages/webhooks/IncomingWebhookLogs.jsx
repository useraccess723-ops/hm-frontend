import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { api } from '../../services/api';
import SubNav from '../../components/SubNav';
import { formatHotelTime, formatHotelDateTime } from '../../utils/format';

// ── Sensitive Information Masking Helpers ────────────────────────────────────
function maskEmail(email) {
  if (!email || typeof email !== 'string') return email;
  const parts = email.split('@');
  if (parts.length !== 2) return '••••••';
  const name = parts[0];
  const domain = parts[1];
  const maskedName = name.length <= 2 ? `${name[0]}*` : `${name.slice(0, 2)}••••${name.slice(-1)}`;
  return `${maskedName}@${domain}`;
}

function maskPhone(phone) {
  if (!phone || typeof phone !== 'string') return phone;
  const clean = phone.trim();
  if (clean.length <= 4) return '••••';
  const visiblePrefix = clean.slice(0, Math.min(6, clean.length - 4));
  const visibleSuffix = clean.slice(-2);
  return `${visiblePrefix} •••• ${visibleSuffix}`;
}

function maskSensitiveData(data) {
  if (data === null || data === undefined) return data;
  if (typeof data === 'string') {
    // If it looks like an email
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data)) return maskEmail(data);
    // If it looks like a phone number
    if (/^(\+?\d{1,3}[- ]?)?\d{10}$/.test(data.replace(/[\s-]/g, ''))) return maskPhone(data);
    // If it's a signature or token hash
    if (data.startsWith('sha256=')) return `sha256=${data.slice(7, 13)}••••••••`;
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => maskSensitiveData(item));
  }
  if (typeof data === 'object') {
    const masked = {};
    for (const [key, value] of Object.entries(data)) {
      const lower = key.toLowerCase();
      if (/email/i.test(lower)) {
        masked[key] = maskEmail(String(value));
      } else if (/phone|mobile|contact_number/i.test(lower)) {
        masked[key] = maskPhone(String(value));
      } else if (/token|secret|signature|authorization|api_key|password|cvv|card_number/i.test(lower)) {
        masked[key] = typeof value === 'string' && value.length > 8 ? `${value.slice(0, 4)}••••••••${value.slice(-4)}` : '••••••••••••';
      } else {
        masked[key] = maskSensitiveData(value);
      }
    }
    return masked;
  }
  return data;
}

// ── Formatting Helpers ───────────────────────────────────────────────────────
function formatHotelId(id) {
  if (!id && id !== 0) return 'H001';
  const str = String(id).trim();
  if (str.toUpperCase().startsWith('H')) return str.toUpperCase();
  const num = parseInt(str, 10);
  if (!Number.isNaN(num)) return `H${String(num).padStart(3, '0')}`;
  return `H${str}`;
}

function formatDate(isoStr) {
  if (!isoStr) return '-';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) {
      // Check if YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr.slice(0, 10))) {
        const [y, m, day] = isoStr.slice(0, 10).split('-');
        return `${day}-${m}-${y}`;
      }
      return isoStr;
    }
    const day = String(d.getDate()).padStart(2, '0');
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const y = d.getFullYear();
    return `${day}-${m}-${y}`;
  } catch {
    return isoStr;
  }
}

function formatStayDates(cin, cout) {
  if (!cin && !cout) return '-';
  const inStr = cin ? formatDate(cin) : '-';
  const outStr = cout ? formatDate(cout) : '-';
  return `${inStr} / ${outStr}`;
}

function formatAmount(amt) {
  if (amt === null || amt === undefined || amt === '') return '-';
  const num = Number(amt);
  if (Number.isNaN(num)) return String(amt);
  return num.toLocaleString('en-IN');
}

function formatTimestamp(isoStr, timeZone = 'Asia/Kolkata') {
  if (!isoStr) return '-';
  return formatHotelTime(isoStr, timeZone);
}

export default function IncomingWebhookLogs() {
  const navigate = useNavigate();
  const { notify, activeTenantId, user, activeTenant, tenant } = useStore();
  const hotelTimezone = activeTenant?.timezone || tenant?.timezone || 'Asia/Kolkata';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [selectedPlatform, setSelectedPlatform] = useState('All');
  const [selectedEventType, setSelectedEventType] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // View Details Modal
  const [activeLog, setActiveLog] = useState(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  // Fetch real incoming logs from backend
  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // Hotel-wise data isolation:
      // If user is scoped to a tenant/hotel, pass hotel_id
      const effectiveHotelId = activeTenantId || user?.hotel_id || (user?.tenant?.id ?? null);
      let url = '/api/webhooks/logs?direction=incoming&limit=300';
      if (effectiveHotelId && !user?.is_super_admin) {
        url += `&hotel_id=${encodeURIComponent(effectiveHotelId)}`;
      }

      const res = await api(url);
      if (Array.isArray(res)) {
        setLogs(res);
      } else {
        setLogs([]);
      }
      if (isRefresh) notify('✓ Incoming webhook logs refreshed');
    } catch (err) {
      notify(`Notice: ${err.message || 'Failed to fetch logs'}`);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [activeTenantId, user, notify]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Extract parsed fields for each log
  const parsedLogs = useMemo(() => {
    return logs.map((log) => {
      let p = {};
      if (log.payload) {
        try {
          p = typeof log.payload === 'string' ? JSON.parse(log.payload) : log.payload;
        } catch {
          p = {};
        }
      }

      // External Booking ID
      const externalBookingId =
        p.channel_reference ||
        p.booking_reference ||
        p.booking_id ||
        p.channel_ref ||
        p.reference ||
        p.id ||
        (p.booking && (p.booking.reference || p.booking.id)) ||
        '-';

      // Hotel ID
      const rawHotelId = log.hotel_id ?? p.hotel_id ?? p.property_id ?? 1;
      const hotelIdFormatted = formatHotelId(rawHotelId);

      // Check-in / Check-out
      const cin = p.check_in || p.arrival_date || p.start_date || (p.stay && p.stay.check_in) || null;
      const cout = p.check_out || p.departure_date || p.end_date || (p.stay && p.stay.check_out) || null;
      const stayDatesFormatted = formatStayDates(cin, cout);

      // Amount
      const amt = p.amount ?? p.total_amount ?? p.paid_amount ?? (p.pricing && p.pricing.total) ?? null;
      const amountFormatted = formatAmount(amt);

      // Received At
      const receivedAtFormatted = formatTimestamp(log.created_at, hotelTimezone);
      const receivedAtFullFormatted = formatHotelDateTime(log.created_at, hotelTimezone);

      // Signature Status
      const isInvalidSig =
        log.response_code === 401 ||
        (log.error_message && /signature/i.test(log.error_message)) ||
        (log.response_body && /signature/i.test(log.response_body));
      const sigStatus = isInvalidSig ? 'Invalid' : 'Valid';

      // Processing Status
      let procStatus = 'Success';
      if (log.response_code === 401) {
        procStatus = 'Rejected';
      } else if (log.response_code >= 400 && log.response_code < 500) {
        procStatus = 'Rejected';
      } else if (log.response_code >= 500) {
        procStatus = 'Failed';
      } else if (log.status === 'Success' || (log.response_code >= 200 && log.response_code < 300)) {
        procStatus = 'Success';
      } else if (log.status === 'Failed') {
        procStatus = 'Failed';
      } else {
        procStatus = log.status || 'Success';
      }

      // HTTP Status Code
      const httpStatus = log.response_code || 200;

      // Error Message
      let errorMsg = '-';
      if (log.response_code === 401) {
        errorMsg = 'Invalid signature';
      } else if (log.error_message && log.error_message !== '-') {
        errorMsg = log.error_message;
      } else if (log.response_code >= 500) {
        errorMsg = 'Database error';
      } else if (log.response_code >= 400 && log.response_body) {
        errorMsg = log.response_body;
      }

      return {
        ...log,
        _parsedPayload: p,
        _externalBookingId: externalBookingId,
        _hotelIdFormatted: hotelIdFormatted,
        _stayDatesFormatted: stayDatesFormatted,
        _amountFormatted: amountFormatted,
        _receivedAtFormatted: receivedAtFormatted,
        _receivedAtFullFormatted: receivedAtFullFormatted,
        _sigStatus: sigStatus,
        _procStatus: procStatus,
        _httpStatus: httpStatus,
        _errorMsg: errorMsg,
      };
    });
  }, [logs]);

  // Dynamic filter options based on available logs + standard platforms
  const availablePlatforms = useMemo(() => {
    const set = new Set(['MakeMyTrip', 'Agoda']);
    parsedLogs.forEach((l) => {
      if (l.channel) set.add(l.channel);
    });
    return Array.from(set);
  }, [parsedLogs]);

  const availableEventTypes = useMemo(() => {
    const set = new Set(['booking.created', 'booking.updated', 'booking.cancelled', 'payment.completed']);
    parsedLogs.forEach((l) => {
      if (l.event_type) set.add(l.event_type);
    });
    return Array.from(set);
  }, [parsedLogs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return parsedLogs.filter((item) => {
      // Platform filter
      if (selectedPlatform !== 'All') {
        if (!item.channel || item.channel.toLowerCase() !== selectedPlatform.toLowerCase()) {
          return false;
        }
      }

      // Event Type filter
      if (selectedEventType !== 'All') {
        if (!item.event_type || item.event_type.toLowerCase() !== selectedEventType.toLowerCase()) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'All') {
        if (item._procStatus.toLowerCase() !== selectedStatus.toLowerCase()) {
          return false;
        }
      }

      // Date Range Filter (from - to)
      if (fromDate) {
        const itemDate = item.created_at ? item.created_at.slice(0, 10) : '';
        if (itemDate && itemDate < fromDate) return false;
      }
      if (toDate) {
        const itemDate = item.created_at ? item.created_at.slice(0, 10) : '';
        if (itemDate && itemDate > toDate) return false;
      }

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          (item.channel && item.channel.toLowerCase().includes(q)) ||
          (item.event_type && item.event_type.toLowerCase().includes(q)) ||
          (item._externalBookingId && item._externalBookingId.toLowerCase().includes(q)) ||
          (item._hotelIdFormatted && item._hotelIdFormatted.toLowerCase().includes(q)) ||
          (item._stayDatesFormatted && item._stayDatesFormatted.toLowerCase().includes(q)) ||
          (item._amountFormatted && item._amountFormatted.toLowerCase().includes(q)) ||
          (item._errorMsg && item._errorMsg.toLowerCase().includes(q)) ||
          (String(item._httpStatus).includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [parsedLogs, selectedPlatform, selectedEventType, selectedStatus, fromDate, toDate, searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedPlatform, selectedEventType, selectedStatus, fromDate, toDate, searchQuery]);

  // Pagination calculation
  const totalEntries = filteredLogs.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalEntries);
  const currentRows = filteredLogs.slice(startIndex, endIndex);

  return (
    <>
      {/* Back button & Sub Navigation for seamless context */}
      <button className="back-btn" onClick={() => navigate('/webhooks')} style={{ marginBottom: 12 }}>
        <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 16, height: 16, stroke: 'currentColor', fill: 'none', strokeWidth: 2 }}>
          <path d="M19 12H5M12 5l-7 7 7 7" />
        </svg>
        <span>Webhooks & Developer APIs</span>
      </button>

      <SubNav parentPath="/webhooks" />

      {/* Main Container matching the uploaded picture layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Header Section */}
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink, #f1f5f9)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Incoming Webhook Logs
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--muted, #94a3b8)', fontWeight: 400 }}>
            View and track incoming booking and payment events from external platforms.
          </p>
        </div>

        {/* Filters Card */}
        <div
          style={{
            background: 'var(--panel, #15222f)',
            borderRadius: 12,
            border: '1px solid var(--line, #26364a)',
            padding: '16px 20px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', flex: 1 }}>
            {/* Source Platform */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 160 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                Source Platform
              </label>
              <select
                value={selectedPlatform}
                onChange={(e) => setSelectedPlatform(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line, #26364a)',
                  background: 'var(--bg, #0d1620)',
                  color: 'var(--ink, #f1f5f9)',
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="All" style={{ background: '#15222f', color: '#f1f5f9' }}>All</option>
                {availablePlatforms.map((p) => (
                  <option key={p} value={p} style={{ background: '#15222f', color: '#f1f5f9' }}>{p}</option>
                ))}
              </select>
            </div>

            {/* Event Type */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 170 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                Event Type
              </label>
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line, #26364a)',
                  background: 'var(--bg, #0d1620)',
                  color: 'var(--ink, #f1f5f9)',
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="All" style={{ background: '#15222f', color: '#f1f5f9' }}>All</option>
                {availableEventTypes.map((et) => (
                  <option key={et} value={et} style={{ background: '#15222f', color: '#f1f5f9' }}>{et}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 140 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line, #26364a)',
                  background: 'var(--bg, #0d1620)',
                  color: 'var(--ink, #f1f5f9)',
                  fontSize: 13,
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="All" style={{ background: '#15222f', color: '#f1f5f9' }}>All</option>
                <option value="Success" style={{ background: '#15222f', color: '#f1f5f9' }}>Success</option>
                <option value="Rejected" style={{ background: '#15222f', color: '#f1f5f9' }}>Rejected</option>
                <option value="Failed" style={{ background: '#15222f', color: '#f1f5f9' }}>Failed</option>
              </select>
            </div>

            {/* From - To Date Range */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                From - To
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 38,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid var(--line, #26364a)',
                  background: 'var(--bg, #0d1620)',
                }}
              >
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ink, #f1f5f9)',
                    fontSize: 12,
                    outline: 'none',
                    cursor: 'pointer',
                    colorScheme: 'dark',
                  }}
                  title="Filter from date"
                />
                <span style={{ color: 'var(--muted, #94a3b8)', fontSize: 12 }}>–</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--ink, #f1f5f9)',
                    fontSize: 12,
                    outline: 'none',
                    cursor: 'pointer',
                    colorScheme: 'dark',
                  }}
                  title="Filter to date"
                />
                {(fromDate || toDate) && (
                  <button
                    type="button"
                    onClick={() => { setFromDate(''); setToDate(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: 'var(--muted, #94a3b8)',
                      padding: '0 2px',
                    }}
                    title="Clear date filter"
                  >
                    ×
                  </button>
                )}
                <span style={{ fontSize: 14, color: 'var(--muted, #94a3b8)', marginLeft: 2 }}>📅</span>
              </div>
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 200, flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                Search
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Search booking ID, event..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    height: 38,
                    padding: '0 12px 0 32px',
                    borderRadius: 8,
                    border: '1px solid var(--line, #26364a)',
                    background: 'var(--bg, #0d1620)',
                    color: 'var(--ink, #f1f5f9)',
                    fontSize: 13,
                    outline: 'none',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    left: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--muted, #94a3b8)',
                    fontSize: 13,
                  }}
                >
                  🔍
                </span>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 14,
                      color: 'var(--muted, #94a3b8)',
                    }}
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Refresh Button matching the picture */}
          <button
            type="button"
            onClick={() => fetchLogs(true)}
            disabled={refreshing}
            style={{
              height: 38,
              padding: '0 18px',
              borderRadius: 8,
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: 13,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              cursor: refreshing ? 'not-allowed' : 'pointer',
              opacity: refreshing ? 0.75 : 1,
              transition: 'background 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.5s' }}>
              🔄
            </span>
            <span>Refresh</span>
          </button>
        </div>

        {/* Table Container */}
        <div
          style={{
            background: 'var(--panel, #15222f)',
            borderRadius: 12,
            border: '1px solid var(--line, #26364a)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}
        >
          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                textAlign: 'left',
                fontSize: 13,
                minWidth: 1100,
              }}
            >
              <thead>
                <tr
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    borderBottom: '1px solid var(--line, #26364a)',
                    color: 'var(--ink, #f1f5f9)',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <th style={{ padding: '14px 16px', width: 44, textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>#</th>
                  <th style={{ padding: '14px 16px' }}>Source Platform</th>
                  <th style={{ padding: '14px 16px' }}>Event Type</th>
                  <th style={{ padding: '14px 16px' }}>External Booking ID</th>
                  <th style={{ padding: '14px 16px' }}>Hotel ID</th>
                  <th style={{ padding: '14px 16px' }}>Check-in / Check-out</th>
                  <th style={{ padding: '14px 16px', textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ padding: '14px 16px' }}>Received At</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Signature Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>Processing Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center' }}>HTTP Status</th>
                  <th style={{ padding: '14px 16px' }}>Error Message</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={12} style={{ padding: 48, textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 18 }}>⏳</span>
                        <span>Loading real incoming webhook logs...</span>
                      </div>
                    </td>
                  </tr>
                ) : currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={12} style={{ padding: 48, textAlign: 'center', color: 'var(--muted, #94a3b8)' }}>
                      <div style={{ maxWidth: 360, margin: '0 auto' }}>
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                        <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink, #f1f5f9)' }}>No incoming webhook logs found</div>
                        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--muted, #94a3b8)' }}>
                          {searchQuery || selectedPlatform !== 'All' || selectedEventType !== 'All' || selectedStatus !== 'All' || fromDate || toDate
                            ? 'Try clearing active filters to view all records.'
                            : 'No incoming events have been received from external platforms yet.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentRows.map((row, idx) => {
                    const rowNumber = startIndex + idx + 1;

                    // Signature Badge colors
                    const sigBadgeStyle =
                      row._sigStatus === 'Valid'
                        ? { background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' }
                        : { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)' };

                    // Processing Status Badge colors
                    let procBadgeStyle = { background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' };
                    if (row._procStatus === 'Rejected') {
                      procBadgeStyle = { background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', border: '1px solid rgba(248, 113, 113, 0.3)' };
                    } else if (row._procStatus === 'Failed') {
                      procBadgeStyle = { background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185', border: '1px solid rgba(251, 113, 133, 0.3)' };
                    }

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setActiveLog(row)}
                        title="Click to view detailed request payload and headers"
                        style={{
                          borderBottom: '1px solid var(--line, #26364a)',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        {/* 1. # */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--muted, #94a3b8)', fontWeight: 500 }}>
                          {rowNumber}
                        </td>

                        {/* 2. Source Platform */}
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                          {row.channel || 'MakeMyTrip'}
                        </td>

                        {/* 3. Event Type */}
                        <td style={{ padding: '14px 16px', color: '#38bdf8', fontFamily: 'monospace', fontSize: 12 }}>
                          {row.event_type || 'booking.created'}
                        </td>

                        {/* 4. External Booking ID */}
                        <td style={{ padding: '14px 16px', fontWeight: 600, color: 'var(--ink, #e2e8f0)', fontFamily: 'monospace', fontSize: 12 }}>
                          {row._externalBookingId}
                        </td>

                        {/* 5. Hotel ID */}
                        <td style={{ padding: '14px 16px', color: 'var(--muted, #cbd5e1)', fontWeight: 500 }}>
                          {row._hotelIdFormatted}
                        </td>

                        {/* 6. Check-in / Check-out */}
                        <td style={{ padding: '14px 16px', color: 'var(--ink, #e2e8f0)', whiteSpace: 'nowrap' }}>
                          {row._stayDatesFormatted}
                        </td>

                        {/* 7. Amount (₹) */}
                        <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--ink, #f1f5f9)' }}>
                          {row._amountFormatted}
                        </td>

                        {/* 8. Received At */}
                        <td style={{ padding: '14px 16px', color: 'var(--muted, #cbd5e1)', whiteSpace: 'nowrap', fontSize: 12 }} title={row._receivedAtFullFormatted || row._receivedAtFormatted}>
                          {row._receivedAtFormatted}
                        </td>

                        {/* 9. Signature Status */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              ...sigBadgeStyle,
                              borderRadius: 9999,
                              padding: '4px 14px',
                              fontWeight: 600,
                              fontSize: 12,
                              display: 'inline-block',
                            }}
                          >
                            {row._sigStatus}
                          </span>
                        </td>

                        {/* 10. Processing Status */}
                        <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                          <span
                            style={{
                              ...procBadgeStyle,
                              borderRadius: 9999,
                              padding: '4px 14px',
                              fontWeight: 600,
                              fontSize: 12,
                              display: 'inline-block',
                            }}
                          >
                            {row._procStatus}
                          </span>
                        </td>

                        {/* 11. HTTP Status */}
                        <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: 600, color: row._httpStatus >= 400 ? '#f87171' : '#4ade80' }}>
                          {row._httpStatus}
                        </td>

                        {/* 12. Error Message */}
                        <td style={{ padding: '14px 16px', color: row._errorMsg !== '-' ? '#f87171' : 'var(--muted, #94a3b8)', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row._errorMsg}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer matching the picture */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: '1px solid var(--line, #26364a)',
              background: 'var(--panel, #15222f)',
              fontSize: 13,
              color: 'var(--muted, #94a3b8)',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              {totalEntries === 0
                ? 'Showing 0 to 0 of 0 entries'
                : `Showing ${startIndex + 1} to ${endIndex} of ${totalEntries} entries`}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Prev Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid var(--line, #26364a)',
                  background: 'var(--bg, #0d1620)',
                  color: currentPage === 1 ? 'var(--muted, #475569)' : 'var(--ink, #e2e8f0)',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 600,
                  fontSize: 13,
                }}
                aria-label="Previous page"
              >
                ‹
              </button>

              {/* Page Number Buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => {
                const isActive = pg === currentPage;
                return (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setCurrentPage(pg)}
                    style={{
                      minWidth: 32,
                      height: 32,
                      padding: '0 10px',
                      borderRadius: 6,
                      border: isActive ? '1px solid #2563eb' : '1px solid var(--line, #26364a)',
                      background: isActive ? '#2563eb' : 'var(--bg, #0d1620)',
                      color: isActive ? '#ffffff' : 'var(--ink, #e2e8f0)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {pg}
                  </button>
                );
              })}

              {/* Next Button */}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                style={{
                  minWidth: 32,
                  height: 32,
                  padding: '0 8px',
                  borderRadius: 6,
                  border: '1px solid var(--line, #26364a)',
                  background: 'var(--bg, #0d1620)',
                  color: currentPage === totalPages || totalPages === 0 ? 'var(--muted, #475569)' : 'var(--ink, #e2e8f0)',
                  cursor: currentPage === totalPages || totalPages === 0 ? 'not-allowed' : 'pointer',
                  display: 'grid',
                  placeItems: 'center',
                  fontWeight: 600,
                  fontSize: 13,
                }}
                aria-label="Next page"
              >
                ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── View Details Modal with Masked Sensitive Information ── */}
      {activeLog && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 16, 26, 0.75)',
            backdropFilter: 'blur(5px)',
            zIndex: 99999,
            display: 'grid',
            placeItems: 'center',
            padding: 16,
          }}
          onClick={() => setActiveLog(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '90vh',
              background: 'var(--panel, #15222f)',
              borderRadius: 16,
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--line, #26364a)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                borderBottom: '1px solid var(--line, #26364a)',
                background: 'var(--panel, #15222f)',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ink, #f1f5f9)' }}>
                    Incoming Webhook Details #{activeLog.id}
                  </h3>
                  <span
                    style={{
                      borderRadius: 9999,
                      padding: '2px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      background: activeLog._sigStatus === 'Valid' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: activeLog._sigStatus === 'Valid' ? '#4ade80' : '#f87171',
                      border: `1px solid ${activeLog._sigStatus === 'Valid' ? 'rgba(74, 222, 128, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`,
                    }}
                  >
                    Signature: {activeLog._sigStatus}
                  </span>
                  <span
                    style={{
                      borderRadius: 9999,
                      padding: '2px 10px',
                      fontSize: 11,
                      fontWeight: 700,
                      background: activeLog._procStatus === 'Success' ? 'rgba(34, 197, 94, 0.15)' : (activeLog._procStatus === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(244, 63, 94, 0.15)'),
                      color: activeLog._procStatus === 'Success' ? '#4ade80' : (activeLog._procStatus === 'Rejected' ? '#f87171' : '#fb7185'),
                      border: `1px solid ${activeLog._procStatus === 'Success' ? 'rgba(74, 222, 128, 0.3)' : (activeLog._procStatus === 'Rejected' ? 'rgba(248, 113, 113, 0.3)' : 'rgba(251, 113, 133, 0.3)')}`,
                    }}
                  >
                    {activeLog._procStatus}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted, #94a3b8)', marginTop: 4 }}>
                  Received from <b style={{ color: 'var(--ink, #f1f5f9)' }}>{activeLog.channel}</b> at {activeLog._receivedAtFullFormatted || activeLog._receivedAtFormatted} • Latency: {activeLog.latency_ms || 15}ms
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveLog(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid var(--line, #26364a)',
                  borderRadius: 8,
                  width: 32,
                  height: 32,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 16,
                  cursor: 'pointer',
                  color: 'var(--ink, #cbd5e1)',
                  lineHeight: 1,
                  padding: 0,
                  transition: 'all 0.15s ease',
                }}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Key metadata grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: 12,
                  padding: 14,
                  borderRadius: 10,
                  background: 'var(--bg, #0d1620)',
                  border: '1px solid var(--line, #26364a)',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase' }}>Source Platform</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink, #f1f5f9)', marginTop: 2 }}>{activeLog.channel}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase' }}>Event Type</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#38bdf8', marginTop: 2, fontFamily: 'monospace' }}>{activeLog.event_type}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase' }}>External Booking ID</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink, #f1f5f9)', marginTop: 2, fontFamily: 'monospace' }}>{activeLog._externalBookingId}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase' }}>Hotel ID</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink, #f1f5f9)', marginTop: 2 }}>{activeLog._hotelIdFormatted}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase' }}>Check-in / Check-out</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink, #f1f5f9)', marginTop: 2 }}>{activeLog._stayDatesFormatted}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase' }}>Booking Amount</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink, #f1f5f9)', marginTop: 2 }}>
                    {activeLog._amountFormatted !== '-' ? `₹${activeLog._amountFormatted}` : '-'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase' }}>HTTP Status Code</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: activeLog._httpStatus >= 400 ? '#f87171' : '#4ade80', marginTop: 2 }}>
                    HTTP {activeLog._httpStatus}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted, #94a3b8)', textTransform: 'uppercase' }}>Error Message</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: activeLog._errorMsg !== '-' ? '#f87171' : 'var(--muted, #94a3b8)', marginTop: 2 }}>
                    {activeLog._errorMsg}
                  </div>
                </div>
              </div>

              {/* Data Privacy & Masking Notice */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  color: '#5eead4',
                  background: 'rgba(14, 124, 123, 0.15)',
                  border: '1px solid rgba(20, 184, 166, 0.3)',
                  borderRadius: 8,
                  padding: '8px 12px',
                }}
              >
                <span>🛡️</span>
                <span><b>Data Protection:</b> Customer email addresses, phone numbers, and authentication tokens are automatically masked in accordance with hotel data isolation and privacy regulations.</span>
              </div>

              {/* Masked Payload Viewer */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink, #f1f5f9)' }}>
                    Masked Inbound JSON Payload
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const text = JSON.stringify(maskSensitiveData(activeLog._parsedPayload), null, 2);
                      navigator.clipboard.writeText(text);
                      setCopiedPayload(true);
                      setTimeout(() => setCopiedPayload(false), 2000);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#38bdf8',
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {copiedPayload ? '✓ Copied!' : '📋 Copy JSON'}
                  </button>
                </div>
                <pre
                  style={{
                    background: '#090f17',
                    border: '1px solid var(--line, #26364a)',
                    color: '#e2e8f0',
                    padding: 14,
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: 'Consolas, Monaco, monospace',
                    overflowX: 'auto',
                    maxHeight: 220,
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {JSON.stringify(maskSensitiveData(activeLog._parsedPayload), null, 2)}
                </pre>
              </div>

              {/* Masked Headers Viewer */}
              {activeLog.request_headers && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink, #f1f5f9)', marginBottom: 6 }}>
                    Masked Request Headers
                  </label>
                  <pre
                    style={{
                      background: '#090f17',
                      border: '1px solid var(--line, #26364a)',
                      color: '#94a3b8',
                      padding: 12,
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'Consolas, Monaco, monospace',
                      overflowX: 'auto',
                      maxHeight: 140,
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {(() => {
                      try {
                        const h = typeof activeLog.request_headers === 'string' ? JSON.parse(activeLog.request_headers) : activeLog.request_headers;
                        return JSON.stringify(maskSensitiveData(h), null, 2);
                      } catch {
                        return activeLog.request_headers;
                      }
                    })()}
                  </pre>
                </div>
              )}

              {/* Response Body */}
              {activeLog.response_body && (
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--ink, #f1f5f9)', marginBottom: 6 }}>
                    Server Response Output
                  </label>
                  <div
                    style={{
                      padding: '10px 14px',
                      background: activeLog._httpStatus >= 400 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                      border: `1px solid ${activeLog._httpStatus >= 400 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(74, 222, 128, 0.3)'}`,
                      color: activeLog._httpStatus >= 400 ? '#fca5a5' : '#86efac',
                      borderRadius: 8,
                      fontSize: 12,
                      fontFamily: 'monospace',
                    }}
                  >
                    {activeLog.response_body}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '12px 24px',
                borderTop: '1px solid var(--line, #26364a)',
                background: 'var(--panel, #15222f)',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveLog(null)}
                style={{
                  padding: '7px 18px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'var(--ink, #e2e8f0)',
                  border: '1px solid var(--line, #26364a)',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
