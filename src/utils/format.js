export const inr = (n) => '₹' + Number(n).toLocaleString('en-IN');

export const fmtDate = (iso) => {
  if (!iso) return '-';
  const str = typeof iso === 'string' ? iso : (iso instanceof Date ? iso.toISOString().slice(0, 10) : '');
  if (!str) return '-';
  try {
    return new Date(str.slice(0, 10) + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '-';
  }
};

/* ── Local-time date helpers ──────────────────────────────────────────────
   toISOString() converts to UTC, which gives yesterday's date for part of the
   day in time zones ahead of UTC (e.g. India, UTC+5:30). Bookings must be
   compared against the user's *local* calendar day instead. */
const pad = (n) => String(n).padStart(2, '0');

export const toISODate = (d) => {
  if (!(d instanceof Date) || isNaN(d.getTime())) return todayISO();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const addDaysISO = (iso, days) => {
  if (!iso || typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) {
    const base = new Date();
    base.setDate(base.getDate() + (Number(days) || 1));
    return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}`;
  }
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return todayISO();
  const dateObj = new Date(y, m - 1, d + (Number(days) || 0));
  if (isNaN(dateObj.getTime())) return todayISO();
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
};

export const isPastDate = (iso) => {
  if (!iso || typeof iso !== 'string') return false;
  return String(iso).slice(0, 10) < todayISO();
};

/**
 * Format a UTC or ISO timestamp to the hotel's configured timezone.
 * Returns formatted time as "hh:mm:ss AM/PM" (e.g. "08:00:03 AM", "11:54:05 AM").
 * Defaults to "Asia/Kolkata" for Indian properties.
 */
export const formatHotelTime = (iso, timeZone = 'Asia/Kolkata') => {
  if (!iso) return '-';
  try {
    let str = String(iso).trim();
    if (!str.endsWith('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) {
      str += 'Z';
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return '-';

    return new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);
  } catch {
    return '-';
  }
};

/**
 * Format a UTC or ISO timestamp to full hotel date-time in the configured timezone.
 * Returns formatted string as "YYYY-MM-DD hh:mm:ss AM/PM" (e.g. "2026-11-03 08:00:03 AM").
 */
export const formatHotelDateTime = (iso, timeZone = 'Asia/Kolkata') => {
  if (!iso) return '-';
  try {
    let str = String(iso).trim();
    if (!str.endsWith('Z') && !str.includes('+') && !/-\d{2}:\d{2}$/.test(str)) {
      str += 'Z';
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return '-';

    const tz = timeZone || 'Asia/Kolkata';
    const timePart = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(d);

    const datePart = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);

    return `${datePart} ${timePart}`;
  } catch {
    return '-';
  }
};

