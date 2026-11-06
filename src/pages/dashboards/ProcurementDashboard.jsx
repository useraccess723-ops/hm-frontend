import React from 'react';
import { useStore } from '../../context/StoreContext';
import PageHead from '../../components/PageHead';
import { useNavigate } from 'react-router-dom';
import SubNav from '../../components/SubNav';
import { StatusBadge } from '../../components/Badge';
import { inr } from '../../utils/format';

export default function ProcurementDashboard() {
  const { notify, activeTenant, tenant, user, settings, records } = useStore();
  const navigate = useNavigate();
  const hotelName = activeTenant?.name || tenant?.name || user?.tenant?.name || settings?.hotel_name || 'Hotel Management';

  const poRecords = records.filter(r => r.category === 'procurement_purchase_orders' || (r.category && r.category.startsWith('procurement_')));
  const pendingPOs = poRecords.filter(r => !['Completed', 'Received', 'Cancelled'].includes(r.status));
  const vendors = records.filter(r => r.category === 'procurement_vendors');
  const requisitions = records.filter(r => r.category === 'procurement_requisitions');
  const grnRecords = records.filter(r => r.category === 'procurement_goods_receipt');

  const pendingAmount = pendingPOs.reduce((sum, r) => {
    const amt = Number(r.data?.['Amount'] || r.data?.['Total'] || 0);
    return sum + (Number.isNaN(amt) ? 0 : amt);
  }, 0);

  return (
    <div className="procurement-dashboard">
      <PageHead
        title={`${hotelName} – Procurement & Central Store Operations`}
        subtitle={`${hotelName} purchase orders, vendor contracts, inventory requisitions, goods receipt, and budget approvals`}
      >
        <button className="btn ghost" onClick={() => navigate('/procurement/purchase-orders')}>
          Manage POs
        </button>
        <button className="btn" onClick={() => navigate('/procurement/requisitions')}>
          + New Requisition
        </button>
      </PageHead>

      {/* Procurement Submenus */}
      <SubNav parentPath="/procurement" />

      {/* Relevant Menus Quick Access */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, marginTop: -4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', alignSelf: 'center', marginRight: 4 }}>Relevant Menus:</span>
        <button className="btn sm ghost" onClick={() => navigate('/finance')}>💰 Finance & Payments</button>
        <button className="btn sm ghost" onClick={() => navigate('/food-beverage')}>🍽️ Food & Beverage Store</button>
      </div>

      {/* Procurement KPIs */}
      <div className="db-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div className="panel" style={{ borderLeft: '4px solid var(--brass)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Pending PO Approvals</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--brass)', marginTop: 4 }}>{inr(pendingAmount)}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{pendingPOs.length} purchase orders awaiting sign-off</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--teal)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Active Suppliers & Vendors</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--teal)', marginTop: 4 }}>{vendors.length} Registered</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Verified vendor directory records</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--blue)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Purchase Requisitions</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', marginTop: 4 }}>{requisitions.length} Items</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Departmental stock requisitions</div>
        </div>
        <div className="panel" style={{ borderLeft: '4px solid var(--green)' }}>
          <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>Goods Received (GRN)</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>{grnRecords.length} Batches</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Delivered & checked at loading dock</div>
        </div>
      </div>

      {/* Active Purchase Orders Table */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>Recent Purchase Orders & Deliveries</h2>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Live procurement transactions across departments</div>
          </div>
          <button className="btn sm ghost" onClick={() => navigate('/procurement/purchase-orders')}>View All Orders</button>
        </div>

        {poRecords.length === 0 ? (
          <div className="empty" style={{ padding: '32px 16px', textAlign: 'center' }}>
            No purchase orders recorded in database.
          </div>
        ) : (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>PO ID</th>
                  <th>Department</th>
                  <th>Vendor</th>
                  <th>Items Summary</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {poRecords.slice(0, 6).map((rec) => {
                  const data = rec.data || {};
                  return (
                    <tr key={rec.id}>
                      <td><span className="tag">PO-{rec.id}</span></td>
                      <td><b>{data['Department'] || 'General'}</b></td>
                      <td>{data['Vendor'] || data['Supplier'] || '—'}</td>
                      <td>{data['Items'] || data['Description'] || rec.title}</td>
                      <td style={{ fontWeight: 700, color: 'var(--brass)' }}>
                        {data['Amount'] ? (String(data['Amount']).startsWith('₹') ? data['Amount'] : inr(data['Amount'])) : '—'}
                      </td>
                      <td><StatusBadge status={rec.status || 'Pending'} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
