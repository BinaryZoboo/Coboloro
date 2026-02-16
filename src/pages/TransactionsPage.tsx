import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarIcon,
  FilterIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { Sidebar } from "../components/Sidebar";
import { supabase } from "../lib/supabaseClient";
import type {
  Category,
  NewTransactionInput,
  Transaction,
} from "../transaction";

interface TransactionsPageProps {
  onLogout: () => void;
  userId: string;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
}

export function TransactionsPage({
  onLogout,
  userId,
  activeItem,
  onNavigate,
}: TransactionsPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  // Filters
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [selectedMonth, setSelectedMonth] = useState<number | null>(
    new Date().getMonth(),
  );
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<
    "all" | "income" | "expense"
  >("all");

  // Edit modal
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMerchant, setEditMerchant] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<"income" | "expense">("expense");
  const [editError, setEditError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete modal
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.email) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("Failed to load profile", error);
        return;
      }

      if (data && isMounted) {
        setUserProfile({
          firstName: data.first_name || "Utilisateur",
          lastName: data.last_name || "",
          email: user.user.email,
        });
      }
    }

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

    async function loadTransactions() {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, type, date, note, category_id, categories(name)")
        .order("date", { ascending: false });

      if (error) {
        console.error("Failed to load transactions", error);
        setIsLoading(false);
        return;
      }

      const mapped = (data ?? []).map((row) => {
        const amountValue = Number(row.amount ?? 0);
        const signedAmount =
          row.type === "expense"
            ? -Math.abs(amountValue)
            : Math.abs(amountValue);

        return {
          id: row.id,
          merchant: row.note ?? "",
          category: row.categories?.[0]?.name ?? "Autres",
          amount: signedAmount,
          type: row.type,
          date: row.date,
        } as Transaction;
      });

      if (isMounted) {
        setTransactions(mapped);
        setIsLoading(false);
      }
    }

    void loadProfile();
    void loadCategories();
    void loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();

      // Year filter
      if (txYear !== selectedYear) return false;

      // Month filter
      if (selectedMonth !== null && txMonth !== selectedMonth) return false;

      // Category filter
      if (selectedCategory && tx.category !== selectedCategory) return false;

      // Type filter
      if (selectedType === "income" && tx.type !== "income") return false;
      if (selectedType === "expense" && tx.type !== "expense") return false;

      return true;
    });
  }, [
    transactions,
    selectedYear,
    selectedMonth,
    selectedCategory,
    selectedType,
  ]);

  const handleEditStart = (tx: Transaction) => {
    setEditingId(tx.id);
    setEditAmount(Math.abs(tx.amount).toString());
    setEditMerchant(tx.merchant);
    setEditCategory(tx.category);
    setEditDate(tx.date);
    setEditType(tx.type);
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editAmount || !editMerchant || !editCategory || !editDate) {
      setEditError("Tous les champs sont requis");
      return;
    }

    setIsSaving(true);
    try {
      const categoryData = categories.find((c) => c.name === editCategory);
      if (!categoryData) {
        setEditError("Catégorie invalide");
        return;
      }

      const amountValue = Math.abs(parseFloat(editAmount));
      if (isNaN(amountValue) || amountValue <= 0) {
        setEditError("Montant invalide");
        return;
      }

      const { error } = await supabase
        .from("transactions")
        .update({
          amount: amountValue,
          note: editMerchant,
          category_id: categoryData.id,
          date: editDate,
          type: editType,
        })
        .eq("id", editingId!);

      if (error) throw error;

      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === editingId
            ? {
                ...tx,
                amount: editType === "expense" ? -amountValue : amountValue,
                merchant: editMerchant,
                category: editCategory,
                date: editDate,
                type: editType,
              }
            : tx,
        ),
      );

      setEditingId(null);
    } catch (error) {
      if (error instanceof Error) {
        setEditError(error.message);
      } else {
        setEditError("Erreur lors de la mise à jour");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", pendingDelete.id);

    if (error) {
      console.error("Failed to delete transaction", error);
      return;
    }

    setTransactions((prev) => prev.filter((tx) => tx.id !== pendingDelete.id));
    setPendingDelete(null);
  };

  async function handleAddTransaction(input: NewTransactionInput) {
    const amountValue = Math.abs(input.amount);
    const selectedCategory = categories.find(
      (category) => category.id === input.categoryId,
    );

    if (!selectedCategory) {
      console.error("Category not found for transaction");
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        category_id: input.categoryId,
        amount: amountValue,
        type: input.type,
        note: input.description,
        date: input.date,
      })
      .select("id, amount, type, date, note, category_id, categories(name)")
      .single();

    if (error) {
      console.error("Failed to add transaction", error);
      return;
    }

    const signedAmount =
      data.type === "expense"
        ? -Math.abs(Number(data.amount ?? 0))
        : Math.abs(Number(data.amount ?? 0));

    const newTx: Transaction = {
      id: data.id,
      merchant: data.note ?? input.description,
      category: data.categories?.[0]?.name ?? selectedCategory.name,
      amount: signedAmount,
      type: data.type,
      date: data.date,
    };

    setTransactions((prev) => [newTx, ...prev]);
    setIsModalOpen(false);
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const allYears = Array.from(
    new Set(transactions.map((tx) => new Date(tx.date).getFullYear())),
  ).sort((a, b) => b - a);

  const months = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];

  const totals = filteredTransactions.reduce(
    (acc, tx) => {
      const value = Math.abs(tx.amount);
      if (tx.type === "income") {
        acc.income += value;
      } else {
        acc.expense += value;
      }
      return acc;
    },
    { income: 0, expense: 0 },
  );

  return (
    <div className="min-h-screen w-full bg-dark">
      <Sidebar
        onLogout={onLogout}
        activeItem={activeItem}
        onNavigate={onNavigate}
        userProfile={userProfile}
      />

      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-dark/80 backdrop-blur-lg border-b border-dark-border">
          <div className="flex items-center justify-between px-6 py-4 lg:px-8">
            <div className="ml-12 lg:ml-0">
              <motion.h1
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-lg font-semibold text-white"
              >
                Transactions
              </motion.h1>
              <p className="text-xs text-gray-500 mt-1">
                {filteredTransactions.length} transaction
                {filteredTransactions.length > 1 ? "s" : ""}
              </p>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-dark text-sm font-semibold hover:bg-gold-light transition-colors duration-200"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="px-6 py-6 lg:px-8 lg:py-8 space-y-6">
          {/* Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <p className="text-xs font-medium text-gray-500 mb-2">Revenus</p>
              <p className="text-2xl font-bold text-emerald-400">
                +
                {totals.income.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}{" "}
                €
              </p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <p className="text-xs font-medium text-gray-500 mb-2">Dépenses</p>
              <p className="text-2xl font-bold text-red-400">
                -
                {totals.expense.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}{" "}
                €
              </p>
            </div>
            <div className="bg-dark-card border border-dark-border rounded-xl p-5">
              <p className="text-xs font-medium text-gray-500 mb-2">Solde</p>
              <p
                className={`text-2xl font-bold ${
                  totals.income - totals.expense >= 0
                    ? "text-gold"
                    : "text-red-400"
                }`}
              >
                {(totals.income - totals.expense).toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}{" "}
                €
              </p>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="bg-dark-card border border-dark-border rounded-xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <FilterIcon className="w-4 h-4 text-gold" />
              <h3 className="text-sm font-semibold text-white">Filtres</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Year */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Année
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors"
                >
                  {allYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {/* Month */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Mois
                </label>
                <select
                  value={selectedMonth ?? ""}
                  onChange={(e) =>
                    setSelectedMonth(
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                  className="w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors"
                >
                  <option value="">Tous les mois</option>
                  {months.map((month, index) => (
                    <option key={index} value={index}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Type
                </label>
                <select
                  value={selectedType}
                  onChange={(e) =>
                    setSelectedType(
                      e.target.value as "all" | "income" | "expense",
                    )
                  }
                  className="w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors"
                >
                  <option value="all">Tous les types</option>
                  <option value="income">Revenus</option>
                  <option value="expense">Dépenses</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-2">
                  Catégorie
                </label>
                <select
                  value={selectedCategory ?? ""}
                  onChange={(e) =>
                    setSelectedCategory(
                      e.target.value === "" ? null : e.target.value,
                    )
                  }
                  className="w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors"
                >
                  <option value="">Toutes les catégories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Transactions List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-dark-card border border-dark-border rounded-xl overflow-hidden"
          >
            {isLoading ? (
              <div className="p-8 text-center">
                <p className="text-gray-500">Chargement...</p>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500">Aucune transaction trouvée</p>
              </div>
            ) : (
              <div className="divide-y divide-dark-border">
                <AnimatePresence>
                  {filteredTransactions.map((tx, index) => (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="flex items-center justify-between p-5 hover:bg-dark-hover transition-colors duration-100"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">
                          {tx.merchant || "Sans description"}
                        </p>
                        <div className="flex items-center gap-3 mt-1">
                          <span
                            className={`text-xs font-medium px-2 py-1 rounded-full ${
                              tx.type === "income"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }`}
                          >
                            {tx.type === "income" ? "Revenu" : "Dépense"}
                          </span>
                          <span className="text-xs text-gray-500">
                            {tx.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(tx.date).toLocaleDateString("fr-FR")}
                          </span>
                        </div>
                      </div>

                      <div className="text-right mr-4 flex-shrink-0">
                        <p
                          className={`text-sm font-semibold ${
                            tx.type === "income"
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {tx.type === "income" ? "+" : "-"}
                          {Math.abs(tx.amount).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                          })}{" "}
                          €
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEditStart(tx)}
                          className="p-2 rounded-lg text-gray-500 hover:text-gold hover:bg-dark-elevated transition-colors"
                          aria-label="Modifier"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setPendingDelete(tx)}
                          className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-dark-elevated transition-colors"
                          aria-label="Supprimer"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingId && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setEditingId(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
                  <h2 className="text-base font-semibold text-white">
                    Modifier la transaction
                  </h2>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-4 space-y-4">
                  {editError && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
                      {editError}
                    </div>
                  )}

                  {/* Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Type
                    </label>
                    <select
                      value={editType}
                      onChange={(e) =>
                        setEditType(e.target.value as "income" | "expense")
                      }
                      className="w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors"
                    >
                      <option value="income">Revenu</option>
                      <option value="expense">Dépense</option>
                    </select>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Montant
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors"
                    />
                  </div>

                  {/* Merchant */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editMerchant}
                      onChange={(e) => setEditMerchant(e.target.value)}
                      placeholder="Ex: Supermarché"
                      className="w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Catégorie
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-dark-border flex gap-3">
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-dark-elevated border border-dark-border text-gray-200 text-sm font-medium hover:bg-dark-hover transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-gold text-dark text-sm font-medium hover:bg-gold-light transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      "Enregistrer"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {pendingDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              onClick={() => setPendingDelete(null)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl max-w-sm w-full">
                <div className="px-6 py-4 border-b border-dark-border">
                  <h2 className="text-base font-semibold text-white">
                    Supprimer la transaction ?
                  </h2>
                </div>

                <div className="px-6 py-4">
                  <p className="text-sm text-gray-400 mb-4">
                    Êtes-vous sûr de vouloir supprimer cette transaction ?
                  </p>
                  <div className="bg-dark-elevated border border-dark-border rounded-lg p-3 mb-4">
                    <p className="text-sm font-medium text-gray-200">
                      {pendingDelete.merchant || "Sans description"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {pendingDelete.category} •{" "}
                      {new Date(pendingDelete.date).toLocaleDateString("fr-FR")}
                    </p>
                    <p className="text-sm font-semibold mt-2">
                      {pendingDelete.type === "income" ? "+" : "-"}
                      {Math.abs(pendingDelete.amount).toLocaleString("fr-FR", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      €
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    Cette action est irréversible.
                  </p>
                </div>

                <div className="px-6 py-4 border-t border-dark-border flex gap-3">
                  <button
                    onClick={() => setPendingDelete(null)}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-dark-elevated border border-dark-border text-gray-200 text-sm font-medium hover:bg-dark-hover transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
        categories={categories}
      />
    </div>
  );
}
