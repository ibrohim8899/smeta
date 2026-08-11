import type { ReactNode } from "react";

type IconButtonProps = {
  children: ReactNode;
  label: string;
  onClick?: () => void;
};

export function IconButton({ children, label, onClick }: IconButtonProps) {
  return (
    <button
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-smeta-line bg-smeta-surface text-smeta-mauve shadow-smeta-soft hover:text-smeta-ink"
      aria-label={label}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}
