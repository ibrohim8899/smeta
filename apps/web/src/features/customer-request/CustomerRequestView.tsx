import { useState } from "react";
import { CheckCircle2, Clock3, MapPin, Phone, Send, UploadCloud } from "lucide-react";
import { createMaterialRequestWithFiles, type MaterialRequestResponse } from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";
import { TextField } from "../../components/ui/TextField";

const customerSteps = [
  "Yuborildi",
  "Admin tekshirmoqda",
  "Do'konlardan taklif yig'ilyapti",
  "Taklifni tanlash",
  "Yetkazildi va tasdiqlandi"
];

type CustomerRequestViewProps = {
  onRequestCreated: () => Promise<void>;
};

export function CustomerRequestView({ onRequestCreated }: CustomerRequestViewProps) {
  const [customerName, setCustomerName] = useState("Ali Karimov");
  const [phone, setPhone] = useState("+998 90 123 45 67");
  const [region, setRegion] = useState("Namangan sh.");
  const [category, setCategory] = useState("Qurilish materiallari");
  const [dealerReferral, setDealerReferral] = useState("Usta Jamshid");
  const [dealerReferralCode, setDealerReferralCode] = useState("USTA-JAM-24");
  const [description, setDescription] = useState("Uy remonti uchun sement, g'isht, armatura va bo'yoq kerak.");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<MaterialRequestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setCreatedRequest(null);
    setIsSubmitting(true);

    try {
      const result = await createMaterialRequestWithFiles(
        {
          category,
          customerName,
          dealerReferral,
          dealerReferralCode,
          description,
          phone,
          region,
          source: "guest_link"
        },
        files
      );
      setCreatedRequest(result);
      await onRequestCreated();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "So'rov yuborilmadi");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
        <div className="flex items-center gap-3">
          <UploadCloud className="h-5 w-5 text-smeta-clay" />
          <h3 className="text-lg font-semibold">Material ro'yxatini yuborish</h3>
        </div>

        <label className="mt-5 block rounded-2xl border border-dashed border-smeta-rose bg-smeta-soft px-5 py-8 text-center shadow-smeta-soft">
          <UploadCloud className="mx-auto h-9 w-9 text-smeta-clay" />
          <p className="mt-3 text-sm font-semibold">JPEG, PNG, PDF, XLS yoki XLSX</p>
          <p className="mt-1 text-xs text-smeta-mauve">10 tagacha fayl, har biri 20MB gacha</p>
          <span className="mt-5 inline-flex rounded-xl bg-smeta-deep px-4 py-2 text-sm font-semibold text-white shadow-smeta-soft">Fayl tanlash</span>
          <input
            className="sr-only"
            multiple
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 10))}
          />
        </label>

        {files.length > 0 ? (
          <div className="mt-3 rounded-md bg-smeta-soft px-3 py-3 text-sm text-smeta-mauve">
            {files.length} ta fayl tanlandi: {files.map((file) => file.name).join(", ")}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <TextField label="Ism" value={customerName} onChange={setCustomerName} />
          <TextField label="Telefon" value={phone} onChange={setPhone} icon={Phone} />
          <TextField label="Hudud" value={region} onChange={setRegion} icon={MapPin} />
          <TextField label="Kategoriya" value={category} onChange={setCategory} />
          <TextField label="Tavsiya qilgan usta" value={dealerReferral} onChange={setDealerReferral} />
          <TextField label="Referral kodi" value={dealerReferralCode} onChange={setDealerReferralCode} />
        </div>

        <label className="mt-3 block">
          <span className="text-xs font-semibold text-smeta-mauve">Izoh</span>
          <textarea
            className="mt-1 min-h-24 w-full rounded-xl border border-smeta-line bg-smeta-surface px-3 py-2 text-sm font-medium outline-none"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {createdRequest ? (
          <p className="mt-3 rounded-md bg-smeta-soft px-3 py-2 text-sm font-semibold text-smeta-ink">
            So'rov yaratildi: {createdRequest.publicCode} · {formatStatusLabel(createdRequest.status)}
          </p>
        ) : null}

        <button
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-smeta-clay px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || !customerName || !region || !category}
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? "Yuborilmoqda..." : "So'rov yuborish"}
        </button>
      </section>

      <section className="rounded-2xl border border-smeta-line bg-smeta-surface p-5 shadow-smeta">
        <h3 className="text-lg font-semibold">Mijoz ko'radigan statuslar</h3>
        <div className="mt-5 space-y-4">
          {customerSteps.map((step, index) => (
            <div key={step} className="flex gap-3">
              <div
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  index < 3 ? "bg-smeta-clay text-white" : "bg-smeta-soft text-smeta-mauve"
                }`}
              >
                {index < 3 ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold">{step}</p>
                <p className="text-xs leading-5 text-smeta-mauve">Mijozga qisqa, tushunarli holat ko'rsatiladi.</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
