import { useEffect, useState } from 'react';
import PageHead from '../../components/PageHead';
import DataTable from '../../components/DataTable';
import SubNav from '../../components/SubNav';
import { api } from '../../services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]); const [error, setError] = useState('');
  useEffect(() => { api('/api/audit-logs?limit=200').then(setLogs).catch(e => setError(e.message)); }, []);
  return <>
    <PageHead title="Audit logs" subtitle="A record of who changed what" />
    <SubNav parentPath="/audit-logs" />
    <div className="panel">
      {error && <p className="note">{error}. Audit log access requires an administrator role.</p>}
      <DataTable columns={['Time', 'User', 'Action', 'Details']} rows={logs.map(x => [new Date(x.created_at).toLocaleString(), x.actor_email, x.action, `${x.entity_type} ${x.entity_id} ${x.detail || ''}`])} />
      {!logs.length && !error && <p className="empty">No audit events recorded yet.</p>}
    </div>
  </>;
}
