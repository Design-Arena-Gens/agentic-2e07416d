"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Shell } from "@/components/Shell";
import { useData } from "@/context/DataContext";
import { createId } from "@/lib/id";
import styles from "./page.module.css";
import type {
  ChecklistItem,
  ChecklistResponse,
  Exigence,
  OperationRecord,
  OrderConfig,
  SampleScan,
  SampleRule,
} from "@/types";

type ActiveSession = {
  order: OrderConfig;
  exigence: Exigence;
  requiredSamples: number;
  startedAt: string;
};

type ResponseState = Record<string, boolean | string | undefined>;

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(value));

const computeSampleCount = (pieces: number, rule: SampleRule) => {
  if (!rule.piecesPerSample || rule.piecesPerSample <= 0) {
    return Math.max(rule.minSamples ?? 1, 1);
  }

  let count = Math.ceil(pieces / rule.piecesPerSample);
  if (rule.minSamples) {
    count = Math.max(count, rule.minSamples);
  }

  if (rule.maxSamples) {
    count = Math.min(count, rule.maxSamples);
  }

  return Math.max(count, 1);
};

const buildChecklistResponses = (
  checklist: ChecklistItem[],
  state: ResponseState,
): ChecklistResponse[] =>
  checklist.map((item) => ({
    itemId: item.id,
    value:
      state[item.id] !== undefined
        ? state[item.id]!
        : item.type === "passFail"
          ? false
          : "",
  }));

export default function OperatorWorkflow() {
  const {
    orders,
    exigences,
    operations,
    logOperation,
  } = useData();

  const [scanValue, setScanValue] = useState("");
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [samples, setSamples] = useState<SampleScan[]>([]);
  const [responseState, setResponseState] = useState<ResponseState>({});
  const [sampleLabel, setSampleLabel] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const lastOperation = useMemo(
    () => operations.at(0) ?? null,
    [operations],
  );

  const handleScanSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleaned = scanValue.trim();
    if (!cleaned) {
      setFeedback("Scanner le tapis pour récupérer un numéro d'ordre valide.");
      return;
    }

    const matchedOrder = orders.find(
      (order) =>
        order.orderNumber.toLowerCase() === cleaned.toLowerCase(),
    );

    if (!matchedOrder) {
      setFeedback(
        `Aucun ordre trouvé pour le numéro ${cleaned}. Vérifiez la configuration.`,
      );
      return;
    }

    const matchedExigence = exigences.find(
      (item) => item.id === matchedOrder.exigenceId,
    );

    if (!matchedExigence) {
      setFeedback(
        "Cet ordre n'a pas d'exigence associée. Configurez la check-list dans l'espace manager.",
      );
      return;
    }

    const requiredSamples = computeSampleCount(
      matchedOrder.pieceCount,
      matchedExigence.sampleRule,
    );

    setSession({
      order: matchedOrder,
      exigence: matchedExigence,
      requiredSamples,
      startedAt: new Date().toISOString(),
    });
    setSamples([]);
    setSampleLabel("");
    setResponseState({});
    setFeedback(null);
  };

  const handleChecklistValue = (id: string, value: boolean | string) => {
    setResponseState((prev) => ({ ...prev, [id]: value }));
  };

  const checklistReady =
    session?.exigence.checklist.every((item) =>
      item.type === "passFail"
        ? typeof responseState[item.id] === "boolean"
        : true,
    ) ?? false;

  const requiredSampleCount = session?.requiredSamples ?? 0;
  const remainingSamples = Math.max(
    requiredSampleCount - samples.length,
    0,
  );

  const handleSaveSample = () => {
    if (!session) return;

    const trimmedLabel = sampleLabel.trim();
    if (!trimmedLabel) {
      setFeedback("Scanner le code d'échantillon avant de valider.");
      return;
    }

    if (!checklistReady) {
      setFeedback("Compléter la check-list pour l'échantillon courant.");
      return;
    }

    const newSample: SampleScan = {
      id: createId(),
      label: trimmedLabel,
      responses: buildChecklistResponses(
        session.exigence.checklist,
        responseState,
      ),
    };

    const nextSamples = [...samples, newSample];
    setSamples(nextSamples);
    setSampleLabel("");
    setResponseState({});
    setFeedback(null);

    if (nextSamples.length >= session.requiredSamples) {
      const record: OperationRecord = {
        id: createId(),
        orderId: session.order.id,
        exigenceId: session.exigence.id,
        orderNumber: session.order.orderNumber,
        pieceCount: session.order.pieceCount,
        requiredSamples: session.requiredSamples,
        samples: nextSamples,
        startedAt: session.startedAt,
        completedAt: new Date().toISOString(),
      };
      logOperation(record);
      setFeedback("Contrôle finalisé et sauvegardé automatiquement.");
      setSession(null);
      setSamples([]);
      setSampleLabel("");
      setResponseState({});
      setScanValue("");
    }
  };

  const checklistField = (item: ChecklistItem) => {
    if (item.type === "passFail") {
      const value =
        typeof responseState[item.id] === "boolean"
          ? (responseState[item.id] as boolean)
          : undefined;

      return (
        <div className={styles.radioGroup}>
          <label
            className={clsx(styles.radioOption)}
            data-active={value === true}
          >
            <input
              type="radio"
              name={item.id}
              value="ok"
              checked={value === true}
              onChange={() => handleChecklistValue(item.id, true)}
              hidden
            />
            Conforme
          </label>
          <label
            className={clsx(styles.radioOption)}
            data-active={value === false}
          >
            <input
              type="radio"
              name={item.id}
              value="nok"
              checked={value === false}
              onChange={() => handleChecklistValue(item.id, false)}
              hidden
            />
            Non conforme
          </label>
        </div>
      );
    }

    return (
      <textarea
        className={styles.input}
        placeholder="Ajouter une remarque (optionnel)"
        rows={3}
        value={(responseState[item.id] as string) ?? ""}
        onChange={(event) =>
          handleChecklistValue(item.id, event.target.value)
        }
      />
    );
  };

  return (
    <Shell>
      <div className={styles.pageTitle}>
        <h1>Poste opérateur</h1>
        <p>
          Scanner le tapis pour afficher la check-list exigée et contrôler les
          échantillons requis automatiquement.
        </p>
      </div>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Étape 1 · Scanner le tapis</h2>
          <p>
            Lire le code tapis ou saisir le numéro d&apos;ordre de fabrication
            pour récupérer les informations de production.
          </p>
        </div>

        <form className={styles.scanForm} onSubmit={handleScanSubmit}>
          <input
            className={styles.input}
            value={scanValue}
            onChange={(event) => setScanValue(event.target.value)}
            placeholder="Numéro d'ordre / scan tapis"
          />
          <button type="submit" className={styles.primaryButton}>
            Récupérer l&apos;ordre
          </button>
        </form>

        {feedback && <div className={styles.error}>{feedback}</div>}

        {session && (
          <>
            <div className={styles.orderSummary}>
              <div className={styles.summaryLine}>
                <span className={styles.summaryLabel}>Ordre</span>
                <span className={styles.summaryValue}>
                  {session.order.orderNumber}
                </span>
              </div>
              <div className={styles.summaryLine}>
                <span className={styles.summaryLabel}>Exigence</span>
                <span className={styles.summaryValue}>
                  {session.exigence.name}
                </span>
              </div>
              <div className={styles.summaryLine}>
                <span className={styles.summaryLabel}>
                  Nombre de pièces
                </span>
                <span className={styles.summaryValue}>
                  {session.order.pieceCount}
                </span>
              </div>
              <div className={styles.summaryLine}>
                <span className={styles.summaryLabel}>
                  Échantillons requis
                </span>
                <span className={styles.summaryValue}>
                  {session.requiredSamples}
                </span>
              </div>
              <div className={styles.summaryLine}>
                <span className={styles.summaryLabel}>
                  Échantillons restants
                </span>
                <span className={styles.summaryValue}>
                  {remainingSamples}
                </span>
              </div>
            </div>

            <div className={styles.cardHeader}>
              <h2>Étape 2 · Scanner les échantillons</h2>
              <p>
                Valider {session.requiredSamples} échantillon
                {session.requiredSamples > 1 ? "s" : ""} en suivant la
                check-list configurée pour cette exigence.
              </p>
            </div>

            <input
              className={styles.input}
              value={sampleLabel}
              onChange={(event) => setSampleLabel(event.target.value)}
              placeholder="Code échantillon scanné"
            />

            <div className={styles.checklist}>
              {session.exigence.checklist.map((item) => (
                <div key={item.id} className={styles.checklistItem}>
                  <span className={styles.checklistLabel}>{item.label}</span>
                  {item.guidance ? (
                    <small className={styles.summaryLabel}>
                      {item.guidance}
                    </small>
                  ) : null}
                  {checklistField(item)}
                </div>
              ))}
            </div>

            {samples.length > 0 ? (
              <div className={styles.samplesList}>
                {samples.map((sample, index) => (
                  <div key={sample.id} className={styles.sampleCard}>
                    <div className={styles.sampleHeader}>
                      <span>Échantillon {index + 1}</span>
                      <span>{sample.label}</span>
                    </div>
                    <ul>
                      {sample.responses.map((response) => {
                        const item = session.exigence.checklist.find(
                          (check) => check.id === response.itemId,
                        );
                        if (!item) return null;
                        return (
                          <li key={response.itemId}>
                            <strong>{item.label} :</strong>{" "}
                            {item.type === "passFail"
                              ? (response.value as boolean)
                                ? "Conforme"
                                : "Non conforme"
                              : (response.value as string) || "—"}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleSaveSample}
              disabled={!session}
            >
              Valider l&apos;échantillon
            </button>
          </>
        )}
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Historique des opérations</h2>
          <p>Chaque contrôle est archivé automatiquement à la validation.</p>
        </div>

        {operations.length === 0 ? (
          <div className={styles.emptyState}>
            Aucun contrôle enregistré pour le moment.
          </div>
        ) : (
          <div className={styles.timeline}>
            {operations.map((operation) => {
              const exigence = exigences.find(
                (item) => item.id === operation.exigenceId,
              );

              return (
                <article key={operation.id} className={styles.timelineItem}>
                  <div className={styles.sampleHeader}>
                    <span>
                      Ordre {operation.orderNumber} ·{" "}
                      {operation.samples.length}/{operation.requiredSamples}{" "}
                      échantillons
                    </span>
                    <span className={styles.statusPill}>Terminé</span>
                  </div>
                  <div className={styles.timelineMeta}>
                    Démarré : {formatDateTime(operation.startedAt)} · clôturé :{" "}
                    {formatDateTime(operation.completedAt)}
                  </div>
                  <div className={styles.samplesList}>
                    {operation.samples.map((sample, index) => (
                      <div key={sample.id} className={styles.sampleCard}>
                        <div className={styles.sampleHeader}>
                          <span>Échantillon {index + 1}</span>
                          <span>{sample.label}</span>
                        </div>
                        <ul>
                          {sample.responses.map((response) => {
                            const item = exigence?.checklist.find(
                              (check) => check.id === response.itemId,
                            );
                            if (!item) return null;
                            return (
                              <li key={response.itemId}>
                                <strong>{item.label} :</strong>{" "}
                                {item.type === "passFail"
                                  ? (response.value as boolean)
                                    ? "Conforme"
                                    : "Non conforme"
                                  : (response.value as string) || "—"}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {lastOperation && !session ? (
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setScanValue(lastOperation.orderNumber);
            setFeedback(null);
          }}
        >
          Reprendre le dernier ordre contrôlé
        </button>
      ) : null}
    </Shell>
  );
}
