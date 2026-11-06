import { STATUS_COLOR } from '../data/mock';

export default function Badge({ color, type, children }) {
  const c = color || type || 'grey';
  return <span className={`badge b-${c}`}>{children}</span>;
}

export function StatusBadge({ status }) {
  return <Badge color={STATUS_COLOR[status] || 'grey'}>{status}</Badge>;
}
