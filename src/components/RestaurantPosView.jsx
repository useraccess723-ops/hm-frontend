import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';
import { useRbac } from '../context/RbacContext';
import { api } from '../services/api';
import { inr } from '../utils/format';
import PageHead from './PageHead';
import SubNav from './SubNav';
import { StatusBadge } from './Badge';

// ── Standard Restaurant Tables Definition ──
const RESTAURANT_TABLES = [
  { id: 'T-01', name: 'Table T-01', capacity: 2, zone: 'Indoor Fine Dining', defaultServer: 'Rohan' },
  { id: 'T-02', name: 'Table T-02', capacity: 4, zone: 'Indoor Fine Dining', defaultServer: 'Anita' },
  { id: 'T-03', name: 'Table T-03', capacity: 4, zone: 'Indoor Fine Dining', defaultServer: 'Rohan' },
  { id: 'T-04', name: 'Table T-04', capacity: 6, zone: 'Family Dining Booth', defaultServer: 'Rohan' },
  { id: 'T-05', name: 'Table T-05', capacity: 2, zone: 'Window View', defaultServer: 'Sunil' },
  { id: 'T-06', name: 'Table T-06', capacity: 4, zone: 'Window View', defaultServer: 'Sunil' },
  { id: 'T-07', name: 'Table T-07', capacity: 6, zone: 'Private Dining Room', defaultServer: 'Anita' },
  { id: 'T-08', name: 'Table T-08', capacity: 8, zone: 'Royal Banquet Alcove', defaultServer: 'Sunil' },
  { id: 'T-09', name: 'Table T-09', capacity: 2, zone: 'Terrace Garden Patio', defaultServer: 'Vikram' },
  { id: 'T-10', name: 'Table T-10', capacity: 4, zone: 'Terrace Garden Patio', defaultServer: 'Vikram' },
  { id: 'T-11', name: 'Table T-11', capacity: 4, zone: 'Terrace Garden Patio', defaultServer: 'Sunil' },
  { id: 'T-12', name: 'Table T-12', capacity: 2, zone: 'Polo Bar & Lounge', defaultServer: 'Anita' },
];

// ── Curated Restaurant Menu ──
const MENU_ITEMS = [
  { id: 'm1', name: 'Royal Murgh Dum Biryani', category: 'Main Course', price: 850, icon: '🍗' },
  { id: 'm2', name: 'Dal Makhani Signature', category: 'Main Course', price: 650, icon: '🍲' },
  { id: 'm3', name: 'Paneer Tikka Platter', category: 'Starters', price: 420, icon: '🧀' },
  { id: 'm4', name: 'Butter Garlic Naan (2 pcs)', category: 'Breads', price: 180, icon: '🫓' },
  { id: 'm5', name: 'Tandoori Roti (2 pcs)', category: 'Breads', price: 120, icon: '🫓' },
  { id: 'm6', name: 'Grilled Atlantic Salmon', category: 'Continental', price: 2400, icon: '🐟' },
  { id: 'm7', name: 'Classic Caesar Salad', category: 'Starters', price: 450, icon: '🥗' },
  { id: 'm8', name: 'Lobster Thermidor', category: 'Continental', price: 2400, icon: '🦞' },
  { id: 'm9', name: 'Truffle Mushroom Risotto', category: 'Continental', price: 890, icon: '🍄' },
  { id: 'm10', name: 'Artisan Cappuccino', category: 'Beverages', price: 240, icon: '☕' },
  { id: 'm11', name: 'Masala Chai Pot', category: 'Beverages', price: 180, icon: '🫖' },
  { id: 'm12', name: 'Fresh Seasonal Juice', category: 'Beverages', price: 250, icon: '🍹' },
  { id: 'm13', name: 'Belgian Chocolate Tart', category: 'Desserts', price: 345, icon: '🍫' },
  { id: 'm14', name: 'Gulab Jamun with Rabri', category: 'Desserts', price: 280, icon: '🍨' },
];

export default function RestaurantPosView() {
  const navigate = useNavigate();
  const { user, notify } = useStore();
  const { canCreate, canEdit, canExport } = useRbac();

  // Active view: 'table-layout' or 'kot-list'
  const [activeTab, setActiveTab] = useState('kot-list');
  const [kotOrders, setKotOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tableFilter, setTableFilter] = useState('all');

  // New KOT Modal State
  const [newKotModalOpen, setNewKotModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState('Table T-01');
  const [orderCart, setOrderCart] = useState({});
  const [chefNotes, setChefNotes] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItems, setCustomItems] = useState([]);
  const [submittingKot, setSubmittingKot] = useState(false);

  // Bill / KOT Print Receipt Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState(null);

  const [dbServers, setDbServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState('');

  // Next auto-generated KOT number
  const nextKotNumber = useMemo(() => {
    const existingNums = kotOrders
      .map((k) => {
        const num = String(k.title || k.data?.['KOT #'] || '').replace(/\D/g, '');
        return parseInt(num, 10);
      })
      .filter((n) => !isNaN(n) && n > 0);
    const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 843;
    return `KOT-${maxNum + 1}`;
  }, [kotOrders]);

  // Logged in server assignment (automatic)
  const currentServerName = useMemo(() => {
    const name = user?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'Server');
    return name.includes('(Server)') ? name : `${name} (Server)`;
  }, [user]);

  // Load KOT Orders and Staff Directory from backend
  const loadKotOrders = useCallback(async () => {
    try {
      setLoading(true);
      // Try dedicated POS endpoint first, then fallback to /api/records
      let data = null;
      try {
        data = await api('/api/pos/kot-orders');
      } catch (_) {
        data = await api('/api/records?category=food-beverage_restaurant-pos');
      }

      // Also query registered Server / Waiter staff from staff directory
      try {
        const staffData = await api('/api/records?category=staff_directory');
        if (Array.isArray(staffData)) {
          const found = staffData
            .map((rec) => {
              const d = rec.data || {};
              const role = String(d.Role || d.role || '').trim();
              const dept = String(d.Department || d.department || '').trim();
              const name = String(d.Name || d.name || rec.title || '').trim();
              return { name, role, dept };
            })
            .filter((st) => {
              const r = st.role.toLowerCase();
              const d = st.dept.toLowerCase();
              return r.includes('server') || r.includes('waiter') || d.includes('food') || d.includes('beverage');
            })
            .map((st) => {
              const displayName = st.name.includes('(Server)') ? st.name : `${st.name} (Server)`;
              return { name: displayName, source: 'db', role: st.role, dept: st.dept };
            });
          setDbServers(found);
        }
      } catch (staffErr) {
        console.warn('Notice loading staff servers:', staffErr);
      }

      if (Array.isArray(data) && data.length > 0) {
        setKotOrders(data);
      } else {
        // Fallback default starter rows if database has not returned any
        const fallbackKots = [
          {
            id: 'fb-841',
            title: 'KOT-841',
            status: 'Cooking in Kitchen',
            data: {
              'KOT #': 'KOT-841',
              'Table #': 'Table T-04',
              'Server': 'Rohan (Server)',
              'Ordered Items': '2x Dum Biryani, 1x Paneer Tikka, 2x Garlic Naan',
              'Amount (₹)': '₹2,450',
              'Amount': 2450,
              'Time Placed': '12 mins ago',
              'KOT Status': 'Cooking in Kitchen',
            },
          },
          {
            id: 'fb-842',
            title: 'KOT-842',
            status: 'Ready to Serve',
            data: {
              'KOT #': 'KOT-842',
              'Table #': 'Table T-11',
              'Server': 'Sunil (Server)',
              'Ordered Items': '1x Grilled Atlantic Salmon, 1x Caesar Salad',
              'Amount (₹)': '₹3,200',
              'Amount': 3200,
              'Time Placed': '25 mins ago',
              'KOT Status': 'Ready to Serve',
            },
          },
          {
            id: 'fb-843',
            title: 'KOT-843',
            status: 'Beverage Bar',
            data: {
              'KOT #': 'KOT-843',
              'Table #': 'Table T-02',
              'Server': 'Anita (Server)',
              'Ordered Items': '4x Cappuccino, 2x Belgian Chocolate Tart',
              'Amount (₹)': '₹1,650',
              'Amount': 1650,
              'Time Placed': '5 mins ago',
              'KOT Status': 'Beverage Bar',
            },
          },
        ];
        setKotOrders(fallbackKots);
      }
    } catch (err) {
      console.warn('Notice loading KOT orders:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKotOrders();
  }, [loadKotOrders]);

  // Compute table status & active KOT for each restaurant table
  const tablesWithStatus = useMemo(() => {
    return RESTAURANT_TABLES.map((t) => {
      // Find active KOT matching this table
      const activeKot = kotOrders.find((k) => {
        const kTable = String(k.data?.['Table #'] || k.data?.table_number || '').trim().toLowerCase();
        const tName = t.name.toLowerCase();
        const tId = t.id.toLowerCase();
        const matches = kTable === tName || kTable === tId || kTable.includes(tId);
        const status = (k.status || k.data?.['KOT Status'] || '').toLowerCase();
        const isActive = status !== 'served & settled' && status !== 'void' && status !== 'cancelled' && status !== 'settled';
        return matches && isActive;
      });

      if (activeKot) {
        return {
          ...t,
          status: activeKot.status === 'Ready to Serve' ? 'Ready to Serve' : 'Occupied',
          activeKot,
          server: activeKot.data?.Server || activeKot.data?.server || t.defaultServer,
          orderSummary: activeKot.data?.['Ordered Items'] || activeKot.data?.ordered_items || 'Active Order',
          amount: activeKot.data?.['Amount (₹)'] || (activeKot.data?.Amount ? inr(activeKot.data.Amount) : '₹0'),
          timePlaced: activeKot.data?.['Time Placed'] || 'Recently',
        };
      }

      return {
        ...t,
        status: 'Available',
        activeKot: null,
        server: t.defaultServer,
        orderSummary: 'No active orders',
        amount: '₹0',
        timePlaced: null,
      };
    });
  }, [kotOrders]);

  // Total calculated cart amount
  const calculatedCartTotal = useMemo(() => {
    let total = 0;
    // Standard menu items
    for (const [itemId, qty] of Object.entries(orderCart)) {
      if (qty > 0) {
        const item = MENU_ITEMS.find((m) => m.id === itemId);
        if (item) total += item.price * qty;
      }
    }
    // Custom items
    for (const ci of customItems) {
      total += (ci.price || 0) * (ci.qty || 1);
    }
    return total;
  }, [orderCart, customItems]);

  // Identified Server / Waiter pool (automatically combined from DB, logged-in user, and floor servers)
  const identifiedServers = useMemo(() => {
    const map = new Map();
    // 1. Current logged-in user
    const myName = user?.full_name || user?.name || (user?.email ? user.email.split('@')[0] : 'Server');
    const myServer = myName.includes('(Server)') ? myName : `${myName} (Server)`;
    map.set(myServer, { name: myServer, source: 'user' });

    // 2. Staff members saved in database with Server / Waiter role
    dbServers.forEach((s) => {
      map.set(s.name, s);
    });

    // 3. Fallback active restaurant floor servers
    ['Rohan (Server)', 'Anita (Server)', 'Sunil (Server)', 'Vikram (Server)'].forEach((s) => {
      if (!map.has(s)) {
        map.set(s, { name: s, source: 'default' });
      }
    });

    return Array.from(map.values());
  }, [user, dbServers]);

  // Open New KOT Order Modal
  const openNewKotModal = (preselectedTable = null) => {
    const tbl = preselectedTable || (tablesWithStatus.find((t) => t.status === 'Available')?.name || 'Table T-01');
    setSelectedTable(tbl);

    // Auto-detect server for table: check table's default/assigned server or first DB Server / Waiter
    const targetTableObj = tablesWithStatus.find((t) => t.name === tbl);
    const tableServer = targetTableObj ? targetTableObj.server : null;
    const defaultServer = (tableServer && identifiedServers.some(s => s.name === tableServer))
      ? tableServer
      : (identifiedServers[0]?.name || currentServerName);

    setSelectedServer(defaultServer);
    setOrderCart({ m1: 1, m3: 1 });
    setCustomItems([]);
    setChefNotes('');
    setNewKotModalOpen(true);
  };

  const handleTableChange = (newTable) => {
    setSelectedTable(newTable);
    const targetTableObj = tablesWithStatus.find((t) => t.name === newTable);
    if (targetTableObj?.server) {
      const match = identifiedServers.find(s => s.name.toLowerCase().includes(targetTableObj.server.toLowerCase()));
      if (match) setSelectedServer(match.name);
    }
  };

  // Add Custom Item to order
  const handleAddCustomItem = () => {
    const name = customItemName.trim();
    const price = parseFloat(customItemPrice);
    if (!name || isNaN(price) || price <= 0) {
      notify('Please enter a valid item name and price');
      return;
    }
    setCustomItems((prev) => [...prev, { id: `custom-${Date.now()}`, name, price, qty: 1 }]);
    setCustomItemName('');
    setCustomItemPrice('');
  };

  // Submit New KOT Order
  const handleCreateKotSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    // Check if at least one item is in the cart
    const activeItems = [];
    for (const [id, qty] of Object.entries(orderCart)) {
      if (qty > 0) {
        const item = MENU_ITEMS.find((m) => m.id === id);
        if (item) activeItems.push({ name: item.name, qty, price: item.price });
      }
    }
    for (const ci of customItems) {
      activeItems.push({ name: ci.name, qty: ci.qty || 1, price: ci.price });
    }

    if (activeItems.length === 0) {
      notify('Please select at least one menu item for this KOT');
      return;
    }

    setSubmittingKot(true);
    const orderedSummary = activeItems.map((it) => `${it.qty}x ${it.name}`).join(', ');
    const kotId = nextKotNumber;

    const payload = {
      category: 'food-beverage_restaurant-pos',
      title: kotId,
      status: 'Cooking in Kitchen',
      data: {
        'KOT #': kotId,
        'Table #': selectedTable,
        'Server': selectedServer || currentServerName,
        'Ordered Items': orderedSummary,
        'Amount (₹)': inr(calculatedCartTotal),
        'Amount': calculatedCartTotal,
        'Time Placed': 'Just now',
        'KOT Status': 'Cooking in Kitchen',
        items: activeItems,
        notes: chefNotes.trim(),
      },
    };

    try {
      // Send to backend SQL database
      let res = null;
      try {
        res = await api('/api/pos/kot-orders', {
          method: 'POST',
          body: payload.data,
        });
      } catch (_) {
        // Fallback to /api/records
        res = await api('/api/records', {
          method: 'POST',
          body: payload,
        });
      }

      notify(`Kitchen Order Ticket ${kotId} sent to kitchen for ${selectedTable}!`);
      setNewKotModalOpen(false);
      setOrderCart({});
      setCustomItems([]);
      setChefNotes('');

      // Reload fresh records from database
      await loadKotOrders();
    } catch (err) {
      notify(err.message || 'Failed to create KOT order');
    } finally {
      setSubmittingKot(false);
    }
  };

  // Update KOT Status (e.g. Cooking in Kitchen -> Ready to Serve -> Served & Settled)
  const handleUpdateKotStatus = async (recordId, newStatus, tableNum) => {
    try {
      try {
        await api(`/api/pos/kot-orders/${recordId}/status`, {
          method: 'PATCH',
          body: { status: newStatus },
        });
      } catch (_) {
        await api(`/api/records/${recordId}`, {
          method: 'PUT',
          body: { status: newStatus },
        });
      }

      notify(`Updated ${tableNum} KOT status to "${newStatus}"`);
      await loadKotOrders();
    } catch (err) {
      notify(err.message || 'Failed to update KOT status');
    }
  };

  // Open Receipt Print Modal
  const openPrintReceipt = (order) => {
    setReceiptOrder(order);
    setPrintModalOpen(true);
  };

  // Filtered tables for Table Layout View
  const filteredTables = useMemo(() => {
    if (tableFilter === 'all') return tablesWithStatus;
    if (tableFilter === 'available') return tablesWithStatus.filter((t) => t.status === 'Available');
    if (tableFilter === 'occupied') return tablesWithStatus.filter((t) => t.status === 'Occupied' || t.status === 'Ready to Serve');
    if (tableFilter === 'ready') return tablesWithStatus.filter((t) => t.status === 'Ready to Serve');
    if (tableFilter === 'indoor') return tablesWithStatus.filter((t) => t.zone.includes('Indoor') || t.zone.includes('Window') || t.zone.includes('Booth') || t.zone.includes('Private') || t.zone.includes('Alcove'));
    if (tableFilter === 'terrace') return tablesWithStatus.filter((t) => t.zone.includes('Terrace') || t.zone.includes('Lounge'));
    return tablesWithStatus;
  }, [tablesWithStatus, tableFilter]);

  // Filtered KOTs for Table View
  const filteredKots = useMemo(() => {
    if (!searchQuery.trim()) return kotOrders;
    const q = searchQuery.toLowerCase();
    return kotOrders.filter((k) => {
      const kotNum = String(k.title || k.data?.['KOT #'] || '').toLowerCase();
      const table = String(k.data?.['Table #'] || '').toLowerCase();
      const server = String(k.data?.['Server'] || '').toLowerCase();
      const items = String(k.data?.['Ordered Items'] || '').toLowerCase();
      const status = String(k.status || k.data?.['KOT Status'] || '').toLowerCase();
      return kotNum.includes(q) || table.includes(q) || server.includes(q) || items.includes(q) || status.includes(q);
    });
  }, [kotOrders, searchQuery]);

  // Overall F&B Metrics
  const activeKotCount = useMemo(() => {
    return tablesWithStatus.filter((t) => t.status !== 'Available').length;
  }, [tablesWithStatus]);

  const activeDiningRevenue = useMemo(() => {
    return tablesWithStatus.reduce((acc, t) => {
      if (t.activeKot && t.activeKot.data) {
        const amt = parseFloat(String(t.activeKot.data.Amount || t.activeKot.data['Amount (₹)'] || 0).replace(/[^\d.]/g, ''));
        return acc + (isNaN(amt) ? 0 : amt);
      }
      return acc;
    }, 0);
  }, [tablesWithStatus]);

  return (
    <>
      {/* Back button to Food & Beverage Parent */}
      <button className="back-btn" onClick={() => navigate('/food-beverage')}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        <span>Food & Beverage</span>
      </button>

      <PageHead
        title="Restaurant POS & Orders"
        subtitle="Kitchen Order Tickets (KOT), live dining tables, order dispatch and bill settlement"
      >
        <button
          className="btn primary"
          onClick={() => openNewKotModal()}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>➕</span> New KOT Order
        </button>

        <button
          className={`btn ${activeTab === 'table-layout' ? 'brass' : 'ghost'}`}
          onClick={() => setActiveTab(activeTab === 'table-layout' ? 'kot-list' : 'table-layout')}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>{activeTab === 'table-layout' ? '📋' : '🍽️'}</span>
          <span>{activeTab === 'table-layout' ? 'KOT Orders View' : 'Table Layout View'}</span>
        </button>

        <button
          className="btn ghost"
          onClick={() => {
            if (kotOrders.length > 0) openPrintReceipt(kotOrders[0]);
            else notify('No orders to print');
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span>🖨️</span> Print Bill
        </button>
      </PageHead>

      {/* Sub-Navigation Pills Bar */}
      <SubNav parentPath="/food-beverage" />

      {/* View Switcher Bar & Real-time Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 18 }}>
        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(59, 130, 246, 0.15)', display: 'grid', placeItems: 'center', fontSize: 20 }}>
            🍽️
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Tables</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--head-color, #fff)' }}>12 Tables</div>
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(239, 68, 68, 0.15)', display: 'grid', placeItems: 'center', fontSize: 20 }}>
            🔥
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Occupied Tables</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red, #ef4444)' }}>{activeKotCount} Occupied</div>
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(34, 197, 94, 0.15)', display: 'grid', placeItems: 'center', fontSize: 20 }}>
            ✨
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Available Tables</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green, #22c55e)' }}>{12 - activeKotCount} Vacant</div>
          </div>
        </div>

        <div className="panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'rgba(234, 179, 8, 0.15)', display: 'grid', placeItems: 'center', fontSize: 20 }}>
            💰
          </div>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 600 }}>Live Dining Sales</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--brass, #eab308)' }}>{inr(activeDiningRevenue)}</div>
          </div>
        </div>
      </div>

      {/* Tab Switcher Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, background: 'var(--panel-alt, rgba(255,255,255,0.03))', padding: 4, borderRadius: 8, border: '1px solid var(--line)' }}>
          <button
            type="button"
            className={`btn sm ${activeTab === 'kot-list' ? 'primary' : 'ghost'}`}
            onClick={() => setActiveTab('kot-list')}
            style={{ fontWeight: 600, fontSize: 13 }}
          >
            📋 Kitchen Order Tickets (KOT) List
          </button>
          <button
            type="button"
            className={`btn sm ${activeTab === 'table-layout' ? 'primary' : 'ghost'}`}
            onClick={() => setActiveTab('table-layout')}
            style={{ fontWeight: 600, fontSize: 13 }}
          >
            🍽️ Restaurant Table Layout View
          </button>
        </div>

        {activeTab === 'kot-list' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search KOT #, table, server..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--line)',
                background: 'var(--panel)',
                color: 'var(--text)',
                fontSize: 13,
                width: 240,
              }}
            />
            <button className="btn sm ghost" onClick={loadKotOrders} title="Refresh records from database">
              🔄 Refresh
            </button>
          </div>
        )}

        {activeTab === 'table-layout' && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'available', 'occupied', 'indoor', 'terrace'].map((f) => (
              <button
                key={f}
                type="button"
                className={`btn sm ${tableFilter === f ? 'brass' : 'ghost'}`}
                onClick={() => setTableFilter(f)}
                style={{ textTransform: 'capitalize', fontSize: 12 }}
              >
                {f === 'all' ? 'All Tables (12)' : f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── VIEW 1: TABLE LAYOUT VIEW ── */}
      {activeTab === 'table-layout' && (
        <div className="panel" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--line)', paddingBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--head-color, #fff)' }}>Dining Room Floor Plan & Table Grid</h3>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                Click any table to view active order items or immediately dispatch a new KOT.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green, #22c55e)' }}></span> Available
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red, #ef4444)' }}></span> Cooking
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--teal, #14b8a6)' }}></span> Ready to Serve
              </span>
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 16,
          }}>
            {filteredTables.map((table) => {
              const isOccupied = table.status !== 'Available';
              const isReady = table.status === 'Ready to Serve';

              return (
                <div
                  key={table.id}
                  style={{
                    background: isOccupied ? 'var(--panel-alt, #1e2430)' : 'var(--panel, #181d27)',
                    border: isReady
                      ? '2px solid var(--teal, #14b8a6)'
                      : isOccupied
                      ? '1px solid var(--red, #ef4444)'
                      : '1px solid var(--line, #2d3748)',
                    borderRadius: 12,
                    padding: 16,
                    position: 'relative',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: isOccupied ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
                  }}
                >
                  {/* Table Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--head-color, #fff)' }}>{table.name}</span>
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.06)', color: 'var(--muted)' }}>
                          {table.capacity} Covers
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{table.zone}</div>
                    </div>

                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 20,
                        fontSize: 11,
                        fontWeight: 600,
                        background: isReady ? 'rgba(20, 184, 166, 0.15)' : isOccupied ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                        color: isReady ? 'var(--teal, #14b8a6)' : isOccupied ? 'var(--red, #ef4444)' : 'var(--green, #22c55e)',
                        border: isReady ? '1px solid var(--teal, #14b8a6)' : isOccupied ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(34, 197, 94, 0.4)',
                      }}
                    >
                      {table.status}
                    </span>
                  </div>

                  {/* Table Body: Active KOT & Order Details */}
                  {isOccupied ? (
                    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                        <span style={{ color: 'var(--brass, #eab308)', fontWeight: 700 }}>
                          🎫 {table.activeKot?.title || table.activeKot?.data?.['KOT #']}
                        </span>
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>{table.timePlaced}</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text)', marginBottom: 8, lineHeight: 1.4, fontWeight: 500 }}>
                        {table.orderSummary}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--line)', paddingTop: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>Server: <b>{table.server}</b></span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green, #22c55e)' }}>{table.amount}</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, marginBottom: 12 }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>🍽️</div>
                      Table is sanitized & ready for seating
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {isOccupied ? (
                      <>
                        {table.status !== 'Ready to Serve' && (
                          <button
                            type="button"
                            className="btn sm"
                            style={{ flex: 1, fontSize: 11, background: 'var(--teal, #14b8a6)', color: '#fff', border: 'none' }}
                            onClick={() => handleUpdateKotStatus(table.activeKot.id, 'Ready to Serve', table.name)}
                          >
                            Mark Ready
                          </button>
                        )}
                        <button
                          type="button"
                          className="btn sm brass"
                          style={{ flex: 1, fontSize: 11 }}
                          onClick={() => handleUpdateKotStatus(table.activeKot.id, 'Served & Settled', table.name)}
                          title="Settle bill and free up table for next guests"
                        >
                          Settle & Free
                        </button>
                        <button
                          type="button"
                          className="btn sm ghost"
                          onClick={() => openPrintReceipt(table.activeKot)}
                          title="Print customer invoice bill"
                        >
                          🖨️ Bill
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="btn sm primary"
                        style={{ width: '100%', fontSize: 12 }}
                        onClick={() => openNewKotModal(table.name)}
                      >
                        ➕ New KOT for {table.name}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── VIEW 2: KOT ORDERS TABLE ── */}
      {activeTab === 'kot-list' && (
        <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>Live Kitchen Order Tickets ({filteredKots.length})</h3>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              Auto-assigned server, system-tracked status, and live pricing
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--panel-alt, rgba(255,255,255,0.02))', borderBottom: '1px solid var(--line)' }}>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600 }}>KOT #</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600 }}>Table #</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600 }}>Server</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600 }}>Ordered Items</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600 }}>Amount (₹)</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600 }}>Time Placed</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600 }}>KOT Status</th>
                  <th style={{ padding: '12px 16px', fontSize: 12, fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredKots.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--muted)' }}>
                      No KOT orders found. Click <b>"New KOT Order"</b> to dispatch a ticket to the kitchen.
                    </td>
                  </tr>
                ) : (
                  filteredKots.map((kot) => {
                    const data = kot.data || {};
                    const kotNum = kot.title || data['KOT #'] || `KOT-${kot.id}`;
                    const tableNum = data['Table #'] || data.table_number || 'Table T-01';
                    const server = data['Server'] || data.server || 'Server';
                    const items = data['Ordered Items'] || data.ordered_items || '—';
                    const amt = data['Amount (₹)'] || (data.Amount ? inr(data.Amount) : '₹0');
                    const time = data['Time Placed'] || data.time_placed || 'Just now';
                    const status = kot.status || data['KOT Status'] || 'Cooking in Kitchen';

                    return (
                      <tr key={kot.id} style={{ borderBottom: '1px solid var(--line)' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <span className="tag" style={{ fontWeight: 700, color: 'var(--brass, #eab308)', letterSpacing: 0.5 }}>
                            {kotNum}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--head-color, #fff)' }}>
                          {tableNum}
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--sub, #9ca3af)', fontSize: 13 }}>
                          {server}
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: 300, fontSize: 13, color: 'var(--text)' }}>
                          {items}
                          {data.notes && (
                            <div style={{ fontSize: 11, color: 'var(--brass, #eab308)', marginTop: 2 }}>
                              Note: {data.notes}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--green, #22c55e)' }}>
                          {amt}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>
                          {time}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <StatusBadge status={status} />
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            {status === 'Cooking in Kitchen' && (
                              <button
                                type="button"
                                className="btn sm"
                                style={{ background: 'var(--teal, #14b8a6)', color: '#fff', border: 'none', fontSize: 11 }}
                                onClick={() => handleUpdateKotStatus(kot.id, 'Ready to Serve', tableNum)}
                              >
                                Ready to Serve
                              </button>
                            )}
                            {status !== 'Served & Settled' && (
                              <button
                                type="button"
                                className="btn sm brass"
                                style={{ fontSize: 11 }}
                                onClick={() => handleUpdateKotStatus(kot.id, 'Served & Settled', tableNum)}
                              >
                                Settle Bill
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn sm ghost"
                              style={{ fontSize: 11 }}
                              onClick={() => openPrintReceipt(kot)}
                            >
                              🖨️ Bill
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── NEW KOT ORDER MODAL (Order Details Only, Automatic Fields) ── */}
      {newKotModalOpen && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 99999,
            padding: 16,
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: 720,
              background: 'var(--panel)',
              borderRadius: 12,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, color: 'var(--head-color, #fff)' }}>
                  New Kitchen Order Ticket (KOT)
                </h2>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  Order Details Only &bull; KOT #, Server, Time Placed, and Total are handled automatically
                </div>
              </div>
              <button type="button" className="btn sm ghost" onClick={() => setNewKotModalOpen(false)}>
                Back
              </button>
            </div>

            <form onSubmit={handleCreateKotSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              {/* Modal Body: Scrollable */}
              <div style={{ padding: 20, overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Automatic System Badges Bar (NO manual entry required!) */}
                <div style={{
                  background: 'var(--panel-alt, rgba(255,255,255,0.03))',
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  padding: '12px 16px',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: 12,
                }}>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>KOT # (Auto)</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--brass, #eab308)' }}>{nextKotNumber}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>Assigned Server (Auto)</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--head-color, #fff)' }}>{selectedServer || currentServerName}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>Time Placed (Auto)</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--head-color, #fff)' }}>Just now</span>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>KOT Status (System)</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--red, #ef4444)' }}>Cooking in Kitchen</span>
                  </div>
                </div>

                {/* 1. Select Table & Assigned Server / Waiter (Automatically identified & assigned) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
                  <div className="field">
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Selected Dining Table</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>Choose from floor plan</span>
                    </label>
                    <select
                      value={selectedTable}
                      onChange={(e) => handleTableChange(e.target.value)}
                      style={{ fontSize: 14, padding: '10px 12px' }}
                      required
                    >
                      {tablesWithStatus.map((t) => (
                        <option key={t.id} value={t.name}>
                          {t.name} — {t.capacity} Covers ({t.zone}) [{t.status}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="field">
                    <label style={{ fontSize: 13, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                      <span>Assigned Server / Waiter</span>
                      <span style={{ fontSize: 11, color: '#38bdf8', fontWeight: 500 }}>⚡ Auto-assigned</span>
                    </label>
                    <select
                      value={selectedServer || currentServerName}
                      onChange={(e) => setSelectedServer(e.target.value)}
                      style={{ fontSize: 14, padding: '10px 12px' }}
                      required
                    >
                      {identifiedServers.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} {s.source === 'db' ? '(Staff Directory)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Menu Item Picker with Quantities */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                      Select Order Items
                    </label>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Click ➕ / ➖ to adjust quantities
                    </span>
                  </div>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
                    gap: 10,
                    maxHeight: 240,
                    overflowY: 'auto',
                    padding: 8,
                    background: 'rgba(0,0,0,0.15)',
                    borderRadius: 8,
                    border: '1px solid var(--line)',
                  }}>
                    {MENU_ITEMS.map((item) => {
                      const qty = orderCart[item.id] || 0;
                      return (
                        <div
                          key={item.id}
                          style={{
                            background: qty > 0 ? 'rgba(234, 179, 8, 0.08)' : 'var(--panel)',
                            border: qty > 0 ? '1px solid var(--brass, #eab308)' : '1px solid var(--line)',
                            borderRadius: 8,
                            padding: '8px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span>{item.icon}</span>
                              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--head-color, #fff)' }}>{item.name}</span>
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--green, #22c55e)', marginTop: 2 }}>{inr(item.price)}</div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
                            {qty > 0 && (
                              <button
                                type="button"
                                className="btn sm ghost"
                                style={{ padding: '2px 8px', fontSize: 12, height: 24, minWidth: 24 }}
                                onClick={() => setOrderCart((prev) => ({ ...prev, [item.id]: Math.max(0, qty - 1) }))}
                              >
                                ➖
                              </button>
                            )}
                            {qty > 0 && (
                              <span style={{ fontSize: 13, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>
                                {qty}
                              </span>
                            )}
                            <button
                              type="button"
                              className="btn sm ghost"
                              style={{ padding: '2px 8px', fontSize: 12, height: 24, minWidth: 24, background: qty > 0 ? 'var(--brass, #eab308)' : 'transparent', color: qty > 0 ? '#000' : 'inherit' }}
                              onClick={() => setOrderCart((prev) => ({ ...prev, [item.id]: qty + 1 }))}
                            >
                              ➕
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Add Custom / Special Item */}
                <div style={{ border: '1px dashed var(--line)', borderRadius: 8, padding: 12, background: 'rgba(255,255,255,0.01)' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--sub, #9ca3af)', display: 'block', marginBottom: 8 }}>
                    ➕ Or add custom special dish / drink
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      type="text"
                      placeholder="Dish / Beverage name"
                      value={customItemName}
                      onChange={(e) => setCustomItemName(e.target.value)}
                      style={{ flex: 2, fontSize: 12 }}
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={customItemPrice}
                      onChange={(e) => setCustomItemPrice(e.target.value)}
                      style={{ flex: 1, fontSize: 12 }}
                    />
                    <button type="button" className="btn sm" onClick={handleAddCustomItem} style={{ fontSize: 12 }}>
                      Add
                    </button>
                  </div>

                  {customItems.length > 0 && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                      {customItems.map((ci) => (
                        <span key={ci.id} className="tag" style={{ fontSize: 11 }}>
                          {ci.name} ({inr(ci.price)})
                          <button
                            type="button"
                            onClick={() => setCustomItems((prev) => prev.filter((p) => p.id !== ci.id))}
                            style={{ background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer', marginLeft: 4 }}
                          >
                            &times;
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 4. Chef Instructions / Notes */}
                <div className="field">
                  <label style={{ fontSize: 12 }}>Kitchen / Chef Instructions (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Less spicy, Jain preparation, serve dessert after main course"
                    value={chefNotes}
                    onChange={(e) => setChefNotes(e.target.value)}
                    style={{ fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Modal Footer: Live Amount Tally & Submit */}
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid var(--line)',
                background: 'var(--panel-alt, rgba(255,255,255,0.02))',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <span style={{ fontSize: 11, color: 'var(--muted)', display: 'block' }}>Automatic Calculated Amount</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--green, #22c55e)' }}>
                    {inr(calculatedCartTotal)}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button type="button" className="btn ghost" onClick={() => setNewKotModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn primary" disabled={submittingKot || calculatedCartTotal <= 0}>
                    {submittingKot ? 'Sending to Kitchen…' : '🔥 Send to Kitchen (Create KOT)'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRINT GUEST BILL / KOT RECEIPT MODAL ── */}
      {printModalOpen && receiptOrder && (
        <div
          className="modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'grid',
            placeItems: 'center',
            zIndex: 99999,
            padding: 16,
          }}
        >
          <div
            className="panel"
            style={{
              width: '100%',
              maxWidth: 420,
              background: '#ffffff',
              color: '#111827',
              borderRadius: 8,
              padding: 24,
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              fontFamily: 'monospace, sans-serif',
            }}
          >
            {/* Printable Receipt Header */}
            <div style={{ textAlign: 'center', borderBottom: '1px dashed #9ca3af', paddingBottom: 14, marginBottom: 14 }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#111827', fontWeight: 700 }}>STAYFLOW LUXURY HOTEL</h2>
              <div style={{ fontSize: 12, color: '#4b5563', marginTop: 2 }}>The Saffron Royale Restaurant & Bar</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>GSTIN: 29AAACH7409R1ZZ &bull; FSSAI Lic: 112233445566</div>
            </div>

            <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
              <div><b>KOT / Bill #:</b> {receiptOrder.title || receiptOrder.data?.['KOT #']}</div>
              <div style={{ textAlign: 'right' }}><b>Table:</b> {receiptOrder.data?.['Table #']}</div>
              <div><b>Server:</b> {receiptOrder.data?.Server}</div>
              <div style={{ textAlign: 'right' }}><b>Time:</b> {receiptOrder.data?.['Time Placed'] || 'Just now'}</div>
            </div>

            <div style={{ borderTop: '1px dashed #9ca3af', borderBottom: '1px dashed #9ca3af', padding: '8px 0', margin: '8px 0', fontSize: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Order Items:</div>
              <div style={{ lineHeight: 1.6, color: '#1f2937' }}>
                {receiptOrder.data?.['Ordered Items']}
              </div>
            </div>

            <div style={{ fontSize: 12, lineHeight: 1.8, marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal:</span>
                <span>{receiptOrder.data?.['Amount (₹)']}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                <span>CGST (2.5%):</span>
                <span>Included</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b7280' }}>
                <span>SGST (2.5%):</span>
                <span>Included</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: '1px solid #111827', paddingTop: 6, marginTop: 4 }}>
                <span>Total Amount:</span>
                <span>{receiptOrder.data?.['Amount (₹)']}</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', fontSize: 11, color: '#6b7280', borderTop: '1px dashed #9ca3af', paddingTop: 10 }}>
              Thank you for dining with StayFlow Hotel!
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button
                type="button"
                className="btn ghost sm"
                style={{ flex: 1, color: '#374151', borderColor: '#d1d5db' }}
                onClick={() => setPrintModalOpen(false)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn primary sm"
                style={{ flex: 1 }}
                onClick={() => window.print()}
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
