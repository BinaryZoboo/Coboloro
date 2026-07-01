import { AnimatePresence, motion } from "framer-motion";
import { ArrowRightIcon, CheckIcon, RefreshCwIcon, SparklesIcon, WalletIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";

export interface WizardRecurringItem {
  categoryId: string;
  categoryName: string;
  amount: number;
}

export interface WizardIncomeItem {
  categoryId: string;
  categoryName: string;
  currentAmount: number | null;
  suggestedAmount: number;
}

interface MonthlyBudgetWizardProps {
  isOpen: boolean;
  onClose: () => void;
  monthLabel: string;
  incomeItems: WizardIncomeItem[];
  totalIncomeBudgeted: number;
  recurringItems: WizardRecurringItem[];
  totalEngaged: number;
  onSaveAmount: (categoryId: string, value: string) => Promise<void>;
  onStopRecurring: (categoryId: string) => Promise<void>;
}

function fmt(v: number) {
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseAmount(raw: string): number | null {
  const amount = Number(raw.replace(",", "."));
  if (!raw || isNaN(amount) || amount <= 0 || amount > 1_000_000) return null;
  return amount;
}

const inputClass = "w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2.5 text-fg text-sm focus:outline-none focus:border-accent/50";

export function MonthlyBudgetWizard({
  isOpen,
  onClose,
  monthLabel,
  incomeItems,
  totalIncomeBudgeted,
  recurringItems,
  totalEngaged,
  onSaveAmount,
  onStopRecurring,
}: MonthlyBudgetWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [incomeMode, setIncomeMode] = useState<"confirm" | "edit">("edit");
  const [incomeDraft, setIncomeDraft] = useState("");
  const [itemDraft, setItemDraft] = useState("");
  const [itemStillRecurring, setItemStillRecurring] = useState(true);
  const [stepError, setStepError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const totalSteps = incomeItems.length + recurringItems.length + 1;
  const currentIncomeItem = stepIndex < incomeItems.length ? incomeItems[stepIndex] : null;
  const currentExpenseItem =
    stepIndex >= incomeItems.length && stepIndex < incomeItems.length + recurringItems.length
      ? recurringItems[stepIndex - incomeItems.length]
      : null;
  const isSummaryStep = stepIndex === totalSteps - 1;

  useEffect(() => {
    if (!isOpen) return;
    setStepIndex(0);
    setStepError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (!currentIncomeItem) return;
    setIncomeMode(currentIncomeItem.currentAmount !== null ? "confirm" : "edit");
    setIncomeDraft(currentIncomeItem.suggestedAmount > 0 ? String(currentIncomeItem.suggestedAmount) : "");
    setStepError("");
  }, [currentIncomeItem]);

  useEffect(() => {
    if (!currentExpenseItem) return;
    setItemDraft(String(currentExpenseItem.amount));
    setItemStillRecurring(true);
    setStepError("");
  }, [currentExpenseItem]);

  if (!isOpen) return null;

  async function handleIncomeConfirmYes() {
    if (!currentIncomeItem) return;
    setIsSaving(true);
    try {
      await onSaveAmount(currentIncomeItem.categoryId, String(currentIncomeItem.suggestedAmount));
      setStepIndex((s) => s + 1);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleIncomeEditSave() {
    if (!currentIncomeItem) return;
    const amount = parseAmount(incomeDraft);
    if (amount === null) { setStepError("Montant invalide (entre 0 et 1 000 000 €)."); return; }
    setIsSaving(true);
    try {
      await onSaveAmount(currentIncomeItem.categoryId, String(amount));
      setStepError("");
      setStepIndex((s) => s + 1);
    } finally {
      setIsSaving(false);
    }
  }

  function handleIncomeSkip() {
    setStepIndex((s) => s + 1);
  }

  async function handleItemNext() {
    if (!currentExpenseItem) return;
    const amount = parseAmount(itemDraft);
    if (amount === null) { setStepError("Montant invalide (entre 0 et 1 000 000 €)."); return; }
    setIsSaving(true);
    try {
      await onSaveAmount(currentExpenseItem.categoryId, String(amount));
      if (!itemStillRecurring) await onStopRecurring(currentExpenseItem.categoryId);
      setStepError("");
      setStepIndex((s) => s + 1);
    } finally {
      setIsSaving(false);
    }
  }

  function handleItemSkip() {
    setStepIndex((s) => s + 1);
  }

  const reste = totalIncomeBudgeted - totalEngaged;

  return (
    <AnimatePresence>
      <motion.div
        key="wizard-backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      <motion.div
        key="wizard-modal"
        initial={{ opacity: 0, scale: 0.94, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: -12 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="fixed inset-0 flex items-center justify-center z-50 p-4"
      >
        <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl max-w-md w-full">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
            <div className="flex items-center gap-2">
              <SparklesIcon className="w-4 h-4 text-accent" />
              <div>
                <h2 className="text-sm font-semibold text-fg">Démarrer le budget de {monthLabel}</h2>
                <p className="text-[11px] text-fg-subtle mt-0.5">Étape {stepIndex + 1} / {totalSteps}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-fg-subtle hover:text-fg-muted transition-colors" aria-label="Fermer le guide">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="h-1 bg-surface-elevated">
            <motion.div
              animate={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-accent"
            />
          </div>

          <div className="px-5 py-5 space-y-3 min-h-[220px]">
            {stepError && <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-xs text-red-400">{stepError}</div>}

            {currentIncomeItem && (
              <>
                <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
                  <WalletIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Revenu {stepIndex + 1} / {incomeItems.length}
                </div>
                <p className="text-sm font-semibold text-fg">{currentIncomeItem.categoryName}</p>

                {incomeMode === "confirm" ? (
                  <>
                    <p className="text-sm text-fg-secondary">Ce revenu est-il toujours de :</p>
                    <p className="text-2xl font-bold text-emerald-400 tabular-nums">{fmt(currentIncomeItem.suggestedAmount)} €</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-fg-secondary">Quel est ce revenu pour {monthLabel} ?</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="0" step="0.01" autoFocus
                        value={incomeDraft}
                        onChange={(e) => setIncomeDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") void handleIncomeEditSave(); }}
                        placeholder="Montant du mois"
                        className={inputClass}
                      />
                      <span className="text-xs text-fg-subtle flex-shrink-0">€</span>
                    </div>
                  </>
                )}
                <p className="text-xs text-fg-subtle">Chaque revenu confirmé s'ajoute au revenu total du mois.</p>
              </>
            )}

            {currentExpenseItem && (
              <>
                <div className="flex items-center gap-1.5 text-xs text-fg-subtle">
                  <RefreshCwIcon className="w-3.5 h-3.5 text-emerald-400" />
                  Dépense récurrente
                </div>
                <p className="text-sm font-semibold text-fg">{currentExpenseItem.categoryName}</p>
                <div>
                  <label className="block text-xs font-medium text-fg-subtle mb-1">Montant ce mois-ci</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="0" step="0.01" autoFocus
                      value={itemDraft}
                      onChange={(e) => setItemDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void handleItemNext(); }}
                      className={inputClass}
                    />
                    <span className="text-xs text-fg-subtle flex-shrink-0">€</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-fg-subtle mb-1.5">Toujours une dépense récurrente ?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setItemStillRecurring(true)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${itemStillRecurring ? "bg-accent text-accent-fg" : "border border-surface-border text-fg-muted"}`}
                    >
                      Oui
                    </button>
                    <button
                      onClick={() => setItemStillRecurring(false)}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${!itemStillRecurring ? "bg-accent text-accent-fg" : "border border-surface-border text-fg-muted"}`}
                    >
                      Non, terminée
                    </button>
                  </div>
                  {!itemStillRecurring && (
                    <p className="text-[11px] text-fg-subtle mt-1.5">Elle sera budgétée ce mois-ci mais ne sera plus proposée automatiquement les mois suivants.</p>
                  )}
                </div>
              </>
            )}

            {isSummaryStep && (
              <>
                <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-1">
                  <CheckIcon className="w-6 h-6 text-accent" />
                </div>
                <p className="text-sm font-medium text-fg text-center">Budget de {monthLabel} prêt !</p>
                <div className="rounded-xl bg-surface-elevated border border-surface-border p-4 text-center space-y-1">
                  <p className="text-[11px] uppercase tracking-widest text-fg-subtle">Revenu total du mois</p>
                  <p className="text-base font-semibold text-emerald-400 tabular-nums">{fmt(totalIncomeBudgeted)} €</p>
                </div>
                <div className="rounded-xl bg-surface-elevated border border-surface-border p-4 text-center">
                  <p className="text-[11px] uppercase tracking-widest text-fg-subtle mb-1">Reste à budgéter</p>
                  <p className={`text-xl font-bold tabular-nums ${reste >= 0 ? "text-success" : "text-red-400"}`}>{fmt(reste)} €</p>
                </div>
                <p className="text-xs text-fg-subtle text-center">Vous pouvez maintenant répartir le reste sur vos autres catégories, directement sur la page Budget.</p>
              </>
            )}
          </div>

          <div className="px-5 py-4 border-t border-surface-border flex gap-3">
            {currentIncomeItem && incomeMode === "confirm" && (
              <>
                <button onClick={() => setIncomeMode("edit")} className="flex-1 py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">
                  Non, modifier
                </button>
                <button onClick={() => void handleIncomeConfirmYes()} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {isSaving ? <span className="w-4 h-4 border-2 border-surface-border border-t-fg rounded-full animate-spin" /> : <>Oui, continuer <ArrowRightIcon className="w-4 h-4" /></>}
                </button>
              </>
            )}
            {currentIncomeItem && incomeMode === "edit" && (
              <>
                <button onClick={handleIncomeSkip} className="flex-1 py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">
                  Passer
                </button>
                <button onClick={() => void handleIncomeEditSave()} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {isSaving ? <span className="w-4 h-4 border-2 border-surface-border border-t-fg rounded-full animate-spin" /> : <>Continuer <ArrowRightIcon className="w-4 h-4" /></>}
                </button>
              </>
            )}
            {currentExpenseItem && (
              <>
                <button onClick={handleItemSkip} className="flex-1 py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">
                  Passer
                </button>
                <button onClick={() => void handleItemNext()} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                  {isSaving ? <span className="w-4 h-4 border-2 border-surface-border border-t-fg rounded-full animate-spin" /> : <>Ajouter au budget <ArrowRightIcon className="w-4 h-4" /></>}
                </button>
              </>
            )}
            {isSummaryStep && (
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors">
                Terminer
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
