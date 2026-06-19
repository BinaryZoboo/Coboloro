import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DeleteIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Category } from "../transaction";

interface QuickExpensePageProps {
  onLogout: () => void;
  onHome: () => void;
  userId: string;
}

const QUICK_ENTRY_CATEGORY_NAME = "A completer";

function getCategoryStyle(name: string): { emoji: string; color: string } {
  const n = name.toLowerCase();
  if (n.includes("aliment") || n.includes("food") || n.includes("course"))
    return { emoji: "🍽", color: "#f97316" };
  if (n.includes("transport") || n.includes("voiture") || n.includes("taxi"))
    return { emoji: "🚗", color: "#3b82f6" };
  if (n.includes("logement") || n.includes("loyer") || n.includes("maison"))
    return { emoji: "🏠", color: "#8b5cf6" };
  if (n.includes("loisir") || n.includes("sport") || n.includes("jeu"))
    return { emoji: "🎯", color: "#ec4899" };
  if (n.includes("santé") || n.includes("médecin") || n.includes("pharma"))
    return { emoji: "❤️", color: "#ef4444" };
  if (n.includes("éducation") || n.includes("formation") || n.includes("livre"))
    return { emoji: "📚", color: "#10b981" };
  if (n.includes("vêtement") || n.includes("mode"))
    return { emoji: "👕", color: "#f59e0b" };
  if (n.includes("complet"))
    return { emoji: "⏳", color: "#6b7280" };
  return { emoji: "📌", color: "#4f7eff" };
}

function normalizeAmount(input: string) {
  return input.replace(",", ".");
}

const KEYPAD: string[][] = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [",", "0", "⌫"],
];

export function QuickExpensePage({ onHome, userId }: QuickExpensePageProps) {
  const [amountInput, setAmountInput] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const noteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("categories")
      .select("id, name, type")
      .eq("user_id", userId)
      .eq("type", "expense")
      .order("name")
      .then(({ data }) => {
        if (mounted && data) setCategories(data as Category[]);
      });
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    if (showNote) setTimeout(() => noteRef.current?.focus(), 50);
  }, [showNote]);

  const parsedAmount = useMemo(() => {
    const v = Number(normalizeAmount(amountInput));
    return Number.isFinite(v) && v > 0 ? v : null;
  }, [amountInput]);

  const formattedDisplay = useMemo(() => {
    if (!amountInput) return "0";
    const parts = amountInput.split(",");
    const formatted = Number(parts[0]).toLocaleString("fr-FR");
    return parts.length > 1 ? `${formatted},${parts[1]}` : formatted;
  }, [amountInput]);

  function handleKey(key: string) {
    if (key === "⌫") { setAmountInput((p) => p.slice(0, -1)); return; }
    if (key === ",") {
      setAmountInput((p) => {
        if (!p) return "0,";
        if (p.includes(",")) return p;
        return `${p},`;
      });
      return;
    }
    setAmountInput((p) => {
      const next = `${p}${key}`;
      if (next.startsWith("0") && !next.startsWith("0,")) return String(Number(next));
      const [, decPart] = next.split(",");
      if (decPart !== undefined && decPart.length > 2) return p;
      return next;
    });
  }

  async function handleValidate() {
    if (!parsedAmount) return;
    setIsSaving(true);
    try {
      let categoryId = selectedCategoryId;

      if (!categoryId) {
        const existing = categories.find(
          (c) => c.name.toLowerCase() === QUICK_ENTRY_CATEGORY_NAME.toLowerCase(),
        );
        if (existing) {
          categoryId = existing.id;
        } else {
          const { data } = await supabase
            .from("categories")
            .insert({ user_id: userId, name: QUICK_ENTRY_CATEGORY_NAME, type: "expense" })
            .select("id, name, type")
            .single();
          if (data) {
            setCategories((prev) => [...prev, data as Category]);
            categoryId = data.id;
          }
        }
      }

      const { error } = await supabase.from("transactions").insert({
        user_id: userId,
        category_id: categoryId,
        amount: Math.abs(parsedAmount),
        type: "expense",
        note: note.trim() || "",
        date: new Date().toISOString().split("T")[0],
      });

      if (error) throw error;

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setAmountInput("");
        setNote("");
        setSelectedCategoryId(null);
        setShowNote(false);
        onHome();
      }, 800);
    } catch (e) {
      console.error("Failed to save expense", e);
    } finally {
      setIsSaving(false);
    }
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="h-[100dvh] w-full bg-surface flex flex-col overflow-hidden md:items-center md:justify-center">
      <div className="flex flex-col flex-1 w-full md:flex-none md:w-[400px] md:max-h-[780px] md:rounded-2xl md:border md:border-surface-border md:bg-surface-card md:shadow-2xl md:shadow-black/40 overflow-hidden">

        <div className="flex items-center justify-between px-5 pt-safe-top pt-4 pb-3 flex-shrink-0">
          <button
            onClick={onHome}
            className="flex items-center gap-2 text-fg-muted hover:text-fg transition-colors min-w-[44px] min-h-[44px]"
            aria-label="Retour"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <p className="text-xs uppercase tracking-[0.18em] text-fg-subtle font-medium">
            Saisie rapide
          </p>
          <div className="w-11" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 min-h-0">
          <div className="flex items-baseline gap-3">
            <span className="text-3xl text-fg-subtle font-medium select-none">€</span>
            <motion.p
              key={amountInput.length > 0 ? "has-value" : "empty"}
              initial={{ scale: 0.96, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.1 }}
              className={`
                tabular-nums font-bold tracking-tight leading-none select-none
                ${amountInput.length === 0
                  ? "text-[72px] text-fg-disabled"
                  : amountInput.length <= 6
                  ? "text-[72px] text-fg"
                  : "text-5xl text-fg"
                }
              `}
            >
              {formattedDisplay}
            </motion.p>
          </div>

          {parsedAmount && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-sm text-fg-subtle"
            >
              {parsedAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </motion.p>
          )}
        </div>

        <div className="flex-shrink-0 px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto snap-x scroll-smooth scrollbar-hide pb-1">
            {expenseCategories.map((cat) => {
              const { emoji, color } = getCategoryStyle(cat.name);
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryId((prev) => (prev === cat.id ? null : cat.id))}
                  className={`
                    snap-start flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full
                    text-xs font-medium transition-all duration-150 border min-h-[44px]
                    ${isSelected
                      ? "border-transparent font-semibold scale-105"
                      : "border-surface-border text-fg-muted bg-surface-elevated hover:border-surface-muted hover:text-fg-secondary"
                    }
                  `}
                  style={isSelected
                    ? { backgroundColor: color, boxShadow: `0 0 14px ${color}55`, color: "#fff" }
                    : {}
                  }
                >
                  <span className="text-sm leading-none">{emoji}</span>
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-shrink-0 px-4">
          <div className="grid grid-cols-3 gap-2">
            {KEYPAD.flat().map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKey(key)}
                className={`
                  flex items-center justify-center rounded-2xl
                  min-h-[76px] text-xl font-semibold select-none
                  transition-all duration-75 active:scale-95
                  ${key === "⌫"
                    ? "text-fg-muted bg-surface-elevated border border-surface-border hover:text-fg hover:border-surface-muted"
                    : key === ","
                    ? "text-fg-secondary bg-surface-elevated border border-surface-border hover:border-surface-muted"
                    : "text-fg bg-surface-elevated border border-surface-border hover:bg-surface-hover hover:border-surface-muted"
                  }
                `}
              >
                {key === "⌫" ? <DeleteIcon className="w-5 h-5" /> : key}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 px-4 pt-3">
          <button
            onClick={() => setShowNote((v) => !v)}
            className="flex items-center gap-2 text-xs text-fg-subtle hover:text-fg-secondary transition-colors min-h-[44px]"
          >
            {showNote ? <ChevronUpIcon className="w-3.5 h-3.5" /> : <ChevronDownIcon className="w-3.5 h-3.5" />}
            {showNote ? "Masquer la note" : "+ Ajouter une note"}
          </button>

          <AnimatePresence>
            {showNote && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <input
                  ref={noteRef}
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex : café, supermarché, plein d'essence…"
                  className="mt-2 w-full px-4 py-3 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary placeholder:text-fg-subtle focus:outline-none focus:border-accent/50 transition-colors"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-shrink-0 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={handleValidate}
            disabled={!parsedAmount || isSaving}
            className={`
              w-full h-14 rounded-2xl text-base font-semibold
              flex items-center justify-center gap-2.5
              transition-all duration-150
              ${parsedAmount
                ? "bg-accent text-accent-fg hover:bg-accent-light active:scale-[0.98]"
                : "bg-surface-elevated text-fg-disabled cursor-not-allowed border border-surface-border"
              }
            `}
            style={parsedAmount ? { boxShadow: "var(--shadow-accent-md)" } : {}}
          >
            <CheckIcon className="w-5 h-5" />
            {isSaving
              ? "Enregistrement…"
              : parsedAmount
              ? `Valider — ${parsedAmount.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`
              : "Entrer un montant"
            }
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div
            key="success"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface/90 backdrop-blur-md"
          >
            <div className="relative flex items-center justify-center">
              <span
                className="absolute w-28 h-28 rounded-full border-2 border-accent/40"
                style={{ animation: "ring-out 0.65s ease-out 0.1s forwards", opacity: 0 }}
              />
              <span
                className="absolute w-28 h-28 rounded-full border border-accent/25"
                style={{ animation: "ring-out 0.8s ease-out 0.25s forwards", opacity: 0 }}
              />
              <div
                className="w-20 h-20 rounded-full bg-accent flex items-center justify-center"
                style={{ animation: "check-pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards", transform: "scale(0)", opacity: 0, boxShadow: "var(--shadow-accent-xl)" }}
              >
                <CheckIcon className="w-9 h-9 text-accent-fg stroke-[2.5]" />
              </div>
            </div>
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 text-lg font-semibold text-fg"
            >
              Dépense enregistrée
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
              className="mt-1 text-sm text-fg-subtle"
            >
              {parsedAmount?.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
