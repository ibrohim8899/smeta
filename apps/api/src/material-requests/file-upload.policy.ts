import { extname, resolve } from "node:path";

export const MAX_REQUEST_FILES = 10;
export const MAX_REQUEST_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const allowedUploadMimeTypes = {
  "application/pdf": [".pdf"],
  "application/vnd.ms-excel": [".xls"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"]
} as const;

export function getUploadDirectory() {
  return resolve(process.env.LOCAL_UPLOAD_DIR ?? "../../storage/uploads/material-requests");
}

export function getSafeOriginalFileName(fileName: string) {
  return fileName.replace(/[^\p{L}\p{N}._ -]/gu, "_").replace(/^\.+/, "").slice(0, 180) || "fayl";
}

export function getUploadExtension(fileName: string) {
  return extname(fileName).toLowerCase();
}

export function isDownloadAllowed(scanStatus: string) {
  return !["infected", "blocked", "failed"].includes(scanStatus);
}

export function isAllowedUpload(mimeType: string, fileName: string) {
  const extension = getUploadExtension(fileName);
  const allowedExtensions = allowedUploadMimeTypes[mimeType as keyof typeof allowedUploadMimeTypes];

  return Boolean(allowedExtensions?.includes(extension as never));
}

export function allowedUploadAcceptList() {
  return Object.values(allowedUploadMimeTypes).flat().join(",");
}
