import { AnimatePresence, motion } from "framer-motion";
import { XIcon } from "lucide-react";
import { useState, type SyntheticEvent } from "react";
import type { NewTransactionInput } from "../transaction";

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewTransactionInput) => void;
}
const categories = [
  "Alimentation",
  "Transport",
  "Logement",
  "Loisirs",
  "Santé",
  "Éducation",
  "Vêtements",
  "Autres",
];

export function AddTransactionModal({
  isOpen,
  onClose,
  onSubmit,
}: AddTransactionModalProps) {
  const [type, setType] = useState<"expense" | "income">("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  function validate() {
    const newErrors: Record<string, string> = {};
    if (!amount || parseFloat(amount) <= 0) newErrors.amount = "Montant requis";
    if (!category) newErrors.category = "Catégorie requise";
    if (!description.trim()) newErrors.description = "Description requise";
    if (!date) newErrors.date = "Date requise";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }
  function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!validate()) return;

    const amountNumber = Number(amount);

    onSubmit({
      type,
      amount: amountNumber,
      category,
      description,
      date,
    });

    onClose();
    setAmount("");
    setCategory("");
    setDescription("");
    setType("expense");
    setErrors({});
  }
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{
              opacity: 0,
              scale: 0.95,
              y: 10,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: 10,
            }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 30,
            }}
            className="relative w-full max-w-md bg-dark-card border border-dark-border rounded-2xl shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
              <h2 className="text-lg font-semibold text-white">
                Nouvelle transaction
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-dark-hover transition-colors"
                aria-label="Fermer"
              >
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Type toggle */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Type
                </label>
                <div className="flex bg-dark-elevated rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${type === "expense" ? "bg-red-500/15 text-red-400" : "text-gray-400 hover:text-gray-300"}`}
                  >
                    Dépense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all duration-200 ${type === "income" ? "bg-emerald-500/15 text-emerald-400" : "text-gray-400 hover:text-gray-300"}`}
                  >
                    Revenu
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label
                  htmlFor="amount"
                  className="block text-xs font-medium text-gray-400 mb-2"
                >
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
                  className={`w-full bg-dark-elevated border rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors ${errors.amount ? "border-red-500" : "border-dark-border"}`}
                />

                {errors.amount && (
                  <p className="text-xs text-red-400 mt-1">{errors.amount}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label
                  htmlFor="category"
                  className="block text-xs font-medium text-gray-400 mb-2"
                >
                  Catégorie
                </label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full bg-dark-elevated border rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors appearance-none ${errors.category ? "border-red-500" : "border-dark-border"} ${!category ? "text-gray-500" : ""}`}
                >
                  <option value="" disabled>
                    Sélectionner une catégorie
                  </option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-xs text-red-400 mt-1">{errors.category}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="description"
                  className="block text-xs font-medium text-gray-400 mb-2"
                >
                  Description
                </label>
                <input
                  id="description"
                  type="text"
                  placeholder="Ex: Courses Carrefour"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full bg-dark-elevated border rounded-lg px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors ${errors.description ? "border-red-500" : "border-dark-border"}`}
                />

                {errors.description && (
                  <p className="text-xs text-red-400 mt-1">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Date */}
              <div>
                <label
                  htmlFor="date"
                  className="block text-xs font-medium text-gray-400 mb-2"
                >
                  Date
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={`w-full bg-dark-elevated border rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors ${errors.date ? "border-red-500" : "border-dark-border"}`}
                />

                {errors.date && (
                  <p className="text-xs text-red-400 mt-1">{errors.date}</p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="w-full py-3 rounded-lg bg-gold text-dark font-semibold text-sm hover:bg-gold-light transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-dark-card"
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
