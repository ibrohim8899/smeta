# 14 - File upload security va private storage

Bu etapda material request fayllari xavfsizroq qilindi: upload policy markazlashdi, storage key spoofing yopildi, private download endpoint qo'shildi va fayl upload/download auditga yoziladigan bo'ldi.

## Backend

Yangi policy fayl:

- `file-upload.policy.ts`

Policy:

- maksimal fayl soni: 10 ta;
- maksimal fayl hajmi: 20 MB;
- ruxsat etilgan turlar: JPEG, PNG, WEBP, PDF, XLS, XLSX;
- MIME va extension birga tekshiriladi;
- original file name sanitizatsiya qilinadi.

`request_attachments` jadvali kuchaytirildi:

- `storage_provider`
- `scan_status`
- `access_level`

Yangi endpoint:

- `GET /material-requests/:requestId/attachments/:attachmentId/download`

Download endpoint:

- faylni faqat request ichidagi attachment bo'yicha beradi;
- `storageKey` bo'lmasa download qilmaydi;
- path traversalga qarshi `basename + resolve` ishlatadi;
- private local storage ichidan stream qiladi.

## Security tuzatish

JSON orqali yuborilgan attachmentlarda `storageKey` saqlanmaydi. Faqat real multipart uploaddan kelgan fayllarga storage key beriladi.

Natija:

- fake `storageKey: "evil.pdf"` yuborilsa DBda `storageKey = null`;
- scan status `metadata_only` bo'ladi;
- real upload fayllari `pending` scan status bilan saqlanadi.

## Audit

Yangi audit eventlar:

- `request_attachment.uploaded`
- `request_attachment.downloaded`

Material request yaratilganda audit metadata ichiga `fileCount` ham yoziladi.

## Frontend

`RequestDetails` endi fayllarni alohida ko'rsatadi:

- fayl nomi;
- MIME turi;
- hajm;
- scan status;
- private download link.

## Tekshiruv

Tekshirildi:

- `npm run typecheck`
- `npm run build`
- real multipart PDF upload;
- private download endpoint 200 qaytarishi;
- upload/download audit yozilishi;
- JSON `storageKey` spoof bloklanishi;
- web sahifa 200;
- API health OK.

Test requestlar:

- `REQ-00009` - real upload/download test.
- `REQ-00011` - storageKey spoof retest, `metadata_only`.

## Hali qolgan ish

- real antivirus/virus scan worker;
- fayl preview thumbnails;
- signed/short-lived download URL;
- role-based download guard;
- S3 yoki boshqa object storage adapter;
- fayl retention/cleanup policy.
