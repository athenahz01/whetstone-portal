import { Card } from "./Card";

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  color?: string;
}

export function MetricCard({ label, value, detail, color = "#6c8cff" }: MetricCardProps) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        <div className="text-xs text-sub uppercase tracking-wider font-medium">{label}</div>
      </div>
      <div className="text-3xl font-bold text-heading" style={{ fontVariantNumeric: "tabular-nums" }}>{value}</div>
      {detail && <div className="text-sm text-sub mt-1.5">{detail}</div>}
    </Card>
  );
}