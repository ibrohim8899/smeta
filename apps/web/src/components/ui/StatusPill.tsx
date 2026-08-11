import { formatStatusLabel, isStrongStatus } from "../../lib/labels";

type StatusPillProps = {
  label: string;
};

export function StatusPill({ label }: StatusPillProps) {
  const displayLabel = formatStatusLabel(label);
  const tone = isStrongStatus(label) ? "bg-smeta-clay text-white" : "bg-smeta-soft text-smeta-mauve";

  return <span className={`inline-flex max-w-full items-center rounded-md px-2 py-1 text-xs font-semibold ${tone}`}>{displayLabel}</span>;
}
