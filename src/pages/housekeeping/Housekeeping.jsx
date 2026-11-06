import { useStore } from '../../context/StoreContext';
import { useRbac } from '../../context/RbacContext';
import PageHead from '../../components/PageHead';
import StatCard, { StatRow } from '../../components/StatCard';
import DataTable from '../../components/DataTable';
import Badge from '../../components/Badge';
import SubNav from '../../components/SubNav';

export default function Housekeeping() {
  const { rooms, markRoomClean, notify } = useStore();
  const { canEdit } = useRbac();
  const count = (s) => rooms.filter((r) => r.s === s).length;
  const dirty = rooms.filter((r) => r.s === 'dirty');

  return (
    <>
      <PageHead title="Housekeeping & maintenance" subtitle="Keep rooms ready for the next guest" />
      <SubNav parentPath="/housekeeping" />
      <StatRow>
        <StatCard label="Need cleaning" value={count('dirty')} />
        <StatCard label="Inspection pending" value={count('dirty') > 0 ? 1 : 0} />
        <StatCard label="Ready to sell" value={count('vac')} />
        <StatCard label="Out of order" value={count('ooo')} />
      </StatRow>
      <div className="row r-2">
        <div className="panel">
          <h2>Cleaning tasks</h2>
          <div className="sub">Tap to mark a room clean</div>
          {dirty.length === 0 && <div className="empty">All rooms are clean.</div>}
          {dirty.map((r) => (
            <div key={r.n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <span><b>Room {r.n}</b> <span className="muted">{r.type}</span></span>
              {canEdit('/housekeeping') && (
                <button className="btn sm" onClick={() => { markRoomClean(r.n); notify(`Room ${r.n} is ready`); }}>Mark clean</button>
              )}
            </div>
          ))}
        </div>
        <div className="panel">
          <h2>Maintenance requests</h2>
          <div className="sub">Rooms marked out of order in database</div>
          <DataTable
            columns={['Room', 'Type', 'Floor', 'Status']}
            rows={rooms.filter(r => r.s === 'ooo').map(r => [
              `Room ${r.n}`, r.type, `Floor ${r.f}`, <Badge color="red">Out of order</Badge>
            ])}
          />
        </div>
      </div>

    </>
  );
}
