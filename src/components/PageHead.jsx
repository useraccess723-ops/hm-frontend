export default function PageHead({ title, subtitle, children }) {
  return (
    <div className="pagehead">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div>{children}</div>
    </div>
  );
}
