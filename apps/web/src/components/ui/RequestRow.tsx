import { ChevronRight } from "lucide-react";
import type { RequestSummary } from "../../types/domain";

type RequestRowProps = {
  request: RequestSummary;
};

export function RequestRow({ request }: RequestRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-smeta-line bg-white px-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">
          {request.id} · {request.customer}
        </p>
        <p className="mt-1 truncate text-xs text-smeta-mauve">
          {request.category} · {request.region}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-smeta-mauve" />
    </div>
  );
}
