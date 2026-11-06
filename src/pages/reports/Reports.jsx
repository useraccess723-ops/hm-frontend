import { useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { inr } from '../../utils/format';
import { api } from '../../services/api';
import PageHead from '../../components/PageHead';
import StatCard, { StatRow } from '../../components/StatCard';
import DataTable from '../../components/DataTable';
import SubNav from '../../components/SubNav';

export default function Reports() {
  const { notify, bookings, rooms, dashboard } = useStore();
  const [occupancy, setOccupancy] = useState(null); const [reportError, setReportError] = useState('');
  useEffect(() => {
    const end = new Date(); const start = new Date(); start.setDate(start.getDate() - 30);
    api(`/api/reports/occupancy?start_date=${start.toISOString().slice(0,10)}&end_date=${end.toISOString().slice(0,10)}`).then(setOccupancy).catch(e => setReportError(e.message));
  }, []);
  const valid = bookings.filter(b => !['Cancelled','No-show'].includes(b.st));
  const nights = valid.reduce((sum,b) => sum + Math.max(0, Number(b.nights || (b.check_in && b.check_out ? (new Date(b.check_out)-new Date(b.check_in))/86400000 : 0))),0);
  const bookingValue = valid.reduce((sum,b) => sum + Number(b.amt || 0),0);
  const adr = nights ? bookingValue / nights : 0;
  const cancelRate = bookings.length ? bookings.filter(b => b.st === 'Cancelled').length * 100 / bookings.length : 0;
  const byType = Object.values(rooms.reduce((acc,r) => { const a=acc[r.type] || (acc[r.type]={type:r.type,count:0,price:r.price,occupied:0}); a.count++; if(r.s==='occ') a.occupied++; return acc; },{}));
  const exportReport = () => {
    const csvContent = 'data:text/csv;charset=utf-8,' +
      'Metric,Value\n' +
      `Occupancy (30 days),${occupancy?.occupancy_percent ?? 0}%\n` +
      `Average daily rate,${adr.toFixed(2)}\n` +
      `Recorded revenue,${dashboard?.revenue || 0}\n` +
      `Cancellation rate,${cancelRate.toFixed(1)}%\n\n` +
      'Room Type,Rooms,Currently Occupied,Base Rate\n' +
      byType.map(t => `"${t.type}",${t.count},${t.occupied},${t.price}`).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hotel_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify('Report exported successfully');
  };

  return <>
    <PageHead title="Reports & analytics" subtitle="Performance across rooms, revenue and sources"><button className="btn ghost" onClick={exportReport}>Export</button></PageHead>
    <SubNav parentPath="/reports" />
    {reportError && <p className="note">Occupancy report could not load: {reportError}</p>}
    <StatRow>
      <StatCard label="Occupancy (30 days)" value={`${occupancy?.occupancy_percent ?? 0}%`} note="Calculated from reservation dates" />
      <StatCard label="Average daily rate" value={inr(adr)} note="Booking value per reserved night" />
      <StatCard label="Recorded revenue" value={inr(dashboard?.revenue || 0)} note="Paid payment ledger only" />
      <StatCard label="Cancellation rate" value={`${cancelRate.toFixed(1)}%`} note={`${bookings.filter(b=>b.st==='Cancelled').length} cancelled reservations`} />
    </StatRow>
    <div className="panel"><h2>Room inventory by type</h2><div className="sub">Live room inventory and current occupied counts</div><DataTable columns={['Room type','Rooms','Currently occupied','Base rate / night']} rows={byType.map(t => [t.type,t.count,t.occupied,inr(t.price)])} />{!byType.length && <p className="empty">No room inventory configured yet.</p>}</div>
  </>;
}
