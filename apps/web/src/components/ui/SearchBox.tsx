import { Search } from "lucide-react";

export function SearchBox() {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-smeta-line bg-smeta-soft px-3 py-2 shadow-smeta-soft">
      <Search className="h-4 w-4 shrink-0 text-smeta-mauve" />
      <input className="w-44 bg-transparent text-sm outline-none placeholder:text-smeta-mauve" placeholder="So'rov qidirish" />
    </div>
  );
}
