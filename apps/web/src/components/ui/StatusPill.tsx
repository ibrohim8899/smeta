import { formatStatusLabel, isStrongStatus } from "../../lib/labels";

type StatusPillProps = {
  label: string;
};

export function StatusPill({ label }: StatusPillProps) {
  const displayLabel = formatStatusLabel(label);
  const tone = isStrongStatus(label)
    ? "bg-smeta-clay text-white shadow-smeta-soft"
    : "border border-smeta-line bg-smeta-soft text-smeta-ink";

  return <span className={`inline-flex max-w-full items-center rounded-full px-3 py-1 text-xs font-extrabold ${tone}`}>{displayLabel}</span>;
}
