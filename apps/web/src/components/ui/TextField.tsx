import type { LucideIcon } from "lucide-react";

type TextFieldProps = {
  icon?: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
};

export function TextField({ icon: Icon, label, onChange, placeholder, value }: TextFieldProps) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-smeta-mauve">{label}</span>
      <span className="mt-1 flex items-center gap-2 rounded-md border border-smeta-line bg-white px-3 py-2">
        {Icon ? <Icon className="h-4 w-4 text-smeta-clay" /> : null}
        <input
          className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}
