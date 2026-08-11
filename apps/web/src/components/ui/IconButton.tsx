import type { ReactNode } from "react";

type IconButtonProps = {
  children: ReactNode;
  label: string;
  onClick?: () => void;
};

export function IconButton({ children, label, onClick }: IconButtonProps) {
  return (
    <button
      className="flex h-10 w-10 items-center justify-center rounded-md border border-smeta-line bg-white text-smeta-mauve"
      aria-label={label}
      onClick={onClick}
      title={label}
    >
      {children}
    </button>
  );
}
