export type ChecklistItemType = "passFail" | "text";

export interface ChecklistItem {
  id: string;
  label: string;
  type: ChecklistItemType;
  guidance?: string;
}

export interface SampleRule {
  piecesPerSample: number;
  minSamples?: number;
  maxSamples?: number;
}

export interface Exigence {
  id: string;
  name: string;
  code: string;
  description?: string;
  sampleRule: SampleRule;
  checklist: ChecklistItem[];
}

export interface OrderConfig {
  id: string;
  orderNumber: string;
  exigenceId: string;
  pieceCount: number;
  notes?: string;
}

export interface ChecklistResponse {
  itemId: string;
  value: boolean | string;
}

export interface SampleScan {
  id: string;
  label: string;
  responses: ChecklistResponse[];
}

export interface OperationRecord {
  id: string;
  orderId: string;
  exigenceId: string;
  orderNumber: string;
  pieceCount: number;
  requiredSamples: number;
  samples: SampleScan[];
  startedAt: string;
  completedAt: string;
}
