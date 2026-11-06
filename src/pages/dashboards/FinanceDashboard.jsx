import React from 'react';
import { useStore } from '../../context/StoreContext';
import { inr } from '../../utils/format';
import PageHead from '../../components/PageHead';
import { StatusBadge } from '../../components/Badge';
import { useNavigate } from 'react-router-dom';
import SubNav from '../../components/SubNav';

export default function FinanceDashboard() {
  const { payments, bookings, notify, user, activeTenant, tenant } = useStore();
  const navigate = useNavigate();

  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || 'Hotel Management';
  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pendingPayments = bookings.filter((b) => b.pay !== 'Paid');
  const gstCollected = Math.round(totalCollected * 0.12);
  const totalOutstanding = pendingPayments.reduce((sum, b) => sum + Number(b.amt || 0), 0);
  const refundsTotal = bookings.filter((b) => b.st === 'Cancelled' || b.st === 'Refunded').reduce((sum, b) => sum + Number(b.amt || 0), 0);

  // Dynamic payment methods breakdown
  const methodMap = {};
  payments.forEach(p => {
    const m = p.method || 'Other';
    methodMap[m] = (methodMap[m] || 0) + Number(p.amount || 0);
  });
  const methodEntries = Object.entries(methodMap);

  return (
    <div className="finance-dashboard">
      <PageHead
        title={`${hotelName} · Finance & Accounts`}
        subtitle={`${hotelName} general ledger, payment reconciliations, GST compliance, refund management and invoice settlements`}
      >
        <button className="btn ghost" onClick={() => navigate('/finance/booking-payments')}>
          Booking Payments
        </button>
        <button className="btn" onClick={() => navigate('/finance/invoice-receipt')}>
          Invoice & Receipt
        </button>
      </PageHead>

      {/* Finance Submenus */}
      <SubNav parentPath="/finance" />

      {/* Relevant Menus Quick Access */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, marginTop: -4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Relevant Menus:</span>
        <button className="btn sm ghost" onClick={() => navigate('/procurement')}>📦 Procurement & Vendors</button>
        <button className="btn sm ghost" onClick={() => navigate('/reports')}>📊 Reports & Analytics</button>
        <button className="btn sm ghost" onClick={() => navigate('/bookings')}>📅 Reservations & Bookings</button>
      </div>

      {/* Finance KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Gross Revenue Settled</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{inr(totalCollected)}</div>
          <div style={{ fontSize: 12, color: 'var(--green)', marginTop: 4 }}>{payments.length} successful transactions</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Outstanding Balance Due</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--red)', marginTop: 4 }}>{inr(totalOutstanding)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{pendingPayments.length} pending settlements</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>GST (12% Est.)</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{inr(gstCollected)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Calculated tax reserve</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Refunds / Cancellations</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{inr(refundsTotal)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>From cancelled reservations</div>
        </div>
        <div className="panel">
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Completed Transactions</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{payments.length} Paid</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Processed payment records</div>
        </div>
      </div>

      {/* Payment Gateway & Method Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Method Breakdown */}
        <div className="panel">
          <h2 style={{ fontSize: 16, margin: '0 0 14px' }}>Settlement Mode Breakdown</h2>
          {methodEntries.length === 0 ? (
            <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
              No payment transactions recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {methodEntries.map(([mode, amt]) => {
                const pct = totalCollected > 0 ? Math.round((amt / totalCollected) * 100) : 0;
                return (
                  <div key={mode} style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 8, border: '1px solid var(--line)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600 }}>{mode}</span>
                      <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{inr(Math.round(amt))} ({pct}%)</span>
                    </div>
                    <div style={{ width: '100%', height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--teal)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pending Settlement Verification Queue */}
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h2 style={{ fontSize: 16, margin: 0 }}>Pending Payment Settlements</h2>
            <button className="btn sm ghost" onClick={() => navigate('/finance/payment-requests')}>All Requests</button>
          </div>
          {pendingPayments.length === 0 ? (
            <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
              No pending payment settlements.
            </div>
          ) : (
            <div className="tw">
              <table>
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Guest</th>
                    <th>Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.slice(0, 5).map((b) => (
                    <tr key={b.id}>
                      <td><span className="tag">{b.id}</span></td>
                      <td><b>{b.guest}</b></td>
                      <td style={{ fontWeight: 700, color: 'var(--brass)' }}>{inr(b.amt)}</td>
                      <td>
                        <button
                          className="btn sm"
                          onClick={() => notify(`Settlement recorded and receipt generated for ${b.guest}`)}
                        >
                          Settle Bill
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
