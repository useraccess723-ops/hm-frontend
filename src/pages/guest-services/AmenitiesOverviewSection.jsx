import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useRbac } from '../../context/RbacContext';

const AMENITY_CARDS = [
  {
    key: 'wifi',
    path: '/guest-services/wifi',
    name: 'Wi-Fi Networks',
    subtitle: 'High-speed guest & public connectivity',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12.55a11 11 0 0 1 14.08 0"></path>
        <path d="M1.42 9a16 16 0 0 1 21.16 0"></path>
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
        <line x1="12" y1="20" x2="12.01" y2="20"></line>
      </svg>
    ),
    badgeColor: 'var(--teal)',
    defaultSummary: 'Fiber 300 Mbps Dedicated'
  },
  {
    key: 'ac',
    path: '/guest-services/ac',
    name: 'Air Conditioning (AC)',
    subtitle: 'Climate control & HVAC maintenance',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20"></path>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
      </svg>
    ),
    badgeColor: 'var(--blue)',
    defaultSummary: 'In-Room Split & Central VRF'
  },
  {
    key: 'tv',
    path: '/guest-services/tv',
    name: 'Television (TV)',
    subtitle: 'Smart screens & entertainment streaming',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect>
        <polyline points="17 2 12 7 7 2"></polyline>
      </svg>
    ),
    badgeColor: 'var(--brass)',
    defaultSummary: '4K Smart TVs with OTT'
  },
  {
    key: 'swimming-pool',
    path: '/guest-services/swimming-pool',
    name: 'Swimming Pool',
    subtitle: 'Aquatics, lifeguards & water quality',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12c1.66 0 3-1.34 3-3s1.34-3 3-3 3 1.34 3 3 1.34 3 3 3 3-1.34 3-3 1.34-3 3-3 3 1.34 3 3"></path>
        <path d="M2 18c1.66 0 3-1.34 3-3s1.34-3 3-3 3 1.34 3 3 1.34 3 3 3 3-1.34 3-3 1.34-3 3-3 3 1.34 3 3"></path>
      </svg>
    ),
    badgeColor: 'var(--teal)',
    defaultSummary: 'Heated Rooftop & Lap Pools'
  },
  {
    key: 'gym',
    path: '/guest-services/gym',
    name: 'Gym & Fitness',
    subtitle: 'Cardio equipment & strength facilities',
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
    badgeColor: 'var(--green)',
    defaultSummary: '24/7 Wellness Center'
  },
  {
    key: 'parking',
    path: '/guest-services/parking',
    name: 'Parking & Valet',
    subtitle: 'Valet bays & EV charging stations',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2"></rect>
        <path d="M9 17V7h4a3 3 0 0 1 0 6H9"></path>
      </svg>
    ),
    badgeColor: 'var(--brass)',
    defaultSummary: 'Covered Bays with 24/7 Valet'
  },
  {
    key: 'spa',
    path: '/guest-services/spa',
    name: 'Spa & Wellness',
    subtitle: 'Ayurvedic & therapeutic therapies',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
      </svg>
    ),
    badgeColor: 'var(--blue)',
    defaultSummary: 'Signature Ayurvedic Massages'
  }
];

export default function AmenitiesOverviewSection() {
  const navigate = useNavigate();
  const { canView } = useRbac();
  const [summaryData, setSummaryData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api('/api/amenities/summary')
      .then((res) => {
        if (active && res && typeof res === 'object') {
          setSummaryData(res);
        }
      })
      .catch((err) => {
        console.error('Error fetching amenities summary:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  return (
    <section className="amenities-overview-section" style={{ marginBottom: 28 }}>
      <style>{`
        .amenities-overview-section {
          animation: fadeIn 0.25s ease-out;
        }
        .amenities-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .amenities-section-title-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .amenities-section-title-wrap h2 {
          font-family: var(--head);
          font-size: 19px;
          color: var(--ink);
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .amenities-section-title-wrap p {
          margin: 2px 0 0;
          font-size: 13px;
          color: var(--muted);
        }
        .amenity-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 16px;
        }
        .amenity-overview-card {
          background: var(--panel);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .amenity-overview-card:hover {
          transform: translateY(-2px);
          border-color: var(--brass);
          box-shadow: 0 6px 18px rgba(0,0,0,0.06);
        }
        .amenity-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .amenity-card-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: rgba(180, 133, 47, 0.12);
          color: var(--brass);
          display: grid;
          place-items: center;
        }
        .amenity-card-pill {
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 99px;
          background: var(--green-soft);
          color: var(--green);
        }
        .amenity-card-body h3 {
          font-family: var(--head);
          font-size: 16px;
          color: var(--ink);
          margin: 0 0 4px;
        }
        .amenity-card-body p {
          font-size: 12px;
          color: var(--muted);
          margin: 0 0 12px;
          line-height: 1.4;
        }
        .amenity-counts-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding-top: 10px;
          border-top: 1px solid var(--line);
          margin-bottom: 12px;
          font-size: 12px;
        }
        .amenity-counts-row b {
          font-size: 15px;
          color: var(--ink);
        }
        .amenity-counts-row span {
          color: var(--muted);
        }
        .amenity-card-actions {
          display: flex;
          gap: 8px;
        }
        .amenity-card-actions .btn {
          flex: 1;
          justify-content: center;
        }
      `}</style>

      {/* Section Header */}
      <div className="amenities-section-head">
        <div className="amenities-section-title-wrap">
          <div>
            <h2>
              <span style={{ color: 'var(--brass)' }}>✨</span>
              Amenities Management
            </h2>
            <p>
              Direct configuration, live operational readiness, and dedicated submenus for all 7 hotel amenities
            </p>
          </div>
        </div>
      </div>

      {/* 7 Amenities Cards Grid */}
      <div className="amenity-cards-grid">
        {AMENITY_CARDS.map((card) => {
          if (!canView(card.path)) return null;

          // Map summary stats
          const keyInSummary = card.key === 'swimming-pool' ? 'swimming_pool' : card.key;
          const stat = summaryData[keyInSummary] || { total: 0, available: 0, maintenance: 0 };
          const isOperational = stat.total > 0 ? (stat.available > 0) : true;

          return (
            <div key={card.key} className="amenity-overview-card">
              <div>
                <div className="amenity-card-header">
                  <div className="amenity-card-icon-wrap">
                    {card.icon}
                  </div>
                  <span
                    className="amenity-card-pill"
                    style={!isOperational ? { background: 'var(--red-soft)', color: 'var(--red)' } : {}}
                  >
                    {loading ? 'Checking...' : isOperational ? 'Operational' : 'Attention'}
                  </span>
                </div>

                <div className="amenity-card-body">
                  <h3>{card.name}</h3>
                  <p>{card.subtitle}</p>
                </div>
              </div>

              <div>
                <div className="amenity-counts-row">
                  <div>
                    <b>{loading ? '—' : stat.total}</b>
                    <span> Units</span>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                      ✓ {loading ? '—' : stat.available} Active
                    </span>
                    {stat.maintenance > 0 && (
                      <span style={{ color: 'var(--brass)', fontWeight: 600 }}>
                        • {stat.maintenance} Maint
                      </span>
                    )}
                  </div>
                </div>

                <div className="amenity-card-actions">
                  <button
                    className="btn primary sm"
                    style={{ background: 'var(--brass)', borderColor: 'var(--brass)', color: '#13243A', fontWeight: 600 }}
                    onClick={() => navigate(card.path)}
                  >
                    Manage {card.name.split(' ')[0]} →
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
