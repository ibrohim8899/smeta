import { useState } from "react";
import { Hash, Hammer, MapPin, MessageSquareText, Phone, Send, Tags, UploadCloud, UserRound } from "lucide-react";
import { createMaterialRequestWithFiles, type MaterialRequestResponse } from "../../lib/api";
import { formatStatusLabel } from "../../lib/labels";
import { UZBEKISTAN_REGIONS } from "../../lib/regions";
import { SelectField } from "../../components/ui/SelectField";
import { TextField } from "../../components/ui/TextField";

function formatUzPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");
  const localDigits = extractUzPhoneLocalDigits(digits).slice(0, 9);

  const parts = [localDigits.slice(0, 2), localDigits.slice(2, 5), localDigits.slice(5, 7), localDigits.slice(7, 9)].filter(Boolean);
  return parts.length ? `+998 ${parts.join(" ")}` : "+998 ";
}

function extractUzPhoneLocalDigits(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("998")) {
    return digits.slice(3);
  }

  if (digits.startsWith("0")) {
    return digits.slice(1);
  }

  return digits;
}

type CustomerRequestViewProps = {
  initialDealerReferral?: string;
  initialDealerReferralCode?: string;
  onRequestCreated: () => Promise<void>;
};

export function CustomerRequestView({ initialDealerReferral, initialDealerReferralCode, onRequestCreated }: CustomerRequestViewProps) {
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("+998 ");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [dealerReferral, setDealerReferral] = useState(initialDealerReferral ?? "");
  const [dealerReferralCode, setDealerReferralCode] = useState(initialDealerReferralCode ?? "");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdRequest, setCreatedRequest] = useState<MaterialRequestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const phoneLocalDigits = extractUzPhoneLocalDigits(phone);
  const normalizedPhone = phoneLocalDigits.length === 9 ? formatUzPhoneInput(phoneLocalDigits) : "";
  const phoneError = phoneLocalDigits.length > 0 && phoneLocalDigits.length !== 9 ? "Telefon raqamini to'liq kiriting" : null;
  const isFormReady = Boolean(customerName.trim() && region.trim() && category.trim() && files.length > 0 && !phoneError);

  async function handleSubmit() {
    setError(null);
    setCreatedRequest(null);
    setIsSubmitting(true);

    try {
      const result = await createMaterialRequestWithFiles(
        {
          category: category.trim(),
          customerName: customerName.trim(),
          dealerReferral: dealerReferral.trim(),
          dealerReferralCode: dealerReferralCode.trim(),
          description: description.trim(),
          phone: normalizedPhone,
          region: region.trim(),
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
    <div className="mx-auto max-w-3xl">
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
            accept=".jpg,.jpeg,.png,.webp,.pdf,.xls,.xlsx"
            className="sr-only"
            multiple
            type="file"
            onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 10))}
          />
        </label>

        {files.length > 0 ? (
          <div className="mt-3 rounded-md bg-smeta-soft px-3 py-3 text-sm text-smeta-mauve">
            {files.length} ta fayl tanlandi: {files.map((file) => file.name).join(", ")}
          </div>
        ) : (
          <div className="mt-3 rounded-md bg-smeta-soft px-3 py-3 text-sm text-smeta-mauve">
            Guest so'rov uchun kamida bitta material ro'yxati fayli majburiy.
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <TextField
            autoComplete="name"
            icon={UserRound}
            label="Ism"
            maxLength={120}
            placeholder="Masalan: Ibroxim"
            required
            value={customerName}
            onChange={setCustomerName}
          />
          <TextField
            autoComplete="tel"
            error={phoneError}
            helperText="Keyingi bosqichda mijoz bilan bog'lanish uchun kerak bo'ladi"
            icon={Phone}
            inputMode="tel"
            label="Telefon"
            placeholder="+998 90 123 45 67"
            value={phone}
            onChange={(value) => setPhone(formatUzPhoneInput(value))}
          />
          <SelectField
            icon={MapPin}
            label="Hudud"
            options={UZBEKISTAN_REGIONS}
            placeholder="O'zbekiston hududini tanlang"
            required
            value={region}
            onChange={setRegion}
          />
          <TextField
            icon={Tags}
            label="Kategoriya"
            maxLength={120}
            placeholder="Masalan: Qurilish materiallari"
            required
            value={category}
            onChange={setCategory}
          />
          <TextField
            helperText="Agar usta olib kelgan bo'lsa, ismini yozing"
            icon={Hammer}
            label="Tavsiya qilgan usta"
            maxLength={120}
            placeholder="Usta ismi"
            value={dealerReferral}
            onChange={setDealerReferral}
          />
          <TextField
            autoComplete="off"
            icon={Hash}
            label="Referral kodi"
            maxLength={64}
            placeholder="Kod bo'lsa kiriting"
            value={dealerReferralCode}
            onChange={(value) => setDealerReferralCode(value.trim().toUpperCase())}
          />
        </div>

        <label className="mt-3 block">
          <span className="flex items-center justify-between gap-3 text-xs font-semibold text-smeta-mauve">
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="h-3.5 w-3.5 text-smeta-clay" />
              Izoh
            </span>
            <span>{description.length}/1000</span>
          </span>
          <textarea
            className="mt-1 min-h-28 w-full resize-y rounded-xl border border-smeta-line bg-smeta-elevated px-3 py-3 text-sm font-semibold text-smeta-ink outline-none shadow-smeta-soft placeholder:text-smeta-mauve/60 focus:border-smeta-clay focus:ring-4 focus:ring-smeta-clay/15"
            maxLength={1000}
            placeholder="Yetkazish manzili, muddat yoki do'konlarga qo'shimcha talablarni yozing"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {createdRequest ? (
          <div className="mt-3 rounded-xl border border-smeta-line bg-smeta-soft px-3 py-3 text-sm text-smeta-ink">
            <p className="font-semibold">
              So'rov yaratildi: {createdRequest.publicCode} - {formatStatusLabel(createdRequest.status)}
            </p>
            {createdRequest.guestAccessUrl ? (
              <a className="mt-2 block break-all text-xs font-semibold text-smeta-clay" href={createdRequest.guestAccessUrl}>
                Maxfiy status havolasi: {createdRequest.guestAccessUrl}
              </a>
            ) : null}
          </div>
        ) : null}

        <p className="mt-3 rounded-xl border border-smeta-line bg-smeta-soft px-3 py-3 text-xs leading-5 text-smeta-mauve">
          Fayllar faqat tasdiqlangan do'konlarga yuboriladi. Telefon va aniq manzil g'olib do'kon qabul qilmaguncha yashiriladi.
        </p>

        <button
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-md bg-smeta-clay px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting || !isFormReady}
          onClick={handleSubmit}
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? "Yuborilmoqda..." : "So'rov yuborish"}
        </button>
      </section>
    </div>
  );
}
