import type { LucideIcon } from "lucide-react";
import type { HTMLInputTypeAttribute, InputHTMLAttributes } from "react";

type TextFieldProps = {
  autoComplete?: string;
  error?: string | null;
  helperText?: string;
  icon?: LucideIcon;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  maxLength?: number;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: HTMLInputTypeAttribute;
  value: string;
};

export function TextField({
  autoComplete,
  error,
  helperText,
  icon: Icon,
  inputMode,
  label,
  maxLength,
  onChange,
  placeholder,
  required,
  type = "text",
  value
}: TextFieldProps) {
  const message = error ?? helperText;

  return (
    <label className="block">
      <span className="flex items-center gap-1 text-xs font-semibold text-smeta-mauve">
        {label}
        {required ? <span className="text-smeta-clay">*</span> : null}
      </span>
      <span
        className={`mt-1 flex min-h-11 items-center gap-2 rounded-xl border bg-smeta-elevated px-3 py-2 shadow-smeta-soft focus-within:border-smeta-clay focus-within:ring-4 focus-within:ring-smeta-clay/15 ${
          error ? "border-red-300 bg-red-50/70" : "border-smeta-line"
        }`}
      >
        {Icon ? <Icon className={`h-4 w-4 shrink-0 ${error ? "text-red-500" : "text-smeta-clay"}`} /> : null}
        <input
          autoComplete={autoComplete}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-smeta-ink outline-none placeholder:text-smeta-mauve/60"
          inputMode={inputMode}
          maxLength={maxLength}
          placeholder={placeholder}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      {message ? <span className={`mt-1 block text-xs ${error ? "text-red-600" : "text-smeta-mauve"}`}>{message}</span> : null}
    </label>
  );
}
