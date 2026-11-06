import { useState, useEffect } from 'react';
import { api, API_BASE_URL } from '../services/api';
import { loadRazorpayScript } from '../utils/razorpay';
import { inr } from '../utils/format';
import { StatusBadge } from './Badge';

export default function InvoiceModal({ bookingReference, isOpen, onClose, onRefresh }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  
  // Add service form state
  const [showAddService, setShowAddService] = useState(false);
  const [serviceForm, setServiceForm] = useState({
    service_name: '',
    category: 'Food & Beverage',
    quantity: 1,
    unit_price: 450,
    service_date: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [submittingService, setSubmittingService] = useState(false);

  // Settlement form state
  const [showSettle, setShowSettle] = useState(false);
  const [settleMethod, setSettleMethod] = useState('UPI');
  const [settleAmount, setSettleAmount] = useState('');
  const [txnRef, setTxnRef] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [submittingSettle, setSubmittingSettle] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchInvoiceData = async () => {
    if (!bookingReference) return;
    setLoading(true);
    setError('');
    try {
      const res = await api(`/api/bookings/${encodeURIComponent(bookingReference)}/billing`);
      setData(res);
      if (res?.billing?.balance_due != null) {
        setSettleAmount(res.billing.balance_due);
      }
    } catch (err) {
      // Fallback to public invoice if admin billing 404s
      try {
        const pub = await api(`/api/public/booking/invoice/${encodeURIComponent(bookingReference)}`);
        setData({
          booking_reference: bookingReference,
          guest_name: pub.guest_name,
          guest_phone: pub.guest_phone,
          guest_email: pub.guest_email,
          room_number: pub.room_number,
          room_type: pub.room_type,
          check_in: pub.check_in,
          check_out: pub.check_out,
          status: pub.payment_status,
          billing: {
            nights: pub.nights,
            base_rate: pub.base_rate,
            room_charges: pub.room_charges,
            daily_room_charges: pub.daily_room_charges || [],
            has_half_day: pub.has_half_day || false,
            additional_charges: pub.additional_charges,
            services: pub.services || [],
            subtotal: pub.subtotal,
            discount_amount: pub.discount_amount || 0,
            taxable_amount: pub.taxable_amount || pub.subtotal,
            gst_percent: pub.gst_percent,
            tax_amount: pub.tax_amount,
            cgst_amount: (pub.tax_amount || 0) / 2,
            sgst_amount: (pub.tax_amount || 0) / 2,
            total_bill: pub.total_bill,
            amount_paid: pub.amount_paid,
            balance_due: pub.balance_due,
            payment_status: pub.payment_status,
            hotel_name: pub.hotel_name,
            currency: pub.currency,
          },
          invoice: pub,
          available_services: []
        });
      } catch (e) {
        setError(err.message || 'Failed to load billing information');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && bookingReference) {
      fetchInvoiceData();
      setShowAddService(false);
      setShowSettle(false);
      setSuccessMsg('');
    }
  }, [isOpen, bookingReference]);

  if (!isOpen) return null;

  const billing = data?.billing || {};
  const services = billing?.services || [];
  const roomCharges = billing?.room_charges || 0;
  const nights = billing?.nights || 1;
  const baseRate = billing?.base_rate || 0;
  const subtotal = billing?.subtotal || (roomCharges + (billing?.additional_charges || 0));
  const discount = billing?.discount_amount || 0;
  const gstPercent = billing?.gst_percent || 12;
  const taxAmount = billing?.tax_amount || 0;
  const totalBill = billing?.total_bill || 0;
  const amountPaid = billing?.amount_paid || 0;
  const balanceDue = billing?.balance_due || 0;
  const paymentStatus = billing?.payment_status || 'Pending';
  const isPaid = balanceDue <= 0;

  const handlePresetSelect = (preset) => {
    setServiceForm({
      service_name: preset.name,
      category: preset.category || 'Hotel Service',
      quantity: 1,
      unit_price: preset.default_price || 0,
      service_date: serviceForm.service_date || new Date().toISOString().split('T')[0],
      notes: preset.unit ? `Standard rate (${preset.unit})` : '',
    });
  };

  const handleToggleHalfDay = async () => {
    try {
      const nextState = !billing?.has_half_day;
      await api(`/api/bookings/${encodeURIComponent(bookingReference)}/half-day`, {
        method: 'POST',
        body: JSON.stringify({
          has_half_day: nextState,
          notes: nextState ? 'Half-day stay (50% room rate) configured by staff' : 'Standard full-day stay applied by staff'
        })
      });
      setSuccessMsg(nextState ? 'Applied half-day stay calculation (50% room rate for departure day)' : 'Reverted to standard full-day room rate');
      await fetchInvoiceData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to update stay policy');
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (!serviceForm.service_name.trim()) return;
    setSubmittingService(true);
    setSuccessMsg('');
    try {
      await api(`/api/bookings/${encodeURIComponent(bookingReference)}/services`, {
        method: 'POST',
        body: JSON.stringify({
          service_name: serviceForm.service_name.trim(),
          category: serviceForm.category,
          quantity: Number(serviceForm.quantity) || 1,
          unit_price: Number(serviceForm.unit_price) || 0,
          service_date: serviceForm.service_date || undefined,
          notes: serviceForm.notes.trim() || undefined,
        })
      });
      setSuccessMsg(`Added ${serviceForm.service_name} to bill successfully`);
      setShowAddService(false);
      setServiceForm({
        service_name: '',
        category: 'Food & Beverage',
        quantity: 1,
        unit_price: 450,
        service_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      await fetchInvoiceData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to add service charge');
    } finally {
      setSubmittingService(false);
    }
  };

  const handleDeleteService = async (serviceId) => {
    if (!window.confirm('Are you sure you want to remove this service from the bill?')) return;
    try {
      await api(`/api/bookings/${encodeURIComponent(bookingReference)}/services/${serviceId}`, {
        method: 'DELETE'
      });
      setSuccessMsg('Service removed from bill');
      await fetchInvoiceData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to remove service');
    }
  };

  const handleFinalizeBill = async (e) => {
    e.preventDefault();
    setSubmittingSettle(true);
    setSuccessMsg('');

    if (settleMethod === 'Razorpay') {
      const payAmt = Number(settleAmount) || 0;
      if (!payAmt || payAmt <= 0) {
        alert('Please enter a valid settlement amount greater than zero.');
        setSubmittingSettle(false);
        return;
      }
      try {
        const orderRes = await api('/api/payments/razorpay/create-order', {
          method: 'POST',
          body: JSON.stringify({
            booking_reference: bookingReference,
            amount: payAmt
          })
        });

        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          throw new Error('Unable to load Razorpay payment SDK.');
        }

        const options = {
          key: orderRes.key_id,
          amount: orderRes.amount,
          currency: orderRes.currency || 'INR',
          name: orderRes.hotel_name || 'StayFlow Hotel',
          description: `Invoice Settlement #${bookingReference}`,
          order_id: orderRes.order_id,
          prefill: {
            name: orderRes.guest_name || 'Guest',
            email: orderRes.guest_email || '',
            contact: orderRes.guest_phone || ''
          },
          theme: { color: '#0F172A' },
          handler: async function (response) {
            try {
              await api('/api/payments/razorpay/verify', {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  booking_reference: bookingReference
                })
              });
              setSuccessMsg('✓ Razorpay settlement verified and invoice updated successfully!');
              setShowSettle(false);
              await fetchInvoiceData();
              if (onRefresh) onRefresh();
            } catch (vErr) {
              alert(`Verification failed: ${vErr.message}`);
            } finally {
              setSubmittingSettle(false);
            }
          },
          modal: {
            ondismiss: function () {
              setSubmittingSettle(false);
              api('/api/payments/razorpay/failed', {
                method: 'POST',
                body: JSON.stringify({
                  razorpay_order_id: orderRes.order_id,
                  error_description: 'Staff dismissed Razorpay checkout'
                })
              }).then(() => {
                loadDetailedData();
              }).catch(() => {});
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setSubmittingSettle(false);
          api('/api/payments/razorpay/failed', {
            method: 'POST',
            body: JSON.stringify({
              razorpay_order_id: orderRes.order_id,
              error_code: resp?.error?.code,
              error_description: resp?.error?.description
            })
          }).catch(() => {});
          alert(`Payment failed: ${resp?.error?.description || 'Declined'}`);
        });
        rzp.open();
        return;
      } catch (err) {
        alert(err.message || 'Razorpay order creation failed');
        setSubmittingSettle(false);
        return;
      }
    }

    try {
      await api(`/api/bookings/${encodeURIComponent(bookingReference)}/finalize-bill`, {
        method: 'POST',
        body: JSON.stringify({
          payment_method: settleMethod,
          settle_amount: Number(settleAmount) || 0,
          transaction_reference: txnRef.trim() || undefined,
          discount_amount: Number(discountAmount) || 0,
        })
      });
      setSuccessMsg('Bill finalized and payment settled successfully!');
      setShowSettle(false);
      await fetchInvoiceData();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to finalize bill');
    } finally {
      setSubmittingSettle(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const token = localStorage.getItem('stayflow_token');
    const pdfUrl = `${API_BASE_URL}/api/public/booking/invoice/${encodeURIComponent(bookingReference)}/pdf`;
    
    // Create an anchor and trigger download
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `Invoice_${bookingReference}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-backdrop" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px',
      overflowY: 'auto'
    }}>
      <div
        className="invoice-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          maxWidth: 820,
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Modal Top Action Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid #E2E8F0',
          background: '#0F172A',
          color: '#FFFFFF'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🧾</span>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#F8FAFC' }}>
                Hotel Bill & Official GST Invoice
              </h2>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>
                Booking Ref: <strong style={{ color: '#38BDF8' }}>{bookingReference}</strong>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={handleDownloadPDF}
              className="btn sm"
              style={{ background: '#0284C7', color: '#FFF', display: 'flex', alignItems: 'center', gap: 6 }}
              title="Download official PDF invoice generated by backend"
            >
              📥 Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="btn sm"
              style={{
                background: '#1E293B',
                color: '#FFFFFF',
                border: '1px solid #475569',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontWeight: 600
              }}
              title="Print invoice"
            >
              🖨️ Print
            </button>
            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94A3B8',
                fontSize: 22,
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0 4px'
              }}
              title="Close modal"
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ overflowY: 'auto', padding: '24px', flex: 1, backgroundColor: '#F8FAFC' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748B' }}>
              <div className="gp-spinner" style={{ margin: '0 auto 12px', borderTopColor: '#0284C7' }} />
              <div>Loading real-time billing and invoice details...</div>
            </div>
          ) : error ? (
            <div style={{ padding: 20, background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, color: '#991B1B' }}>
              <strong>Error loading invoice:</strong> {error}
            </div>
          ) : (
            <>
              {successMsg && (
                <div style={{
                  padding: '10px 16px',
                  background: '#F0FDF4',
                  border: '1px solid #86EFAC',
                  borderRadius: 8,
                  color: '#166534',
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 16
                }}>
                  ✅ {successMsg}
                </div>
              )}

              {/* Printable Invoice Sheet */}
              <div id="printable-invoice" style={{
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E2E8F0',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                marginBottom: 20
              }}>
                {/* Hotel Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0F172A', paddingBottom: 16, marginBottom: 16 }}>
                  <div>
                    <h1 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#0F172A' }}>
                      {billing.hotel_name || 'StayFlow Hotel & Luxury Suites'}
                    </h1>
                    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                      104 Coastal Boulevard, Hospitality Zone, Bengaluru 560001<br />
                      <strong>GSTIN:</strong> 29AAACH7409R1ZZ &nbsp;|&nbsp; <strong>Phone:</strong> +91 80 4567 8900<br />
                      <strong>Email:</strong> frontdesk@stayflowhotel.com &nbsp;|&nbsp; <strong>Web:</strong> stayflowhotel.com
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#0284C7', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Tax Invoice
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      INV-{bookingReference}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: isPaid ? '#DCFCE7' : (amountPaid > 0 ? '#FEF3C7' : '#FEE2E2'),
                        color: isPaid ? '#15803D' : (amountPaid > 0 ? '#B45309' : '#B91C1C'),
                        border: `1px solid ${isPaid ? '#86EFAC' : (amountPaid > 0 ? '#FCD34D' : '#FCA5A5')}`
                      }}>
                        {paymentStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Guest & Stay 2-Column Info Card */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: 16,
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 10,
                  padding: '14px 16px',
                  marginBottom: 20
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#0284C7', marginBottom: 6 }}>
                      Guest Particulars
                    </div>
                    <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
                      <div><strong>Name:</strong> {data?.guest_name || '—'}</div>
                      <div><strong>Phone:</strong> {data?.guest_phone || '—'}</div>
                      <div><strong>Email:</strong> {data?.guest_email || '—'}</div>
                      <div><strong>ID Proof:</strong> {data?.invoice?.id_proof || 'Verified at Check-in'}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#0284C7', marginBottom: 6 }}>
                      Stay & Room Details
                    </div>
                    <div style={{ fontSize: 13, color: '#1E293B', lineHeight: 1.6 }}>
                      <div><strong>Room:</strong> Room {data?.room_number} ({data?.room_type})</div>
                      <div><strong>Duration:</strong> {nights} Night(s)</div>
                      <div><strong>Check-In:</strong> {data?.check_in} (14:00 hrs)</div>
                      <div><strong>Check-Out:</strong> {data?.check_out} (11:00 hrs)</div>
                    </div>
                  </div>
                </div>

                {/* Itemized Table */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: '#334155' }}>
                      Itemized Stay & Services
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="no-print">
                      <button
                        type="button"
                        className="btn sm ghost"
                        onClick={handleToggleHalfDay}
                        title={billing?.has_half_day ? "Half-day stay is active (50% room rate for departure day). Click to revert to full-day stay." : "Click to apply half-day stay calculation (50% room rate for departure day)"}
                        style={{
                          fontSize: 11,
                          padding: '4px 10px',
                          border: `1px solid ${billing?.has_half_day ? '#0284C7' : '#CBD5E1'}`,
                          color: billing?.has_half_day ? '#0284C7' : '#64748B',
                          background: billing?.has_half_day ? '#F0F9FF' : '#FFFFFF',
                          fontWeight: 600
                        }}
                      >
                        ⏱️ {billing?.has_half_day ? 'Half-Day Active (50%)' : 'Apply Half-Day Stay'}
                      </button>
                      <button
                        type="button"
                        className="btn sm"
                        onClick={() => setShowAddService(!showAddService)}
                        style={{ fontSize: 11, padding: '4px 10px', background: '#0284C7', color: '#FFF' }}
                      >
                        {showAddService ? 'Hide Service Form' : '+ Add Service / Charge'}
                      </button>
                    </div>
                  </div>

                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#0F172A', color: '#FFFFFF', textAlign: 'left' }}>
                        <th style={{ padding: '8px 10px', width: 30 }}>#</th>
                        <th style={{ padding: '8px 10px' }}>Description / Service</th>
                        <th style={{ padding: '8px 10px' }}>Category</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: 60 }}>Qty</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', width: 90 }}>Rate</th>
                        <th style={{ padding: '8px 10px', textAlign: 'right', width: 100 }}>Total</th>
                        <th style={{ padding: '8px 10px', textAlign: 'center', width: 40 }} className="no-print">Act</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Daily Room Charges: each stay date displayed separately */}
                      {((billing.daily_room_charges && billing.daily_room_charges.length > 0)
                        ? billing.daily_room_charges
                        : [{
                            day_number: 1,
                            date_formatted: data?.check_in,
                            room_type: data?.room_type,
                            room_number: data?.room_number,
                            duration: 'Full Day',
                            rate_per_day: baseRate,
                            amount: roomCharges
                          }]
                      ).map((day, dIdx) => (
                        <tr key={`day-${dIdx}`} style={{ borderBottom: '1px solid #E2E8F0', background: '#FFFFFF' }}>
                          <td style={{ padding: '10px' }}>{dIdx + 1}</td>
                          <td style={{ padding: '10px' }}>
                            <strong style={{ color: '#0F172A' }}>Room Stay: {day.room_type || data?.room_type}</strong>
                            <div style={{ fontSize: 11, color: '#64748B' }}>
                              Room #{day.room_number || data?.room_number} • Stay Date: {day.date_formatted || day.date} • {day.duration === 'Half Day' ? 'Half Day Stay (50% Rate)' : 'Full Day Stay'} @ {inr(day.rate_per_day)}/day
                            </div>
                          </td>
                          <td style={{ padding: '10px', color: '#475569' }}>Accommodation</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            {day.duration === 'Half Day' ? 'Half Day' : '1 Day'}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'right' }}>{inr(day.rate_per_day)}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            {inr(day.amount)}
                          </td>
                          <td style={{ padding: '10px', textAlign: 'center', color: '#94A3B8' }} className="no-print">—</td>
                        </tr>
                      ))}

                      {/* Additional Services: each extra service used displayed separately with service date */}
                      {services.map((svc, idx) => {
                        const rowNum = (billing.daily_room_charges?.length || 1) + idx + 1;
                        return (
                          <tr key={svc.id || idx} style={{ borderBottom: '1px solid #E2E8F0', background: idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF' }}>
                            <td style={{ padding: '10px' }}>{rowNum}</td>
                            <td style={{ padding: '10px' }}>
                              <strong style={{ color: '#0F172A' }}>{svc.name || svc.service_name}</strong>
                              <div style={{ fontSize: 11, color: '#64748B' }}>
                                {svc.service_date_formatted || svc.service_date ? `Service Date: ${svc.service_date_formatted || svc.service_date}` : ''}
                                {svc.notes ? `${svc.service_date_formatted || svc.service_date ? ' • ' : ''}${svc.notes}` : ''}
                              </div>
                            </td>
                            <td style={{ padding: '10px', color: '#475569' }}>{svc.category || 'Hotel Service'}</td>
                            <td style={{ padding: '10px', textAlign: 'center' }}>{svc.quantity}</td>
                            <td style={{ padding: '10px', textAlign: 'right' }}>{inr(svc.unit_price || svc.rate_per_unit)}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                              {inr(svc.total || svc.total_amount)}
                            </td>
                            <td style={{ padding: '10px', textAlign: 'center' }} className="no-print">
                              {svc.id && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteService(svc.id)}
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#DC2626',
                                    cursor: 'pointer',
                                    padding: '2px 4px',
                                    fontSize: 14
                                  }}
                                  title="Remove charge"
                                >
                                  🗑️
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {services.length === 0 && (
                        <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                          <td colSpan={7} style={{ padding: '10px', color: '#94A3B8', fontStyle: 'italic', textAlign: 'center', fontSize: 11 }}>
                            No additional services.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary Block */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  flexWrap: 'wrap',
                  gap: 16,
                  paddingTop: 12,
                  borderTop: '1px solid #E2E8F0'
                }}>
                  <div style={{ flex: 1, minWidth: 260, fontSize: 11, color: '#64748B', lineHeight: 1.6 }}>
                    <strong>GST Compliance & Tax Notes:</strong><br />
                    • SAC Code 996311: Hotel Accommodation & Hospitality Services<br />
                    • Central GST (CGST @ {gstPercent / 2}%): {inr(taxAmount / 2)}<br />
                    • State GST (SGST @ {gstPercent / 2}%): {inr(taxAmount / 2)}<br />
                    • Total Taxes: {inr(taxAmount)} ({gstPercent}% GST)<br />
                    • <i>This invoice is digitally recorded and verified against the hotel management database.</i>
                  </div>

                  <div style={{ width: 280, fontSize: 12, color: '#1E293B' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>Room Charges:</span>
                      <span>{inr(roomCharges)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>Additional Services:</span>
                      <span>{inr(billing.additional_charges || 0)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: 600, borderTop: '1px dashed #CBD5E1', marginTop: 3 }}>
                      <span>Subtotal (Gross):</span>
                      <span>{inr(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', color: '#16A34A', fontWeight: 600 }}>
                        <span>Discount Applied:</span>
                        <span>-{inr(discount)}</span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
                      <span>GST Taxes ({gstPercent}%):</span>
                      <span>{inr(taxAmount)}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '8px 0',
                      borderTop: '2px solid #0F172A',
                      borderBottom: '2px solid #0F172A',
                      marginTop: 4,
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#0F172A'
                    }}>
                      <span>FINAL TOTAL:</span>
                      <span style={{ color: '#0284C7' }}>{inr(totalBill)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#15803D', fontWeight: 600 }}>
                      <span>Amount Paid:</span>
                      <span>{inr(amountPaid)}</span>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '5px 0',
                      fontSize: 13,
                      fontWeight: 700,
                      color: balanceDue > 0 ? '#DC2626' : '#15803D'
                    }}>
                      <span>Outstanding Balance:</span>
                      <span>{inr(balanceDue)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Form 1: Add Additional Service Panel */}
              {showAddService && (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1.5px solid #0284C7',
                  padding: '20px',
                  marginBottom: 20
                }} className="no-print">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      ➕ Add Additional Service to Booking
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddService(false)}
                      style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 18 }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Configured Rate Presets from MySQL */}
                  {data?.available_services && data.available_services.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                        Quick Presets (Configured Database Rates):
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {data.available_services.map((preset, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handlePresetSelect(preset)}
                            className="btn sm ghost"
                            style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6 }}
                          >
                            {preset.name} (₹{preset.default_price})
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleAddService}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Service Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={serviceForm.service_name}
                          onChange={(e) => setServiceForm({ ...serviceForm, service_name: e.target.value })}
                          placeholder="e.g. Extra Bed, Laundry, Room Service"
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Service Date
                        </label>
                        <input
                          type="date"
                          value={serviceForm.service_date}
                          onChange={(e) => setServiceForm({ ...serviceForm, service_date: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Category
                        </label>
                        <select
                          value={serviceForm.category}
                          onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                        >
                          <option value="Food & Beverage">Food & Beverage</option>
                          <option value="Housekeeping">Housekeeping / Extra Bed</option>
                          <option value="Laundry">Laundry & Dry Clean</option>
                          <option value="Transportation">Transportation / Taxi</option>
                          <option value="Wellness">Spa & Wellness</option>
                          <option value="Mini Bar">Mini Bar</option>
                          <option value="Front Desk">Front Desk / Late Checkout</option>
                          <option value="Other">Other Incidental</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Quantity *
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          required
                          value={serviceForm.quantity}
                          onChange={(e) => setServiceForm({ ...serviceForm, quantity: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Unit Price (₹) *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={serviceForm.unit_price}
                          onChange={(e) => setServiceForm({ ...serviceForm, unit_price: e.target.value })}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                        Notes / Details (Optional)
                      </label>
                      <input
                        type="text"
                        value={serviceForm.notes}
                        onChange={(e) => setServiceForm({ ...serviceForm, notes: e.target.value })}
                        placeholder="e.g. 2 dinner platters delivered to room"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn sm ghost"
                        onClick={() => setShowAddService(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn sm"
                        disabled={submittingService}
                        style={{ background: '#0284C7', color: '#FFF' }}
                      >
                        {submittingService ? 'Adding...' : 'Add Service Charge'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Staff Form 2: Settle & Finalize Bill Panel */}
              {showSettle && (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 12,
                  border: '1.5px solid #16A34A',
                  padding: '20px',
                  marginBottom: 20
                }} className="no-print">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#0F172A' }}>
                      💳 Settle Payment & Finalize Invoice
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowSettle(false)}
                      style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 18 }}
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleFinalizeBill}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 12 }}>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Payment Method
                        </label>
                        <select
                          value={settleMethod}
                          onChange={(e) => setSettleMethod(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                        >
                          <option value="Razorpay">Razorpay (Online Gateway - Test Mode)</option>
                          <option value="UPI">UPI / QR Code</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Debit Card">Debit Card</option>
                          <option value="Cash">Cash at Counter</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Amount to Settle (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={settleAmount}
                          onChange={(e) => setSettleAmount(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Discount (₹, if any)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#334155', marginBottom: 4 }}>
                          Transaction Reference
                        </label>
                        <input
                          type="text"
                          value={txnRef}
                          onChange={(e) => setTxnRef(e.target.value)}
                          placeholder="e.g. UPI-REF-99213"
                          style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 12 }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                      <button
                        type="button"
                        className="btn sm ghost"
                        onClick={() => setShowSettle(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn sm"
                        disabled={submittingSettle}
                        style={{ background: '#16A34A', color: '#FFF' }}
                      >
                        {submittingSettle ? 'Recording...' : 'Record Payment & Mark Paid'}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '14px 24px',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF'
        }} className="no-print">
          <div>
            {!isPaid && !showSettle && (
              <button
                type="button"
                className="btn sm"
                onClick={() => setShowSettle(true)}
                style={{ background: '#16A34A', color: '#FFF' }}
              >
                💳 Settle Balance (₹{balanceDue.toFixed(2)})
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn sm ghost"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={handlePrint}
              style={{
                background: 'var(--teal, #0E7C7B)',
                color: '#FFFFFF',
                border: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontWeight: 600
              }}
              title="Print invoice"
            >
              🖨️ Print
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={handleDownloadPDF}
              style={{ background: '#0284C7', color: '#FFF' }}
            >
              📥 Download PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
