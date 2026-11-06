import { useStore } from '../../context/StoreContext';
import { inr } from '../../utils/format';
import PageHead from '../../components/PageHead';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import SubNav from '../../components/SubNav';

const cellClass = (v) => (v === 0 ? 'cell-stop' : v <= 1 ? 'cell-low' : v <= 2 ? 'cell-mid' : 'cell-ok');

export default function Availability() {
  const { rooms, bookings } = useStore();

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const dayHeaders = days.map((d) => d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }));

  const roomTypesMap = rooms.reduce((acc, r) => {
    if (!acc[r.type]) acc[r.type] = { type: r.type, price: r.price, total: 0 };
    acc[r.type].total++;
    return acc;
  }, {});

  const typeEntries = Object.entries(roomTypesMap);

  return (
    <>
      <PageHead title="Availability & pricing" subtitle="Live room availability and base rates across dates" />
      <SubNav parentPath="/availability" />
      <div className="panel">
        <h2>Availability calendar</h2>
        <div className="sub">Rooms left to sell per day calculated from saved reservations.</div>
        {typeEntries.length === 0 ? (
          <div className="empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
            <h3 style={{ fontSize: 16, marginBottom: 6 }}>No rooms configured yet</h3>
            <p className="muted">Add room categories and rooms to view real-time availability across dates.</p>
          </div>
        ) : (
          <div className="tw">
            <table className="cal">
              <thead>
                <tr><th>Room type</th>{dayHeaders.map((d) => <th key={d}>{d}</th>)}</tr>
              </thead>
              <tbody>
                {typeEntries.map(([type, info]) => {
                  const vals = days.map((d) => {
                    const dateStr = d.toISOString().slice(0, 10);
                    const reserved = bookings.filter((b) => {
                      if (b.room !== type) return false;
                      if (['Cancelled', 'Checked-out', 'No-show'].includes(b.st)) return false;
                      const cin = (b.check_in || b.in || '').slice(0, 10);
                      const cout = (b.check_out || b.out || '').slice(0, 10);
                      return cin <= dateStr && cout > dateStr;
                    }).length;
                    return Math.max(0, info.total - reserved);
                  });

                  return (
                    <tr key={type}>
                      <td><b>{type}</b><br /><span className="muted">{inr(info.price)}</span></td>
                      {vals.map((v, i) => <td key={i} className={cellClass(v)}>{v}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </>
  );
}
