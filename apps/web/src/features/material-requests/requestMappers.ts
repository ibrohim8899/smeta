import { getAttachmentDownloadUrl, type MaterialRequestResponse } from "../../lib/api";
import { formatSourceLabel, formatStatusLabel } from "../../lib/labels";
import type { RequestSummary } from "../../types/domain";

export function toRequestSummary(request: MaterialRequestResponse): RequestSummary {
  return {
    apiId: request.id,
    budget: "Aniqlanmagan",
    category: request.category,
    customer: request.customerName,
    dealer: request.dealer?.displayName ?? request.dealerReferral ?? "Referral yo'q",
    deadline: "24 soat",
    description: request.description,
    files: `${request.attachments.length} fayl`,
    fileItems: request.attachments.map((attachment) => ({
      downloadUrl: attachment.storageKey ? getAttachmentDownloadUrl(request.id, attachment.id) : null,
      fileName: attachment.fileName,
      id: attachment.id,
      mimeType: attachment.mimeType,
      scanStatus: attachment.scanStatus,
      sizeBytes: attachment.sizeBytes
    })),
    id: request.publicCode,
    offers: 0,
    region: request.region,
    source: formatSourceLabel(request.source),
    status: request.status,
    statusLabel: formatStatusLabel(request.status)
  };
}
