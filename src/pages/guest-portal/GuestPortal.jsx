import { useState, useEffect, useRef } from 'react';
import { api, getApiBaseUrl } from '../../services/api';
import { loadRazorpayScript } from '../../utils/razorpay';
import '../../styles/GuestPortal.css';

export default function GuestPortal() {
  // Public Hotel Tenant Branding State
  const [hotelCode, setHotelCode] = useState('HOTEL-001');
  const [hotelInfo, setHotelInfo] = useState(null);
  const [hotelLoading, setHotelLoading] = useState(false);

  // Verification step state
  const [verifyForm, setVerifyForm] = useState({
    booking_reference: '',
    full_name: '',
    phone: '',
    email: ''
  });
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');

  // Razorpay Guest Payment state
  const [guestPayAmount, setGuestPayAmount] = useState('');
  const [guestPaying, setGuestPaying] = useState(false);
  const [guestPaySuccess, setGuestPaySuccess] = useState('');
  const [guestPayError, setGuestPayError] = useState('');

  // Two-Stage Booking Lookup & Verification state
  // Stage 1: Reference confirmation (ZERO PII returned)
  const [autoFetching, setAutoFetching] = useState(false);
  const [autoFetchSuccess, setAutoFetchSuccess] = useState(false);
  const [lookupMessage, setLookupMessage] = useState('');
  // Stage 2: Verified identity after registered phone check
  const [identityVerified, setIdentityVerified] = useState(false);
  const [fetchedBooking, setFetchedBooking] = useState(null);
  const latestLookupIdRef = useRef(0);
  const lastFetchedRefRef = useRef('');

  // Read URL query parameter (?hotel=... & ?ref=...) on load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlHotel = (
        params.get('hotel') ||
        params.get('tenant') ||
        params.get('code') ||
        sessionStorage.getItem('stayflow_guest_hotel') ||
        'HOTEL-001'
      ).trim();

      setHotelCode(urlHotel);
      sessionStorage.setItem('stayflow_guest_hotel', urlHotel);

      setHotelLoading(true);
      api(`/api/public/hotel/info?hotel=${encodeURIComponent(urlHotel)}`)
        .then((res) => {
          if (res?.hotel) {
            setHotelInfo(res.hotel);
          }
        })
        .catch((e) => console.warn('Could not load hotel info:', e))
        .finally(() => setHotelLoading(false));

      const urlRef = params.get('ref') || params.get('booking_reference') || params.get('id');
      if (urlRef) {
        setVerifyForm((prev) => ({
          ...prev,
          booking_reference: urlRef.toUpperCase().trim()
        }));
      }
    } catch (e) {
      console.warn('Could not parse URL query parameters:', e);
    }
  }, []);

  // Automatic Debounced Reference Lookup (Stage 1: Zero PII Disclosure)
  useEffect(() => {
    const rawRef = (verifyForm.booking_reference || '').trim().toUpperCase();

    // Reset when reference is empty or too short
    if (!rawRef || rawRef.length < 3) {
      setAutoFetching(false);
      setAutoFetchSuccess(false);
      setLookupMessage('');
      setFetchedBooking(null);
      setIdentityVerified(false);
      lastFetchedRefRef.current = '';
      return;
    }

    // Skip redundant lookup if this reference was already validated
    if (rawRef === lastFetchedRefRef.current) {
      return;
    }

    const currentLookupId = ++latestLookupIdRef.current;
    setAutoFetching(true);
    setVerifyError('');

    const timer = setTimeout(async () => {
      if (currentLookupId !== latestLookupIdRef.current) return;

      try {
        const res = await api(`/api/public/booking/lookup/${encodeURIComponent(rawRef)}?hotel=${encodeURIComponent(hotelCode)}`);
        if (currentLookupId !== latestLookupIdRef.current) return;

        lastFetchedRefRef.current = rawRef;
        setAutoFetchSuccess(true);
        setLookupMessage(res.message || `✓ Booking reference recognized! Please enter your registered phone number to verify and auto-fill your details.`);
        setVerifyError('');

        // SECURITY: Do NOT populate guest full_name, phone, or email here.
        // Sensitive PII is returned ONLY after identity verification with registered phone number.
      } catch (err) {
        if (currentLookupId !== latestLookupIdRef.current) return;
        setAutoFetchSuccess(false);
        setLookupMessage('');
        setFetchedBooking(null);
        setIdentityVerified(false);
        setVerifyError(err.message || `No booking found with Reference ID '${rawRef}' for this hotel. Please check your reference ID.`);
      } finally {
        if (currentLookupId === latestLookupIdRef.current) {
          setAutoFetching(false);
        }
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [verifyForm.booking_reference, hotelCode]);

  // Verified booking data & step control: 'verify' | 'selfie' | 'checkin' | 'checkout' | 'keycard' | 'invoice'
  const [viewStep, setViewStep] = useState('verify');
  const [bookingData, setBookingData] = useState(null);

  // Live Selfie Verification state
  const [selfieCaptured, setSelfieCaptured] = useState(null);
  const [selfieConfirmed, setSelfieConfirmed] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraStarting, setCameraStarting] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaStreamRef = useRef(null);

  // Check-In form state
  const [checkInForm, setCheckInForm] = useState({
    actual_check_in: '',
    id_proof_type: 'Aadhaar Card',
    id_proof_number: '',
    document_file_name: '',
    document_base64: ''
  });
  const [checkInSubmitting, setCheckInSubmitting] = useState(false);
  const [checkInError, setCheckInError] = useState('');
  const [checkInResult, setCheckInResult] = useState(null);

  // Check-Out form state
  const [checkOutForm, setCheckOutForm] = useState({
    actual_check_out: '',
    payment_method: 'UPI',
    notes: ''
  });
  const [checkOutSubmitting, setCheckOutSubmitting] = useState(false);
  const [checkOutError, setCheckOutError] = useState('');
  const [invoiceData, setInvoiceData] = useState(null);

  // Helper to format ISO datetime to local input "YYYY-MM-DDTHH:mm"
  const getCurrentLocalDateTimeString = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  const formatDisplayDateTime = (dtStr) => {
    if (!dtStr) return 'N/A';
    try {
      const d = new Date(dtStr);
      return d.toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return dtStr;
    }
  };

  const formatDisplayDate = (dStr) => {
    if (!dStr) return 'N/A';
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-IN', { dateStyle: 'medium' });
    } catch {
      return dStr;
    }
  };

  const formatCurrency = (val) => {
    const num = Number(val) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Callback ref to guarantee stream is attached to video element as soon as it mounts
  const setVideoRef = (node) => {
    videoRef.current = node;
    if (node && mediaStreamRef.current) {
      try {
        node.srcObject = mediaStreamRef.current;
        node.muted = true;
        node.playsInline = true;
        node.play().catch((err) => {
          console.warn('Video play error on ref attach:', err);
        });
      } catch (e) {
        console.warn('Error setting video srcObject:', e);
      }
    }
  };

  // 1. Camera Lifecycle Management
  const startCamera = async () => {
    setCameraStarting(true);
    setCameraError('');

    // Check if mediaDevices API exists in current browser environment
    if (!navigator || !navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraActive(false);
      setCameraStarting(false);
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        setCameraError(
          'Camera access is unavailable because this page is loaded over an insecure HTTP LAN IP. Modern browsers require a Secure Context (HTTPS or http://localhost) to enable camera access. For local camera testing, open http://localhost:5173/guest-portal, or use the photo upload option below.'
        );
      } else {
        setCameraError(
          'Your browser does not support camera access (getUserMedia API unavailable). Please use a modern browser (Chrome, Edge, Safari, Firefox) or use the photo upload option below.'
        );
      }
      return;
    }

    // Check browser camera permissions if Permissions API is supported
    if (navigator.permissions && navigator.permissions.query) {
      try {
        const perm = await navigator.permissions.query({ name: 'camera' });
        if (perm.state === 'denied') {
          setCameraActive(false);
          setCameraStarting(false);
          setCameraError(
            'Camera permission is blocked in your browser settings. Please click the camera/lock icon in your browser address bar to allow camera access, or use the photo upload option below.'
          );
          return;
        }
      } catch {
        // Permissions query for 'camera' is not supported in all browsers; proceed to getUserMedia
      }
    }

    try {
      // First attempt: Front-facing camera with exact constraint requested
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });
      } catch (constraintErr) {
        // If front-camera constraint fails or is overconstrained, fallback to any default video device
        if (
          constraintErr.name === 'OverconstrainedError' ||
          constraintErr.name === 'ConstraintNotSatisfiedError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } else {
          throw constraintErr;
        }
      }

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        await videoRef.current.play().catch((playErr) => {
          console.warn('Video play() warning:', playErr);
        });
      }

      setCameraActive(true);
      setCameraError('');
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraActive(false);

      // Separate error handling as requested
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError(
          'Camera permission was denied. Please allow camera access in your browser settings (look for the lock/camera icon in your address bar), or use the photo upload option below.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError(
          'No camera device detected on your system. Please connect a webcam or use the photo upload option below.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraError(
          'Camera is currently in use by another application or browser tab. Please close other camera apps and click "Try Camera Again", or use the photo upload option below.'
        );
      } else if (err.name === 'SecurityError') {
        setCameraError(
          'Camera access was blocked due to browser security restrictions. Camera requires a Secure Context (HTTPS or http://localhost). Please use the photo upload option below.'
        );
      } else {
        setCameraError(
          `Camera access error (${err.name || 'Error'}): ${err.message || 'Unable to open camera.'} You can use the photo upload option below.`
        );
      }
    } finally {
      setCameraStarting(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.srcObject = null;
      } catch {}
    }
    setCameraActive(false);
  };

  // Clean up camera on unmount or view change
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // When step switches to 'selfie', start camera automatically if no selfie captured yet
  useEffect(() => {
    if (viewStep === 'selfie' && !selfieCaptured) {
      startCamera();
    } else if (viewStep !== 'selfie') {
      stopCamera();
    }
  }, [viewStep, selfieCaptured]);

  // Capture Live Snapshot from Video Stream
  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (width === 0 || height === 0) {
      console.warn('Video stream not ready yet for snapshot');
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Flip horizontally to save selfie natural to user view (mirror)
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    const dataUri = canvas.toDataURL('image/jpeg', 0.88);
    setSelfieCaptured(dataUri);
    stopCamera();
  };

  // Retake selfie
  const handleRetakeSelfie = () => {
    setSelfieCaptured(null);
    setSelfieConfirmed(false);
    startCamera();
  };

  // Confirm selfie and move to check-in form
  const handleConfirmSelfie = () => {
    if (!selfieCaptured) return;
    setSelfieConfirmed(true);
    setViewStep('checkin');
  };

  // Fallback Upload from File
  const handleSelfieFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setCameraError('Selfie image file is too large (>8MB). Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelfieCaptured(reader.result);
      setCameraError('');
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // 2. Handle Verification Input Changes
  const handleVerifyChange = (e) => {
    const { name, value } = e.target;
    setVerifyForm((prev) => ({
      ...prev,
      [name]: name === 'booking_reference' ? value.toUpperCase().trim() : value
    }));
    if (name === 'booking_reference') {
      setIdentityVerified(false);
      setFetchedBooking(null);
    }
    if (verifyError) setVerifyError('');
  };

  const handleClearVerifyForm = () => {
    setVerifyForm({ booking_reference: '', full_name: '', phone: '', email: '' });
    setFetchedBooking(null);
    setBookingData(null);
    setAutoFetchSuccess(false);
    setAutoFetching(false);
    setLookupMessage('');
    setIdentityVerified(false);
    setVerifyError('');
    lastFetchedRefRef.current = '';
    latestLookupIdRef.current++;
  };

  // 3. Verify Identity via Registered Phone Number & Auto-Fill Details
  const verifyGuestIdentity = async (phoneOverride) => {
    const rawRef = (verifyForm.booking_reference || '').trim().toUpperCase();
    const phoneInput = (phoneOverride !== undefined ? phoneOverride : verifyForm.phone || '').trim();
    const cleanDigits = phoneInput.replace(/\D/g, '');

    if (!rawRef || rawRef.length < 3) {
      setVerifyError('Please enter your Booking Reference ID first.');
      return null;
    }
    if (cleanDigits.length < 7) {
      setVerifyError('Please enter your Registered Phone Number (at least 7 digits) to verify your reservation.');
      return null;
    }

    setVerifying(true);
    setVerifyError('');

    try {
      const res = await api('/api/public/booking/verify', {
        method: 'POST',
        body: JSON.stringify({
          booking_reference: rawRef,
          phone: phoneInput,
          full_name: verifyForm.full_name.trim() || undefined,
          hotel: hotelCode
        })
      });

      if (!res || !res.verified) {
        throw new Error(res?.message || 'Verification failed. Please check your registered phone number.');
      }

      setBookingData(res);
      setFetchedBooking(res);
      setIdentityVerified(true);
      setVerifyError('');

      // Auto-populate guest details NOW that phone verification has succeeded!
      setVerifyForm((prev) => ({
        ...prev,
        full_name: res.guest?.full_name || prev.full_name || '',
        phone: res.guest?.phone || prev.phone || phoneInput,
        email: res.guest?.email || prev.email || '' // If email is empty, allows manual entry!
      }));

      if (res.selfie_url) {
        setSelfieCaptured(res.selfie_url);
        setSelfieConfirmed(true);
      }
      return res;
    } catch (err) {
      setIdentityVerified(false);
      setVerifyError(err.message || 'The registered phone number does not match this booking reservation.');
      return null;
    } finally {
      setVerifying(false);
    }
  };

  // 4. Submit Verification and Proceed to Next Step
  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verifyForm.booking_reference) {
      setVerifyError('Please enter your Booking Reference ID (e.g. BK-...).');
      return;
    }
    if (!verifyForm.phone.trim()) {
      setVerifyError('Please enter your Registered Phone Number to verify your identity.');
      return;
    }

    let activeData = bookingData;
    if (!identityVerified || !activeData) {
      activeData = await verifyGuestIdentity();
      if (!activeData) return;
    }

    const status = (activeData.booking?.status || '').toLowerCase();

    if (status === 'checked-in' || status === 'checked in') {
      // Guest is already checked in -> proceed to Check-Out & Billing view
      setCheckOutForm((prev) => ({
        ...prev,
        actual_check_out: getCurrentLocalDateTimeString(),
        payment_method: 'UPI'
      }));
      setViewStep('checkout');
    } else if (status === 'checked-out' || status === 'checked out') {
      // Already completed checkout -> show final invoice
      if (activeData.invoice) {
        setInvoiceData(activeData.invoice);
      } else {
        try {
          const inv = await api(`/api/public/booking/invoice/${activeData.booking.reference}?hotel=${encodeURIComponent(hotelCode)}`);
          setInvoiceData(inv);
        } catch {
          setInvoiceData({
            invoice_number: `INV-${activeData.booking.reference}`,
            created_at: new Date().toISOString(),
            guest: activeData.guest,
            booking: activeData.booking,
            room: activeData.room,
            billing: activeData.billing,
            is_paid: true
          });
        }
      }
      setViewStep('invoice');
    } else {
      // Pending or Confirmed -> proceed to Selfie Verification first
      setCheckInForm((prev) => ({
        ...prev,
        actual_check_in: getCurrentLocalDateTimeString(),
        id_proof_type: activeData.guest?.id_proof_type || 'Aadhaar Card',
        id_proof_number: activeData.guest?.id_proof_number || ''
      }));
      setViewStep('selfie');
    }
  };

  // 4. Handle Document File Upload in Check-In
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setCheckInError('File size exceeds 8MB limit. Please upload a smaller image/PDF.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCheckInForm((prev) => ({
        ...prev,
        document_file_name: file.name,
        document_base64: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  // 5. Submit Check-In
  const handleCheckInSubmit = async (e) => {
    e.preventDefault();
    if (!checkInForm.id_proof_number.trim()) {
      setCheckInError('Please provide a valid ID Proof Number for security registration.');
      return;
    }

    setCheckInSubmitting(true);
    setCheckInError('');

    try {
      const payload = {
        booking_reference: bookingData.booking.reference,
        full_name: verifyForm.full_name.trim(),
        phone: verifyForm.phone.trim(),
        actual_check_in: checkInForm.actual_check_in || getCurrentLocalDateTimeString(),
        id_proof_type: checkInForm.id_proof_type,
        id_proof_number: checkInForm.id_proof_number.trim(),
        selfie_image: selfieCaptured || undefined,
        id_document: checkInForm.document_base64 || checkInForm.document_file_name || undefined,
        hotel: hotelCode
      };

      const res = await api('/api/public/booking/check-in', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setCheckInResult(res);
      setViewStep('keycard');
    } catch (err) {
      setCheckInError(err.message || 'Check-in failed. Please contact the front desk.');
    } finally {
      setCheckInSubmitting(false);
    }
  };

  // Razorpay Public Guest Payment Handler (Test Mode)
  const handleGuestRazorpayPayment = async (customAmt = null) => {
    const booking = fetchedBooking || bookingData;
    if (!booking?.booking?.reference) {
      setGuestPayError('No active booking reference found.');
      return;
    }
    const balanceDue = Number(booking.billing?.balance_due || booking.billing?.outstanding_balance || 0);
    const payAmt = Number(customAmt !== null && customAmt !== undefined ? customAmt : (guestPayAmount || balanceDue));

    if (!payAmt || payAmt <= 0) {
      setGuestPayError('Please enter a valid payment amount greater than zero.');
      return;
    }
    if (payAmt > balanceDue && balanceDue > 0) {
      setGuestPayError(`Payment amount (₹${payAmt.toFixed(2)}) cannot exceed outstanding balance (₹${balanceDue.toFixed(2)}).`);
      return;
    }

    setGuestPaying(true);
    setGuestPayError('');
    setGuestPaySuccess('');

    try {
      const orderRes = await api('/api/public/payments/razorpay/create-order', {
        method: 'POST',
        body: JSON.stringify({
          booking_reference: booking.booking.reference,
          hotel: hotelCode,
          amount: payAmt,
          phone: verifyForm.phone || undefined
        })
      });

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error('Unable to load Razorpay payment gateway SDK. Please check your internet connection.');
      }

      const options = {
        key: orderRes.key_id,
        amount: orderRes.amount,
        currency: orderRes.currency || 'INR',
        name: orderRes.hotel_name || hotelInfo?.name || 'StayFlow Hotel',
        description: `Booking #${orderRes.booking_reference} - Guest Settlement`,
        order_id: orderRes.order_id,
        prefill: {
          name: orderRes.guest_name || verifyForm.full_name || 'Guest',
          email: orderRes.guest_email || verifyForm.email || '',
          contact: orderRes.guest_phone || verifyForm.phone || ''
        },
        theme: { color: '#0F172A' },
        handler: async function (response) {
          try {
            const verifyRes = await api('/api/public/payments/razorpay/verify', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                booking_reference: booking.booking.reference,
                hotel: hotelCode
              })
            });

            setGuestPaySuccess(`✓ Payment of ₹${verifyRes.amount.toFixed(2)} captured successfully! (Ref: ${verifyRes.transaction_id})`);

            // Live update fetchedBooking billing state
            if (verifyRes.invoice) {
              setFetchedBooking(prev => prev ? ({
                ...prev,
                billing: {
                  ...prev.billing,
                  amount_paid: verifyRes.invoice.amount_paid,
                  balance_due: verifyRes.invoice.balance_due,
                  payment_status: verifyRes.invoice.payment_status,
                  outstanding_balance: verifyRes.invoice.balance_due
                }
              }) : prev);

              if (bookingData) {
                setBookingData(prev => prev ? ({
                  ...prev,
                  billing: {
                    ...prev.billing,
                    amount_paid: verifyRes.invoice.amount_paid,
                    balance_due: verifyRes.invoice.balance_due,
                    payment_status: verifyRes.invoice.payment_status,
                    outstanding_balance: verifyRes.invoice.balance_due
                  }
                }) : prev);
              }
            }
          } catch (vErr) {
            setGuestPayError(`Payment verification failed: ${vErr.message}`);
          } finally {
            setGuestPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setGuestPaying(false);
            api('/api/public/payments/razorpay/failed', {
              method: 'POST',
              body: JSON.stringify({
                razorpay_order_id: orderRes.order_id,
                error_description: 'Guest cancelled or dismissed checkout window'
              })
            }).then(() => {
              fetchBookingDetails();
            }).catch(() => {});
            setGuestPayError('Payment checkout window was cancelled. No charges were deducted.');
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (resp) {
        setGuestPaying(false);
        api('/api/public/payments/razorpay/failed', {
          method: 'POST',
          body: JSON.stringify({
            razorpay_order_id: orderRes.order_id,
            error_code: resp?.error?.code,
            error_description: resp?.error?.description
          })
        }).catch(() => {});
        setGuestPayError(`Payment declined: ${resp?.error?.description || 'Transaction failed'}`);
      });
      rzp.open();
    } catch (err) {
      setGuestPayError(err.message || 'Failed to initiate Razorpay payment');
      setGuestPaying(false);
    }
  };

  // 6. Submit Check-Out & Billing Settlement
  const handleCheckOutSubmit = async (e) => {
    e.preventDefault();
    setCheckOutSubmitting(true);
    setCheckOutError('');

    try {
      if (checkOutForm.payment_method === 'Razorpay' && (bookingData.billing?.outstanding_balance > 0 || bookingData.billing?.balance_due > 0)) {
        await handleGuestRazorpayPayment(bookingData.billing?.outstanding_balance || bookingData.billing?.balance_due);
        return;
      }

      const payload = {
        booking_reference: bookingData.booking.reference,
        full_name: verifyForm.full_name.trim(),
        phone: verifyForm.phone.trim(),
        actual_check_out: checkOutForm.actual_check_out || getCurrentLocalDateTimeString(),
        payment_method: checkOutForm.payment_method || 'UPI',
        settle_balance: true,
        hotel: hotelCode
      };

      const res = await api('/api/public/booking/check-out', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setInvoiceData(res.invoice);
      setViewStep('invoice');
    } catch (err) {
      setCheckOutError(err.message || 'Check-out settlement failed. Please try again.');
    } finally {
      setCheckOutSubmitting(false);
    }
  };

  // Reset to initial verification view
  const handleReset = () => {
    stopCamera();
    setVerifyForm({ booking_reference: '', full_name: '', phone: '', email: '' });
    setVerifyError('');
    setBookingData(null);
    setFetchedBooking(null);
    setLookupMessage('');
    setAutoFetchSuccess(false);
    setIdentityVerified(false);
    setSelfieCaptured(null);
    setSelfieConfirmed(false);
    setCheckInResult(null);
    setInvoiceData(null);
    setViewStep('verify');
  };

  return (
    <div className="gp-root">
      <div className="gp-container">
        {/* Brand Header with Landing Page Hero Image */}
        <header
          className="gp-brand-header"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(15,23,42,0.65) 0%, rgba(15,23,42,0.92) 100%), url('/noire_hero.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center 35%',
            borderRadius: '16px',
            padding: '36px 20px',
            marginBottom: '26px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            border: '1px solid rgba(255,255,255,0.12)'
          }}
        >
          <div className="gp-crest">SF</div>
          <h1 className="gp-hotel-name" style={{ color: '#FFFFFF', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            {hotelInfo?.name || 'StayFlow Luxury Suites & Resorts'}
          </h1>
          <p className="gp-portal-subtitle" style={{ color: '#E2E8F0', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>
            {hotelInfo?.city ? `${hotelInfo.city} • ` : ''}Digital Guest Express Check-In & Check-Out Portal
          </p>
        </header>

        {/* ── STEP 1: VERIFICATION SCREEN ── */}
        {viewStep === 'verify' && (
          <div className="gp-card">
            <div className="gp-card-header">
              <h2 className="gp-card-title">
                <span>🔐</span> Guest Verification & Auto-Fill
              </h2>
              <p className="gp-card-desc">
                Enter your Booking Reference ID and Registered Phone Number to securely verify your identity and auto-fill your stay details.
              </p>
            </div>

            <form className="gp-form" onSubmit={handleVerifySubmit} noValidate>
              {verifyError && (
                <div className="gp-alert gp-alert-error" role="alert">
                  <span>⚠️</span>
                  <span>{verifyError}</span>
                </div>
              )}

              <div className="gp-field">
                <label className="gp-label" htmlFor="booking_reference">
                  <span>Booking Reference ID <span className="gp-required-star">*</span></span>
                  <small style={{ color: 'var(--gp-slate)', fontWeight: 400 }}>e.g. BK-77A1B2C3</small>
                </label>
                <div className="gp-input-wrapper">
                  <span className="gp-input-icon">🔖</span>
                  <input
                    id="booking_reference"
                    name="booking_reference"
                    type="text"
                    className="gp-input"
                    placeholder="Enter Booking Reference ID (e.g. BK-3BA62FF4)"
                    value={verifyForm.booking_reference}
                    onChange={handleVerifyChange}
                    required
                    autoFocus
                  />
                </div>
                {autoFetching && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gp-primary)', marginTop: 6 }}>
                    <div className="gp-spinner" style={{ width: 14, height: 14, borderTopColor: 'var(--gp-primary)', borderColor: 'rgba(14,124,123,0.2)' }} />
                    <span>Validating booking reference with hotel records…</span>
                  </div>
                )}
                {autoFetchSuccess && lookupMessage && !identityVerified && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gp-primary)', fontWeight: 600, marginTop: 6 }}>
                    <span>ℹ️</span>
                    <span>{lookupMessage}</span>
                  </div>
                )}
              </div>

              {/* Verified Booking & Stay Summary Cardlet (ONLY shown after successful identity verification) */}
              {identityVerified && fetchedBooking && (
                <div
                  className="gp-res-banner"
                  style={{
                    background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
                    border: '1px solid #CBD5E1',
                    borderRadius: 12,
                    padding: '16px 18px',
                    margin: '12px 0 20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #E2E8F0', paddingBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 18 }}>🏨</span>
                      <strong style={{ fontSize: 15, color: 'var(--gp-navy)' }}>{fetchedBooking.room?.type_name || 'Standard'}</strong>
                      {fetchedBooking.room?.number && (
                        <span style={{ background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                          Room {fetchedBooking.room.number}
                        </span>
                      )}
                    </div>
                    <span className={`gp-badge ${fetchedBooking.booking?.status === 'Checked-in' ? 'gp-badge-green' : fetchedBooking.booking?.status === 'Checked-out' ? 'gp-badge-blue' : 'gp-badge-yellow'}`}>
                      ● {fetchedBooking.booking?.status}
                    </span>
                  </div>

                  <div className="gp-res-grid">
                    <div className="gp-res-cell">
                      <label>Guest Name</label>
                      <span style={{ color: 'var(--gp-navy)', fontWeight: 600 }}>{fetchedBooking.guest?.full_name || '—'}</span>
                    </div>
                    <div className="gp-res-cell">
                      <label>Stay Dates</label>
                      <span>{formatDisplayDate(fetchedBooking.stay?.check_in)} – {formatDisplayDate(fetchedBooking.stay?.check_out)}</span>
                    </div>
                    <div className="gp-res-cell">
                      <label>Stay Duration</label>
                      <span>{fetchedBooking.stay?.nights} Night{fetchedBooking.stay?.nights > 1 ? 's' : ''}</span>
                    </div>
                    <div className="gp-res-cell">
                      <label>Total Charges</label>
                      <span style={{ color: 'var(--gp-primary)', fontWeight: 700 }}>{formatCurrency(fetchedBooking.billing?.total_bill)}</span>
                    </div>
                    <div className="gp-res-cell">
                      <label>Payment Status</label>
                      <span style={{ color: fetchedBooking.billing?.balance_due <= 0 ? 'var(--gp-success)' : 'var(--gp-warning)', fontWeight: 700 }}>
                        {fetchedBooking.billing?.payment_status}
                      </span>
                    </div>
                  </div>

                  {/* Online Payment Card (Razorpay TEST MODE) */}
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>💳</span>
                        <strong style={{ fontSize: 14, color: 'var(--gp-navy)' }}>Online Payment (Razorpay Test Mode)</strong>
                      </div>
                      <span style={{ fontSize: 11, background: '#EFF6FF', color: '#1D4ED8', padding: '2px 8px', borderRadius: 999, fontWeight: 700 }}>
                        TEST MODE ACTIVE
                      </span>
                    </div>

                    {guestPaySuccess && (
                      <div style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
                        {guestPaySuccess}
                      </div>
                    )}
                    {guestPayError && (
                      <div style={{ background: '#FEF2F2', border: '1px solid #EF4444', color: '#991B1B', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 10 }}>
                        ⚠️ {guestPayError}
                      </div>
                    )}

                    {fetchedBooking.billing?.balance_due > 0 ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8, color: '#475569' }}>
                          <span>Outstanding Balance Due:</span>
                          <strong style={{ color: '#B91C1C', fontSize: 14 }}>{formatCurrency(fetchedBooking.billing.balance_due)}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                          <div style={{ position: 'relative', width: 140 }}>
                            <span style={{ position: 'absolute', left: 8, top: 9, color: '#64748B', fontSize: 12 }}>₹</span>
                            <input
                              type="number"
                              step="0.01"
                              min="1"
                              max={fetchedBooking.billing.balance_due}
                              style={{ width: '100%', padding: '7px 8px 7px 20px', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: 13, fontWeight: 600 }}
                              value={guestPayAmount !== '' ? guestPayAmount : (fetchedBooking.billing.balance_due || '')}
                              onChange={(e) => setGuestPayAmount(e.target.value)}
                              placeholder="Amount (₹)"
                            />
                          </div>
                          <button
                            type="button"
                            className="gp-btn gp-btn-gold"
                            style={{ padding: '8px 18px', fontSize: 13, height: 36, whiteSpace: 'nowrap' }}
                            onClick={() => handleGuestRazorpayPayment()}
                            disabled={guestPaying}
                          >
                            {guestPaying ? 'Connecting to Razorpay…' : `Pay ₹${guestPayAmount || fetchedBooking.billing.balance_due} Now`}
                          </button>
                        </div>
                        <small style={{ display: 'block', marginTop: 6, fontSize: 11, color: '#64748B' }}>
                          Supports full payment, partial payment, and balance settlement in Razorpay Test Mode.
                        </small>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#059669', fontSize: 13, fontWeight: 600 }}>
                        <span>✓</span>
                        <span>This booking is fully paid! No outstanding balance due.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="gp-field">
                <label className="gp-label" htmlFor="phone">
                  <span>Registered Phone Number <span className="gp-required-star">*</span></span>
                  {identityVerified ? (
                    <small style={{ color: 'var(--gp-success)', fontWeight: 600 }}>✓ Identity verified</small>
                  ) : autoFetchSuccess ? (
                    <small style={{ color: 'var(--gp-primary)', fontWeight: 600 }}>Enter phone to verify & auto-fill</small>
                  ) : null}
                </label>
                <div className="gp-input-wrapper" style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <span className="gp-input-icon">📞</span>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      className="gp-input"
                      placeholder="Enter Registered Phone Number"
                      value={verifyForm.phone}
                      onChange={handleVerifyChange}
                      onBlur={() => {
                        if (!identityVerified && autoFetchSuccess && verifyForm.phone.replace(/\D/g, '').length >= 7) {
                          verifyGuestIdentity(verifyForm.phone);
                        }
                      }}
                      required
                    />
                  </div>
                  {autoFetchSuccess && !identityVerified && (
                    <button
                      type="button"
                      className="gp-btn gp-btn-secondary"
                      style={{ padding: '0 14px', whiteSpace: 'nowrap', height: '46px', fontSize: '13px' }}
                      onClick={() => verifyGuestIdentity(verifyForm.phone)}
                      disabled={verifying || verifyForm.phone.replace(/\D/g, '').length < 7}
                    >
                      {verifying ? 'Verifying…' : 'Verify Phone'}
                    </button>
                  )}
                </div>
                {identityVerified && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--gp-success)', fontWeight: 600, marginTop: 6 }}>
                    <span>✓</span>
                    <span>Identity verified! Personal details auto-filled below.</span>
                  </div>
                )}
              </div>

              <div className="gp-field">
                <label className="gp-label" htmlFor="full_name">
                  <span>Primary Guest Full Name <span className="gp-required-star">*</span></span>
                  {identityVerified && verifyForm.full_name && (
                    <small style={{ color: 'var(--gp-success)', fontWeight: 600 }}>✓ Auto-populated after verification</small>
                  )}
                </label>
                <div className="gp-input-wrapper">
                  <span className="gp-input-icon">👤</span>
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    className="gp-input"
                    placeholder="Guest Full Name (auto-fills after phone verification)"
                    value={verifyForm.full_name}
                    onChange={handleVerifyChange}
                    required
                  />
                </div>
              </div>

              <div className="gp-field">
                <label className="gp-label" htmlFor="email">
                  <span>Email Address</span>
                  {identityVerified && verifyForm.email ? (
                    <small style={{ color: 'var(--gp-success)', fontWeight: 600 }}>✓ Auto-populated</small>
                  ) : identityVerified && !verifyForm.email ? (
                    <small style={{ color: 'var(--gp-slate)', fontWeight: 500 }}>Optional — enter manually to receive confirmation</small>
                  ) : null}
                </label>
                <div className="gp-input-wrapper">
                  <span className="gp-input-icon">✉️</span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="gp-input"
                    placeholder="e.g. guest@example.com (optional)"
                    value={verifyForm.email || ''}
                    onChange={handleVerifyChange}
                  />
                </div>
              </div>

              <div className="gp-actions">
                <button
                  type="button"
                  className="gp-btn gp-btn-secondary"
                  onClick={handleClearVerifyForm}
                  disabled={verifying}
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="gp-btn gp-btn-primary"
                  disabled={verifying || autoFetching}
                >
                  {verifying ? (
                    <>
                      <div className="gp-spinner" />
                      <span>Verifying Identity with Hotel…</span>
                    </>
                  ) : !identityVerified ? (
                    <>
                      <span>Verify Phone & Auto-Fill</span>
                      <span>🔒</span>
                    </>
                  ) : fetchedBooking?.booking?.status === 'Checked-in' ? (
                    <>
                      <span>Proceed to Check-Out & Settle Bill</span>
                      <span>→</span>
                    </>
                  ) : fetchedBooking?.booking?.status === 'Checked-out' ? (
                    <>
                      <span>View Official Invoice & Stay Summary</span>
                      <span>→</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Proceed to Check-In</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 2: LIVE SELFIE CAPTURE & VERIFICATION ── */}
        {viewStep === 'selfie' && bookingData && (
          <div className="gp-card">
            <div className="gp-card-header">
              <h2 className="gp-card-title">
                <span>📸</span> Live Guest Selfie Verification
              </h2>
              <p className="gp-card-desc">
                Welcome, <strong>{bookingData.guest.full_name}</strong>! Please capture a live selfie facing your front camera for contactless verification and digital key issuance.
              </p>
            </div>

            <div className="gp-form">
              {cameraError && (
                <div className="gp-alert gp-alert-error" role="alert" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span>⚠️</span>
                    <span>{cameraError}</span>
                  </div>
                  {!selfieCaptured && (
                    <button
                      type="button"
                      className="gp-btn gp-btn-secondary"
                      style={{ height: '34px', fontSize: '12px', alignSelf: 'flex-start', marginTop: '4px' }}
                      onClick={startCamera}
                    >
                      🔄 Try Camera Again
                    </button>
                  )}
                </div>
              )}

              <div className="gp-selfie-container">
                {/* Camera / Captured Preview Box */}
                <div className="gp-camera-view">
                  {selfieCaptured ? (
                    <img
                      src={selfieCaptured}
                      alt="Guest Selfie Preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <>
                      <video
                        ref={setVideoRef}
                        className="gp-camera-video"
                        playsInline
                        muted
                        autoPlay
                      />
                      <div className="gp-face-guide" />
                      <div className="gp-face-guide-text">
                        Position your face inside the frame
                      </div>
                    </>
                  )}
                </div>

                {/* Hidden canvas for snapshot rasterization */}
                <canvas ref={canvasRef} className="gp-camera-canvas" />

                {/* Shutter / Retake Controls */}
                <div className="gp-shutter-bar">
                  {!selfieCaptured ? (
                    <button
                      type="button"
                      className="gp-shutter-btn"
                      onClick={handleCaptureSnapshot}
                      title="Capture Live Selfie"
                      disabled={cameraStarting}
                    >
                      📸
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="gp-btn gp-btn-secondary"
                        onClick={handleRetakeSelfie}
                      >
                        <span>🔄</span> Retake Selfie
                      </button>
                      <button
                        type="button"
                        className="gp-btn gp-btn-gold"
                        onClick={handleConfirmSelfie}
                      >
                        <span>✓</span> Confirm & Continue
                      </button>
                    </div>
                  )}
                </div>

                {/* File Upload Fallback Option */}
                <div style={{ marginTop: '20px', textAlign: 'center', width: '100%' }}>
                  <label
                    htmlFor="selfie_file_input"
                    style={{
                      cursor: 'pointer',
                      fontSize: '13px',
                      color: 'var(--gp-primary)',
                      fontWeight: 600,
                      textDecoration: 'underline'
                    }}
                  >
                    📁 Camera unavailable? Click here to upload a photo
                  </label>
                  <input
                    id="selfie_file_input"
                    type="file"
                    accept="image/*"
                    capture="user"
                    style={{ display: 'none' }}
                    onChange={handleSelfieFileUpload}
                  />
                </div>
              </div>

              <div className="gp-actions">
                <button
                  type="button"
                  className="gp-btn gp-btn-secondary"
                  onClick={() => {
                    stopCamera();
                    setViewStep('verify');
                  }}
                >
                  ← Back to Verification
                </button>
                {selfieCaptured && (
                  <button
                    type="button"
                    className="gp-btn gp-btn-primary"
                    onClick={handleConfirmSelfie}
                  >
                    <span>Proceed to Check-In Form</span>
                    <span>→</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 3: CHECK-IN FORM ── */}
        {viewStep === 'checkin' && bookingData && (
          <div className="gp-card">
            <div className="gp-card-header">
              <h2 className="gp-card-title">
                <span>🛎️</span> Express Digital Check-In
              </h2>
              <p className="gp-card-desc">
                Welcome, <strong>{bookingData.guest.full_name}</strong>! Verify your stay information, confirmed selfie, and government ID proof to receive your digital room access.
              </p>
            </div>

            <div className="gp-form">
              {checkInError && (
                <div className="gp-alert gp-alert-error" role="alert">
                  <span>⚠️</span>
                  <span>{checkInError}</span>
                </div>
              )}

              {/* Confirmed Selfie Showcase */}
              {selfieCaptured && (
                <div className="gp-selfie-confirmed-box">
                  <img
                    src={selfieCaptured}
                    alt="Verified Guest Selfie"
                    className="gp-selfie-avatar"
                  />
                  <div className="gp-selfie-badge">
                    <span>✓</span> Live Selfie Verified
                  </div>
                  <button
                    type="button"
                    className="gp-btn gp-btn-secondary"
                    style={{ height: '32px', fontSize: '11px', marginTop: '8px', padding: '0 12px' }}
                    onClick={() => setViewStep('selfie')}
                  >
                    Change Selfie
                  </button>
                </div>
              )}

              {/* Reservation summary banner */}
              <div className="gp-res-banner">
                <div className="gp-res-grid">
                  <div className="gp-res-cell">
                    <label>Booking Ref</label>
                    <span>{bookingData.booking.reference}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Room Assigned</label>
                    <span style={{ color: 'var(--gp-primary)', fontSize: '15px' }}>
                      Room {bookingData.room.number}
                    </span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Room Category</label>
                    <span>{bookingData.room.type_name}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Check-In Date</label>
                    <span>{formatDisplayDate(bookingData.booking.check_in)}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Check-Out Date</label>
                    <span>{formatDisplayDate(bookingData.booking.check_out)}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Status</label>
                    <span className="gp-badge gp-badge-yellow">{bookingData.booking.status}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCheckInSubmit} noValidate>
                <div className="gp-field">
                  <label className="gp-label" htmlFor="actual_check_in">
                    <span>Actual Check-in Date & Time <span className="gp-required-star">*</span></span>
                    <small style={{ color: 'var(--gp-slate)' }}>Timestamp recorded in MySQL</small>
                  </label>
                  <div className="gp-input-wrapper">
                    <span className="gp-input-icon">🕒</span>
                    <input
                      id="actual_check_in"
                      type="datetime-local"
                      className="gp-input"
                      value={checkInForm.actual_check_in}
                      onChange={(e) => setCheckInForm(prev => ({ ...prev, actual_check_in: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="gp-field">
                  <label className="gp-label" htmlFor="id_proof_type">
                    <span>Government ID Proof Type <span className="gp-required-star">*</span></span>
                  </label>
                  <div className="gp-input-wrapper">
                    <span className="gp-input-icon">🪪</span>
                    <select
                      id="id_proof_type"
                      className="gp-select"
                      value={checkInForm.id_proof_type}
                      onChange={(e) => setCheckInForm(prev => ({ ...prev, id_proof_type: e.target.value }))}
                      required
                    >
                      <option value="Aadhaar Card">Aadhaar Card / National ID</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Other Govt ID">Other Government ID</option>
                    </select>
                  </div>
                </div>

                <div className="gp-field">
                  <label className="gp-label" htmlFor="id_proof_number">
                    <span>ID Proof Number <span className="gp-required-star">*</span></span>
                  </label>
                  <div className="gp-input-wrapper">
                    <span className="gp-input-icon">🔢</span>
                    <input
                      id="id_proof_number"
                      type="text"
                      className="gp-input"
                      placeholder="e.g. 5678-1234-9012 or Passport Number"
                      value={checkInForm.id_proof_number}
                      onChange={(e) => setCheckInForm(prev => ({ ...prev, id_proof_number: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="gp-field">
                  <label className="gp-label" htmlFor="doc_upload">
                    <span>Upload ID Document Photo/PDF (Optional)</span>
                    {checkInForm.document_file_name && (
                      <span style={{ color: 'var(--gp-success)', fontWeight: 600 }}>
                        ✓ {checkInForm.document_file_name}
                      </span>
                    )}
                  </label>
                  <div className="gp-input-wrapper">
                    <span className="gp-input-icon">📎</span>
                    <input
                      id="doc_upload"
                      type="file"
                      accept="image/*,.pdf"
                      className="gp-input"
                      style={{ paddingLeft: '44px', paddingTop: '10px' }}
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>

                <div className="gp-actions">
                  <button
                    type="button"
                    className="gp-btn gp-btn-secondary"
                    onClick={() => setViewStep('selfie')}
                    disabled={checkInSubmitting}
                  >
                    ← Back to Selfie
                  </button>
                  <button
                    type="submit"
                    className="gp-btn gp-btn-primary"
                    disabled={checkInSubmitting}
                  >
                    {checkInSubmitting ? (
                      <>
                        <div className="gp-spinner" />
                        <span>Confirming Check-In…</span>
                      </>
                    ) : (
                      <>
                        <span>Complete Check-In & Get Key</span>
                        <span>🔑</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── STEP 4: DIGITAL ROOM KEY (AFTER CHECK-IN) ── */}
        {viewStep === 'keycard' && checkInResult && (
          <div className="gp-card">
            <div className="gp-card-header">
              <h2 className="gp-card-title" style={{ color: 'var(--gp-success)' }}>
                <span>✨</span> Check-In Confirmed!
              </h2>
              <p className="gp-card-desc">
                Your check-in has been successfully recorded in MySQL. Room status updated to <strong>Occupied</strong>.
              </p>
            </div>

            <div className="gp-form">
              {/* Digital Room Key Badge */}
              <div className="gp-key-card">
                {selfieCaptured && (
                  <img
                    src={selfieCaptured}
                    alt="Verified Guest"
                    style={{
                      width: '74px',
                      height: '74px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2.5px solid #D9A84E',
                      marginBottom: '8px'
                    }}
                  />
                )}
                <div style={{ textTransform: 'uppercase', letterSpacing: '2px', fontSize: '11px', color: '#D9A84E' }}>
                  Digital Room Key Pass
                </div>
                <div className="gp-key-room-num">
                  {checkInResult.digital_key?.room_number || bookingData.room.number}
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#FFFFFF', marginBottom: '14px' }}>
                  {checkInResult.digital_key?.room_type || bookingData.room.type_name} • Floor {bookingData.room.floor}
                </div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.85)' }}>
                  Guest: <strong>{bookingData.guest.full_name}</strong> • Key Code: <strong style={{ color: '#D9A84E' }}>{checkInResult.digital_key?.key_pass_code}</strong>
                </div>
              </div>

              <div className="gp-res-banner" style={{ marginTop: '0' }}>
                <div className="gp-res-grid">
                  <div className="gp-res-cell">
                    <label>Actual Check-In</label>
                    <span>{formatDisplayDateTime(checkInResult.actual_check_in)}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Expected Check-Out</label>
                    <span>{formatDisplayDate(bookingData.booking.check_out)}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>High-Speed Wi-Fi</label>
                    <span>{checkInResult.digital_key?.wifi_network}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Wi-Fi Password</label>
                    <span>{checkInResult.digital_key?.wifi_password}</span>
                  </div>
                </div>
              </div>

              <div className="gp-alert gp-alert-info">
                <span>ℹ️</span>
                <span>
                  Save this screen or bookmark this page. When you are ready to depart, scanning the same QR Code will immediately bring you to express check-out and billing!
                </span>
              </div>

              <div className="gp-actions">
                <button
                  type="button"
                  className="gp-btn gp-btn-secondary"
                  onClick={() => window.print()}
                >
                  <span>🖨️</span>
                  <span>Print Key Pass</span>
                </button>
                <button
                  type="button"
                  className="gp-btn gp-btn-primary"
                  onClick={handleReset}
                >
                  <span>Done / Log Out</span>
                  <span>✓</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: CHECK-OUT & BILLING SETTLEMENT ── */}
        {viewStep === 'checkout' && bookingData && (
          <div className="gp-card">
            <div className="gp-card-header">
              <h2 className="gp-card-title">
                <span>💳</span> Express Check-Out & Final Billing
              </h2>
              <p className="gp-card-desc">
                Review your stay charges, settle any pending balance, and receive your official GST tax invoice.
              </p>
            </div>

            <div className="gp-form">
              {checkOutError && (
                <div className="gp-alert gp-alert-error" role="alert">
                  <span>⚠️</span>
                  <span>{checkOutError}</span>
                </div>
              )}

              {/* Stay Summary */}
              <div className="gp-res-banner">
                <div className="gp-res-grid">
                  <div className="gp-res-cell">
                    <label>Guest Name</label>
                    <span>{bookingData.guest.full_name}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Room Number</label>
                    <span style={{ color: 'var(--gp-primary)', fontSize: '15px' }}>
                      Room {bookingData.room.number}
                    </span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Category</label>
                    <span>{bookingData.room.type_name}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Actual Check-In</label>
                    <span>{formatDisplayDateTime(bookingData.booking.checked_in_at || bookingData.booking.check_in)}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleCheckOutSubmit} noValidate>
                <div className="gp-field">
                  <label className="gp-label" htmlFor="actual_check_out">
                    <span>Actual Check-out Date & Time <span className="gp-required-star">*</span></span>
                    <small style={{ color: 'var(--gp-slate)' }}>Timestamp recorded in MySQL</small>
                  </label>
                  <div className="gp-input-wrapper">
                    <span className="gp-input-icon">🕒</span>
                    <input
                      id="actual_check_out"
                      type="datetime-local"
                      className="gp-input"
                      value={checkOutForm.actual_check_out}
                      onChange={(e) => setCheckOutForm(prev => ({ ...prev, actual_check_out: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {/* Itemized Billing Breakdown Table */}
                <h3 style={{ fontSize: '15px', color: 'var(--gp-navy)', margin: '20px 0 8px' }}>
                  Detailed Billing Summary
                </h3>

                <table className="gp-bill-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ textAlign: 'center' }}>Qty / Nights</th>
                      <th style={{ textAlign: 'right' }}>Rate</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>{bookingData.room.type_name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--gp-slate)' }}>
                          Room {bookingData.room.number} accommodation
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>{bookingData.billing?.chargeable_nights || 1} nights</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(bookingData.billing?.nightly_rate)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(bookingData.billing?.room_charges)}</td>
                    </tr>
                    {bookingData.billing?.additional_charges > 0 && (
                      <tr>
                        <td>Additional Services & Amenities</td>
                        <td style={{ textAlign: 'center' }}>-</td>
                        <td style={{ textAlign: 'right' }}>-</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(bookingData.billing.additional_charges)}</td>
                      </tr>
                    )}
                    {bookingData.billing?.discount_amount > 0 && (
                      <tr>
                        <td style={{ color: 'var(--gp-success)' }}>Discount Applied</td>
                        <td style={{ textAlign: 'center' }}>-</td>
                        <td style={{ textAlign: 'right' }}>-</td>
                        <td style={{ textAlign: 'right', color: 'var(--gp-success)' }}>
                          -{formatCurrency(bookingData.billing.discount_amount)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>Applicable Taxes (GST 12%)</td>
                      <td style={{ textAlign: 'center' }}>12%</td>
                      <td style={{ textAlign: 'right' }}>-</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(bookingData.billing?.tax_amount)}</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan="3">Total Bill Amount</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(bookingData.billing?.total_bill)}</td>
                    </tr>
                    <tr>
                      <td colSpan="3" style={{ color: 'var(--gp-success)', fontWeight: 600 }}>
                        Amount Already Paid (MySQL Records)
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--gp-success)', fontWeight: 600 }}>
                        {formatCurrency(bookingData.billing?.amount_paid)}
                      </td>
                    </tr>
                    <tr style={{ background: '#FFFBEB', fontWeight: 700, fontSize: '15px' }}>
                      <td colSpan="3" style={{ color: 'var(--gp-navy)' }}>
                        Net Outstanding Balance Due
                      </td>
                      <td style={{ textAlign: 'right', color: (bookingData.billing?.outstanding_balance > 0 ? '#B9433A' : '#2E8A57') }}>
                        {formatCurrency(bookingData.billing?.outstanding_balance)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* If there is a pending balance, show payment selection */}
                {bookingData.billing?.outstanding_balance > 0 && (
                  <div style={{ marginTop: '20px' }}>
                    <label className="gp-label">
                      <span>Select Payment Method to Settle Balance <span className="gp-required-star">*</span></span>
                    </label>

                    <div className="gp-payment-options">
                      <div
                        className={`gp-pay-option ${checkOutForm.payment_method === 'Razorpay' ? 'selected' : ''}`}
                        onClick={() => setCheckOutForm(prev => ({ ...prev, payment_method: 'Razorpay' }))}
                        style={{ border: checkOutForm.payment_method === 'Razorpay' ? '2px solid #2563EB' : undefined }}
                      >
                        <span className="gp-pay-option-icon">⚡</span>
                        <span className="gp-pay-option-label">Razorpay (Test Gateway)</span>
                        <small style={{ fontSize: '10px', color: '#2563EB', fontWeight: 600 }}>Cards, UPI, Netbanking</small>
                      </div>

                      <div
                        className={`gp-pay-option ${checkOutForm.payment_method === 'UPI' ? 'selected' : ''}`}
                        onClick={() => setCheckOutForm(prev => ({ ...prev, payment_method: 'UPI' }))}
                      >
                        <span className="gp-pay-option-icon">📱</span>
                        <span className="gp-pay-option-label">Instant UPI / QR</span>
                        <small style={{ fontSize: '10px', color: 'var(--gp-slate)' }}>GPay, PhonePe, Paytm</small>
                      </div>

                      <div
                        className={`gp-pay-option ${checkOutForm.payment_method === 'Credit Card' ? 'selected' : ''}`}
                        onClick={() => setCheckOutForm(prev => ({ ...prev, payment_method: 'Credit Card' }))}
                      >
                        <span className="gp-pay-option-icon">💳</span>
                        <span className="gp-pay-option-label">Credit / Debit Card</span>
                        <small style={{ fontSize: '10px', color: 'var(--gp-slate)' }}>Visa, Master, RuPay</small>
                      </div>

                      <div
                        className={`gp-pay-option ${checkOutForm.payment_method === 'Cash' ? 'selected' : ''}`}
                        onClick={() => setCheckOutForm(prev => ({ ...prev, payment_method: 'Cash' }))}
                      >
                        <span className="gp-pay-option-icon">💵</span>
                        <span className="gp-pay-option-label">Cash at Desk</span>
                        <small style={{ fontSize: '10px', color: 'var(--gp-slate)' }}>Front Desk Settlement</small>
                      </div>
                    </div>
                  </div>
                )}

                <div className="gp-actions">
                  <button
                    type="button"
                    className="gp-btn gp-btn-secondary"
                    onClick={handleReset}
                    disabled={checkOutSubmitting}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="gp-btn gp-btn-gold"
                    disabled={checkOutSubmitting}
                  >
                    {checkOutSubmitting ? (
                      <>
                        <div className="gp-spinner" />
                        <span>Processing Check-out & Bill…</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {bookingData.billing?.outstanding_balance > 0
                            ? `Pay ${formatCurrency(bookingData.billing?.outstanding_balance)} & Complete Check-Out`
                            : 'Complete Check-Out & Generate Invoice'}
                        </span>
                        <span>🧾</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── STEP 6: FINAL OFFICIAL TAX INVOICE ── */}
        {viewStep === 'invoice' && invoiceData && (
          <div className="gp-card">
            <div className="gp-card-header">
              <h2 className="gp-card-title" style={{ color: 'var(--gp-success)' }}>
                <span>✅</span> Check-Out Completed & Bill Settled
              </h2>
              <p className="gp-card-desc">
                Thank you for staying at StayFlow Luxury Suites & Resorts! Below is your official Tax Invoice. Room status updated to <strong>Vacant Dirty (Housekeeping)</strong>.
              </p>
            </div>

            <div className="gp-form">
              {/* Printable Invoice Container */}
              <div className="gp-invoice-box" id="printable-invoice">
                <div className="gp-invoice-head">
                  <div>
                    <h3 className="gp-invoice-title">TAX INVOICE</h3>
                    <div style={{ fontSize: '12px', color: 'var(--gp-slate)' }}>
                      Invoice No: <strong>{invoiceData.invoice_number}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gp-slate)' }}>
                      Date: <strong>{formatDisplayDateTime(invoiceData.created_at)}</strong>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--gp-slate)' }}>
                      GSTIN: <strong>33AAAAA0000A1Z5</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="gp-invoice-badge-paid">PAID IN FULL</div>
                    <div style={{ fontSize: '12px', color: 'var(--gp-slate)', marginTop: '6px' }}>
                      Ref: <strong>{invoiceData.booking?.reference}</strong>
                    </div>
                  </div>
                </div>

                {/* Guest & Room Details Grid */}
                <div className="gp-res-grid" style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--gp-border)' }}>
                  <div className="gp-res-cell">
                    <label>Billed To (Guest)</label>
                    <span>{invoiceData.guest?.full_name}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Contact Phone</label>
                    <span>{invoiceData.guest?.phone}</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Room Number</label>
                    <span>Room {invoiceData.room?.number} ({invoiceData.room?.type_name})</span>
                  </div>
                  <div className="gp-res-cell">
                    <label>Stay Duration</label>
                    <span>
                      {formatDisplayDate(invoiceData.booking?.check_in)} to {formatDisplayDate(invoiceData.booking?.check_out)}
                    </span>
                  </div>
                </div>

                {/* Charges Table */}
                <table className="gp-bill-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{ textAlign: 'center' }}>Nights</th>
                      <th style={{ textAlign: 'right' }}>Rate / Night</th>
                      <th style={{ textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Room Charges ({invoiceData.room?.type_name})</td>
                      <td style={{ textAlign: 'center' }}>{invoiceData.billing?.chargeable_nights || 1}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(invoiceData.billing?.nightly_rate)}</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(invoiceData.billing?.room_charges)}</td>
                    </tr>
                    {/* Itemized Additional Services */}
                    {Array.isArray(invoiceData.services) && invoiceData.services.length > 0 ? (
                      invoiceData.services.map((svc, sIdx) => (
                        <tr key={svc.id || sIdx}>
                          <td>
                            <strong>{svc.name || svc.service_name}</strong>
                            {svc.notes && <div style={{ fontSize: '11px', color: 'var(--gp-slate)' }}>{svc.notes}</div>}
                          </td>
                          <td style={{ textAlign: 'center' }}>{svc.quantity}x</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(svc.unit_price)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(svc.total)}</td>
                        </tr>
                      ))
                    ) : (
                      invoiceData.billing?.additional_charges > 0 && (
                        <tr>
                          <td>Additional Amenities & Services</td>
                          <td style={{ textAlign: 'center' }}>-</td>
                          <td style={{ textAlign: 'right' }}>-</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(invoiceData.billing.additional_charges)}</td>
                        </tr>
                      )
                    )}
                    {invoiceData.billing?.discount_amount > 0 && (
                      <tr>
                        <td style={{ color: 'var(--gp-success)' }}>Discount Applied</td>
                        <td style={{ textAlign: 'center' }}>-</td>
                        <td style={{ textAlign: 'right' }}>-</td>
                        <td style={{ textAlign: 'right', color: 'var(--gp-success)' }}>
                          -{formatCurrency(invoiceData.billing.discount_amount)}
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td>Goods & Services Tax (GST {invoiceData.gst_percent || 12}%)</td>
                      <td style={{ textAlign: 'center' }}>{invoiceData.gst_percent || 12}%</td>
                      <td style={{ textAlign: 'right' }}>-</td>
                      <td style={{ textAlign: 'right' }}>{formatCurrency(invoiceData.billing?.tax_amount || invoiceData.tax_amount)}</td>
                    </tr>
                    <tr className="total-row">
                      <td colSpan="3">Total Amount Paid</td>
                      <td style={{ textAlign: 'right', color: 'var(--gp-navy)' }}>
                        {formatCurrency(invoiceData.billing?.total_bill || invoiceData.total_bill)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan="3" style={{ color: 'var(--gp-success)', fontWeight: 600 }}>
                        Outstanding Balance
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--gp-success)', fontWeight: 600 }}>
                        ₹0.00
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'var(--gp-slate)' }}>
                  This is a computer-generated tax invoice and requires no physical signature. StayFlow Hotel Reservation Management System.
                </div>
              </div>

              <div className="gp-actions">
                <button
                  type="button"
                  className="gp-btn gp-btn-gold"
                  onClick={() => {
                    const ref = invoiceData.booking_reference || bookingData?.booking?.reference;
                    const pdfUrl = `${getApiBaseUrl()}/api/public/booking/invoice/${encodeURIComponent(ref)}/pdf?hotel=${encodeURIComponent(hotelCode)}`;
                    const link = document.createElement('a');
                    link.href = pdfUrl;
                    link.download = `Invoice_${ref}.pdf`;
                    link.target = '_blank';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }}
                >
                  <span>📥</span>
                  <span>Download PDF Invoice</span>
                </button>
                <button
                  type="button"
                  className="gp-btn gp-btn-secondary"
                  onClick={() => window.print()}
                >
                  <span>🖨️</span>
                  <span>Print Tax Invoice</span>
                </button>
                <button
                  type="button"
                  className="gp-btn gp-btn-primary"
                  onClick={handleReset}
                >
                  <span>Done / Log Out</span>
                  <span>✓</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
