import React from 'react';
import { useStore } from '../../context/StoreContext';
import { inr } from '../../utils/format';
import PageHead from '../../components/PageHead';
import { useNavigate } from 'react-router-dom';
import SubNav from '../../components/SubNav';
import { StatusBadge } from '../../components/Badge';

export default function FbDashboard() {
  const { notify, user, activeTenant, tenant, records, updateRecord, refresh } = useStore();
  const navigate = useNavigate();

  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || 'Hotel Management';
  const fbRecords = records.filter(r => r.category && (r.category.startsWith('food_beverage') || r.category.startsWith('food-beverage')));
  const kotOrders = records.filter(r => 
    r.category === 'food_beverage_restaurant_pos' || r.category === 'food-beverage_restaurant-pos' ||
    r.category === 'food_beverage_in_room_dining' || r.category === 'food-beverage_in-room-dining'
  );
  const activeKots = kotOrders.filter(r => !['Completed', 'Delivered', 'Cancelled'].includes(r.status));
  const tableReservations = records.filter(r => 
    r.category === 'food_beverage_table_reservations' || r.category === 'food-beverage_table-reservations'
  );

  const totalFbSales = fbRecords.reduce((sum, r) => {
    const amt = Number(r.data?.['Amount'] || r.data?.['Total'] || r.data?.['Bill'] || 0);
    return sum + (Number.isNaN(amt) ? 0 : amt);
  }, 0);

  return (
    <div className="fb-dashboard">
      <PageHead
        title={`${hotelName} · Food & Beverage Operations`}
        subtitle={`${hotelName} restaurant POS, live Kitchen Order Tickets (KOT), in-room dining, banquet banquets and bar cellars`}
      >
        <button className="btn ghost" onClick={() => navigate('/food-beverage/restaurant-pos')}>
          Open Restaurant POS
        </button>
        <button className="btn" onClick={() => navigate('/food-beverage/in-room-dining')}>
          + New In-Room Order
        </button>
      </PageHead>

      {/* Food & Beverage Submenus */}
      <SubNav parentPath="/food-beverage" />

      {/* Relevant Menus Quick Access */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, marginTop: -4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Relevant Menus:</span>
        <button className="btn sm ghost" onClick={() => navigate('/procurement')}>📦 Procurement & Supplies</button>
        <button className="btn sm ghost" onClick={() => navigate('/guest-services')}>🛎️ Guest Services</button>
      </div>

      {/* F&B KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Recorded F&B Sales</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{inr(totalFbSales)}</div>
          <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>Dining + Room Service orders</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Live KOT Orders</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)', marginTop: 4 }}>{activeKots.length} KOTs</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Active kitchen production queue</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Table Reservations</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{tableReservations.length} Tables</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Reserved table bookings</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Total F&B Records</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{fbRecords.length}</div>
          <div style={{ fontSize: 12, color: 'var(--teal)', marginTop: 4 }}>Orders, requisitions and logs</div>
        </div>
      </div>

      {/* Live Kitchen Order Tickets (KOT) */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Live Kitchen Order Tickets (KOT Display)</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Direct kitchen production queue</div>
          </div>
          <button className="btn sm ghost" onClick={() => navigate('/food-beverage/restaurant-pos')}>Full POS Screen</button>
        </div>
        {kotOrders.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            No active kitchen orders or KOT tickets in queue.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
            {kotOrders.slice(0, 6).map((k) => {
              const data = k.data || {};
              return (
                <div key={k.id} style={{ padding: '14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="tag">KOT-{k.id}</span>
                    <StatusBadge status={k.status || 'Active'} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 14, margin: '8px 0 4px' }}>
                    {data['Table'] || data['Room Number'] || data['Target'] || k.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--sub)', lineHeight: 1.5 }}>
                    {data['Items'] || data['Order Summary'] || data['Description'] || '—'}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Status: {k.status || 'Received'}</span>
                    {k.status !== 'Completed' && (
                      <button
                        className="btn sm"
                        onClick={async () => {
                          if (updateRecord) {
                            await updateRecord(k.id, { status: 'Completed' });
                            await refresh();
                            notify(`KOT-${k.id} marked READY & COMPLETED`);
                          }
                        }}
                      >
                        Mark Ready
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
