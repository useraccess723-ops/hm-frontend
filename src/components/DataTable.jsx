export default function DataTable({ columns, rows, className = '', emptyMessage = 'No bookings found.' }) {
  if (!rows || !rows.length) {
    return <div className="empty">{emptyMessage}</div>;
  }
  return (
    <div className="tw">
      <table className={className}>
        <thead>
          <tr>{columns.map((c, i) => <th key={i}>{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>{r.map((cell, j) => <td key={j}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
