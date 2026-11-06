import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, getActiveTenantId, setActiveTenantId } from '../services/api';
import { inr, isPastDate } from '../utils/format';

const StoreContext = createContext(null);
export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
};
const fmt = (value) => value ? new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
const statusForUi = (s) => s === 'Checked-in' ? 'Checked-in' : s === 'Checked-out' ? 'Checked-out' : s;
const normalizeRoom = (r) => ({ ...r, n: Number.isNaN(Number(r.n)) ? r.n : Number(r.n), f: r.f ?? r.floor ?? 1, s: r.s ?? r.status, type: r.type, price: Number(r.price) });
const normalizeBooking = (b) => ({ ...b, id: b.id || b.reference, check_in: b.in, check_out: b.out, in: fmt(b.in), out: fmt(b.out), st: statusForUi(b.st || b.status), amt: Number(b.amt ?? b.total_amount ?? 0), pay: b.pay || 'Pending' });

export function StoreProvider({ children, user, onLogout }) {
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [channels, setChannels] = useState([]);
  const [guests, setGuests] = useState([]);
  const [payments, setPayments] = useState([]);
  const [offers, setOffers] = useState([]);
  const [records, setRecords] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [query, setQuery] = useState('');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingInitialDate, setBookingInitialDate] = useState(null);
  const [toast, setToast] = useState({ msg: '', show: false });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeTenantId, setActiveTenantIdState] = useState(getActiveTenantId());
  const [tenantsList, setTenantsList] = useState([]);
  const [tenant, setTenant] = useState(user?.tenant || null);
  const timer = useRef();

  const notify = useCallback((msg) => {
    setToast({ msg, show: true });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), 2600);
  }, []);

  // ── User-Isolated & Persistent Theme State (Light / Dark Theme) ──
  const [theme, setThemeState] = useState(() => {
    try {
      const activeUser = user?.email || sessionStorage.getItem('stayflow_user_email') || localStorage.getItem('stayflow_last_user_email');
      const userKey = activeUser ? `stayflow_theme_${activeUser.toLowerCase()}` : null;
      const saved = (userKey && localStorage.getItem(userKey)) || localStorage.getItem('stayflow_theme_preference');
      if (saved === 'light' || saved === 'white') return 'light';
      if (saved === 'dark' || saved === 'black') return 'dark';
    } catch {}
    return (typeof document !== 'undefined' && document.documentElement.dataset.theme) || 'dark';
  });

  const applyThemeGlobally = useCallback((newTheme) => {
    const normalized = (newTheme === 'light' || newTheme === 'white') ? 'light' : 'dark';
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = normalized;
    }
    setThemeState(normalized);
    try {
      localStorage.setItem('stayflow_theme_preference', normalized);
      const activeUser = user?.email || sessionStorage.getItem('stayflow_user_email') || localStorage.getItem('stayflow_last_user_email');
      if (activeUser) {
        localStorage.setItem(`stayflow_theme_${activeUser.toLowerCase()}`, normalized);
        localStorage.setItem('stayflow_last_user_email', activeUser.toLowerCase());
      }
    } catch {}
  }, [user]);

  const setTheme = useCallback(async (newTheme) => {
    const normalized = (newTheme === 'light' || newTheme === 'white') ? 'light' : 'dark';
    applyThemeGlobally(normalized);
    try {
      await api('/api/users/preferences', {
        method: 'PUT',
        body: JSON.stringify({ theme: normalized }),
      });
    } catch (e) {
      // Best-effort backend preference sync
    }
  }, [applyThemeGlobally]);

  const toggleTheme = useCallback(() => {
    const current = (typeof document !== 'undefined' && document.documentElement.dataset.theme) || theme;
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    notify(`Switched to ${nextTheme === 'light' ? 'Light' : 'Dark'} Theme`);
  }, [theme, setTheme, notify]);

  // Synchronize authenticated user's theme preference on login or startup
  useEffect(() => {
    if (user?.email) {
      try {
        sessionStorage.setItem('stayflow_user_email', user.email.toLowerCase());
        localStorage.setItem('stayflow_last_user_email', user.email.toLowerCase());
      } catch {}

      if (user.theme && (user.theme === 'light' || user.theme === 'dark')) {
        applyThemeGlobally(user.theme);
      } else {
        const userKey = `stayflow_theme_${user.email.toLowerCase()}`;
        const userSaved = localStorage.getItem(userKey);
        if (userSaved) {
          applyThemeGlobally(userSaved);
        } else {
          api('/api/users/preferences')
            .then((res) => {
              if (res?.theme) applyThemeGlobally(res.theme);
              if (Array.isArray(res?.dismissed_alerts)) {
                setDismissedAlertIds((prev) => {
                  const merged = Array.from(new Set([...prev, ...res.dismissed_alerts]));
                  try { localStorage.setItem('sf_dismissed_alerts', JSON.stringify(merged)); } catch {}
                  return merged;
                });
              }
            })
            .catch(() => {});
        }
      }
    }
  }, [user, applyThemeGlobally]);



  useEffect(() => {
    // Clear all tenant-specific state immediately when user changes or logs out
    setRooms([]);
    setBookings([]);
    setChannels([]);
    setGuests([]);
    setPayments([]);
    setOffers([]);
    setRecords([]);
    setDashboard(null);
    setRoomTypes([]);
    setLoadError('');

    if (user?.tenant) {
      setTenant(user.tenant);
    } else {
      setTenant(null);
    }
    if (user?.tenant_id && !user?.is_super_admin) {
      setActiveTenantId(user.tenant_id);
      setActiveTenantIdState(String(user.tenant_id));
    } else if (!user) {
      setActiveTenantId(null);
      setActiveTenantIdState(null);
    }
  }, [user]);

  const refresh = useCallback(async () => {
    setLoadError('');
    const isCustomer = Boolean((user?.role || '').toUpperCase() === 'CUSTOMER' || (user?.role || '').toUpperCase() === 'GUEST');
    if (isCustomer) {
      setRooms([]);
      setBookings([]);
      setGuests([]);
      setPayments([]);
      setOffers([]);
      setRecords([]);
      setChannels([]);
      setDashboard(null);
      setLoading(false);
      return;
    }
    if (user?.is_super_admin) {
      try {
        const tenants = await api('/api/superadmin/tenants').catch(() => []);
        setTenantsList(tenants);
        setRooms([]);
        setBookings([]);
        setGuests([]);
        setPayments([]);
        setOffers([]);
        setRecords([]);
        setChannels([]);
      } catch (err) {
        setLoadError(err.message || 'Could not load platform tenant list');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const calls = [
        api('/api/rooms'), api('/api/bookings?limit=500'), api('/api/channels'), api('/api/dashboard'),
        api('/api/guests?limit=200'), api('/api/payments'), api('/api/offers'), api('/api/records'),
        api('/api/settings').catch(() => null),
        api('/api/room-types').catch(() => []),
      ];
      const results = await Promise.allSettled(calls);
      const valueAt = (index, fallback = []) => results[index]?.status === 'fulfilled' ? results[index].value : fallback;
      if (results[0].status === 'rejected' || results[1].status === 'rejected' || results[3].status === 'rejected') {
        throw new Error([results[0], results[1], results[3]].find(r => r.status === 'rejected')?.reason?.message || 'Could not load hotel data');
      }
      setRooms(valueAt(0).map(normalizeRoom));
      setBookings(valueAt(1).map(normalizeBooking));
      setChannels(valueAt(2).map((c) => ({
        n: c.n || c.name,
        name: c.name || c.n,
        c: ({ MakeMyTrip: '#D6322E', Agoda: '#5A2E8A', 'Booking.com': '#1F4E9E', Expedia: '#B88A12' })[c.name || c.n] || '#777',
        d: c.description || 'Availability, rates and reservation updates',
        on: Boolean(c.on ?? c.enabled),
        sync: c.status || c.sync || 'Not connected',
        status: c.status || 'Not connected',
        b: c.b != null ? c.b : '—',
        com: '—',
        id: c.id,
        configured: Boolean(c.configured),
        last_sync_at: c.last_sync_at,
        last_error: c.last_error,
        sync_count: c.sync_count || 0,
        credentials: c.credentials || {},
      })));
      setDashboard(valueAt(3, null));
      if (results[4].status === 'fulfilled' && Array.isArray(results[4].value)) {
        setGuests(results[4].value);
      } else if (results[4].status === 'fulfilled') {
        setGuests(valueAt(4));
      }
      setPayments(valueAt(5)); setOffers(valueAt(6)); setRecords(valueAt(7, []));
      setRoomTypes(valueAt(9, []));
      const settingsVal = valueAt(8, null);
      if (settingsVal?.hotel_name) {
        setTenant((prev) => ({
          ...(prev || {}),
          id: user?.tenant_id || prev?.id || 1,
          name: prev?.name || settingsVal.hotel_name,
          hotel_name: settingsVal.hotel_name,
        }));
      }
    } catch (err) { setLoadError(err.message || 'Could not load hotel data'); }
    finally { setLoading(false); }
  }, [user]);

  const refreshGuests = useCallback(async () => {
    try {
      const [guestsData, bookingsData] = await Promise.all([
        api('/api/guests?limit=200'),
        api('/api/bookings?limit=500').catch(() => null),
      ]);
      if (Array.isArray(guestsData)) {
        setGuests(guestsData);
      }
      if (Array.isArray(bookingsData)) {
        setBookings(bookingsData.map(normalizeBooking));
      }
      return guestsData;
    } catch (err) {
      throw err;
    }
  }, []);

  const switchTenant = useCallback(async (tenantId) => {
    if (!user?.is_super_admin) return;
    setActiveTenantId(tenantId);
    setActiveTenantIdState(tenantId ? String(tenantId) : null);
    setLoading(true);
    await refresh();
    const tName = tenantsList.find(t => String(t.id) === String(tenantId))?.name;
    notify(tenantId ? `Switched view to hotel: ${tName || `Hotel #${tenantId}`}` : 'Switched to Platform-wide View');
  }, [user, tenantsList, refresh, notify]);

  const activeTenant = useMemo(() => {
    if (activeTenantId && tenantsList.length > 0) {
      return tenantsList.find(t => String(t.id) === String(activeTenantId)) || tenant || user?.tenant;
    }
    return tenant || user?.tenant;
  }, [activeTenantId, tenantsList, tenant, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const setBookingStatus = useCallback(async (id, st) => {
    try {
      await api(`/api/bookings/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status: st }) });
      await refresh(); notify(`Booking ${id} updated to ${st}`);
    } catch (err) { notify(err.message); }
  }, [refresh, notify]);

  const addBooking = useCallback(async ({ guest_id, guest, phone, email, identification_number, notes, room_type_id, room, src, in: inDate, out, nights, status = 'Confirmed', num_guests = 1, group_name = null, group_ref = null }) => {
    try {
      if (isPastDate(inDate)) throw new Error('Check-in date cannot be in the past. Choose today or a future date.');
      if (isPastDate(out)) throw new Error('Check-out date cannot be in the past. Choose a future date.');
      if (out <= inDate) throw new Error('Check-out date must be after check-in date');

      // Resolve existing guest database ID if available
      let resolvedGuestId = guest_id ? Number(guest_id) : undefined;
      if (!resolvedGuestId && guests && guests.length) {
        const found = guests.find(g => 
          (guest && g.full_name && g.full_name.trim().toLowerCase() === guest.trim().toLowerCase()) ||
          (phone && g.phone && g.phone.trim() === phone.trim())
        );
        if (found) resolvedGuestId = Number(found.id);
      }

      // Filter candidate rooms strictly by room_type_id or room type name
      const targetRoomTypeId = room_type_id ? Number(room_type_id) : undefined;
      const candidates = rooms.filter((r) => {
        if (['dirty', 'ooo'].includes(r.s)) return false;
        if (targetRoomTypeId) return Number(r.room_type_id) === targetRoomTypeId;
        return r.type === room;
      }).sort((a, b) => (a.s === 'vac' ? -1 : 0) - (b.s === 'vac' ? -1 : 0));

      let created = false; let lastError;
      const buildPayload = (roomRow = null) => {
        const payload = {
          check_in: inDate,
          check_out: out,
          source: src,
          status,
          num_guests: Number(num_guests) || 1,
          group_name: group_name || undefined,
          group_ref: group_ref || undefined,
        };
        if (roomRow) {
          payload.room_id = Number(roomRow.id);
          payload.room_type_id = Number(roomRow.room_type_id || targetRoomTypeId);
        } else if (targetRoomTypeId) {
          payload.room_type_id = targetRoomTypeId;
        }
        if (resolvedGuestId) {
          payload.guest_id = resolvedGuestId;
        } else {
          payload.guest = {
            full_name: guest,
            phone: phone || undefined,
            email: email || undefined,
            identification_number: identification_number || undefined,
            notes: notes || undefined,
          };
        }
        return payload;
      };

      const reqHeaders = user?.tenant_id && !user?.is_super_admin
        ? { 'X-Tenant-Id': String(user.tenant_id) }
        : {};

      if (candidates.length > 0) {
        for (const roomRow of candidates) {
          try {
            await api('/api/bookings', {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify(buildPayload(roomRow))
            });
            created = true; break;
          } catch (err) {
            lastError = err;
            if (!/overlapping reservation|already has/i.test(err.message)) throw err;
          }
        }
      } else if (targetRoomTypeId) {
        try {
          await api('/api/bookings', {
            method: 'POST',
            headers: reqHeaders,
            body: JSON.stringify(buildPayload(null))
          });
          created = true;
        } catch (err) {
          lastError = err;
        }
      } else {
        const typeName = room || 'selected';
        throw new Error(`No operational ${typeName} room is configured`);
      }

      if (!created) {
        const typeName = room || (roomTypes.find(rt => Number(rt.id) === targetRoomTypeId)?.name) || 'selected';
        throw lastError || new Error(`No ${typeName} room is available for the selected dates`);
      }
      await refresh(); notify(`Booking saved (${nights} night${nights === 1 ? '' : 's'})`); return true;
    } catch (err) { notify(err.message); return false; }
  }, [rooms, roomTypes, guests, user, refresh, notify]);

  const createGroupBooking = useCallback(async (payload) => {
    try {
      const res = await api('/api/bookings/group', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refresh();
      notify(`Group booking created: ${res.group_name} (${res.rooms_allocated} rooms, Ref: ${res.group_ref})`);
      return res;
    } catch (err) {
      notify(err.message || 'Failed to create group booking');
      return null;
    }
  }, [refresh, notify]);

  const toggleChannel = useCallback(async (index) => {
    const channel = channels[index]; if (!channel?.id) return;
    try {
      const updated = await api(`/api/channels/${channel.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: !channel.on }) });
      await refresh();
      notify(updated.integration_active ? 'Channel updated' : `${channel.n}: saved locally; provider integration credentials are not configured`);
    } catch (err) { notify(err.message); }
  }, [channels, refresh, notify]);

  const markRoomClean = useCallback(async (n) => {
    const room = rooms.find((r) => String(r.n) === String(n)); if (!room) return;
    try {
      await api(`/api/rooms/${room.id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'vac' }) });
      await refresh(); notify(`Room ${n} marked clean`);
    } catch (err) { notify(err.message); }
  }, [rooms, refresh, notify]);

  const updateRoomStatus = useCallback(async (roomId, status) => {
    try {
      await api(`/api/rooms/${roomId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await refresh(); notify('Room status updated in database'); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const updateRoom = useCallback(async (roomId, data) => {
    try {
      const res = await api(`/api/rooms/${roomId}`, { method: 'PUT', body: JSON.stringify(data) });
      await refresh();
      return res;
    } catch (err) {
      throw err;
    }
  }, [refresh]);

  const deleteRoom = useCallback(async (roomId) => {
    try {
      await api(`/api/rooms/${roomId}`, { method: 'DELETE' });
      await refresh(); notify('Room removed from database'); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const addGuest = useCallback(async (data) => {
    try {
      const res = await api('/api/guests', { method: 'POST', body: JSON.stringify(data) });
      await refresh();
      notify('Guest saved to database');
      return res;
    } catch (err) {
      notify(err.message || 'Failed to save guest');
      return null;
    }
  }, [refresh, notify]);

  const updateGuest = useCallback(async (id, data) => {
    try {
      const rawId = typeof id === 'object' && id !== null ? (id.id ?? id.guest_id) : id;
      const numId = parseInt(rawId, 10);
      if (Number.isNaN(numId) || numId <= 0) {
        const res = await addGuest(data);
        return Boolean(res);
      }
      await api(`/api/guests/${numId}`, { method: 'PUT', body: JSON.stringify(data) });
      await refresh();
      notify('Guest details saved to database');
      return true;
    } catch (err) {
      notify(err.message);
      return false;
    }
  }, [addGuest, refresh, notify]);

  const deleteGuest = useCallback(async (id) => {
    try {
      const rawId = typeof id === 'object' && id !== null ? (id.id ?? id.guest_id) : id;
      const numId = parseInt(rawId, 10);
      const targetId = Number.isNaN(numId) ? id : numId;
      await api(`/api/guests/${targetId}?cascade=true`, { method: 'DELETE' });
      await refresh();
      notify('Guest deleted from database');
      return true;
    } catch (err) {
      notify(err.message);
      return false;
    }
  }, [refresh, notify]);

  const updateBooking = useCallback(async (ref, data) => {
    try {
      await api(`/api/bookings/${encodeURIComponent(ref)}`, { method: 'PUT', body: JSON.stringify(data) });
      await refresh(); notify(`Booking ${ref} updated`); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const deleteBooking = useCallback(async (ref) => {
    try {
      await api(`/api/bookings/${encodeURIComponent(ref)}`, { method: 'DELETE' });
      await refresh(); notify(`Booking ${ref} deleted`); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const updatePayment = useCallback(async (id, data) => {
    try {
      await api(`/api/payments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      await refresh(); notify('Payment transaction updated'); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const deletePayment = useCallback(async (id) => {
    try {
      await api(`/api/payments/${id}`, { method: 'DELETE' });
      await refresh(); notify('Payment transaction removed'); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const toggleOffer = useCallback(async (id, active) => {
    try {
      await api(`/api/offers/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) });
      await refresh(); notify(`Offer ${active ? 'activated' : 'deactivated'}`); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const deleteOffer = useCallback(async (id) => {
    try {
      await api(`/api/offers/${id}`, { method: 'DELETE' });
      await refresh(); notify('Offer deleted'); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const updateUser = useCallback(async (id, data) => {
    try {
      await api(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
      await refresh(); notify('User updated'); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const deleteUser = useCallback(async (id) => {
    try {
      await api(`/api/admin/users/${id}`, { method: 'DELETE' });
      await refresh(); notify('User account removed'); return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  const getRecords = useCallback(async (cat) => {
    try {
      const path = cat ? `/api/records?category=${encodeURIComponent(cat)}` : '/api/records';
      return await api(path);
    } catch (_) { return []; }
  }, []);

  const addRecord = useCallback(async (rec) => {
    try {
      const res = await api('/api/records', { method: 'POST', body: JSON.stringify(rec) });
      notify(`${res.title || 'Record'} saved to database`);
      await refresh();
      return res;
    } catch (err) { notify(err.message); return null; }
  }, [refresh, notify]);

  const updateRecord = useCallback(async (id, rec) => {
    try {
      const res = await api(`/api/records/${id}`, { method: 'PUT', body: JSON.stringify(rec) });
      notify(`${res.title || 'Record'} updated in database`);
      await refresh();
      return res;
    } catch (err) { notify(err.message); return null; }
  }, [refresh, notify]);

  const deleteRecord = useCallback(async (id) => {
    try {
      await api(`/api/records/${id}`, { method: 'DELETE' });
      notify('Record deleted from database');
      await refresh();
      return true;
    } catch (err) { notify(err.message); return false; }
  }, [refresh, notify]);

  /* -- Alert Tracking & Synchronization -- */
  const [dismissedAlertIds, setDismissedAlertIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sf_dismissed_alerts') || '[]');
    } catch {
      return [];
    }
  });

  const dismissAlert = useCallback(async (alert) => {
    if (alert.source === 'record' && alert.recordId) {
      await updateRecord(alert.recordId, { ...alert.rawRecord, status: 'Dismissed' });
    } else {
      setDismissedAlertIds((prev) => {
        const next = prev.includes(alert.id) ? prev : [...prev, alert.id];
        try { localStorage.setItem('sf_dismissed_alerts', JSON.stringify(next)); } catch {}
        api('/api/users/preferences', {
          method: 'PUT',
          body: JSON.stringify({ dismissed_alerts: next }),
        }).catch(() => {});
        return next;
      });
      notify('Alert dismissed');
    }
  }, [updateRecord, notify, api]);

  const resolveAlert = useCallback(async (alert) => {
    if (alert.source === 'record' && alert.recordId) {
      await updateRecord(alert.recordId, { ...alert.rawRecord, status: 'Resolved' });
    } else {
      setDismissedAlertIds((prev) => {
        const next = prev.includes(alert.id) ? prev : [...prev, alert.id];
        try { localStorage.setItem('sf_dismissed_alerts', JSON.stringify(next)); } catch {}
        api('/api/users/preferences', {
          method: 'PUT',
          body: JSON.stringify({ dismissed_alerts: next }),
        }).catch(() => {});
        return next;
      });
      notify('Alert marked as resolved');
    }
  }, [updateRecord, notify, api]);

  const alerts = useMemo(() => {
    const list = [];

    // 1. Database Notification & Alert records from operational_records table
    const recordAlerts = (records || []).filter((r) => {
      const cat = (r.category || '').toLowerCase();
      const isNotifCat = cat === 'notifications' || cat.startsWith('notifications_') || cat === 'alerts' || cat.startsWith('alerts_') || cat === 'tasks';
      const st = (r.status || '').toLowerCase();
      const isPending = !['resolved', 'dismissed', 'completed', 'closed', 'inactive'].includes(st);
      return isNotifCat && isPending;
    });

    for (const r of recordAlerts) {
      const dataObj = typeof r.data === 'object' && r.data !== null ? r.data : {};
      const desc = dataObj.description || dataObj.Description || dataObj.Notes || dataObj.notes || dataObj.Reason || dataObj.reason || dataObj.Message || dataObj.message || (typeof r.data === 'string' ? r.data : '') || r.title;
      const createdDate = r.created_at ? new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recent';
      list.push({
        id: `rec-${r.id}`,
        recordId: r.id,
        source: 'record',
        rawRecord: r,
        title: r.title,
        description: desc,
        date: createdDate,
        status: r.status || 'Pending',
        color: (r.status || '').toLowerCase() === 'urgent' ? 'var(--red)' : 'var(--brass)',
      });
    }

    // 2. Operational System Alerts from Rooms and Bookings
    const pendingBookings = bookings.filter((b) => b.pay === 'Pending' || b.pay === 'Partially Paid');
    const pendingAmt = pendingBookings.reduce((sum, b) => sum + (b.amt || 0), 0);
    const dirtyRooms = rooms.filter((r) => r.s === 'dirty');
    const oooRooms = rooms.filter((r) => r.s === 'ooo');

    if (pendingBookings.length > 0 && !dismissedAlertIds.includes('op-pending-payments')) {
      list.push({
        id: 'op-pending-payments',
        source: 'operational',
        title: `${pendingBookings.length} booking${pendingBookings.length === 1 ? '' : 's'} have pending payments`,
        description: `${inr(pendingAmt)} balance to collect before or during stay. Bookings: ${pendingBookings.map(b => b.id).slice(0, 4).join(', ')}${pendingBookings.length > 4 ? '…' : ''}.`,
        date: 'Today',
        status: 'Pending',
        color: 'var(--brass)',
      });
    }

    if (dirtyRooms.length > 0 && !dismissedAlertIds.includes('op-dirty-rooms')) {
      list.push({
        id: 'op-dirty-rooms',
        source: 'operational',
        title: `${dirtyRooms.length} room${dirtyRooms.length === 1 ? '' : 's'} pending housekeeping`,
        description: `Rooms needing cleaning: Room ${dirtyRooms.map((r) => r.n).join(', Room ')}.`,
        date: 'Today',
        status: 'Pending',
        color: 'var(--brass)',
      });
    }

    if (oooRooms.length > 0 && !dismissedAlertIds.includes('op-ooo-rooms')) {
      list.push({
        id: 'op-ooo-rooms',
        source: 'operational',
        title: `${oooRooms.length} room${oooRooms.length === 1 ? '' : 's'} out of order`,
        description: `Maintenance attention needed for: Room ${oooRooms.map((r) => r.n).join(', Room ')}.`,
        date: 'Today',
        status: 'Action Required',
        color: 'var(--red)',
      });
    }

    return list;
  }, [records, bookings, rooms, dismissedAlertIds]);

  const alertCount = alerts.length;

  const logout = useCallback(async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (_) { /* token is removed by App */ }
    onLogout?.();
  }, [onLogout]);

  const openBookingModal = useCallback((initialDate = null) => {
    const validDate = typeof initialDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(initialDate) ? initialDate : null;
    setBookingInitialDate(validDate);
    setBookingModalOpen(true);
  }, []);

  const closeBookingModal = useCallback(() => {
    setBookingInitialDate(null);
    setBookingModalOpen(false);
  }, []);

  const value = useMemo(() => ({
    user, logout, bookings, rooms, roomTypes, channels, guests, payments, offers, dashboard, loading, loadError, refresh, refreshGuests,
    query, setQuery, toast, notify, bookingModalOpen, bookingInitialDate,
    openBookingModal, closeBookingModal,
    tenant, activeTenant, tenantsList, activeTenantId, switchTenant,
    setBookingStatus, addBooking, createGroupBooking, toggleChannel, markRoomClean,
    updateRoomStatus, updateRoom, deleteRoom,
    addGuest, updateGuest, deleteGuest, updateBooking, deleteBooking,
    updatePayment, deletePayment, toggleOffer, deleteOffer,
    updateUser, deleteUser, getRecords, addRecord, updateRecord, deleteRecord,
    records, alerts, alertCount, dismissAlert, resolveAlert, theme, setTheme, toggleTheme,
  }), [user, theme, setTheme, toggleTheme, logout, bookings, rooms, roomTypes, channels, guests, payments, offers, dashboard, loading, loadError, refresh, refreshGuests, query, toast, notify, bookingModalOpen, bookingInitialDate, openBookingModal, closeBookingModal, tenant, activeTenant, tenantsList, activeTenantId, switchTenant, setBookingStatus, addBooking, createGroupBooking, toggleChannel, markRoomClean, updateRoomStatus, updateRoom, deleteRoom, addGuest, updateGuest, deleteGuest, updateBooking, deleteBooking, updatePayment, deletePayment, toggleOffer, deleteOffer, updateUser, deleteUser, getRecords, addRecord, updateRecord, deleteRecord, records, alerts, alertCount, dismissAlert, resolveAlert]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
