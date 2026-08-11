export type RequestSummary = {
  apiId: string;
  id: string;
  customer: string;
  description?: string | null;
  source: string;
  dealer: string;
  region: string;
  category: string;
  files: string;
  fileItems: Array<{
    downloadUrl: string | null;
    fileName: string;
    id: string;
    mimeType: string;
    scanStatus: string;
    sizeBytes: number;
  }>;
  status: string;
  statusLabel: string;
  budget: string;
  offers: number;
  deadline: string;
};

export type StoreOffer = {
  store: string;
  amount: string;
  validity: string;
  delivery: string;
  status: string;
};

export type LedgerEntry = {
  id: string;
  store: string;
  base: string;
  commission: string;
  dealer: string;
  net: string;
  status: string;
};
