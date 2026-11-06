import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { useStore } from '../../context/StoreContext';
import { useRbac } from '../../context/RbacContext';
import { inr } from '../../utils/format';
import { api } from '../../services/api';
import PageHead from '../../components/PageHead';
import DataTable from '../../components/DataTable';
import { StatusBadge } from '../../components/Badge';
import SubNav from '../../components/SubNav';

const JOURNEY = [
  ['Booking confirmed', 'Reservation and payment details saved'],
  ['Check-in', 'Verify ID, assign room, record deposit'],
  ['During the stay', 'Extra charges, room service, room changes'],
  ['Check-out', 'Final bill, settle payment, release room'],
  ['Housekeeping', 'Room cleaned and marked ready'],
];

export default function FrontDesk() {
  const { bookings, setBookingStatus, notify, activeTenant, tenant, user } = useStore();
  const { canEdit, canApprove } = useRbac();
  const today = new Date().toISOString().slice(0, 10);

  const [qrUrl, setQrUrl] = useState('');
  const [qrDataUri, setQrDataUri] = useState('');
  const [showQr, setShowQr] = useState(true);

  const hotelCode = activeTenant?.code || tenant?.code || user?.tenant?.code || 'HOTEL-001';

  useEffect(() => {
    // 1. Configured production frontend domain (e.g. Vercel deployment URL)
    const configuredProdOrigin = (
      import.meta.env.VITE_FRONTEND_URL ||
      import.meta.env.VITE_PUBLIC_URL ||
      ''
    ).replace(/\/$/, '');

    // 2. Fetch network and hotel-scoped portal info from backend
    api(`/api/system/network-info?hotel=${encodeURIComponent(hotelCode)}`)
      .then((data) => {
        let portalUrl = data.guest_portal_url;
        // If production frontend origin is explicitly configured, ensure it is used
        if (configuredProdOrigin) {
          portalUrl = `${configuredProdOrigin}/guest-portal?hotel=${encodeURIComponent(hotelCode)}`;
        } else if (!portalUrl) {
          portalUrl = `${window.location.origin}/guest-portal?hotel=${encodeURIComponent(hotelCode)}`;
        }
        setQrUrl(portalUrl);
        return QRCode.toDataURL(portalUrl, {
          width: 260,
          margin: 2,
          color: { dark: '#13243a', light: '#ffffff' }
        });
      })
      .then(setQrDataUri)
      .catch(() => {
        const baseOrigin = configuredProdOrigin || window.location.origin;
        const fallbackUrl = `${baseOrigin}/guest-portal?hotel=${encodeURIComponent(hotelCode)}`;
        setQrUrl(fallbackUrl);
        QRCode.toDataURL(fallbackUrl, {
          width: 260,
          margin: 2,
          color: { dark: '#13243a', light: '#ffffff' }
        }).then(setQrDataUri).catch(() => {});
      });
  }, [hotelCode]);

  const handleCopyLink = () => {
    if (qrUrl) {
      navigator.clipboard.writeText(qrUrl);
      notify('Guest Portal URL copied to clipboard!');
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUri) return;
    const a = document.createElement('a');
    a.href = qrDataUri;
    a.download = 'stayflow-guest-checkin-checkout-qr.png';
    a.click();
    notify('QR Code image downloaded');
  };

  const arrivals = bookings.filter(
    (b) => ['Confirmed', 'Pending', 'Modified'].includes(b.st) && b.check_in === today
  );
  const departures = bookings.filter(
    (b) => b.st === 'Checked-in' || (b.check_out === today && b.st === 'Confirmed')
  );

  return (
    <>
      <PageHead title="Front desk" subtitle="Check guests in and out, assign rooms, and settle bills" />
      <SubNav parentPath="/front-desk" />

      {/* Guest Self-Service Check-In & Check-Out QR Code Panel */}
      <div className="panel" style={{ borderLeft: '4px solid var(--teal)', background: 'linear-gradient(to right, #FAFDFD, #FFFFFF)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showQr ? '16px' : '0' }}>
          <div>
            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', fontSize: '18px', fontWeight: 700, fontFamily: 'var(--head)' }}>
              <span>📱</span> Guest Express Check-In & Check-Out QR Portal
              <span className="badge" style={{ background: '#d7eeed', color: '#064E3B', fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Single QR Code
              </span>
            </h2>
            <div className="sub" style={{ margin: '4px 0 0', color: '#334155', fontSize: '13px', fontWeight: 500, lineHeight: '1.4' }}>
              One unified QR code for guest verification, ID registration, digital room keys, express check-out, and billing
            </div>
          </div>
          <button
            type="button"
            className="btn sm"
            onClick={() => setShowQr(!showQr)}
            style={{ minWidth: '90px' }}
          >
            {showQr ? 'Hide QR' : 'Show QR'}
          </button>
        </div>

        {showQr && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center', marginTop: '14px' }}>
            {qrDataUri ? (
              <div style={{ background: '#FFFFFF', padding: '12px', borderRadius: '14px', border: '1px solid var(--line)', boxShadow: '0 4px 14px rgba(0,0,0,0.08)', textAlign: 'center', width: '214px' }}>
                <div style={{ width: '190px', height: '94px', borderRadius: '8px', overflow: 'hidden', marginBottom: '10px', position: 'relative', border: '1px solid #E2E8F0' }}>
                  <img
                    src="/noire_hero.jpg"
                    alt="StayFlow Coastal Retreat"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <div style={{ position: 'absolute', bottom: 0, insetInline: 0, padding: '3px 8px', background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, textAlign: 'left' }}>
                    StayFlow Luxury Retreat
                  </div>
                </div>
                <img
                  src={qrDataUri}
                  alt="Guest Check-In / Check-Out QR Code"
                  style={{ width: '190px', height: '190px', display: 'block', borderRadius: '6px' }}
                />
                <div style={{ fontSize: '12px', color: '#475569', marginTop: '8px', fontWeight: 600 }}>
                  Scan with any mobile camera
                </div>
              </div>
            ) : (
              <div style={{ width: '214px', height: '214px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F1F5F9', borderRadius: '12px', color: '#475569', fontWeight: 600 }}>
                <span>Generating QR…</span>
              </div>
            )}

            <div style={{ flex: '1 1 320px' }}>
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#1E293B', marginBottom: '14px', fontWeight: 500 }}>
                Place this QR Code at the reception counter or in guest confirmation emails. Guests can scan it on any smartphone to:
              </div>
              <ul style={{ margin: '0 0 16px 20px', padding: 0, fontSize: '13px', lineHeight: '1.7', color: '#334155' }}>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#0F172A', fontWeight: 700 }}>Verify Booking:</strong> Securely matches Booking Ref ID, Full Name, and Phone Number.</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#0F172A', fontWeight: 700 }}>Self Check-In:</strong> Records actual check-in time, ID proof details, and allocates digital room key.</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#0F172A', fontWeight: 700 }}>Re-scan to Check-Out:</strong> Real-time stay charges calculation (nights, tax, payments) and instant payment settlement.</li>
                <li style={{ marginBottom: '6px' }}><strong style={{ color: '#0F172A', fontWeight: 700 }}>Official Tax Invoice:</strong> Download or print the finalized GST tax invoice with zero duplicate charges.</li>
              </ul>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '9px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', fontFamily: 'monospace' }}>
                <span style={{ color: '#475569', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Portal URL:</span>
                <strong style={{ color: '#0E7C7B', fontWeight: 700, wordBreak: 'break-all', fontSize: '13px' }}>{qrUrl || 'Loading…'}</strong>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <a
                  href={qrUrl || "/guest-portal"}
                  target="_blank"
                  rel="noreferrer"
                  className="btn sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                  title="Open Hotel Guest Portal"
                >
                  <span>🔗</span> Open Guest Portal
                </a>
                <button
                  type="button"
                  className="btn sm brass"
                  onClick={handleDownloadQr}
                  disabled={!qrDataUri}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>⬇️</span> Download QR (PNG)
                </button>
                <button
                  type="button"
                  className="btn sm"
                  onClick={handleCopyLink}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <span>📋</span> Copy Link
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="row r-2">
        <div className="panel">
          <h2>Today's arrivals</h2>
          <div className="sub">{arrivals.length} guests expected</div>
          <DataTable
            columns={['Guest', 'Room type', 'Payment', '']}
            rows={arrivals.map((b) => [
              b.guest, b.room, <StatusBadge status={b.pay} />,
              (canEdit('/front-desk') || canApprove('/front-desk')) ? (
                <button className="btn sm" onClick={() => { setBookingStatus(b.id, 'Checked-in'); notify(`${b.guest} checked in`); }}>Check in</button>
              ) : null,
            ])}
          />
        </div>
        <div className="panel">
          <h2>Today's departures</h2>
          <div className="sub">{departures.length} guests leaving</div>
          <DataTable
            columns={['Guest', 'Room type', 'Bill', '']}
            rows={departures.map((b) => [
              b.guest, b.room, inr(b.amt),
              (canEdit('/front-desk') || canApprove('/front-desk')) ? (
                <button className="btn sm brass" onClick={() => { setBookingStatus(b.id, 'Checked-out'); notify(`${b.guest} checked out`); }}>Check out</button>
              ) : null,
            ])}
          />
        </div>
      </div>
      <div className="panel">
        <h2>Guest journey</h2>
        <div className="sub">The standard front desk workflow</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12 }}>
          {JOURNEY.map(([title, text], i) => (
            <div key={title} style={{ borderLeft: `3px solid ${i === 1 ? 'var(--brass)' : 'var(--teal)'}`, padding: '2px 12px' }}>
              <b>{title}</b>
              <div className="muted">{text}</div>
            </div>
          ))}
        </div>
      </div>

    </>
  );
}
