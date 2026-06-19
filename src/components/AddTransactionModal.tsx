import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { useEffect, useState, type SyntheticEvent } from "react";
import type { Category, NewTransactionInput } from "../transaction";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewTransactionInput) => void;
  categories: Category[];
}

export function AddTransactionModal({
  isOpen,
  onClose,
  onSubmit,
  categories,
}: AddTransactionModalProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filteredCategories = categories.filter((cat) => cat.type === type);

  useEffect(() => {
    if (!filteredCategories.some((cat) => cat.id === category)) {
      setCategory("");
    }
  }, [category, filteredCategories]);

  function validate() {
    const newErrors: Record<string, string> = {};
    const parsedAmount = parseFloat(amount);
    if (!amount || parsedAmount <= 0) newErrors.amount = "Montant requis";
    else if (parsedAmount > 1_000_000) newErrors.amount = "Montant trop élevé (max. 1 000 000 €)";
    if (!category) newErrors.category = "Catégorie requise";
    if (!description.trim()) newErrors.description = "Description requise";
    if (!date) newErrors.date = "Date requise";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ type, amount: Number(amount), categoryId: category, description, date });
    onClose();
    setAmount("");
    setCategory("");
    setDescription("");
    setType("expense");
    setErrors({});
  }

  const inputBase = "w-full bg-surface-elevated border rounded-lg px-4 py-2.5 text-fg text-sm placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors";

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl z-10"
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
              <h2 className="text-lg font-semibold text-fg">
                Nouvelle transaction
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
                aria-label="Fermer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-medium text-fg-muted mb-2">Type</label>
                <div className="flex bg-surface-elevated rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${type === "expense" ? "bg-red-500/15 text-red-400" : "text-fg-muted hover:text-fg-secondary"}`}
                  >
                    Dépense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${type === "income" ? "bg-emerald-500/15 text-emerald-400" : "text-fg-muted hover:text-fg-secondary"}`}
                  >
                    Revenu
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="amount" className="block text-xs font-medium text-fg-muted mb-2">
                  Montant (€)
                </label>
                <input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={`${inputBase} ${errors.amount ? "border-red-500" : "border-surface-border"}`}
                />
                {errors.amount && <p className="text-xs text-red-400 mt-1">{errors.amount}</p>}
              </div>

              <div>
                <label htmlFor="category" className="block text-xs font-medium text-fg-muted mb-2">
                  Catégorie
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`${inputBase} appearance-none ${errors.category ? "border-red-500" : "border-surface-border"} ${!category ? "text-fg-subtle" : ""}`}
                >
                  <option value="" disabled>Sélectionner une catégorie</option>
                  {filteredCategories.length === 0 ? (
                    <option value="" disabled>Aucune catégorie disponible</option>
                  ) : (
                    filteredCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))
                  )}
                </select>
                {errors.category && <p className="text-xs text-red-400 mt-1">{errors.category}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-medium text-fg-muted mb-2">
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  placeholder="Ex: Courses Carrefour"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`${inputBase} ${errors.description ? "border-red-500" : "border-surface-border"}`}
                />
                {errors.description && <p className="text-xs text-red-400 mt-1">{errors.description}</p>}
              </div>

              <div>
                <label htmlFor="date" className="block text-xs font-medium text-fg-muted mb-2">
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`${inputBase} ${errors.date ? "border-red-500" : "border-surface-border"}`}
                />
                {errors.date && <p className="text-xs text-red-400 mt-1">{errors.date}</p>}
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-accent text-accent-fg font-semibold text-sm hover:bg-accent-light transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-card"
              >
                Ajouter la transaction
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
