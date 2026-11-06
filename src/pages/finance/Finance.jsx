import { useStore } from '../../context/StoreContext';
import { useRbac } from '../../context/RbacContext';
import { inr } from '../../utils/format';
import PageHead from '../../components/PageHead';
import StatCard, { StatRow } from '../../components/StatCard';
import DataTable from '../../components/DataTable';
import { StatusBadge } from '../../components/Badge';
import { useState, useEffect, useCallback } from 'react';
import { api, API_BASE_URL } from '../../services/api';
import SubNav from '../../components/SubNav';
import InvoiceModal from '../../components/InvoiceModal';
import { loadRazorpayScript } from '../../utils/razorpay';

export default function Finance() {
  const { bookings, payments, refresh, notify, updatePayment, deletePayment } = useStore();
  const { canCreate, canEdit, canDelete, canApprove } = useRbac();
  const [open, setOpen] = useState(false);
  const [billPickerOpen, setBillPickerOpen] = useState(false);
  const [selectedInvoiceRef, setSelectedInvoiceRef] = useState(null);
  const [pickerRef, setPickerRef] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [form, setForm] = useState({ reservation_id: '', amount: '', method: 'UPI', status: 'Paid', transaction_reference: '' });

  const loadInvoices = useCallback(async () => {
    setInvoicesLoading(true);
    try {
      const data = await api('/api/invoices');
      setInvoices(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  
  const [razorpayLoading, setRazorpayLoading] = useState(false);

  async function handleRazorpayAdminPayment(e) {
    e.preventDefault();
    const b = bookings.find(x => String(x.reservation_id) === String(form.reservation_id));
    if (!b) {
      notify('Please select a booking first');
      return;
    }
    const payAmt = Number(form.amount);
    if (!payAmt || payAmt <= 0) {
      notify('Please enter a valid payment amount greater than zero');
      return;
    }

    setRazorpayLoading(true);
    try {
      const orderRes = await api('/api/payments/razorpay/create-order', {
        method: 'POST',
        body: JSON.stringify({
          booking_reference: b.id,
          amount: payAmt
        })
      });

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error('Could not load Razorpay Checkout SDK. Please check your network connection.');
      }

      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: orderRes.hotel_name || 'StayFlow Hotel',
        description: `Booking #${orderRes.booking_reference} - Staff Payment`,
        order_id: orderRes.order_id,
        prefill: {
          name: orderRes.guest_name || 'Guest',
          email: orderRes.guest_email || '',
          contact: orderRes.guest_phone || ''
        },
        theme: { color: '#2563EB' },
        handler: async function (response) {
          try {
            const verifyRes = await api('/api/payments/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_reference: b.id
              })
            });
            notify(`✓ Razorpay payment of ₹${verifyRes.amount} captured and verified!`);
            setOpen(false);
            setForm({ reservation_id: '', amount: '', method: 'Razorpay', status: 'Paid', transaction_reference: '' });
            await refresh();
            await loadInvoices();
          } catch (vErr) {
            notify(`Verification error: ${vErr.message}`);
          } finally {
            setRazorpayLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setRazorpayLoading(false);
            api('/api/payments/razorpay/failed', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: orderRes.order_id,
                error_description: 'Admin or guest cancelled checkout popup'
              })
            }).then(() => {
              refresh();
            }).catch(() => {});
            notify('Razorpay checkout window was dismissed');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setRazorpayLoading(false);
        api('/api/payments/razorpay/failed', {
          method: 'POST',
          body: JSON.stringify({
            razorpay_order_id: orderRes.order_id,
            error_code: resp?.error?.code,
            error_description: resp?.error?.description
          })
        }).catch(() => {});
        notify(`Payment failed: ${resp?.error?.description || 'Transaction declined'}`);
      });
      rzp.open();
    } catch (err) {
      notify(`Order error: ${err.message}`);
      setRazorpayLoading(false);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (form.method === 'Razorpay') {
      return handleRazorpayAdminPayment(e);
    }
    try {
      await api('/api/payments', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          reservation_id: Number(form.reservation_id),
          amount: Number(form.amount),
          transaction_reference: form.transaction_reference || null
        })
      });
      setOpen(false);
      setForm({ reservation_id: '', amount: '', method: 'UPI', status: 'Paid', transaction_reference: '' });
      await refresh();
      await loadInvoices();
      notify('Payment transaction recorded');
    } catch (err) {
      notify(err.message);
    }
  }

  const paid = payments.filter(p => p.status === 'Paid').reduce((s,p) => s + Number(p.amount), 0);
  const pending = payments.filter(p => p.status === 'Pending').reduce((s,p) => s + Number(p.amount), 0);
  const refunded = payments.filter(p => p.status === 'Refunded').reduce((s,p) => s + Number(p.amount), 0);
  const totalInvoiced = invoices.reduce((s, inv) => s + Number(inv.total_bill || 0), 0);

  const handleStatusChange = async (p, newStatus) => {
    await updatePayment(p.id, { status: newStatus });
    await loadInvoices();
  };

  const handleDeletePayment = async (p) => {
    if (!window.confirm(`Delete payment of ₹${p.amount}?`)) return;
    await deletePayment(p.id);
    await loadInvoices();
  };

  const handleOpenPicker = (e) => {
    e.preventDefault();
    if (!pickerRef) return;
    setSelectedInvoiceRef(pickerRef);
    setBillPickerOpen(false);
  };

  const handleDownloadPDF = (ref) => {
    const pdfUrl = `${API_BASE_URL}/api/public/booking/invoice/${encodeURIComponent(ref)}/pdf`;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `Invoice_${ref}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Payment ledger rows
  const paymentRows = payments.map(p => {
    const b = bookings.find(x => x.reservation_id === p.reservation_id);
    return [
      <span className="tag" key={p.id}>{b?.id || `Reservation #${p.reservation_id}`}</span>,
      b?.guest || '—',
      inr(p.amount),
      p.method,
      <StatusBadge key={`s-${p.id}`} status={p.status} />,
      <div key={`act-${p.id}`} style={{ display: 'flex', gap: 6 }}>
        {p.status === 'Pending' && (canApprove('/finance') || canEdit('/finance')) && (
          <button className="btn sm teal" onClick={() => handleStatusChange(p, 'Paid')} title="Mark paid">Paid</button>
        )}
        {p.status === 'Paid' && (canApprove('/finance') || canEdit('/finance')) && (
          <button className="btn sm brass" onClick={() => handleStatusChange(p, 'Refunded')} title="Process refund">Refund</button>
        )}
        {canDelete('/finance') && (
          <button className="btn sm danger ghost" onClick={() => handleDeletePayment(p)} title="Delete transaction">Delete</button>
        )}
      </div>
    ];
  });

  // Invoice ledger rows
  const invoiceRows = invoices.map(inv => {
    const ref = inv.booking_reference || inv.invoice_number.replace('INV-', '');
    const isFullyPaid = (inv.balance_due || 0) <= 0 && (inv.amount_paid || 0) > 0;
    let statusLabel = 'Pending';
    if (inv.payment_status === 'Fully Paid' || inv.payment_status === 'Paid' || isFullyPaid) {
      statusLabel = 'Fully Paid';
    } else if (inv.payment_status === 'Partially Paid' || (inv.amount_paid > 0 && (inv.balance_due || 0) > 0)) {
      statusLabel = 'Partially Paid';
    } else {
      statusLabel = 'Pending';
    }

    return [
      <strong key={`inv-${inv.id}`} style={{ color: 'var(--ink)' }}>{inv.invoice_number}</strong>,
      <span className="tag" key={`ref-${inv.id}`}>{ref}</span>,
      <span key={`gst-${inv.id}`}>{inv.guest_name}</span>,
      <span key={`rm-${inv.id}`}>{inv.room_type} ({inv.room_number ? `Rm ${inv.room_number}` : '—'})</span>,
      `${inv.nights || 1}n`,
      inr(inv.subtotal),
      inr(inv.tax_amount),
      <strong key={`tot-${inv.id}`}>{inr(inv.total_bill)}</strong>,
      <span key={`pd-${inv.id}`} style={{ color: 'var(--green)', fontWeight: 600 }}>{inr(inv.amount_paid)}</span>,
      <span key={`bl-${inv.id}`} style={{ color: (inv.balance_due || 0) > 0 ? 'var(--red)' : 'var(--green)', fontWeight: 700 }}>{inr(inv.balance_due || 0)}</span>,
      <StatusBadge key={`st-${inv.id}`} status={statusLabel} />,
      <div key={`iact-${inv.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
        <button
          type="button"
          className="btn sm"
          onClick={() => setSelectedInvoiceRef(ref)}
          title="View full itemized invoice, add services, and settle bill"
          style={{
            background: 'var(--teal-soft)',
            color: 'var(--teal)',
            border: '1px solid var(--teal)',
            borderRadius: 7,
            padding: '5px 11px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            whiteSpace: 'nowrap',
            lineHeight: 1.2
          }}
        >
          <span>🧾</span>
          <span>View Bill</span>
        </button>
        <button
          type="button"
          className="btn sm ghost"
          onClick={() => handleDownloadPDF(ref)}
          title="Download official PDF invoice"
          style={{
            borderRadius: 7,
            padding: '5px 10px',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            whiteSpace: 'nowrap',
            lineHeight: 1.2
          }}
        >
          <span>📥</span>
          <span>PDF</span>
        </button>
      </div>
    ];
  });

  return (
    <>
      <PageHead title="Finance & payments" subtitle="Collections, refunds, automated invoicing and OTA commissions">
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn"
            style={{
              background: billPickerOpen ? 'var(--grey-soft)' : 'var(--teal)',
              color: billPickerOpen ? 'var(--ink)' : '#FFF',
              border: '1px solid ' + (billPickerOpen ? 'var(--line)' : 'var(--teal)'),
              fontWeight: 600
            }}
            onClick={() => setBillPickerOpen(v => !v)}
          >
            {billPickerOpen ? '✕ Close Bill Picker' : '🧾 Open Bill / Generate Invoice'}
          </button>
          {canCreate('/finance') && (
            <button className="btn" onClick={() => setOpen(v => !v)}>
              {open ? 'Close form' : 'Record payment'}
            </button>
          )}
        </div>
      </PageHead>
      <SubNav parentPath="/finance" />

      {/* Open Hotel Bill / Generate Invoice Section */}
      {billPickerOpen && (
        <form className="panel bill-picker-panel" onSubmit={handleOpenPicker}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <h2 style={{ color: 'var(--ink)', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
              <span>🧾</span> Open Hotel Bill / Generate Invoice for Booking
            </h2>
            <button
              type="button"
              onClick={() => setBillPickerOpen(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--muted)',
                fontSize: 18,
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 4,
                lineHeight: 1
              }}
              title="Close panel"
            >
              ✕
            </button>
          </div>
          <div className="sub" style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4, marginBottom: 16 }}>
            Select a registered booking to calculate the bill, add extra services, settle balances, and view or download the official tax invoice.
          </div>
          <div className="bill-picker-grid">
            <div className="field" style={{ margin: 0 }}>
              <label style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>
                Select Booking
              </label>
              <select
                required
                value={pickerRef}
                onChange={e => setPickerRef(e.target.value)}
                style={{
                  height: 42,
                  width: '100%',
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--line)',
                  background: 'var(--panel-alt)',
                  color: 'var(--ink)',
                  fontSize: 13,
                  fontWeight: 500,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">-- Choose a booking to calculate bill --</option>
                {bookings.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.id} · {b.guest} ({b.room}) · {b.st} · Status: {b.pay}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label style={{ color: 'var(--ink)', fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>
                Action
              </label>
              <button
                type="submit"
                className="btn primary"
                style={{
                  height: 42,
                  padding: '0 20px',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  whiteSpace: 'nowrap',
                  cursor: pickerRef ? 'pointer' : 'not-allowed',
                  opacity: pickerRef ? 1 : 0.65
                }}
                disabled={!pickerRef}
              >
                <span>🧾</span>
                <span>Open Detailed Bill & Invoice</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Record Payment Form */}
      {open && (() => {
        const selectedBooking = bookings.find(x => String(x.reservation_id) === String(form.reservation_id));
        const matchedInv = invoices.find(x => x.booking_reference === selectedBooking?.id);
        const invTotal = matchedInv ? Number(matchedInv.total_bill) : (selectedBooking ? Number(selectedBooking.amt) : 0);
        const invPaid = matchedInv ? Number(matchedInv.amount_paid) : 0;
        const invBalance = matchedInv ? Number(matchedInv.balance_due) : (selectedBooking ? Number(selectedBooking.amt) : 0);

        return (
          <form className="panel" onSubmit={save} style={{ border: form.method === 'Razorpay' ? '1px solid #3B82F6' : undefined }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>Record Payment & Settlement</h2>
              {form.method === 'Razorpay' && (
                <span style={{ background: '#EFF6FF', color: '#1D4ED8', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
                  ⚡ Razorpay Test Mode Gateway
                </span>
              )}
            </div>

            {selectedBooking && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border, #334155)',
                borderRadius: 8,
                padding: '12px 16px',
                marginBottom: 16,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 12
              }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--sub, #94A3B8)' }}>Booking Ref</div>
                  <strong style={{ fontSize: 13, color: 'var(--head-color, #FFF)' }}>{selectedBooking.id}</strong>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--sub, #94A3B8)' }}>Guest</div>
                  <strong style={{ fontSize: 13, color: 'var(--head-color, #FFF)' }}>{selectedBooking.guest}</strong>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--sub, #94A3B8)' }}>Invoice Total</div>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{inr(invTotal)}</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--sub, #94A3B8)' }}>Previously Paid</div>
                  <span style={{ fontSize: 13, color: '#10B981', fontWeight: 600 }}>{inr(invPaid)}</span>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--sub, #94A3B8)' }}>Outstanding Balance</div>
                  <span style={{ fontSize: 13, color: invBalance > 0 ? '#EF4444' : '#10B981', fontWeight: 700 }}>
                    {inr(invBalance)}
                  </span>
                </div>
              </div>
            )}

            <div className="grid2">
              <div className="field">
                <label>Select Booking</label>
                <select
                  required
                  value={form.reservation_id}
                  onChange={e => {
                    const id = e.target.value;
                    const b = bookings.find(x => String(x.reservation_id) === id);
                    const inv = invoices.find(x => x.booking_reference === b?.id);
                    const bal = inv ? String(inv.balance_due) : (b ? String(b.amt) : form.amount);
                    setForm(f => ({ ...f, reservation_id: id, amount: bal || f.amount }));
                  }}
                >
                  <option value="">Select reservation</option>
                  {bookings.map(b => (
                    <option key={b.reservation_id} value={b.reservation_id}>
                      {b.id} · {b.guest}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ margin: 0 }}>Amount to Collect (₹)</label>
                  {invBalance > 0 && (
                    <button
                      type="button"
                      className="btn ghost"
                      style={{ padding: '2px 8px', fontSize: 11, height: 'auto', color: '#38BDF8' }}
                      onClick={() => setForm(f => ({ ...f, amount: String(invBalance) }))}
                    >
                      ⚡ Settle Full Balance ({inr(invBalance)})
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={form.amount}
                  onChange={set('amount')}
                />
              </div>
              <div className="field">
                <label>Payment Method</label>
                <select value={form.method} onChange={set('method')}>
                  <option value="Razorpay">Razorpay (Online Gateway - Test Mode)</option>
                  <option value="UPI">UPI</option>
                  <option value="Card">Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank transfer">Bank transfer</option>
                </select>
              </div>
              {form.method !== 'Razorpay' ? (
                <>
                  <div className="field">
                    <label>Status</label>
                    <select value={form.status} onChange={set('status')}>
                      <option>Paid</option>
                      <option>Pending</option>
                      <option>Failed</option>
                      <option>Refunded</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Transaction reference (optional)</label>
                    <input
                      value={form.transaction_reference}
                      onChange={set('transaction_reference')}
                      placeholder="e.g. UTR-12345 or Bank Ref"
                    />
                  </div>
                </>
              ) : (
                <div className="field">
                  <label>Gateway Provider</label>
                  <div style={{ padding: '8px 12px', background: 'rgba(59, 130, 246, 0.08)', borderRadius: 6, fontSize: 12, color: '#60A5FA' }}>
                    💳 Razorpay Test Mode Checkout (Cards, UPI, Netbanking)
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              {form.method === 'Razorpay' ? (
                <button
                  type="button"
                  className="btn"
                  onClick={handleRazorpayAdminPayment}
                  disabled={razorpayLoading || !form.reservation_id || (invBalance <= 0)}
                  style={{ background: invBalance <= 0 ? '#475569' : '#2563EB', borderColor: '#1D4ED8', cursor: invBalance <= 0 ? 'not-allowed' : 'pointer' }}
                >
                  {razorpayLoading ? 'Launching Razorpay…' : invBalance <= 0 ? '✓ Fully Settled (₹0 Balance)' : `💳 Settle with Razorpay (₹${Number(form.amount || invBalance).toFixed(2)})`}
                </button>
              ) : (
                <button className="btn">Save Manual Payment</button>
              )}
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        );
      })()}

      {/* Stat Cards */}
      <StatRow>
        <StatCard label="Collected Payments" value={inr(paid)} note="Recorded paid transactions" />
        <StatCard
          label="Pending Payments"
          value={inr(pending)}
          note={`${payments.filter(p => p.status === 'Pending').length} transactions`}
          negative={pending > 0}
        />
        <StatCard label="Total Invoiced" value={inr(totalInvoiced)} note={`${invoices.length} generated invoices`} />
        <StatCard label="Total Reservations" value={bookings.length} note="Saved hotel bookings" />
      </StatRow>

      {/* Invoices & Billing Ledger Panel */}
      <div className="panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h2 style={{ margin: 0 }}>Official Invoices & Billing Records</h2>
          <button className="btn sm ghost" onClick={loadInvoices} title="Reload invoices from database">
            🔄 Refresh Invoices
          </button>
        </div>
        <div className="sub">
          Detailed tax invoices saved in MySQL database, linked to booking references with room rates, additional services, and GST breakdowns.
        </div>
        {invoicesLoading ? (
          <p style={{ color: '#64748B', padding: 20 }}>Loading invoices from database...</p>
        ) : (
          <>
            <DataTable
              className="table-wide"
              columns={[
                'Invoice No.',
                'Booking Ref',
                'Guest',
                'Room',
                'Nights',
                'Subtotal',
                'GST Tax',
                'Total Bill',
                'Paid',
                'Balance',
                'Status',
                'Actions'
              ]}
              rows={invoiceRows}
            />
            {!invoiceRows.length && (
              <p className="empty">
                No invoices generated yet. Click "Generate / Manage Bill" above or check out a guest to automatically generate an invoice.
              </p>
            )}
          </>
        )}
      </div>

      {/* Payment Ledger Panel */}
      <div className="panel">
        <h2>Payment Transaction Ledger</h2>
        <div className="sub">Transactions recorded in MySQL payments table.</div>
        <DataTable columns={['Booking', 'Guest', 'Amount', 'Method', 'Status', 'Actions']} rows={paymentRows} />
        {!paymentRows.length && <p className="empty">No payment transactions recorded yet.</p>}
      </div>

      {/* Detailed Bill / Invoice Modal */}
      {selectedInvoiceRef && (
        <InvoiceModal
          bookingReference={selectedInvoiceRef}
          isOpen={Boolean(selectedInvoiceRef)}
          onClose={() => setSelectedInvoiceRef(null)}
          onRefresh={async () => {
            await refresh();
            await loadInvoices();
          }}
        />
      )}
    </>
  );
}
