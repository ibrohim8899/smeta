import { InfoTile } from "./InfoTile";
import { StatusPill } from "./StatusPill";
import type { RequestSummary } from "../../types/domain";

type RequestDetailsProps = {
  request: RequestSummary;
};

export function RequestDetails({ request }: RequestDetailsProps) {
  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <InfoTile label="Mijoz" value={request.customer} />
        <InfoTile label="Manba" value={request.source} />
        <InfoTile label="Usta/referral" value={request.dealer} />
        <InfoTile label="Hudud" value={request.region} />
        <InfoTile label="Kategoriya" value={request.category} />
        <InfoTile label="Fayllar" value={request.files} />
        <InfoTile label="Budjet" value={request.budget} />
        <InfoTile label="Takliflar" value={`${request.offers} ta`} />
      </div>

      {request.fileItems.length > 0 ? (
        <div className="rounded-md border border-smeta-line bg-smeta-soft p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-smeta-mauve">Yuklangan fayllar</p>
          <div className="mt-3 space-y-2">
            {request.fileItems.map((file) => (
              <div key={file.id} className="flex flex-col gap-2 rounded-md bg-white px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{file.fileName}</p>
                  <p className="mt-1 text-xs text-smeta-mauve">
                    {file.mimeType} · {formatFileSize(file.sizeBytes)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill label={file.scanStatus} />
                  {file.downloadUrl ? (
                    <a className="rounded-md bg-smeta-ink px-3 py-2 text-xs font-semibold text-white" href={file.downloadUrl}>
                      Yuklab olish
                    </a>
                  ) : (
                    <span className="text-xs text-smeta-mauve">Faqat metadata</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatFileSize(sizeBytes: number) {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / 1024 / 1024).toFixed(1)} MB`;
  }

  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }

  return `${sizeBytes} bayt`;
}
