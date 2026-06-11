export default function SummaryCard({ label, value, detail, tone = "default" }) {
  return (
    <div className={`summary-card summary-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
