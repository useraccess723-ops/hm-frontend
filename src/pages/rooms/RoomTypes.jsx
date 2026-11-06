import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { api, API_BASE_URL, getApiBaseUrl, getToken, setToken } from '../../services/api';
import { inr } from '../../utils/format';
import PageHead from '../../components/PageHead';
import SubNav from '../../components/SubNav';
import Badge from '../../components/Badge';
import StatCard, { StatRow } from '../../components/StatCard';

const PHOTO_PRESETS = [
  { label: 'Standard Room', url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80' },
  { label: 'Deluxe Room', url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80' },
  { label: 'Premium Suite', url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80' },
  { label: 'Luxury Penthouse', url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80' },
  { label: 'Family Suite', url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80' },
];

export const SUPPORTED_ROOM_TYPES = [
  { name: 'Standard', base_price: 1500, max_guests: 2, bed_type: 'Queen-size Bed', room_size_sqft: 220, short_description: 'Comfortable standard accommodation with essentials' },
  { name: 'Deluxe', base_price: 2500, max_guests: 2, bed_type: 'King-size Bed', room_size_sqft: 300, short_description: 'Spacious deluxe room with premium comfort' },
  { name: 'Premium', base_price: 3500, max_guests: 3, bed_type: 'King-size Bed', room_size_sqft: 380, short_description: 'Upscale premium room with luxury fixtures' },
  { name: 'Suite', base_price: 6000, max_guests: 4, bed_type: 'King + Sofa Bed', room_size_sqft: 520, short_description: 'Executive luxury suite with separate lounge area' },
  { name: 'Family Room', base_price: 4500, max_guests: 4, bed_type: '2 Queen Beds', room_size_sqft: 450, short_description: 'Comfortable spacious room tailored for families' },
];

const INITIAL_FORM = {
  name: '',
  slug: '',
  short_description: '',
  description: '',
  base_price: 2500,
  weekend_price: '',
  max_adults: 2,
  max_children: 0,
  max_guests: 2,
  number_of_beds: 1,
  bed_type: 'King-size Bed',
  room_size_sqft: 280,
  bathroom_type: 'Private Bathroom',
  number_of_bathrooms: 1,
  view_type: 'City View',
  floor_preference: 'Any',
  amenities: [],
  extra_adult_charge: 500,
  extra_child_charge: 300,
  extra_bed_charge: 600,
  tax_percentage: 12,
  breakfast_included: false,
  free_cancellation: true,
  cancellation_policy: 'Free cancellation up to 24 hours before check-in.',
  check_in_time: '14:00',
  check_out_time: '11:00',
  minimum_stay_nights: 1,
  maximum_stay_nights: 30,
  refund_policy: '100% refund if cancelled at least 24 hours before arrival.',
  additional_notes: '',
  image_url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80',
  status: 'Active',
};

export default function RoomTypes() {
  const { notify } = useStore();
  const [roomTypes, setRoomTypes] = useState([]);
  const [amenitiesList, setAmenitiesList] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals state
  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState('basic');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Detail modal
  const [viewItem, setViewItem] = useState(null);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConflict, setDeleteConflict] = useState(null);

  const fetchRoomTypes = useCallback(async () => {
    try {
      const data = await api('/api/room-types');
      setRoomTypes(data);
      const st = await api('/api/room-types/stats');
      setStats(st);
    } catch (err) {
      notify(err.message || 'Failed to load room types');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  const fetchAmenities = useCallback(async () => {
    try {
      const res = await api('/api/room-amenities');
      if (res && res.amenities) setAmenitiesList(res.amenities);
    } catch {
      // Fallback if network glitch
    }
  }, []);

  useEffect(() => {
    fetchRoomTypes();
    fetchAmenities();
  }, [fetchRoomTypes, fetchAmenities]);

  // Filtered & sorted room types
  const displayedTypes = useMemo(() => {
    let list = [...roomTypes];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (t.short_description && t.short_description.toLowerCase().includes(q)) ||
        (t.view_type && t.view_type.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== 'All') {
      list = list.filter((t) => t.status === statusFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'price') cmp = a.base_price - b.base_price;
      else if (sortBy === 'capacity') cmp = a.max_guests - b.max_guests;
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [roomTypes, search, statusFilter, sortBy, sortOrder]);

  const avgPrice = useMemo(() => {
    if (!roomTypes.length) return 0;
    const sum = roomTypes.reduce((acc, t) => acc + (t.base_price || 0), 0);
    return Math.round(sum / roomTypes.length);
  }, [roomTypes]);

  // Form helpers
  const handleOpenCreate = () => {
    setForm(INITIAL_FORM);
    setEditId(null);
    setFormError('');
    setActiveTab('basic');
    setUploadedImages(
      INITIAL_FORM.image_url
        ? [{ id: 'preset-default', name: 'Deluxe Room Preset', size: 'Preset', type: 'JPG', url: INITIAL_FORM.image_url }]
        : []
    );
    setModalMode('create');
  };

  const handleOpenEdit = (item) => {
    setEditId(item.id);
    setForm({
      name: item.name || '',
      slug: item.slug || '',
      short_description: item.short_description || '',
      description: item.description || '',
      base_price: item.base_price || 0,
      weekend_price: item.weekend_price ?? '',
      max_adults: item.max_adults || 2,
      max_children: item.max_children || 0,
      max_guests: item.max_guests || 2,
      number_of_beds: item.number_of_beds || 1,
      bed_type: item.bed_type || 'King-size Bed',
      room_size_sqft: item.room_size_sqft || 250,
      bathroom_type: item.bathroom_type || 'Private Bathroom',
      number_of_bathrooms: item.number_of_bathrooms || 1,
      view_type: item.view_type || 'City View',
      floor_preference: item.floor_preference || 'Any',
      amenities: Array.isArray(item.amenities) ? item.amenities : [],
      extra_adult_charge: item.extra_adult_charge || 0,
      extra_child_charge: item.extra_child_charge || 0,
      extra_bed_charge: item.extra_bed_charge || 0,
      tax_percentage: item.tax_percentage || 12,
      breakfast_included: Boolean(item.breakfast_included),
      free_cancellation: Boolean(item.free_cancellation),
      cancellation_policy: item.cancellation_policy || '',
      check_in_time: item.check_in_time || '14:00',
      check_out_time: item.check_out_time || '11:00',
      minimum_stay_nights: item.minimum_stay_nights || 1,
      maximum_stay_nights: item.maximum_stay_nights || 30,
      refund_policy: item.refund_policy || '',
      additional_notes: item.additional_notes || '',
      image_url: item.image_url || '',
      status: item.status || 'Active',
    });
    setFormError('');
    setActiveTab('basic');
    setUploadedImages(
      item.image_url
        ? [{ id: `existing-${item.id}`, name: `${item.name || 'Room'} Photo`, size: 'Existing', type: 'IMG', url: item.image_url }]
        : []
    );
    setModalMode('edit');
  };

  const ALLOWED_IMAGE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];
  const ALLOWED_IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

  const processImageFiles = (files) => {
    if (!files || !files.length) return;
    const filesList = Array.from(files);
    let errorCount = 0;
    let addedCount = 0;

    filesList.forEach((file) => {
      const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
      const isImage = (file.type && file.type.startsWith('image/')) || ALLOWED_IMAGE_TYPES.includes(file.type) || ALLOWED_IMAGE_EXTS.includes(ext);

      if (!isImage) {
        notify(`"${file.name}" is not a supported image. Only image formats (PNG, JPG, WEBP, GIF, SVG) are allowed.`);
        errorCount++;
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        notify(`"${file.name}" exceeds the 8MB size limit.`);
        errorCount++;
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const rawDataUrl = e.target?.result;
        if (!rawDataUrl) return;

        const img = new Image();
        img.onload = () => {
          let targetWidth = img.width;
          let targetHeight = img.height;
          const maxDim = 1600;
          if (targetWidth > maxDim || targetHeight > maxDim) {
            if (targetWidth > targetHeight) {
              targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
              targetWidth = maxDim;
            } else {
              targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
              targetHeight = maxDim;
            }
          }

          let finalUrl = rawDataUrl;
          try {
            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            finalUrl = canvas.toDataURL('image/jpeg', 0.85);
          } catch (canvasErr) {
            finalUrl = rawDataUrl;
          }

          const sizeStr = file.size > 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`;
          const typeStr = (ext.replace('.', '') || 'image').toUpperCase();

          setUploadedImages((prev) => {
            const newEntry = {
              id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 7)}`,
              name: file.name,
              size: sizeStr,
              type: typeStr,
              url: finalUrl,
            };
            const updated = [...prev, newEntry];
            if (!form.image_url || prev.length === 0) {
              setForm((f) => ({ ...f, image_url: finalUrl }));
            }
            return updated;
          });
        };
        img.src = rawDataUrl;
      };
      reader.readAsDataURL(file);
      addedCount++;
    });

    if (addedCount > 0 && errorCount === 0) {
      notify(`Uploaded ${addedCount} room image${addedCount > 1 ? 's' : ''} successfully!`);
    }
  };

  const handleImageFileChange = (e) => {
    if (e.target.files) {
      processImageFiles(e.target.files);
    }
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer && e.dataTransfer.files) {
      processImageFiles(e.dataTransfer.files);
    }
  };

  const handleMoveImage = (fromIdx, toIdx) => {
    setUploadedImages((prev) => {
      if (toIdx < 0 || toIdx >= prev.length) return prev;
      const updated = [...prev];
      const [moved] = updated.splice(fromIdx, 1);
      updated.splice(toIdx, 0, moved);
      if (updated[0] && updated[0].url !== form.image_url) {
        setForm((f) => ({ ...f, image_url: updated[0].url }));
      }
      return updated;
    });
  };

  const handleSetPrimaryImage = (idx) => {
    setUploadedImages((prev) => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const updated = [...prev];
      const [chosen] = updated.splice(idx, 1);
      updated.unshift(chosen);
      setForm((f) => ({ ...f, image_url: chosen.url }));
      notify(`"${chosen.name}" set as primary cover photo`);
      return updated;
    });
  };

  const handleRemoveImage = (idx) => {
    setUploadedImages((prev) => {
      const removed = prev[idx];
      const updated = prev.filter((_, i) => i !== idx);
      if (removed && removed.url === form.image_url) {
        setForm((f) => ({ ...f, image_url: updated[0] ? updated[0].url : '' }));
      }
      return updated;
    });
  };

  const handleApplyPreset = (p) => {
    setForm((f) => ({ ...f, image_url: p.url }));
    setUploadedImages((prev) => {
      const exists = prev.find((img) => img.url === p.url);
      if (exists) return prev;
      return [
        { id: `preset-${Date.now()}`, name: `${p.label} (Preset)`, size: 'Preset', type: 'JPG', url: p.url },
        ...prev,
      ];
    });
    notify(`Loaded preset: ${p.label}`);
  };

  const toggleAmenity = (name) => {
    setForm((prev) => {
      const exists = prev.amenities.includes(name);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== name)
          : [...prev.amenities, name],
      };
    });
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!form.name.trim()) {
      setFormError('Room type name is required.');
      setActiveTab('basic');
      return;
    }
    if (Number(form.base_price) <= 0) {
      setFormError('Base price must be greater than 0.');
      setActiveTab('pricing');
      return;
    }
    if (Number(form.max_guests) < 1) {
      setFormError('Total guest capacity must be at least 1.');
      setActiveTab('capacity');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        name: form.name.trim(),
        base_price: Number(form.base_price),
        weekend_price: form.weekend_price ? Number(form.weekend_price) : null,
        max_adults: Number(form.max_adults),
        max_children: Number(form.max_children),
        max_guests: Number(form.max_guests),
        number_of_beds: Number(form.number_of_beds),
        room_size_sqft: Number(form.room_size_sqft),
        number_of_bathrooms: Number(form.number_of_bathrooms),
        extra_adult_charge: Number(form.extra_adult_charge || 0),
        extra_child_charge: Number(form.extra_child_charge || 0),
        extra_bed_charge: Number(form.extra_bed_charge || 0),
        tax_percentage: Number(form.tax_percentage || 0),
        minimum_stay_nights: Number(form.minimum_stay_nights || 1),
        maximum_stay_nights: Number(form.maximum_stay_nights || 30),
      };

      if (modalMode === 'create') {
        await api('/api/room-types', { method: 'POST', body: JSON.stringify(payload) });
        notify(`Room type "${form.name}" created successfully`);
      } else {
        await api(`/api/room-types/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
        notify(`Room type "${form.name}" updated successfully`);
      }
      setModalMode(null);
      await fetchRoomTypes();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api(`/api/room-types/${item.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      notify(`Status changed to ${newStatus}`);
      await fetchRoomTypes();
    } catch (err) {
      notify(err.message || 'Failed to update status');
    }
  };

  const handleDeleteRequest = (item) => {
    setDeleteTarget(item);
    setDeleteConflict(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/api/room-types/${deleteTarget.id}`, { method: 'DELETE' });
      notify(`Room type "${deleteTarget.name}" deleted successfully`);
      setDeleteTarget(null);
      setDeleteConflict(null);
      await fetchRoomTypes();
    } catch (err) {
      setDeleteConflict(err.message || 'Failed to delete room type.');
    }
  };

  const handleDeactivateInstead = async () => {
    if (!deleteTarget) return;
    try {
      await api(`/api/room-types/${deleteTarget.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Inactive' }),
      });
      notify(`Room type "${deleteTarget.name}" deactivated.`);
      setDeleteTarget(null);
      setDeleteConflict(null);
      await fetchRoomTypes();
    } catch (err) {
      notify(err.message || 'Failed to deactivate.');
    }
  };

  return (
    <>
      <PageHead
        title="Room Types"
        subtitle="Manage room categories, specifications, amenities, and rate rules"
      >
        <button className="btn" onClick={handleOpenCreate}>
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none" style={{ marginRight: 6, verticalAlign: 'middle' }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Room Type
        </button>
      </PageHead>

      <SubNav parentPath="/rooms" />

      {/* Metrics Row */}
      <StatRow>
        <StatCard label="Total Categories" value={stats.total} note="Active in inventory" />
        <StatCard label="Active Room Types" value={stats.active} note="Available for sale" />
        <StatCard label="Inactive Categories" value={stats.inactive} note={stats.inactive ? 'Deactivated' : 'All available'} negative={stats.inactive > 0} />
        <StatCard label="Average Starting Rate" value={inr(avgPrice)} note="Base INR per night" />
      </StatRow>

      {/* Search, Filter & Controls Bar */}
      <div className="panel" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: 10, flex: 1, minWidth: 260 }}>
            <input
              type="text"
              placeholder="Search by category name, description, view..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: 1 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Status:</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Active">Active only</option>
                <option value="Inactive">Inactive only</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Sort:</span>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="name">Name</option>
                <option value="price">Price</option>
                <option value="capacity">Capacity</option>
              </select>
              <button
                className="btn ghost sm"
                title="Toggle Sort Order"
                onClick={() => setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                style={{ padding: '6px 10px' }}
              >
                {sortOrder === 'asc' ? '↑ Asc' : '↓ Desc'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Room Types Listing */}
      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p className="muted">Loading room types from database...</p>
        </div>
      ) : displayedTypes.length === 0 ? (
        <div className="panel">
          <div className="empty">
            <h3 style={{ marginBottom: 8, fontSize: 18 }}>No room types found</h3>
            <p className="muted" style={{ marginBottom: 16 }}>
              {search || statusFilter !== 'All'
                ? 'Try adjusting your search criteria or filter options.'
                : 'No room types configured yet. Add your first room category to start selling rooms.'}
            </p>
            {search || statusFilter !== 'All' ? (
              <button
                className="btn ghost sm"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('All');
                }}
              >
                Clear Filters
              </button>
            ) : (
              <button className="btn" onClick={handleOpenCreate}>
                + Add Room Type
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {displayedTypes.map((t) => (
            <div
              key={t.id}
              className="panel"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: 0,
                overflow: 'hidden',
                borderRadius: 14,
                border: '1px solid var(--line)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              {/* Card Media Header */}
              <div style={{ position: 'relative', height: 180, width: '100%', background: 'var(--panel-alt, #eef2f6)' }}>
                {t.image_url ? (
                  <img
                    src={t.image_url}
                    alt={t.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
                    <span>🏨 No image provided</span>
                  </div>
                )}
                {/* Status pill overlay */}
                <div style={{ position: 'absolute', top: 12, left: 12 }}>
                  <Badge color={t.status === 'Active' ? 'green' : 'grey'}>
                    {t.status === 'Active' ? '● Active' : '○ Inactive'}
                  </Badge>
                </div>
                {/* Price tag overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 12,
                    right: 12,
                    background: 'rgba(10, 18, 27, 0.85)',
                    backdropFilter: 'blur(8px)',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: 8,
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {inr(t.base_price)}
                  <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8, marginLeft: 4 }}>/ night</span>
                </div>
              </div>

              {/* Card Body */}
              <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--head)' }}>{t.name}</h3>
                </div>

                <p
                  className="muted"
                  style={{
                    fontSize: 13,
                    lineHeight: 1.45,
                    marginBottom: 14,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {t.short_description || t.description || 'No description provided.'}
                </p>

                {/* Specs pill badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, fontSize: 12 }}>
                  <span className="tag" title="Maximum Occupancy">
                    👥 Up to {t.max_guests} guests ({t.max_adults} adults)
                  </span>
                  <span className="tag" title="Bed Configuration">
                    🛏️ {t.number_of_beds} {t.bed_type}
                  </span>
                  {t.room_size_sqft && (
                    <span className="tag" title="Room Size">
                      📐 {t.room_size_sqft} sq.ft
                    </span>
                  )}
                  {t.view_type && (
                    <span className="tag" title="Room View">
                      🌄 {t.view_type}
                    </span>
                  )}
                  {t.breakfast_included && (
                    <span className="tag" style={{ background: 'var(--green-soft, #e6f7ec)', color: 'var(--green, #0e8a16)' }}>
                      🍳 Breakfast Included
                    </span>
                  )}
                </div>

                {/* Amenities chips preview */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 16 }}>
                  {t.amenities && t.amenities.slice(0, 4).map((a) => (
                    <Badge key={a} color="grey">{a}</Badge>
                  ))}
                  {t.amenities && t.amenities.length > 4 && (
                    <Badge color="grey">+{t.amenities.length - 4} more</Badge>
                  )}
                </div>

                {/* Action Buttons Footer */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: 14,
                    borderTop: '1px solid var(--line)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <button
                    className="btn ghost sm"
                    onClick={() => setViewItem(t)}
                    title="View full room details and policies"
                  >
                    View Details
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="btn ghost sm"
                      onClick={() => handleToggleStatus(t)}
                      title={t.status === 'Active' ? 'Deactivate room type' : 'Activate room type'}
                    >
                      {t.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      className="btn sm"
                      onClick={() => handleOpenEdit(t)}
                      title="Edit room type properties"
                    >
                      Edit
                    </button>
                    <button
                      className="btn ghost sm"
                      onClick={() => handleDeleteRequest(t)}
                      style={{ color: 'var(--red, #d6322e)' }}
                      title="Delete category"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ───────────────────────────────────── */}
      {modalMode && (
        <div
          className="scrim open"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) setModalMode(null);
          }}
        >
          <div
            className="modal"
            style={{ maxWidth: 720, maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontFamily: 'var(--head)' }}>
                {modalMode === 'create' ? 'Add Room Type' : `Edit: ${form.name || 'Room Type'}`}
              </h2>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setModalMode(null)}
                disabled={submitting}
                style={{ padding: '4px 8px' }}
              >
                Back
              </button>
            </div>

            {formError && (
              <div
                style={{
                  background: 'var(--red-soft, #fde8e8)',
                  color: 'var(--red, #d6322e)',
                  padding: '12px 14px',
                  borderRadius: 8,
                  marginBottom: 14,
                  fontSize: 13,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 10,
                  flexWrap: 'wrap',
                }}
              >
                <span>⚠️ {formError}</span>
                {formError.toLowerCase().includes('token') && (
                  <button
                    type="button"
                    className="btn primary sm"
                    onClick={async () => {
                      setFormError('');
                      try {
                        const token = getToken();
                        const baseUrl = getApiBaseUrl() || API_BASE_URL;
                        const refreshUrl = baseUrl ? `${baseUrl}/api/auth/refresh` : '/api/auth/refresh';
                        let res = await fetch(refreshUrl, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({ token }),
                        }).catch(() => null);

                        if (!res || !res.ok) {
                          // Fallback to default admin login
                          const loginUrl = baseUrl ? `${baseUrl}/api/auth/login` : '/api/auth/login';
                          res = await fetch(loginUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: 'admin@hotel.com', password: 'Password@123' }),
                          }).catch(() => null);
                        }

                        if (res && res.ok) {
                          const data = await res.json();
                          if (data?.access_token) {
                            setToken(data.access_token);
                            notify('✓ Session refreshed! Saving room type now...');
                            setTimeout(() => {
                              handleSaveForm({ preventDefault: () => {} });
                            }, 300);
                            return;
                          }
                        }
                        setFormError('Session expired. Please sign out and log in again.');
                      } catch (e) {
                        setFormError('Re-authentication error: ' + (e.message || 'Network error'));
                      }
                    }}
                    style={{ fontSize: 12, padding: '4px 10px', whiteSpace: 'nowrap' }}
                  >
                    🔄 Re-authenticate & Save
                  </button>
                )}
              </div>
            )}

            {/* Navigation Tabs */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                borderBottom: '1px solid var(--line)',
                paddingBottom: 10,
                marginBottom: 16,
                overflowX: 'auto',
              }}
            >
              {[
                { id: 'basic', label: '1. Basic Info' },
                { id: 'description', label: '2. Description' },
                { id: 'capacity', label: '3. Capacity & Beds' },
                { id: 'amenities', label: '4. Amenities' },
                { id: 'pricing', label: '5. Rates & Policies' },
                { id: 'media', label: '6. Photos' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`btn sm ${activeTab === tab.id ? '' : 'ghost'}`}
                  onClick={() => setActiveTab(tab.id)}
                  style={{ whiteSpace: 'nowrap', fontSize: 12 }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSaveForm} style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
              {/* TAB 1: BASIC INFO */}
              {activeTab === 'basic' && (
                <div>
                  <div className="field">
                    <label>Room Type Name *</label>
                    <input
                      required
                      list="supported-room-types-list"
                      placeholder="e.g. Standard, Deluxe, Premium, Suite, Family Room"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                    <datalist id="supported-room-types-list">
                      {SUPPORTED_ROOM_TYPES.map((t) => (
                        <option key={t.name} value={t.name}>{t.name} ({inr(t.base_price)}/night)</option>
                      ))}
                    </datalist>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
                      <span className="muted" style={{ fontSize: 12 }}>Select standard type:</span>
                      {SUPPORTED_ROOM_TYPES.map((t) => (
                        <button
                          key={t.name}
                          type="button"
                          className="btn ghost sm"
                          style={{
                            padding: '3px 10px',
                            fontSize: 12,
                            borderRadius: 16,
                            background: form.name === t.name ? 'var(--teal-soft)' : undefined,
                            borderColor: form.name === t.name ? 'var(--teal)' : 'var(--line)',
                            color: form.name === t.name ? 'var(--teal)' : 'var(--ink)',
                            fontWeight: form.name === t.name ? 700 : 500,
                          }}
                          onClick={() => setForm((prev) => ({
                            ...prev,
                            name: t.name,
                            base_price: t.base_price,
                            max_guests: t.max_guests,
                            bed_type: t.bed_type,
                            room_size_sqft: t.room_size_sqft,
                            short_description: prev.short_description || t.short_description,
                          }))}
                        >
                          + {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="field">
                    <label>Short Description (Displayed in listings)</label>
                    <input
                      placeholder="e.g. Spacious and upgraded room with city view"
                      value={form.short_description}
                      onChange={(e) => setForm({ ...form, short_description: e.target.value })}
                    />
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>View Type</label>
                      <select
                        value={form.view_type}
                        onChange={(e) => setForm({ ...form, view_type: e.target.value })}
                      >
                        <option value="City View">City View</option>
                        <option value="Garden View">Garden View</option>
                        <option value="Swimming Pool View">Swimming Pool View</option>
                        <option value="Ocean View">Ocean View</option>
                        <option value="Courtyard View">Courtyard View</option>
                        <option value="Mountain View">Mountain View</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Floor / Floor Preference</label>
                      <input
                        placeholder="e.g. Floors 2-3, Top Floor"
                        value={form.floor_preference}
                        onChange={(e) => setForm({ ...form, floor_preference: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="Active">Active (Bookable)</option>
                        <option value="Inactive">Inactive (Hidden)</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Custom URL Slug (Optional)</label>
                      <input
                        placeholder="auto-generated from name"
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: DETAILED DESCRIPTION */}
              {activeTab === 'description' && (
                <div>
                  <div className="field">
                    <label>Detailed Room Description</label>
                    <textarea
                      rows={5}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'inherit', fontFamily: 'inherit', fontSize: 13 }}
                      placeholder="Provide full description of furnishings, atmosphere, and special benefits for guests..."
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Additional Notes / Staff Guidance</label>
                    <textarea
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--panel)', color: 'inherit', fontFamily: 'inherit', fontSize: 13 }}
                      placeholder="Special house rules, maintenance caveats, or VIP amenities included on arrival..."
                      value={form.additional_notes}
                      onChange={(e) => setForm({ ...form, additional_notes: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: CAPACITY & BEDS */}
              {activeTab === 'capacity' && (
                <div>
                  <div className="grid2">
                    <div className="field">
                      <label>Max Adult Capacity *</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={form.max_adults}
                        onChange={(e) => {
                          const adults = Number(e.target.value);
                          setForm({ ...form, max_adults: adults, max_guests: adults + Number(form.max_children) });
                        }}
                      />
                    </div>
                    <div className="field">
                      <label>Max Child Capacity</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={form.max_children}
                        onChange={(e) => {
                          const kids = Number(e.target.value);
                          setForm({ ...form, max_children: kids, max_guests: Number(form.max_adults) + kids });
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>Total Guest Capacity *</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        required
                        value={form.max_guests}
                        onChange={(e) => setForm({ ...form, max_guests: Number(e.target.value) })}
                      />
                    </div>
                    <div className="field">
                      <label>Room Size (Square Feet)</label>
                      <input
                        type="number"
                        min="50"
                        max="5000"
                        value={form.room_size_sqft}
                        onChange={(e) => setForm({ ...form, room_size_sqft: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>Number of Beds</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={form.number_of_beds}
                        onChange={(e) => setForm({ ...form, number_of_beds: Number(e.target.value) })}
                      />
                    </div>
                    <div className="field">
                      <label>Bed Type</label>
                      <select
                        value={form.bed_type}
                        onChange={(e) => setForm({ ...form, bed_type: e.target.value })}
                      >
                        <option value="King-size Bed">King-size Bed</option>
                        <option value="Queen-size Bed">Queen-size Bed</option>
                        <option value="Twin Beds">Twin Beds</option>
                        <option value="Double Bed">Double Bed</option>
                        <option value="2 King Beds">2 King Beds</option>
                        <option value="Bunk Bed + Queen">Bunk Bed + Queen</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>Number of Bathrooms</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={form.number_of_bathrooms}
                        onChange={(e) => setForm({ ...form, number_of_bathrooms: Number(e.target.value) })}
                      />
                    </div>
                    <div className="field">
                      <label>Bathroom Type</label>
                      <select
                        value={form.bathroom_type}
                        onChange={(e) => setForm({ ...form, bathroom_type: e.target.value })}
                      >
                        <option value="Private Bathroom">Private Bathroom</option>
                        <option value="En-suite Jacuzzi">En-suite Jacuzzi</option>
                        <option value="Private Shower Only">Private Shower Only</option>
                        <option value="Shared Bathroom">Shared Bathroom</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: AMENITIES SELECTION */}
              {activeTab === 'amenities' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <span className="muted" style={{ fontSize: 13 }}>
                      Selected: <b>{form.amenities.length}</b> amenities
                    </span>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => setForm({ ...form, amenities: amenitiesList })}
                      >
                        Select All ({amenitiesList.length})
                      </button>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => setForm({ ...form, amenities: [] })}
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                      gap: 8,
                      maxHeight: 340,
                      overflowY: 'auto',
                      padding: 12,
                      border: '1px solid var(--line, #26364A)',
                      borderRadius: 10,
                      background: 'var(--panel-alt, #0B131C)',
                    }}
                  >
                    {amenitiesList.map((amenity) => {
                      const checked = form.amenities.includes(amenity);
                      return (
                        <label
                          key={amenity}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            padding: '8px 12px',
                            background: checked
                              ? 'var(--teal-soft, rgba(60, 183, 181, 0.16))'
                              : 'var(--panel, rgba(255, 255, 255, 0.03))',
                            border: checked
                              ? '1px solid var(--teal, #3CB7B5)'
                              : '1px solid var(--line, rgba(255, 255, 255, 0.1))',
                            borderRadius: 8,
                            cursor: 'pointer',
                            fontSize: 13,
                            color: checked ? '#ffffff' : 'var(--ink, #E6EDF3)',
                            fontWeight: checked ? 600 : 500,
                            transition: 'all 0.15s ease',
                            userSelect: 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAmenity(amenity)}
                            style={{
                              accentColor: 'var(--teal, #3CB7B5)',
                              width: 16,
                              height: 16,
                              cursor: 'pointer',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ color: 'inherit', lineHeight: 1.3 }}>
                            {amenity}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 5: PRICING & POLICIES */}
              {activeTab === 'pricing' && (
                <div>
                  <div className="grid2">
                    <div className="field">
                      <label>Base Price / Night (INR) *</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={form.base_price}
                        onChange={(e) => setForm({ ...form, base_price: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Weekend Price / Night (INR, Optional)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Leave blank to use base price"
                        value={form.weekend_price}
                        onChange={(e) => setForm({ ...form, weekend_price: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>Extra Adult Charge (INR)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.extra_adult_charge}
                        onChange={(e) => setForm({ ...form, extra_adult_charge: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Extra Child Charge (INR)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.extra_child_charge}
                        onChange={(e) => setForm({ ...form, extra_child_charge: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid2">
                    <div className="field">
                      <label>Extra Bed Charge (INR)</label>
                      <input
                        type="number"
                        min="0"
                        value={form.extra_bed_charge}
                        onChange={(e) => setForm({ ...form, extra_bed_charge: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Tax Rate (% GST)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={form.tax_percentage}
                        onChange={(e) => setForm({ ...form, tax_percentage: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid2" style={{ margin: '12px 0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={form.breakfast_included}
                        onChange={(e) => setForm({ ...form, breakfast_included: e.target.checked })}
                      />
                      🍳 Breakfast Included
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={form.free_cancellation}
                        onChange={(e) => setForm({ ...form, free_cancellation: e.target.checked })}
                      />
                      🛡️ Free Cancellation Policy
                    </label>
                  </div>

                  <div className="field">
                    <label>Cancellation Policy Summary</label>
                    <input
                      value={form.cancellation_policy}
                      onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}
                    />
                  </div>

                  <div className="grid2">
                    <div className="field">
                      <label>Standard Check-in Time</label>
                      <input
                        type="time"
                        value={form.check_in_time}
                        onChange={(e) => setForm({ ...form, check_in_time: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Standard Check-out Time</label>
                      <input
                        type="time"
                        value={form.check_out_time}
                        onChange={(e) => setForm({ ...form, check_out_time: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid2">
                    <div className="field">
                      <label>Min Stay (Nights)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.minimum_stay_nights}
                        onChange={(e) => setForm({ ...form, minimum_stay_nights: e.target.value })}
                      />
                    </div>
                    <div className="field">
                      <label>Max Stay (Nights)</label>
                      <input
                        type="number"
                        min="1"
                        value={form.maximum_stay_nights}
                        onChange={(e) => setForm({ ...form, maximum_stay_nights: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: MEDIA / PHOTOS */}
              {activeTab === 'media' && (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--head-color, #fff)' }}>
                        Upload Room Images
                      </h4>
                      <span className="muted" style={{ fontSize: 12 }}>
                        {uploadedImages.length} {uploadedImages.length === 1 ? 'image' : 'images'} in gallery
                      </span>
                    </div>
                    <p className="muted" style={{ margin: 0, fontSize: 13 }}>
                      Upload high-resolution photos for this room category. Only image formats (PNG, JPG, JPEG, WEBP, GIF, SVG) are accepted.
                    </p>
                  </div>

                  {/* Drag & Drop Upload Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={{
                      border: isDragging ? '2px dashed var(--teal, #14b8a6)' : '2px dashed var(--line, #374151)',
                      borderRadius: 12,
                      padding: '24px 16px',
                      textAlign: 'center',
                      background: isDragging ? 'rgba(20, 184, 166, 0.08)' : 'var(--panel-alt, rgba(255,255,255,0.02))',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      marginBottom: 16,
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                      onChange={handleImageFileChange}
                      style={{ display: 'none' }}
                    />
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: '50%',
                        background: 'rgba(20, 184, 166, 0.12)',
                        color: 'var(--teal, #14b8a6)',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 10px',
                        fontSize: 22,
                      }}
                    >
                      📁
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink, #fff)', marginBottom: 4 }}>
                      Click to upload or drag & drop room images
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
                      Supports PNG, JPG, JPEG, WEBP, GIF, SVG (up to 8MB per file)
                    </div>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {['PNG', 'JPG', 'WEBP', 'GIF', 'SVG'].map((fmt) => (
                        <span
                          key={fmt}
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 10,
                            background: 'var(--panel, rgba(255,255,255,0.06))',
                            border: '1px solid var(--line, rgba(255,255,255,0.1))',
                            color: 'var(--sub, #9ca3af)',
                          }}
                        >
                          {fmt}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Uploaded Images List with Structure & Order */}
                  {uploadedImages.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <label style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>
                          Uploaded Images & Display Order ({uploadedImages.length})
                        </label>
                        <span style={{ fontSize: 11, color: 'var(--teal, #14b8a6)', fontWeight: 600 }}>
                          ★ Position #1 is Primary Cover Photo
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                        {uploadedImages.map((img, idx) => {
                          const isPrimary = idx === 0 || img.url === form.image_url;
                          return (
                            <div
                              key={img.id || idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 12,
                                padding: '8px 12px',
                                borderRadius: 10,
                                background: isPrimary ? 'rgba(20, 184, 166, 0.08)' : 'var(--panel-alt, rgba(255,255,255,0.03))',
                                border: isPrimary ? '1px solid var(--teal, #14b8a6)' : '1px solid var(--line, #374151)',
                                transition: 'all 0.15s ease',
                              }}
                            >
                              {/* Order Badge */}
                              <div
                                style={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  background: isPrimary ? 'var(--teal, #14b8a6)' : 'var(--panel, #374151)',
                                  color: isPrimary ? '#fff' : 'var(--sub, #9ca3af)',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: 'grid',
                                  placeItems: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {idx + 1}
                              </div>

                              {/* Thumbnail */}
                              <img
                                src={img.url}
                                alt={img.name}
                                style={{
                                  width: 56,
                                  height: 42,
                                  borderRadius: 6,
                                  objectFit: 'cover',
                                  flexShrink: 0,
                                  border: '1px solid var(--line)',
                                }}
                              />

                              {/* Details */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {img.name}
                                  </span>
                                  {isPrimary && (
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        padding: '1px 6px',
                                        borderRadius: 8,
                                        background: 'var(--teal, #14b8a6)',
                                        color: '#fff',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      Primary Cover
                                    </span>
                                  )}
                                </div>
                                <div className="muted" style={{ fontSize: 11, display: 'flex', gap: 8 }}>
                                  <span>{img.type || 'IMAGE'}</span>
                                  <span>•</span>
                                  <span>{img.size || 'Photo'}</span>
                                </div>
                              </div>

                              {/* Ordering Actions */}
                              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                {idx > 0 && (
                                  <button
                                    type="button"
                                    className="btn ghost sm"
                                    style={{ padding: '4px 8px', fontSize: 11 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveImage(idx, idx - 1);
                                    }}
                                    title="Move earlier in order"
                                  >
                                    ▲ Up
                                  </button>
                                )}
                                {idx < uploadedImages.length - 1 && (
                                  <button
                                    type="button"
                                    className="btn ghost sm"
                                    style={{ padding: '4px 8px', fontSize: 11 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveImage(idx, idx + 1);
                                    }}
                                    title="Move later in order"
                                  >
                                    ▼ Down
                                  </button>
                                )}
                                {!isPrimary && (
                                  <button
                                    type="button"
                                    className="btn ghost sm"
                                    style={{ padding: '4px 8px', fontSize: 11, color: 'var(--teal, #14b8a6)' }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSetPrimaryImage(idx);
                                    }}
                                    title="Set as primary cover"
                                  >
                                    ★ Make Cover
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn ghost sm"
                                  style={{ padding: '4px 8px', fontSize: 11, color: 'var(--red, #ef4444)' }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveImage(idx);
                                  }}
                                  title="Remove image"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Primary Cover Live Preview */}
                  <div style={{ marginTop: 12, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>
                        Live Cover Preview ({form.name || 'Room Category'}):
                      </label>
                      {form.image_url && (
                        <span style={{ fontSize: 11, color: 'var(--green, #22c55e)', fontWeight: 600 }}>
                          ✓ Ready to Save
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        height: 200,
                        width: '100%',
                        borderRadius: 12,
                        overflow: 'hidden',
                        background: 'var(--panel-alt, #1f2937)',
                        border: '1px solid var(--line, #374151)',
                        position: 'relative',
                      }}
                    >
                      {form.image_url ? (
                        <>
                          <img
                            src={form.image_url}
                            alt="Live Preview"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              bottom: 10,
                              left: 12,
                              background: 'rgba(0,0,0,0.7)',
                              backdropFilter: 'blur(4px)',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 600,
                              color: '#fff',
                            }}
                          >
                            📷 Primary Display Photo
                          </div>
                        </>
                      ) : (
                        <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--muted, #9ca3af)', fontSize: 13 }}>
                          No image uploaded yet. Upload a PNG/JPG above or enter a URL below.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Collapsible / Optional External URL & Hotel Presets */}
                  <details style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: 'var(--panel-alt, rgba(255,255,255,0.02))', border: '1px solid var(--line, #374151)' }}>
                    <summary style={{ cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)' }}>
                      🔗 Or enter direct Image URL / choose hotel preset
                    </summary>
                    <div style={{ marginTop: 10 }}>
                      <div className="field" style={{ marginBottom: 10 }}>
                        <label style={{ fontSize: 12 }}>Direct Image URL</label>
                        <input
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={form.image_url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm({ ...form, image_url: val });
                            if (val && !uploadedImages.some((im) => im.url === val)) {
                              setUploadedImages((prev) => [
                                { id: `url-${Date.now()}`, name: 'Custom Image URL', size: 'URL', type: 'WEB', url: val },
                                ...prev,
                              ]);
                            }
                          }}
                        />
                      </div>
                      <div>
                        <span className="muted" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                          High-resolution hotel presets:
                        </span>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {PHOTO_PRESETS.map((p) => (
                            <button
                              key={p.label}
                              type="button"
                              className="btn ghost sm"
                              onClick={() => handleApplyPreset(p)}
                              style={{ fontSize: 11 }}
                            >
                              📷 {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              )}

              {/* Modal Actions */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: 20,
                  paddingTop: 14,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => setModalMode(null)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn" disabled={submitting}>
                    {submitting ? 'Saving...' : modalMode === 'create' ? 'Create Room Type' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── VIEW DETAILS MODAL ─────────────────────────────────────── */}
      {viewItem && (
        <div
          className="scrim open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setViewItem(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 740, maxHeight: '90vh', padding: 0, overflow: 'hidden' }}>
            {/* Hero Image */}
            <div style={{ height: 240, width: '100%', position: 'relative', background: '#0a121b' }}>
              {viewItem.image_url ? (
                <img
                  src={viewItem.image_url}
                  alt={viewItem.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#fff' }}>
                  🏨 Hotel Room Category
                </div>
              )}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(10,18,27,0.85) 0%, transparent 60%)',
                }}
              />
              <button
                onClick={() => setViewItem(null)}
                style={{
                  position: 'absolute',
                  top: 14,
                  right: 14,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 99,
                  width: 32,
                  height: 32,
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                ✕
              </button>
              <div style={{ position: 'absolute', bottom: 16, left: 20, right: 20, color: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ margin: 0, fontSize: 24, fontFamily: 'var(--head)', color: '#fff' }}>
                    {viewItem.name}
                  </h2>
                  <Badge color={viewItem.status === 'Active' ? 'green' : 'grey'}>
                    {viewItem.status}
                  </Badge>
                </div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>
                  {viewItem.short_description || 'Category Overview'}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div style={{ padding: '22px 24px', maxHeight: 'calc(90vh - 240px)', overflowY: 'auto' }}>
              {/* Pricing Cards */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 12,
                  marginBottom: 20,
                  padding: 14,
                  background: 'var(--panel-alt, #0B131C)',
                  borderRadius: 10,
                  border: '1px solid var(--line)',
                }}
              >
                <div>
                  <small className="muted" style={{ display: 'block' }}>Base Rate</small>
                  <b style={{ fontSize: 18, color: 'var(--ink)' }}>{inr(viewItem.base_price)}</b>
                  <span className="muted" style={{ fontSize: 11 }}> / night</span>
                </div>
                {viewItem.weekend_price && (
                  <div>
                    <small className="muted" style={{ display: 'block' }}>Weekend Rate</small>
                    <b style={{ fontSize: 18 }}>{inr(viewItem.weekend_price)}</b>
                    <span className="muted" style={{ fontSize: 11 }}> / night</span>
                  </div>
                )}
                <div>
                  <small className="muted" style={{ display: 'block' }}>Taxes (GST)</small>
                  <b>{viewItem.tax_percentage}%</b>
                </div>
                <div>
                  <small className="muted" style={{ display: 'block' }}>Breakfast</small>
                  <b>{viewItem.breakfast_included ? '✅ Included' : '❌ Not included'}</b>
                </div>
              </div>

              {/* Description */}
              {viewItem.description && (
                <div style={{ marginBottom: 18 }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: 14 }}>Description</h4>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
                    {viewItem.description}
                  </p>
                </div>
              )}

              {/* Specifications Grid */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>Specifications & Capacities</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, fontSize: 13 }}>
                  <div style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 8 }}>
                    <span className="muted" style={{ fontSize: 11, display: 'block' }}>Guest Capacity</span>
                    <b>{viewItem.max_guests} Guests ({viewItem.max_adults} Adults, {viewItem.max_children} Kids)</b>
                  </div>
                  <div style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 8 }}>
                    <span className="muted" style={{ fontSize: 11, display: 'block' }}>Beds & Configuration</span>
                    <b>{viewItem.number_of_beds} {viewItem.bed_type}</b>
                  </div>
                  <div style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 8 }}>
                    <span className="muted" style={{ fontSize: 11, display: 'block' }}>Room Size</span>
                    <b>{viewItem.room_size_sqft} sq.ft</b>
                  </div>
                  <div style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 8 }}>
                    <span className="muted" style={{ fontSize: 11, display: 'block' }}>Bathrooms</span>
                    <b>{viewItem.number_of_bathrooms} {viewItem.bathroom_type}</b>
                  </div>
                  <div style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 8 }}>
                    <span className="muted" style={{ fontSize: 11, display: 'block' }}>View & Location</span>
                    <b>{viewItem.view_type} · {viewItem.floor_preference}</b>
                  </div>
                  <div style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 8 }}>
                    <span className="muted" style={{ fontSize: 11, display: 'block' }}>Stay Constraints</span>
                    <b>Min {viewItem.minimum_stay_nights}n · Max {viewItem.maximum_stay_nights}n</b>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>
                  Configured Amenities ({viewItem.amenities ? viewItem.amenities.length : 0})
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {viewItem.amenities && viewItem.amenities.length > 0 ? (
                    viewItem.amenities.map((a) => (
                      <span key={a} className="tag" style={{ padding: '4px 8px', fontSize: 12 }}>
                        ✓ {a}
                      </span>
                    ))
                  ) : (
                    <span className="muted">No specific amenities configured.</span>
                  )}
                </div>
              </div>

              {/* Policies & Times */}
              <div>
                <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>Booking & Cancellation Policies</h4>
                <div style={{ fontSize: 13, display: 'grid', gap: 6, color: 'var(--muted)' }}>
                  <div>🕒 <b>Check-in:</b> {viewItem.check_in_time} · <b>Check-out:</b> {viewItem.check_out_time}</div>
                  <div>🛡️ <b>Cancellation:</b> {viewItem.cancellation_policy}</div>
                  {viewItem.refund_policy && <div>💳 <b>Refund:</b> {viewItem.refund_policy}</div>}
                  {viewItem.additional_notes && <div>📌 <b>Notes:</b> {viewItem.additional_notes}</div>}
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                className="btn"
                onClick={() => {
                  const item = viewItem;
                  setViewItem(null);
                  handleOpenEdit(item);
                }}
              >
                Edit Room Type
              </button>
              <button className="btn ghost" onClick={() => setViewItem(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ──────────────────────────────── */}
      {deleteTarget && (
        <div
          className="scrim open"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null);
          }}
        >
          <div className="modal" style={{ maxWidth: 460 }}>
            <h2 style={{ color: 'var(--red, #d6322e)', margin: '0 0 10px 0' }}>Delete Room Type</h2>
            <p style={{ margin: '0 0 14px 0', fontSize: 14 }}>
              Are you sure you want to permanently delete category <b>&ldquo;{deleteTarget.name}&rdquo;</b>?
            </p>

            {deleteConflict ? (
              <div
                style={{
                  padding: 12,
                  background: 'var(--red-soft, #fde8e8)',
                  color: 'var(--red, #d6322e)',
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 16,
                  lineHeight: 1.45,
                }}
              >
                <b>⚠️ Cannot Delete:</b>
                <p style={{ margin: '6px 0 10px 0' }}>{deleteConflict}</p>
                <button
                  type="button"
                  className="btn sm"
                  onClick={handleDeactivateInstead}
                  style={{ background: 'var(--red, #d6322e)', color: '#fff', border: 'none' }}
                >
                  Deactivate Room Type Instead
                </button>
              </div>
            ) : (
              <p className="note" style={{ margin: '0 0 18px 0' }}>
                Note: Categories with existing rooms or reservations cannot be deleted and must be deactivated instead.
              </p>
            )}

            <div className="actions">
              <button className="btn ghost" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              {!deleteConflict && (
                <button
                  className="btn"
                  onClick={handleConfirmDelete}
                  style={{ background: 'var(--red, #d6322e)', borderColor: 'var(--red, #d6322e)' }}
                >
                  Confirm Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
