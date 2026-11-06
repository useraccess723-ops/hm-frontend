import { useState, useMemo, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { STATUS_NAME } from '../data/mock';
import { inr } from '../utils/format';
import PageHead from '../components/PageHead';
import DataTable from '../components/DataTable';
import { StatusBadge } from '../components/Badge';
import '../styles/Dashboard.css';

const SOURCE_COLORS = {
  'MakeMyTrip': 'var(--teal)',
  Agoda: '#7B4FB0',
  'Booking.com': 'var(--blue)',
  Direct: 'var(--brass)',






  
  Expedia: 'var(--red)',
};

function RevenueChart({ bookings }) {
  const labels = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return d;
  });

  const vals = labels.map((d) =>
    bookings
      .filter((b) => {
        const raw = b.created_at || '';
        return raw.slice(0, 10) === d.toISOString().slice(0, 10);
      })
      .reduce((sum, b) => sum + Number(b.amt || 0), 0)
  );

  const max = Math.max(...vals, 1);
  const W = 520;
  const H = 200;
  const bw = 36;
  const gap = (W - bw * 7) / 8;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Booking value created over the last seven days">
      <defs>
        <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--teal)" />
          <stop offset="100%" stopColor="rgba(14, 124, 123, 0.7)" />
        </linearGradient>
        <linearGradient id="barGradientNormal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--teal-soft)" />
          <stop offset="100%" stopColor="rgba(215, 238, 237, 0.4)" />
        </linearGradient>
      </defs>

      {/* Subtle guide line */}
      <line x1="10" y1={H - 24} x2={W - 10} y2={H - 24} stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />

      {vals.map((v, i) => {
        const h = Math.max(4, (v / max) * (H - 52));
        const x = gap + i * (bw + gap);
        const isToday = i === 6;

        return (
          <g key={labels[i].toISOString()} className="db-chart-bar-group">
            <rect
              x={x}
              y={H - 24 - h}
              width={bw}
              height={h}
              rx="6"
              fill={isToday ? 'url(#barGradientActive)' : 'url(#barGradientNormal)'}
              stroke={isToday ? 'var(--teal)' : 'transparent'}
              strokeWidth={isToday ? 1 : 0}
            />
            <text
              x={x + bw / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize="11.5"
              fontWeight={isToday ? '700' : '500'}
              fill={isToday ? 'var(--teal)' : 'var(--muted)'}
            >
              {labels[i].toLocaleDateString('en', { weekday: 'short' })}
            </text>
            <text
              x={x + bw / 2}
              y={Math.max(14, H - 28 - h)}
              textAnchor="middle"
              fontSize="10.5"
              fontWeight="600"
              fill={isToday ? 'var(--teal)' : 'var(--ink)'}
            >
              {v ? `${Math.round(v / 1000)}k` : '—'}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function Dashboard() {
  const { rooms, bookings, openBookingModal, dashboard, user, activeTenant, tenant } = useStore();
  const [selected, setSelected] = useState(null);
  const [roomStatusFilter, setRoomStatusFilter] = useState('all');

  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || 'Grand Meridian Chennai';
  const userRole = (user?.role || '').toUpperCase();
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';
  const roleDisplay = isAdmin ? 'Administrator'
    : userRole === 'GENERAL_MANAGER' ? 'General Manager'
    : userRole === 'REVENUE_MANAGER' ? 'Revenue Manager'
    : userRole === 'FRONT_DESK' ? 'Front Desk Staff'
    : userRole === 'HOUSEKEEPING' ? 'Housekeeping Staff'
    : userRole === 'FINANCE' ? 'Finance Staff'
    : user?.role || 'Administrator';

  useEffect(() => {
    document.title = `${hotelName} – ${isAdmin ? 'Hotel Admin Dashboard' : `${roleDisplay} Dashboard`} | StayFlow`;
  }, [hotelName, isAdmin, roleDisplay]);

  // Greeting helper
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const total = rooms.length;
  const occupied = rooms.filter((r) => r.s === 'occ').length;
  const vacant = rooms.filter((r) => r.s === 'vac').length;
  const reserved = rooms.filter((r) => r.s === 'res').length;
  const dirty = rooms.filter((r) => r.s === 'dirty').length;
  const ooo = rooms.filter((r) => r.s === 'ooo').length;

  const occupancyPercent = Number(
    dashboard?.occupancy_percent ?? (total ? (occupied * 100) / total : 0)
  ).toFixed(0);

  // 7-day revenue total for chart callout
  const sevenDayTotal = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    return bookings
      .filter((b) => new Date(b.created_at || Date.now()) >= cutoff)
      .reduce((sum, b) => sum + Number(b.amt || 0), 0);
  }, [bookings]);

  // Channel Breakdown
  const sourceCounts = bookings.reduce((acc, b) => {
    const name = b.src || 'Direct';
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});
  const sourceEntries = Object.entries(sourceCounts);
  let sourceCursor = 0;
  const sourceGradient = sourceEntries.length
    ? `conic-gradient(${sourceEntries
        .map(([name, count]) => {
          const start = sourceCursor;
          sourceCursor += bookings.length ? (count * 100) / bookings.length : 0;
          return `${SOURCE_COLORS[name] || 'var(--muted)'} ${start}% ${sourceCursor}%`;
        })
        .join(',')})`
    : 'conic-gradient(var(--line) 0 100%)';

  return (
    <div className="db-container">
      {/* 1. EXECUTIVE WELCOME & QUICK ACTIONS HEADER */}
      <div className="db-welcome-banner">
        <div className="db-welcome-left">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
            <div className="db-welcome-badge">
              <span className="db-pulsing-dot" />
              Live Hotel Management
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(201, 158, 77, 0.12)',
              border: '1px solid var(--brass, #c99e4d)',
              padding: '3px 10px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--brass, #c99e4d)',
              letterSpacing: '0.02em'
            }}>
              🏨 {hotelName}
            </div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '3px 9px',
              borderRadius: 6,
              background: 'rgba(14, 124, 123, 0.15)',
              border: '1px solid var(--teal)',
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--teal)'
            }}>
              {isAdmin ? 'Admin Dashboard' : `${roleDisplay} Dashboard`}
            </div>
          </div>
          <h1 className="db-welcome-title">{greeting}, {user?.full_name ? `${user.full_name}` : (isAdmin ? 'Administrator' : roleDisplay)}</h1>
          <p className="db-welcome-subtitle">
            <strong style={{ color: 'var(--brass, #c99e4d)' }}>{hotelName}</strong> · {isAdmin ? 'Admin Dashboard' : `${roleDisplay} Dashboard`} · {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}{' '}
            · Real-time occupancy, floor matrix, and revenue metrics
          </p>
        </div>

        <div className="db-welcome-actions">
          <button type="button" className="db-btn-primary" onClick={() => openBookingModal()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Reservation
          </button>
        </div>
      </div>

      {/* 2. EXECUTIVE KPI CARDS */}
      <div className="db-kpi-grid">
        {/* KPI 1: Occupancy Rate */}
        <div className="db-kpi-card">
          <div>
            <div className="db-kpi-top">
              <span className="db-kpi-label">Occupancy Rate</span>
              <div className="db-kpi-icon-wrap">
                <svg viewBox="0 0 24 24"><path d="M2 19h20M4 19V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10M2 12h20M9 7v2m6-2v2" /></svg>
              </div>
            </div>
            <div className="db-kpi-value">{occupancyPercent}%</div>
            <div className="db-kpi-note">
              <b>{occupied}</b> of {total} rooms occupied
            </div>
          </div>
          <div className="db-kpi-progress">
            <div className="db-kpi-progress-bar" style={{ width: `${Math.min(100, Math.max(0, occupancyPercent))}%` }} />
          </div>
        </div>

        {/* KPI 2: Paid Revenue */}
        <div className="db-kpi-card">
          <div>
            <div className="db-kpi-top">
              <span className="db-kpi-label">Total Revenue</span>
              <div className="db-kpi-icon-wrap brass">
                <svg viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
              </div>
            </div>
            <div className="db-kpi-value">{inr(dashboard?.revenue || 0)}</div>
            <div className="db-kpi-note" style={{ color: 'var(--green)' }}>
              ✓ Recorded successful payments
            </div>
          </div>
          <div className="db-kpi-progress">
            <div className="db-kpi-progress-bar" style={{ width: '85%', background: 'var(--brass)' }} />
          </div>
        </div>

        {/* KPI 3: Check-ins & Check-outs */}
        <div className="db-kpi-card">
          <div>
            <div className="db-kpi-top">
              <span className="db-kpi-label">Today's Activity</span>
              <div className="db-kpi-icon-wrap blue">
                <svg viewBox="0 0 24 24"><path d="M16 17l5-5-5-5M21 12H9M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" /></svg>
              </div>
            </div>
            <div className="db-kpi-value">
              {dashboard?.today_check_ins || 0}{' '}
              <span style={{ fontSize: '18px', fontWeight: '400', color: 'var(--muted)' }}>in</span> /{' '}
              {dashboard?.today_check_outs || 0}{' '}
              <span style={{ fontSize: '18px', fontWeight: '400', color: 'var(--muted)' }}>out</span>
            </div>
            <div className="db-kpi-note">Scheduled for today</div>
          </div>
          <div className="db-kpi-progress">
            <div className="db-kpi-progress-bar" style={{ width: '65%', background: 'var(--blue)' }} />
          </div>
        </div>

        {/* KPI 4: Total Bookings */}
        <div className="db-kpi-card">
          <div>
            <div className="db-kpi-top">
              <span className="db-kpi-label">Total Bookings</span>
              <div className="db-kpi-icon-wrap green">
                <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
              </div>
            </div>
            <div className="db-kpi-value">{dashboard?.total_bookings || bookings.length}</div>
            <div className="db-kpi-note">All registered stays</div>
          </div>
          <div className="db-kpi-progress">
            <div className="db-kpi-progress-bar" style={{ width: '100%', background: 'var(--green)' }} />
          </div>
        </div>
      </div>

      {/* 3. SIGNATURE ROOM BOARD (FLOOR MATRIX & FILTER TABS) */}
      <div className="db-room-panel">
        <div className="db-room-panel-header">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Floor & Room Matrix</h2>
            <div style={{ color: 'var(--muted)', fontSize: '13px', marginTop: '2px' }}>
              Real-time room occupancy status across {total} rooms on 4 floors. Select a room tile to inspect details.
            </div>
          </div>

          {/* Legend Badges */}
          <div className="legend">
            <span><i className="lg-occ" />Occupied ({occupied})</span>
            <span><i className="lg-vac" />Vacant & clean ({vacant})</span>
            <span><i className="lg-res" />Reserved ({reserved})</span>
            <span><i className="lg-dirty" />Needs cleaning ({dirty})</span>
            <span><i className="lg-ooo" />Out of order ({ooo})</span>
          </div>
        </div>

        {/* Interactive Quick Filter Tabs */}
        <div className="db-room-filter-row">
          <button
            type="button"
            className={`db-filter-tab ${roomStatusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setRoomStatusFilter('all')}
          >
            All Rooms ({total})
          </button>
          <button
            type="button"
            className={`db-filter-tab ${roomStatusFilter === 'occ' ? 'active' : ''}`}
            onClick={() => setRoomStatusFilter('occ')}
          >
            Occupied ({occupied})
          </button>
          <button
            type="button"
            className={`db-filter-tab ${roomStatusFilter === 'vac' ? 'active' : ''}`}
            onClick={() => setRoomStatusFilter('vac')}
          >
            Vacant ({vacant})
          </button>
          <button
            type="button"
            className={`db-filter-tab ${roomStatusFilter === 'res' ? 'active' : ''}`}
            onClick={() => setRoomStatusFilter('res')}
          >
            Reserved ({reserved})
          </button>
          <button
            type="button"
            className={`db-filter-tab ${roomStatusFilter === 'dirty' ? 'active' : ''}`}
            onClick={() => setRoomStatusFilter('dirty')}
          >
            Needs Cleaning ({dirty})
          </button>
        </div>

        {total === 0 ? (
          <div className="empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>No rooms added yet</h3>
            <p className="muted" style={{ marginBottom: 14 }}>
              Add room categories and rooms to display the real-time floor plan and room board.
            </p>
          </div>
        ) : (
          <>
            {[4, 3, 2, 1].map((f) => (
              <div className="db-floor-row" key={f}>
                <span className="db-floor-label">
                  Floor {f}
                </span>
                <div className="db-floor-rooms">
                  {rooms
                    .filter((r) => r.f === f)
                    .map((r) => {
                      const isDimmed = roomStatusFilter !== 'all' && r.s !== roomStatusFilter;
                      const isSelected = selected && selected.n === r.n;

                      return (
                        <button
                          key={r.n}
                          type="button"
                          className={`db-room-tile s-${r.s} ${isDimmed ? 'dimmed' : ''} ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelected(isSelected ? null : r)}
                          aria-label={`Room ${r.n}, ${STATUS_NAME[r.s]}`}
                        >
                          <span>{r.n}</span>
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}

            {/* Room Inspector Banner */}
            <div className="db-room-inspector">
              <div className="db-room-inspector-info">
                {selected ? (
                  <>
                    <span className="db-room-inspector-badge">ROOM {selected.n}</span>
                    <span><b>{selected.type}</b></span>
                    <span>·</span>
                    <span>{inr(selected.price)} / night</span>
                    <span>·</span>
                    <span style={{ fontWeight: '600', color: selected.s === 'occ' ? 'var(--teal)' : 'inherit' }}>
                      Status: {STATUS_NAME[rooms.find((r) => r.n === selected.n)?.s || 'vac']}
                    </span>
                  </>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>
                    💡 Tip: Click any room tile above to inspect guest details, rates, and current housekeeping status.
                  </span>
                )}
              </div>

              {selected && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => openBookingModal()}
                  >
                    Reserve Room {selected.n}
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => setSelected(null)}
                  >
                    Clear Selection
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 4. REVENUE & CHANNELS CHARTS */}
      <div className="row r-21">
        {/* Revenue 7-Day Chart */}
        <div className="panel">
          <div className="db-chart-header">
            <div>
              <h2>Revenue Trajectory</h2>
              <div className="sub">Booking value created over the last seven days</div>
            </div>
            {sevenDayTotal > 0 && (
              <span className="db-revenue-total-pill">
                7-Day Total: {inr(sevenDayTotal)}
              </span>
            )}
          </div>
          <RevenueChart bookings={bookings} />
        </div>

        {/* Booking Sources Donut */}
        <div className="panel">
          <h2>Booking Distribution</h2>
          <div className="sub">Channel share this month</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginTop: '12px' }}>
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: sourceGradient,
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: 82,
                  height: 82,
                  borderRadius: '50%',
                  background: 'var(--panel)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <b style={{ fontSize: '18px', lineHeight: 1 }}>{bookings.length}</b>
                <span style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase' }}>Bookings</span>
              </div>
            </div>

            <ul className="db-channel-list">
              {sourceEntries.map(([name, count]) => {
                const pct = bookings.length ? Math.round((count * 100) / bookings.length) : 0;
                return (
                  <li key={name} className="db-channel-row">
                    <div className="db-channel-top">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}>
                        <span className="dot" style={{ background: SOURCE_COLORS[name] || 'var(--muted)', marginTop: 0 }} />
                        {name}
                      </span>
                      <b>{pct}% ({count})</b>
                    </div>
                    <div className="db-channel-progress">
                      <div
                        className="db-channel-progress-bar"
                        style={{
                          width: `${pct}%`,
                          background: SOURCE_COLORS[name] || 'var(--muted)',
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* 5. RECENT BOOKINGS & OPERATIONAL SUMMARY */}
      <div className="row r-21">
        <div className="panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
            <h2>Recent Reservations</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Latest {Math.min(5, bookings.length)} stays</span>
          </div>
          <div className="sub">Latest reservations across all online and front desk channels</div>
          <DataTable
            columns={['Booking ID', 'Guest Name', 'Room', 'Channel', 'Amount', 'Status']}
            rows={bookings.slice(0, 5).map((b) => [
              <span className="tag" style={{ fontWeight: '700' }}>{b.id}</span>,
              <span style={{ fontWeight: '600' }}>{b.guest}</span>,
              <span style={{ fontWeight: '600', color: 'var(--teal)' }}>Room {b.room}</span>,
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot" style={{ background: SOURCE_COLORS[b.src] || 'var(--muted)', marginTop: 0 }} />
                {b.src || 'Direct'}
              </span>,
              <b>{inr(b.amt)}</b>,
              <StatusBadge status={b.st} />,
            ])}
          />
        </div>

        <div className="panel">
          <h2>Operational Pulse</h2>
          <div className="sub">Live database status & alerts</div>
          <ul className="feed" style={{ marginTop: '10px' }}>
            <li>
              <span className="dot" style={{ background: 'var(--green)' }} />
              <div>
                <b>{dashboard?.available_rooms || vacant} rooms ready</b>
                <br />
                <span className="muted">Vacant, cleaned, and inspect-ready</span>
              </div>
            </li>
            <li>
              <span className="dot" style={{ background: 'var(--brass)' }} />
              <div>
                <b>{bookings.filter((b) => b.st === 'Pending').length} pending confirmations</b>
                <br />
                <span className="muted">Awaiting deposit or payment verification</span>
              </div>
            </li>
            <li>
              <span className="dot" style={{ background: 'var(--blue)' }} />
              <div>
                <b>{bookings.filter((b) => b.st === 'Checked-in').length} in-house guests</b>
                <br />
                <span className="muted">Active hotel room occupancy</span>
              </div>
            </li>
            {dirty > 0 && (
              <li>
                <span className="dot" style={{ background: 'var(--red)' }} />
                <div>
                  <b style={{ color: 'var(--red)' }}>{dirty} rooms need cleaning</b>
                  <br />
                  <span className="muted">Assigned to housekeeping dispatch</span>
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
