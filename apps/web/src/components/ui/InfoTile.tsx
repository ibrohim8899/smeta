type InfoTileProps = {
  label: string;
  value: string;
};

export function InfoTile({ label, value }: InfoTileProps) {
  return (
    <div className="rounded-xl border border-smeta-line bg-smeta-soft px-3 py-3">
      <p className="text-xs text-smeta-mauve">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
