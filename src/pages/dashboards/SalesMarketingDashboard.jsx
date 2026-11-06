import React from 'react';
import { useStore } from '../../context/StoreContext';
import { inr } from '../../utils/format';
import PageHead from '../../components/PageHead';
import { useNavigate } from 'react-router-dom';

export default function SalesMarketingDashboard() {
  const { offers, records, notify, activeTenant, tenant, user, settings } = useStore();
  const navigate = useNavigate();
  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || settings?.hotel_name || 'Grand Meridian Hotel';

  // Real corporate records
  const corporateRecords = records.filter((r) => {
    const cat = (r.category || '').toLowerCase();
    return cat.includes('corporate') || cat.includes('sales_marketing') || cat.includes('partner');
  });

  const activeOffers = offers.filter((o) => o.active);

  return (
    <div className="sm-dashboard">
      <PageHead
        title={`${hotelName} – Sales & Marketing Performance`}
        subtitle={`${hotelName} corporate partnerships, MICE event pipelines, promotional campaigns, and agent commissions`}
      >
        <button className="btn ghost" onClick={() => navigate('/offers/create')}>
          + New Campaign Offer
        </button>
        <button className="btn" onClick={() => navigate('/sales-marketing/corporate-accounts')}>
          Corporate Accounts
        </button>
      </PageHead>

      {/* Sales KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Corporate Contracting Accounts</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{corporateRecords.length} Accounts</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Active contracted partners</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Promo Campaigns</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{activeOffers.length} Active</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Live promotional discount codes</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total Offers Configured</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{offers.length} Offers</div>
          <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 4 }}>All seasonal & member rates</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Marketplace Records</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{corporateRecords.length} Logged</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>B2B accounts & agreements</div>
        </div>
      </div>

      {/* Corporate Deals & Active Campaigns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16 }}>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Corporate Allotments & Production</h2>
            <button className="btn sm ghost" onClick={() => navigate('/sales-marketing/corporate-accounts')}>Manage Accounts</button>
          </div>
          {corporateRecords.length === 0 ? (
            <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
              No corporate accounts recorded in database.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {corporateRecords.map((corp) => (
                <div key={corp.id} style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600 }}>{corp.title || corp.data?.['Company Name'] || 'Corporate Client'}</span>
                    <span className="badge b-brass">{corp.status || corp.data?.['Status'] || 'Active'}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                    Contract: {corp.data?.['Contract'] || corp.data?.['Rate'] || 'Special Corporate Rate'}
                  </div>
                  {corp.data?.['Contact'] && (
                    <div style={{ fontSize: 12, color: 'var(--sub)', marginTop: 2 }}>
                      POC: {corp.data['Contact']}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Active Promotional Campaigns</h2>
            <button className="btn sm ghost" onClick={() => navigate('/offers')}>All Offers</button>
          </div>
          {offers.length === 0 ? (
            <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
              No promotional campaigns configured.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {offers.map((p) => (
                <div key={p.id} style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tag">{p.code}</span>
                    <span style={{ fontWeight: 700, color: 'var(--brass)' }}>
                      {p.discount_type === 'percent' ? `${p.discount_value}% OFF` : inr(p.discount_value)}
                    </span>
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13.5, margin: '6px 0 2px' }}>{p.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    Valid until: <b>{p.ends_on || 'Ongoing'}</b> • Status: <span style={{ color: p.active ? 'var(--green)' : 'var(--muted)' }}>{p.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
