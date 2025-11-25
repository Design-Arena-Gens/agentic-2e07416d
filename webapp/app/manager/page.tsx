"use client";

import { useMemo, useState } from "react";
import { Shell } from "@/components/Shell";
import { useData } from "@/context/DataContext";
import { createId } from "@/lib/id";
import type {
  ChecklistItemType,
  Exigence,
  OrderConfig,
  SampleRule,
} from "@/types";
import styles from "./page.module.css";

type ChecklistDraft = {
  id: string;
  label: string;
  type: ChecklistItemType;
  guidance?: string;
};

type ExigenceFormState = {
  id?: string;
  name: string;
  code: string;
  description: string;
  sampleRule: SampleRule;
  checklist: ChecklistDraft[];
};

type OrderFormState = {
  id?: string;
  orderNumber: string;
  pieceCount: number;
  exigenceId: string;
  notes: string;
};

const createEmptyExigence = (): ExigenceFormState => ({
  name: "",
  code: "",
  description: "",
  sampleRule: {
    piecesPerSample: 30,
    minSamples: 1,
    maxSamples: 10,
  },
  checklist: [
    {
      id: createId(),
      label: "Contrôle visuel",
      type: "passFail",
    },
  ],
});

const createEmptyOrder = (): OrderFormState => ({
  orderNumber: "",
  pieceCount: 0,
  exigenceId: "",
  notes: "",
});

export default function ManagerPage() {
  const {
    exigences,
    orders,
    upsertExigence,
    deleteExigence,
    upsertOrder,
    deleteOrder,
  } = useData();

  const [exigenceForm, setExigenceForm] = useState<ExigenceFormState>(
    createEmptyExigence,
  );
  const [orderForm, setOrderForm] = useState<OrderFormState>(
    createEmptyOrder,
  );

  const isEditingExigence = Boolean(exigenceForm.id);
  const isEditingOrder = Boolean(orderForm.id);

  const exigencesById = useMemo(() => {
    const map = new Map<string, Exigence>();
    exigences.forEach((exigence) => map.set(exigence.id, exigence));
    return map;
  }, [exigences]);

  const handleAddChecklistItem = () => {
    setExigenceForm((prev) => ({
      ...prev,
      checklist: [
        ...prev.checklist,
        {
          id: createId(),
          label: "",
          type: "passFail",
        },
      ],
    }));
  };

  const handleChecklistChange = (
    id: string,
    field: "label" | "type" | "guidance",
    value: string,
  ) => {
    setExigenceForm((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const handleChecklistRemoval = (id: string) => {
    setExigenceForm((prev) => ({
      ...prev,
      checklist: prev.checklist.filter((item) => item.id !== id),
    }));
  };

  const resetExigenceForm = () => {
    setExigenceForm(createEmptyExigence());
  };

  const resetOrderForm = () => {
    setOrderForm(createEmptyOrder());
  };

  const handleExigenceSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!exigenceForm.name.trim() || !exigenceForm.code.trim()) {
      alert("Nom et code exigence sont obligatoires.");
      return;
    }

    if (exigenceForm.checklist.length === 0) {
      alert("Ajouter au minimum un item dans la check-list.");
      return;
    }

    upsertExigence({
      id: exigenceForm.id,
      name: exigenceForm.name.trim(),
      code: exigenceForm.code.trim(),
      description: exigenceForm.description.trim(),
      sampleRule: {
        piecesPerSample: Math.max(
          1,
          Number(exigenceForm.sampleRule.piecesPerSample) || 1,
        ),
        minSamples: exigenceForm.sampleRule.minSamples
          ? Math.max(1, Number(exigenceForm.sampleRule.minSamples))
          : undefined,
        maxSamples: exigenceForm.sampleRule.maxSamples
          ? Math.max(
              exigenceForm.sampleRule.minSamples ?? 1,
              Number(exigenceForm.sampleRule.maxSamples),
            )
          : undefined,
      },
      checklist: exigenceForm.checklist.map((item) => ({
        id: item.id,
        label: item.label.trim(),
        type: item.type,
        guidance: item.guidance?.trim() || undefined,
      })),
    });

    resetExigenceForm();
  };

  const handleOrderSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!orderForm.orderNumber.trim()) {
      alert("Le numéro d'ordre est obligatoire.");
      return;
    }

    if (!orderForm.exigenceId) {
      alert("Associez une exigence à l'ordre.");
      return;
    }

    if (!orderForm.pieceCount || orderForm.pieceCount <= 0) {
      alert("Le nombre de pièces doit être supérieur à 0.");
      return;
    }

    upsertOrder({
      id: orderForm.id,
      orderNumber: orderForm.orderNumber.trim(),
      pieceCount: Math.floor(orderForm.pieceCount),
      exigenceId: orderForm.exigenceId,
      notes: orderForm.notes.trim(),
    });

    resetOrderForm();
  };

  const handleEditExigence = (exigence: Exigence) => {
    setExigenceForm({
      id: exigence.id,
      name: exigence.name,
      code: exigence.code,
      description: exigence.description ?? "",
      sampleRule: {
        piecesPerSample: exigence.sampleRule.piecesPerSample,
        minSamples: exigence.sampleRule.minSamples,
        maxSamples: exigence.sampleRule.maxSamples,
      },
      checklist: exigence.checklist.map((item) => ({
        id: item.id,
        label: item.label,
        type: item.type,
        guidance: item.guidance,
      })),
    });
  };

  const handleEditOrder = (order: OrderConfig) => {
    setOrderForm({
      id: order.id,
      orderNumber: order.orderNumber,
      pieceCount: order.pieceCount,
      exigenceId: order.exigenceId,
      notes: order.notes ?? "",
    });
  };

  const handleDeleteExigence = (id: string) => {
    if (!window.confirm("Supprimer cette exigence et les ordres associés ?")) {
      return;
    }
    deleteExigence(id);
    if (exigenceForm.id === id) {
      resetExigenceForm();
    }
  };

  const handleDeleteOrder = (id: string) => {
    if (!window.confirm("Supprimer cet ordre de production ?")) return;
    deleteOrder(id);
    if (orderForm.id === id) {
      resetOrderForm();
    }
  };

  return (
    <Shell>
      <div className={styles.pageTitle}>
        <h1>Espace manager</h1>
        <p>
          Configurez les exigences, règles d&apos;échantillonnage et check-lists
          utilisées par les opérateurs.
        </p>
      </div>

      <div className={styles.grid}>
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Exigences & check-lists</h2>
            <p>
              Définissez les règles d&apos;échantillonnage et les contrôles à
              réaliser pour chaque exigence qualité.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleExigenceSubmit}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldGroup}>
                <span className={styles.label}>Nom</span>
                <input
                  className={styles.input}
                  value={exigenceForm.name}
                  onChange={(event) =>
                    setExigenceForm((prev) => ({
                      ...prev,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Ex: Contrôle qualité standard"
                  required
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.label}>Code</span>
                <input
                  className={styles.input}
                  value={exigenceForm.code}
                  onChange={(event) =>
                    setExigenceForm((prev) => ({
                      ...prev,
                      code: event.target.value,
                    }))
                  }
                  placeholder="Ex: CTRL-STD"
                  required
                />
              </label>
            </div>

            <label className={styles.fieldGroup}>
              <span className={styles.label}>Description</span>
              <textarea
                className={styles.textarea}
                value={exigenceForm.description}
                onChange={(event) =>
                  setExigenceForm((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Objectifs, périmètre ou notes pour cette exigence."
              />
            </label>

            <div className={styles.fieldRow}>
              <label className={styles.fieldGroup}>
                <span className={styles.label}>
                  1 échantillon pour X pièces
                </span>
                <input
                  type="number"
                  min={1}
                  className={styles.input}
                  value={exigenceForm.sampleRule.piecesPerSample}
                  onChange={(event) =>
                    setExigenceForm((prev) => ({
                      ...prev,
                      sampleRule: {
                        ...prev.sampleRule,
                        piecesPerSample: Number(event.target.value),
                      },
                    }))
                  }
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.label}>Minimum d&apos;échantillons</span>
                <input
                  type="number"
                  min={1}
                  className={styles.input}
                  value={exigenceForm.sampleRule.minSamples ?? ""}
                  onChange={(event) =>
                    setExigenceForm((prev) => ({
                      ...prev,
                      sampleRule: {
                        ...prev.sampleRule,
                        minSamples: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      },
                    }))
                  }
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.label}>Maximum d&apos;échantillons</span>
                <input
                  type="number"
                  min={1}
                  className={styles.input}
                  value={exigenceForm.sampleRule.maxSamples ?? ""}
                  onChange={(event) =>
                    setExigenceForm((prev) => ({
                      ...prev,
                      sampleRule: {
                        ...prev.sampleRule,
                        maxSamples: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      },
                    }))
                  }
                />
              </label>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.listHeader}>
                <span className={styles.label}>Check-list</span>
                <button
                  type="button"
                  className={styles.smallButton}
                  onClick={handleAddChecklistItem}
                >
                  Ajouter un contrôle
                </button>
              </div>
              <div className={styles.checklistItems}>
                {exigenceForm.checklist.map((item) => (
                  <div key={item.id} className={styles.checklistRow}>
                    <div className={styles.fieldGroup}>
                      <input
                        className={styles.input}
                        value={item.label}
                        onChange={(event) =>
                          handleChecklistChange(
                            item.id,
                            "label",
                            event.target.value,
                          )
                        }
                        placeholder="Libellé du contrôle"
                        required
                      />
                      <input
                        className={styles.input}
                        value={item.guidance ?? ""}
                        onChange={(event) =>
                          handleChecklistChange(
                            item.id,
                            "guidance",
                            event.target.value,
                          )
                        }
                        placeholder="Guidance opérateur (optionnel)"
                      />
                    </div>
                    <div className={styles.fieldGroup}>
                      <select
                        className={styles.select}
                        value={item.type}
                        onChange={(event) =>
                          handleChecklistChange(
                            item.id,
                            "type",
                            event.target.value,
                          )
                        }
                      >
                        <option value="passFail">Conforme / Non conforme</option>
                        <option value="text">Champ texte</option>
                      </select>
                      <div className={styles.checklistActions}>
                        <button
                          type="button"
                          className={styles.smallButton}
                          onClick={() => handleChecklistRemoval(item.id)}
                          disabled={exigenceForm.checklist.length <= 1}
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.buttonRow}>
              <button type="submit" className={styles.primaryButton}>
                {isEditingExigence ? "Mettre à jour l'exigence" : "Créer l'exigence"}
              </button>
              {isEditingExigence ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetExigenceForm}
                >
                  Annuler l&apos;édition
                </button>
              ) : null}
            </div>
          </form>

          <div className={styles.divider} />

          {exigences.length === 0 ? (
            <div className={styles.emptyState}>
              Aucune exigence configurée. Commencez par créer votre première
              check-list.
            </div>
          ) : (
            <div className={styles.list}>
              {exigences.map((exigence) => (
                <article key={exigence.id} className={styles.listItem}>
                  <div className={styles.listHeader}>
                    <div>
                      <strong>{exigence.name}</strong>{" "}
                      <span className={styles.listMeta}>{exigence.code}</span>
                    </div>
                    <div className={styles.buttonRow}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => handleEditExigence(exigence)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => handleDeleteExigence(exigence.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  {exigence.description ? (
                    <p className={styles.listMeta}>{exigence.description}</p>
                  ) : null}
                  <div className={styles.chipRow}>
                    <span className={styles.chip}>
                      1 échantillon / {exigence.sampleRule.piecesPerSample} pièces
                    </span>
                    {exigence.sampleRule.minSamples ? (
                      <span className={styles.chip}>
                        Min {exigence.sampleRule.minSamples} échantillon
                        {exigence.sampleRule.minSamples > 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {exigence.sampleRule.maxSamples ? (
                      <span className={styles.chip}>
                        Max {exigence.sampleRule.maxSamples} échantillon
                        {exigence.sampleRule.maxSamples > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                  <ul>
                    {exigence.checklist.map((item) => (
                      <li key={item.id}>
                        <strong>{item.label}</strong> ·{" "}
                        {item.type === "passFail"
                          ? "Conforme / Non conforme"
                          : "Champ texte"}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Ordres de production</h2>
            <p>
              Associez chaque ordre à une exigence et renseignez le volume de
              pièces pour calculer automatiquement le nombre d&apos;échantillons.
            </p>
          </div>

          <form className={styles.form} onSubmit={handleOrderSubmit}>
            <div className={styles.fieldRow}>
              <label className={styles.fieldGroup}>
                <span className={styles.label}>Numéro d&apos;ordre</span>
                <input
                  className={styles.input}
                  value={orderForm.orderNumber}
                  onChange={(event) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      orderNumber: event.target.value,
                    }))
                  }
                  placeholder="Ex: CMD-1001"
                  required
                />
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.label}>Pièces dans l&apos;ordre</span>
                <input
                  type="number"
                  min={1}
                  className={styles.input}
                  value={
                    Number.isNaN(orderForm.pieceCount)
                      ? ""
                      : orderForm.pieceCount
                  }
                  onChange={(event) =>
                    setOrderForm((prev) => ({
                      ...prev,
                      pieceCount: Number(event.target.value),
                    }))
                  }
                  required
                />
              </label>
            </div>

            <label className={styles.fieldGroup}>
              <span className={styles.label}>Exigence associée</span>
              <select
                className={styles.select}
                value={orderForm.exigenceId}
                onChange={(event) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    exigenceId: event.target.value,
                  }))
                }
                required
              >
                <option value="">Sélectionner une exigence</option>
                {exigences.map((exigence) => (
                  <option key={exigence.id} value={exigence.id}>
                    {exigence.name}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span className={styles.label}>Notes internes</span>
              <textarea
                className={styles.textarea}
                value={orderForm.notes}
                onChange={(event) =>
                  setOrderForm((prev) => ({
                    ...prev,
                    notes: event.target.value,
                  }))
                }
                placeholder="Informations complémentaires destinées aux opérateurs."
              />
            </label>

            <div className={styles.buttonRow}>
              <button type="submit" className={styles.primaryButton}>
                {isEditingOrder ? "Mettre à jour l'ordre" : "Créer l'ordre"}
              </button>
              {isEditingOrder ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={resetOrderForm}
                >
                  Annuler l&apos;édition
                </button>
              ) : null}
            </div>
          </form>

          <div className={styles.divider} />

          {orders.length === 0 ? (
            <div className={styles.emptyState}>
              Aucun ordre configuré. Créez un ordre pour permettre le scan côté
              opérateur.
            </div>
          ) : (
            <div className={styles.list}>
              {orders.map((order) => (
                <article key={order.id} className={styles.listItem}>
                  <div className={styles.listHeader}>
                    <div>
                      <strong>{order.orderNumber}</strong>{" "}
                      <span className={styles.listMeta}>
                        {order.pieceCount} pièces
                      </span>
                    </div>
                    <div className={styles.buttonRow}>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => handleEditOrder(order)}
                      >
                        Modifier
                      </button>
                      <button
                        type="button"
                        className={styles.dangerButton}
                        onClick={() => handleDeleteOrder(order.id)}
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                  <div className={styles.listMeta}>
                    Exigence :{" "}
                    {exigencesById.get(order.exigenceId)?.name ??
                      "Non configurée"}
                  </div>
                  {order.notes ? (
                    <p className={styles.listMeta}>{order.notes}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
