import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import type { LucideIcon } from "lucide-react";

type SelectFieldProps = {
  error?: string | null;
  helperText?: string;
  icon?: LucideIcon;
  label: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  value: string;
};

export function SelectField({
  error,
  helperText,
  icon: Icon,
  label,
  onChange,
  options,
  placeholder = "Tanlang",
  required,
  value
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const listboxId = useId();
  const message = error ?? helperText;

  return (
    <div
      className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <span className="flex items-center gap-1 text-xs font-semibold text-smeta-mauve">
        {label}
        {required ? <span className="text-smeta-clay">*</span> : null}
      </span>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        className={`mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl border bg-smeta-elevated px-3 py-2 text-left shadow-smeta-soft outline-none focus:border-smeta-clay focus:ring-4 focus:ring-smeta-clay/15 ${
          error ? "border-red-300 bg-red-50/70" : "border-smeta-line"
        }`}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        {Icon ? <Icon className={`h-4 w-4 shrink-0 ${error ? "text-red-500" : "text-smeta-clay"}`} /> : null}
        <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${value ? "text-smeta-ink" : "text-smeta-mauve/60"}`}>
          {value || placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-smeta-mauve transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen ? (
        <div
          className="absolute left-0 right-0 z-30 mt-2 max-h-64 overflow-auto rounded-xl border border-smeta-line bg-smeta-surface p-1 shadow-smeta"
          id={listboxId}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option === value;

            return (
              <button
                aria-selected={isSelected}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold outline-none hover:bg-smeta-soft focus:bg-smeta-soft ${
                  isSelected ? "text-smeta-clay" : "text-smeta-ink"
                }`}
                key={option}
                role="option"
                type="button"
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
              >
                <span className="min-w-0 flex-1 truncate">{option}</span>
                {isSelected ? <Check className="h-4 w-4 shrink-0" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {message ? <span className={`mt-1 block text-xs ${error ? "text-red-600" : "text-smeta-mauve"}`}>{message}</span> : null}
    </div>
  );
}
