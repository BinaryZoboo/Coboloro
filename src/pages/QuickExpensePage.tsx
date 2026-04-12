import { motion } from "framer-motion";
import { CheckIcon, HomeIcon, LogOutIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Category } from "../transaction";

interface QuickExpensePageProps {
  onLogout: () => void;
  onHome: () => void;
  userId: string;
}

const keypadRows = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [",", "0", "<-"],
];

function normalizeAmount(input: string) {
  return input.replace(",", ".");
}

const QUICK_ENTRY_CATEGORY_NAME = "A completer";

export function QuickExpensePage({
  onLogout,
  onHome,
  userId,
}: QuickExpensePageProps) {
  const [amountInput, setAmountInput] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("name");

      if (error) {
        console.error("Failed to load categories", error);
        return;
      }

      if (isMounted) {
        setCategories((data ?? []) as Category[]);
      }
    }

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  const parsedAmount = useMemo(() => {
    const normalized = normalizeAmount(amountInput);
    const value = Number(normalized);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  }, [amountInput]);

  function clearFeedback() {
    if (feedback) {
      setFeedback(null);
      setFeedbackError(false);
    }
  }

  function handleDigitPress(key: string) {
    clearFeedback();

    if (key === "<-") {
      setAmountInput((prev) => prev.slice(0, -1));
      return;
    }

    if (key === ",") {
      setAmountInput((prev) => {
        if (!prev) return "0,";
        if (prev.includes(",")) return prev;
        return `${prev},`;
      });
      return;
    }

    setAmountInput((prev) => {
      const next = `${prev}${key}`;
      if (next.startsWith("0") && !next.startsWith("0,")) {
        return String(Number(next));
      }
      return next;
    });
  }

  async function getQuickEntryCategoryId() {
    const existingQuickCategory = categories.find(
      (category) =>
        category.type === "expense" &&
        category.name.toLowerCase() === QUICK_ENTRY_CATEGORY_NAME.toLowerCase(),
    );
    if (existingQuickCategory) {
      return existingQuickCategory.id;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: userId,
        name: QUICK_ENTRY_CATEGORY_NAME,
        type: "expense",
      })
      .select("id, name, type")
      .single();

    if (error || !data) {
      throw new Error("Impossible de preparer la categorie quick-entry");
    }

    setCategories((prev) => [...prev, data as Category]);
    return data.id;
  }

  async function handleValidate() {
    clearFeedback();

    if (!parsedAmount) {
      setFeedbackError(true);
      setFeedback("Entre un montant valide");
      return;
    }

    setIsSaving(true);
    try {
      const quickEntryCategoryId = await getQuickEntryCategoryId();

      const { error } = await supabase.from("transactions").insert({
        user_id: userId,
        category_id: quickEntryCategoryId,
        amount: Math.abs(parsedAmount),
        type: "expense",
        note: "",
        date: new Date().toISOString().split("T")[0],
      });

      if (error) {
        throw error;
      }

      setFeedbackError(false);
      setFeedback("Depense enregistree. Tu pourras la completer ensuite.");
      setAmountInput("");
    } catch (error) {
      console.error("Failed to create quick expense", error);
      setFeedbackError(true);
      setFeedback("Echec de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  }

  const formattedAmount = amountInput || "0";

  return (
    <div className="min-h-screen w-full bg-dark flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm rounded-2xl border border-dark-border bg-dark-card shadow-2xl shadow-black/40 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-dark-border flex items-center justify-between">
          <button
            type="button"
            onClick={onHome}
            className="inline-flex items-center gap-2 text-xs font-semibold rounded-lg px-3 py-2 bg-dark-elevated text-gray-200 hover:text-white transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            HOME
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 text-xs font-medium rounded-lg px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOutIcon className="w-4 h-4" />
            Deconnexion
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
            Saisie rapide
          </p>
          <div className="mt-2 rounded-xl border border-dark-border bg-dark-elevated px-4 py-4 text-right">
            <p className="text-3xl font-semibold text-white tabular-nums">
              {formattedAmount} €
            </p>
          </div>

          {feedback && (
            <p
              className={`mt-3 text-xs ${feedbackError ? "text-red-400" : "text-emerald-400"}`}
              role="status"
            >
              {feedback}
            </p>
          )}

          <div className="mt-4 grid grid-cols-3 gap-2">
            {keypadRows.flat().map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDigitPress(key)}
                className="h-14 rounded-xl border border-dark-border bg-dark-elevated text-lg font-semibold text-gray-100 hover:border-gold/40 hover:text-gold transition-colors"
              >
                {key}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleValidate}
            disabled={isSaving}
            className="mt-4 w-full h-12 rounded-xl bg-gold text-dark font-semibold flex items-center justify-center gap-2 hover:bg-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <CheckIcon className="w-4 h-4" />
            {isSaving ? "Validation..." : "Valider"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
