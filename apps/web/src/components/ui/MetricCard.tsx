type MetricCardProps = {
  label: string;
  note: string;
  value: string;
};

export function MetricCard({ label, note, value }: MetricCardProps) {
  return (
    <div className="h-fit rounded-2xl border border-smeta-line bg-smeta-surface p-4 shadow-smeta-soft">
      <p className="text-xs font-semibold uppercase tracking-[0.13em] text-smeta-mauve">{label}</p>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-smeta-mauve">{note}</p>
    </div>
  );
}
