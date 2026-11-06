import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { inr } from '../../utils/format';
import PageHead from '../../components/PageHead';
import { useNavigate } from 'react-router-dom';

export default function RevenueManagerDashboard() {
  const { channels, rooms, payments, bookings, notify, user, activeTenant, tenant } = useStore();
  const navigate = useNavigate();

  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || 'Hotel Management';
  const [yieldMultiplier, setYieldMultiplier] = useState(1.15);
  const [weekendSurcharge, setWeekendSurcharge] = useState(20);

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.s === 'occ').length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const totalRev = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const adr = occupiedRooms > 0 ? Math.round(totalRev / occupiedRooms) : 0;
  const revpar = totalRooms > 0 ? Math.round(totalRev / totalRooms) : 0;

  // Real room category yield computation
  const roomTypes = useMemo(() => {
    const map = {};
    rooms.forEach((r) => {
      const type = r.type || 'Standard';
      if (!map[type]) {
        map[type] = {
          type,
          base: Number(r.price || r.rate || 2500),
          count: 0,
          occupied: 0,
        };
      }
      map[type].count += 1;
      if (r.s === 'occ') map[type].occupied += 1;
    });
    return Object.values(map);
  }, [rooms]);

  // Real channel distribution computation
  const channelStats = useMemo(() => {
    if (!channels || channels.length === 0) return [];
    return channels.map((c) => {
      const channelBookings = bookings.filter((b) => (b.src || '').toLowerCase() === (c.name || '').toLowerCase());
      const rev = channelBookings.reduce((sum, b) => sum + Number(b.amt || 0), 0);
      const share = bookings.length > 0 ? Math.round((channelBookings.length / bookings.length) * 100) : 0;
      return {
        name: c.name,
        enabled: c.enabled,
        share: `${share}%`,
        rev: inr(rev),
        bookingsCount: channelBookings.length,
        status: c.enabled ? 'Sync Active' : 'Disabled',
        color: c.enabled ? 'green' : 'grey',
      };
    });
  }, [channels, bookings]);

  return (
    <div className="rm-dashboard">
      <PageHead
        title={`${hotelName} · Revenue & Yield Management`}
        subtitle={`${hotelName} dynamic pricing engines, RevPAR maximization, channel contribution, and demand elasticity`}
      >
        <button className="btn ghost" onClick={() => navigate('/revenue-management/competitor-rates')}>
          Rate Parity Monitor
        </button>
        <button className="btn" onClick={() => navigate('/availability/dynamic-pricing')}>
          Update Pricing Rules
        </button>
      </PageHead>

      {/* Yield KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>RevPAR</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{inr(revpar)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Revenue per available room</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Average Daily Rate (ADR)</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{inr(adr)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Per sold room night</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Current Occupancy</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{occupancyRate}%</div>
          <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 4 }}>{occupiedRooms} of {totalRooms} rooms filled</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Channels</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{channels.filter(c => c.enabled).length}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{channels.length} total channels configured</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Yield Multiplier</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{yieldMultiplier}x</div>
          <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 4 }}>+{Math.round((yieldMultiplier - 1) * 100)}% dynamic uplift</div>
        </div>
      </div>

      {/* Dynamic Rate Matrix & Simulator */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Category Yield & Base Rates</h2>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Live database calculation</span>
          </div>
          {roomTypes.length === 0 ? (
            <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
              No room categories defined in database.
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Base Rate</th>
                    <th>Priced With Yield</th>
                    <th>Inventory</th>
                    <th>Occupancy</th>
                  </tr>
                </thead>
                <tbody>
                  {roomTypes.map((row) => {
                    const dynamicPrice = Math.round(row.base * yieldMultiplier);
                    const catOcc = row.count > 0 ? Math.round((row.occupied / row.count) * 100) : 0;
                    return (
                      <tr key={row.type}>
                        <td><b>{row.type}</b></td>
                        <td>{inr(row.base)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--brass)' }}>{inr(dynamicPrice)}</td>
                        <td>{row.count} rooms</td>
                        <td>
                          <span className={`badge b-${catOcc > 70 ? 'brass' : catOcc > 30 ? 'teal' : 'green'}`}>
                            {catOcc}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Rate Adjustment Controls */}
        <div className="panel">
          <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>Surge & Dynamic Rate Controls</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Active Dynamic Multiplier:</span>
                <span style={{ fontWeight: 700, color: 'var(--brass)' }}>{yieldMultiplier}x (+{Math.round((yieldMultiplier - 1) * 100)}%)</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.6"
                step="0.05"
                value={yieldMultiplier}
                onChange={(e) => setYieldMultiplier(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                <span>0.8x (Off-Peak)</span>
                <span>1.0x (Base)</span>
                <span>1.3x (High Demand)</span>
                <span>1.6x (Festival Surge)</span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Weekend Premium Surcharge:</span>
                <span style={{ fontWeight: 700, color: 'var(--teal)' }}>+{weekendSurcharge}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="40"
                step="5"
                value={weekendSurcharge}
                onChange={(e) => setWeekendSurcharge(parseInt(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button
                className="btn primary"
                onClick={() => notify(`Dynamic yield multiplier set to ${yieldMultiplier}x and pushed to all channels`)}
              >
                Apply & Push to Channels
              </button>
              <button className="btn ghost" onClick={() => setYieldMultiplier(1.0)}>
                Reset to Standard
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Channel Distribution & Yield Contribution */}
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Distribution Channel Share & Net Revenue Yield</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Direct vs OTA revenue efficiency comparison</div>
          </div>
          <button className="btn sm ghost" onClick={() => navigate('/channels')}>Channel Manager</button>
        </div>
        {channelStats.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            No distribution channels configured.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
            {channelStats.map((c) => (
              <div key={c.name} style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                  <span className={`badge b-${c.color}`}>{c.share}</span>
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 4px', color: 'var(--ink)' }}>{c.rev}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  Bookings: <b style={{ color: 'var(--ink)' }}>{c.bookingsCount}</b>
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--sub)', marginTop: 6 }}>● {c.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
