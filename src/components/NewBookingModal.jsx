import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { todayISO, addDaysISO } from '../utils/format';

export default function NewBookingModal() {
  const { bookingModalOpen, bookingInitialDate, closeBookingModal, addBooking, notify, rooms, roomTypes, guests } = useStore();
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);

  const activeRoomTypes = useMemo(() => {
    let list = [];
    if (roomTypes && roomTypes.length) {
      list = roomTypes.filter((rt) => (rt.status || 'Active').toLowerCase() === 'active');
    }
    if (!list.length && rooms && rooms.length) {
      const map = new Map();
      for (const r of rooms) {
        if (r.room_type_id && !map.has(r.room_type_id)) {
          map.set(r.room_type_id, { id: r.room_type_id, name: r.type });
        }
      }
      list = Array.from(map.values());
    }
    return list;
  }, [roomTypes, rooms]);

  const [form, setForm] = useState({
    guest_id: null,
    name: '',
    phone: '',
    room_type_id: activeRoomTypes[0]?.id || '',
    src: 'Direct',
    status: 'Confirmed',
    in: today,
    out: tomorrow,
    num_guests: 1,
    group_name: ''
  });
  const nameRef = useRef(null);

  useEffect(() => {
    if (activeRoomTypes.length && !activeRoomTypes.some((rt) => String(rt.id) === String(form.room_type_id))) {
      setForm((f) => ({ ...f, room_type_id: activeRoomTypes[0].id }));
    }
  }, [activeRoomTypes]);

  useEffect(() => {
    if (!bookingModalOpen) return;
    // Re-base the dates every time the dialog opens so a page left open overnight never offers a past date.
    const currentToday = todayISO();
    setForm((f) => {
      const isDateStr = (val) => typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val);
      const preferredIn = (isDateStr(bookingInitialDate) && bookingInitialDate >= currentToday) ? bookingInitialDate : f.in;
      const validIn = isDateStr(preferredIn) ? preferredIn : currentToday;
      const nextIn = (!validIn || validIn < currentToday) ? currentToday : validIn;
      const validOut = isDateStr(f.out) ? f.out : addDaysISO(nextIn, 1);
      const nextOut = (!validOut || validOut <= nextIn) ? addDaysISO(nextIn, 1) : validOut;
      return { ...f, in: nextIn, out: nextOut };
    });
    nameRef.current?.focus();
  }, [bookingModalOpen, bookingInitialDate]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeBookingModal();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [closeBookingModal]);

  if (!bookingModalOpen) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleGuestNameChange = (e) => {
    const value = e.target.value;
    const matched = (guests || []).find((g) =>
      g.full_name && g.full_name.trim().toLowerCase() === value.trim().toLowerCase()
    );
    setForm((f) => ({
      ...f,
      name: value,
      guest_id: matched ? matched.id : null,
      phone: matched && matched.phone ? matched.phone : f.phone
    }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const matched = (guests || []).find((g) =>
      g.phone && g.phone.trim() === value.trim()
    );
    setForm((f) => ({
      ...f,
      phone: value,
      guest_id: matched ? matched.id : f.guest_id,
      name: matched && !f.name ? matched.full_name : f.name
    }));
  };

  const setCheckIn = (e) => {
    const value = e.target.value;
    setForm((f) => ({ ...f, in: value, out: value && f.out <= value ? addDaysISO(value, 1) : f.out }));
  };

  const save = async () => {
    const name = form.name.trim();
    if (!name) { notify('Enter the guest name'); nameRef.current?.focus(); return; }
    if (!form.in || !form.out) { notify('Select check-in and check-out dates'); return; }
    const currentToday = todayISO();
    if (form.in < currentToday) { notify('Check-in date cannot be in the past. Choose today or a future date.'); return; }
    if (form.out < currentToday) { notify('Check-out date cannot be in the past. Choose a future date.'); return; }
    const nights = Math.round((new Date(`${form.out}T00:00:00`) - new Date(`${form.in}T00:00:00`)) / 864e5);
    if (!(nights > 0)) { notify('Check-out must be after check-in'); return; }

    let matchedGuestId = form.guest_id;
    if (!matchedGuestId && guests && guests.length) {
      const matched = guests.find((g) =>
        (g.full_name && g.full_name.trim().toLowerCase() === name.toLowerCase()) ||
        (g.phone && form.phone && g.phone.trim() === form.phone.trim())
      );
      if (matched) matchedGuestId = matched.id;
    }

    const selectedRt = activeRoomTypes.find((t) => String(t.id) === String(form.room_type_id)) || activeRoomTypes[0];
    if (!selectedRt?.id) {
      notify('No active room types found for this hotel');
      return;
    }

    const saved = await addBooking({
      guest_id: matchedGuestId || undefined,
      guest: name,
      phone: form.phone.trim(),
      room_type_id: Number(selectedRt?.id),
      room: selectedRt?.name,
      src: form.src,
      status: form.status || 'Confirmed',
      in: form.in,
      out: form.out,
      nights,
      num_guests: parseInt(form.num_guests, 10) || 1,
      group_name: form.src === 'Group' ? form.group_name.trim() : null
    });
    if (!saved) return;
    setForm((f) => ({
      ...f,
      guest_id: null,
      name: '',
      phone: '',
      status: 'Confirmed',
      in: todayISO(),
      out: addDaysISO(todayISO(), 1),
      num_guests: 1,
      group_name: ''
    }));
    closeBookingModal();
  };

  return (
    <div className="scrim open" onClick={(e) => e.target === e.currentTarget && closeBookingModal()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="nb-title">
        <div className="modal-header">
          <h2 id="nb-title">New booking</h2>
          <button
            type="button"
            className="modal-close-btn"
            onClick={closeBookingModal}
            aria-label="Close booking modal"
          >
            ✕
          </button>
        </div>
        <div className="field">
          <label htmlFor="f-name">Guest name *</label>
          <input
            id="f-name"
            ref={nameRef}
            list="guest-options-datalist"
            value={form.name}
            onChange={handleGuestNameChange}
            placeholder="e.g. Arun Prakash"
            required
            autoComplete="off"
          />
          <datalist id="guest-options-datalist">
            {(guests || []).map((g) => (
              <option key={g.id} value={g.full_name}>
                {g.phone ? `${g.full_name} (${g.phone})` : g.full_name}
              </option>
            ))}
          </datalist>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="f-phone">Phone number</label>
            <input
              id="f-phone"
              type="tel"
              value={form.phone}
              onChange={handlePhoneChange}
              placeholder="e.g. +91 98401 23456"
            />
          </div>
          <div className="field">
            <label htmlFor="f-guests">Guests count</label>
            <input id="f-guests" type="number" min="1" max="10" value={form.num_guests || 1} onChange={set('num_guests')} />
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="f-type">Room type</label>
            <select id="f-type" value={form.room_type_id} onChange={set('room_type_id')}>
              {activeRoomTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-src">Source / Channel</label>
            <select id="f-src" value={form.src} onChange={set('src')}>
              {['Direct', 'Walk-in', 'Group', 'MakeMyTrip', 'Agoda', 'Booking.com'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        {form.src === 'Group' && (
          <div className="field">
            <label htmlFor="f-group">Group Name</label>
            <input id="f-group" value={form.group_name} onChange={set('group_name')} placeholder="e.g. TechCorp Annual Offsite" />
          </div>
        )}
        <div className="field">
          <label htmlFor="f-status">Status</label>
          <select id="f-status" value={form.status || 'Confirmed'} onChange={set('status')}>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
          </select>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="f-in">Check-in</label>
            <input id="f-in" type="date" min={today} value={typeof form.in === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(form.in) ? form.in : today} onChange={setCheckIn} />
          </div>
          <div className="field">
            <label htmlFor="f-out">Check-out</label>
            <input id="f-out" type="date" value={typeof form.out === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(form.out) ? form.out : addDaysISO(today, 1)} min={addDaysISO(form.in || today, 1)} onChange={set('out')} />
          </div>
        </div>
        <div className="actions">
          <button type="button" className="btn ghost" onClick={closeBookingModal}>Cancel</button>
          <button type="button" className="btn" onClick={save}>Save booking</button>
        </div>
      </div>
    </div>
  );
}

