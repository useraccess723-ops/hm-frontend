export function StatRow({ children }) {
  return <div className="stats">{children}</div>;
}

export default function StatCard({ label, value, note, negative = false }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <b>{value}</b>
      {note && <em className={negative ? 'neg' : ''}>{note}</em>}
    </div>
  );
}
