import { Card } from "./Card";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  color?: string;
}

export function MetricCard({ label, value, detail, color = "#5A83F3" }: MetricCardProps) {
  return (
    <Card style={{ borderTop: `3px solid ${color}` }}>
      <div className="text-xs text-sub uppercase tracking-widest font-semibold mb-2">{label}</div>
      <div className="text-3xl font-bold text-heading">{value}</div>
      {detail && <div className="text-sm text-sub mt-1">{detail}</div>}
    </Card>
  );
}