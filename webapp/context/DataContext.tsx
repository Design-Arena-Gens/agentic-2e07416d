/**
 * DataContext centralizes configuration data (exigences & orders)
 * and runtime results (operations). Backed by localStorage so it
 * works client-side without a database.
 */
"use client";

import { createContext, useContext, useMemo } from "react";
import { usePersistentState } from "@/lib/usePersistentState";
import { createId } from "@/lib/id";
import type {
  Exigence,
  OperationRecord,
  OrderConfig,
  SampleRule,
} from "@/types";

type DataContextValue = {
  exigences: Exigence[];
  upsertExigence: (payload: Omit<Exigence, "id"> & { id?: string }) => void;
  deleteExigence: (id: string) => void;

  orders: OrderConfig[];
  upsertOrder: (payload: Omit<OrderConfig, "id"> & { id?: string }) => void;
  deleteOrder: (id: string) => void;

  operations: OperationRecord[];
  logOperation: (record: OperationRecord) => void;
  clearOperations: () => void;
};

const DataContext = createContext<DataContextValue | undefined>(undefined);

const EXIGENCES_KEY = "odoo-checklist-exigences";
const ORDERS_KEY = "odoo-checklist-orders";
const OPERATIONS_KEY = "odoo-checklist-operations";

const defaultSampleRule: SampleRule = {
  piecesPerSample: 30,
  minSamples: 1,
  maxSamples: 10,
};

const DEFAULT_EXIGENCES: Exigence[] = [
  {
    id: createId(),
    name: "Control Qualité Standard",
    code: "STD-CTRL",
    description: "Checklist générique pour les ordres standards.",
    sampleRule: defaultSampleRule,
    checklist: [
      {
        id: createId(),
        label: "État visuel conforme",
        type: "passFail",
      },
      {
        id: createId(),
        label: "Dimensions vérifiées",
        type: "passFail",
      },
      {
        id: createId(),
        label: "Observation / Remarque",
        type: "text",
      },
    ],
  },
];

const DEFAULT_ORDERS: OrderConfig[] = [
  {
    id: createId(),
    orderNumber: "CMD-1001",
    exigenceId: DEFAULT_EXIGENCES[0].id,
    pieceCount: 120,
    notes: "Commande test pour démonstration.",
  },
];

function useDataState() {
  const [exigences, setExigences] = usePersistentState<Exigence[]>(
    EXIGENCES_KEY,
    DEFAULT_EXIGENCES,
  );
  const [orders, setOrders] = usePersistentState<OrderConfig[]>(
    ORDERS_KEY,
    DEFAULT_ORDERS,
  );
  const [operations, setOperations] = usePersistentState<OperationRecord[]>(
    OPERATIONS_KEY,
    [],
  );

  const value = useMemo<DataContextValue>(
    () => ({
      exigences,
      upsertExigence: (payload) => {
        setExigences((prev) => {
          if (payload.id) {
            return prev.map((item) =>
              item.id === payload.id ? { ...item, ...payload } : item,
            );
          }
          return [...prev, { ...payload, id: createId() }];
        });
      },
      deleteExigence: (id) => {
        setExigences((prev) => prev.filter((item) => item.id !== id));
        setOrders((prev) => prev.filter((order) => order.exigenceId !== id));
      },

      orders,
      upsertOrder: (payload) => {
        setOrders((prev) => {
          if (payload.id) {
            return prev.map((item) =>
              item.id === payload.id ? { ...item, ...payload } : item,
            );
          }
          return [...prev, { ...payload, id: createId() }];
        });
      },
      deleteOrder: (id) => {
        setOrders((prev) => prev.filter((item) => item.id !== id));
      },

      operations,
      logOperation: (record) => {
        setOperations((prev) => [record, ...prev]);
      },
      clearOperations: () => {
        setOperations([]);
      },
    }),
    [exigences, orders, operations, setExigences, setOrders, setOperations],
  );

  return value;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const value = useDataState();
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const value = useContext(DataContext);
  if (!value) {
    throw new Error("useData must be used within DataProvider");
  }
  return value;
}
