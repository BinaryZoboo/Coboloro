import {
  AnimatePresence,
  PanInfo,
  animate,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import {
  CalendarIcon,
  FilterIcon,
  PlusIcon,
  RotateCcwIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { ProfileSheet, getInitials } from "../components/ProfileSheet";
import { useEffect, useMemo, useState } from "react";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { DailySpendingChart } from "../components/DailySpendingChart";
import { NotificationBell } from "../components/NotificationBell";
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
  userProfile?: { firstName: string; lastName: string; email: string } | null;
}

function getCategoryName(categories: unknown) {
  if (Array.isArray(categories)) {
    return (categories[0] as { name?: string } | undefined)?.name;
  }
  return (categories as { name?: string } | null)?.name;
}

function getCategoryEmoji(category: string): string {
  const n = category.toLowerCase();
  if (n.includes("aliment") || n.includes("food") || n.includes("course")) return "🍽️";
  if (n.includes("transport") || n.includes("voiture") || n.includes("taxi")) return "🚗";
  if (n.includes("logement") || n.includes("loyer") || n.includes("maison")) return "🏠";
  if (n.includes("loisir") || n.includes("sport") || n.includes("jeu")) return "🎯";
  if (n.includes("santé") || n.includes("médecin") || n.includes("pharma")) return "❤️";
  if (n.includes("éducation") || n.includes("formation") || n.includes("livre")) return "📚";
  if (n.includes("vêtement") || n.includes("mode")) return "👕";
  if (n.includes("revenu") || n.includes("freelance") || n.includes("salaire")) return "💰";
  return "📌";
}

function getDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (dateStr === today) return "Aujourd'hui";
  if (dateStr === yesterday) return "Hier";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

interface SwipeableRowProps {
  tx: Transaction;
  onDelete: (tx: Transaction) => void;
  onEditRequest: (tx: Transaction) => void;
}

function SwipeableRow({ tx, onDelete, onEditRequest }: SwipeableRowProps) {
  const x = useMotionValue(0);
  const deleteOpacity = useTransform(x, [-100, -24], [1, 0]);

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (info.offset.x < -88) {
      void animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
      onDelete(tx);
    } else {
      void animate(x, 0, { type: "spring", stiffness: 400, damping: 32 });
    }
  }

  const emoji = getCategoryEmoji(tx.category);
  const isIncome = tx.type === "income";

  return (
    <div className="relative overflow-hidden group">
      <motion.div
        style={{ opacity: deleteOpacity }}
        className="absolute inset-y-0 right-0 flex items-center px-6 bg-red-500/15 border-l border-red-500/20"
      >
        <Trash2Icon className="w-5 h-5 text-red-400" />
      </motion.div>

      <motion.div
        drag="x"
        dragConstraints={{ left: -110, right: 0 }}
        dragElastic={{ left: 0.08, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        onClick={() => onEditRequest(tx)}
        className="relative z-10 bg-transparent flex items-center gap-4 px-5 min-h-[64px] py-3 hover:bg-surface-hover/50 transition-colors cursor-pointer lg:cursor-default"
      >
        <div className="w-10 h-10 flex-shrink-0 rounded-full bg-surface-elevated border border-surface-border flex items-center justify-center text-lg">
          {emoji}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fg-secondary truncate">
            {tx.merchant || "Sans description"}
          </p>
          <p className="text-xs text-fg-subtle mt-0.5 truncate">{tx.category}</p>
        </div>

        <div className="flex-shrink-0 text-right">
          <p className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-400" : "text-red-400"}`}>
            {isIncome ? "+" : "−"}&nbsp;
            {Math.abs(tx.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function TransactionsPage({ onLogout, userId, activeItem, onNavigate, userProfile }: TransactionsPageProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [selectedType, setSelectedType] = useState<"all" | "income" | "expense">("all");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth());

  const [draftType, setDraftType] = useState<"all" | "income" | "expense">("all");
  const [draftCategory, setDraftCategory] = useState<string | null>(null);
  const [draftYear, setDraftYear] = useState<number>(new Date().getFullYear());
  const [draftMonth, setDraftMonth] = useState<number | null>(new Date().getMonth());

  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);
  const [pendingAction, setPendingAction] = useState<Transaction | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMerchant, setEditMerchant] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editType, setEditType] = useState<"income" | "expense">("expense");
  const [editError, setEditError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadCategories() {
      const { data } = await supabase.from("categories").select("id, name, type").eq("user_id", userId).order("name");
      if (isMounted) setCategories((data ?? []) as Category[]);
    }

    async function loadTransactions() {
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, type, date, note, category_id, categories(name)")
        .eq("user_id", userId)
        .order("date", { ascending: false });
      const mapped = (data ?? []).map((row) => {
        const amountValue = Number(row.amount ?? 0);
        const signedAmount = row.type === "expense" ? -Math.abs(amountValue) : Math.abs(amountValue);
        return {
          id: row.id,
          merchant: row.note ?? "",
          category: getCategoryName(row.categories) ?? "Autres",
          amount: signedAmount,
          type: row.type,
          date: row.date,
        } as Transaction;
      });
      if (isMounted) { setTransactions(mapped); setIsLoading(false); }
    }

    void loadCategories();
    void loadTransactions();

    return () => { isMounted = false; };
  }, [userId]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      if (d.getFullYear() !== selectedYear) return false;
      if (selectedMonth !== null && d.getMonth() !== selectedMonth) return false;
      if (selectedCategory && tx.category !== selectedCategory) return false;
      if (selectedType === "income" && tx.type !== "income") return false;
      if (selectedType === "expense" && tx.type !== "expense") return false;
      return true;
    });
  }, [transactions, selectedYear, selectedMonth, selectedCategory, selectedType]);

  const groupedByDate = useMemo(() => {
    const groups: { label: string; items: Transaction[] }[] = [];
    const seen = new Map<string, Transaction[]>();
    filteredTransactions.forEach((tx) => {
      const label = getDateLabel(tx.date);
      if (!seen.has(label)) { seen.set(label, []); groups.push({ label, items: seen.get(label)! }); }
      seen.get(label)!.push(tx);
    });
    return groups;
  }, [filteredTransactions]);

  const dailyChartData = useMemo(() => {
    if (selectedMonth === null) return [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const byDay: Record<string, number> = {};
    for (let d = 1; d <= daysInMonth; d++) byDay[String(d)] = 0;
    filteredTransactions
      .filter((tx) => tx.type === "expense")
      .forEach((tx) => {
        const d = String(new Date(tx.date).getDate());
        byDay[d] = (byDay[d] ?? 0) + Math.abs(tx.amount);
      });
    return Object.entries(byDay).map(([day, spent]) => ({ day, spent }));
  }, [filteredTransactions, selectedMonth, selectedYear]);

  const totals = filteredTransactions.reduce(
    (acc, tx) => {
      const v = Math.abs(tx.amount);
      if (tx.type === "income") acc.income += v;
      else acc.expense += v;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  const months = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

  function applyFilters() {
    setSelectedType(draftType);
    setSelectedCategory(draftCategory);
    setSelectedYear(draftYear);
    setSelectedMonth(draftMonth);
  }

  function resetFilters() {
    const now = new Date();
    setDraftType("all"); setSelectedType("all");
    setDraftCategory(null); setSelectedCategory(null);
    setDraftYear(now.getFullYear()); setSelectedYear(now.getFullYear());
    setDraftMonth(now.getMonth()); setSelectedMonth(now.getMonth());
  }

  function handleEditStart(tx: Transaction) {
    setEditingId(tx.id);
    setEditAmount(Math.abs(tx.amount).toString());
    setEditMerchant(tx.merchant);
    setEditCategory(tx.category);
    setEditDate(tx.date);
    setEditType(tx.type);
    setEditError("");
  }

  function handleRowActionRequest(tx: Transaction) {
    if (window.matchMedia("(min-width: 1024px)").matches) return;
    setPendingAction(tx);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    setDeleteError("");
    const { error } = await supabase.from("transactions").delete().eq("id", pendingDelete.id).eq("user_id", userId);
    if (error) { setDeleteError("Impossible de supprimer cette transaction."); return; }
    setTransactions((prev) => prev.filter((tx) => tx.id !== pendingDelete.id));
    setPendingDelete(null);
  }

  function handleSwipeDelete(tx: Transaction) {
    setPendingDelete(tx);
  }

  async function handleSaveEdit() {
    if (!editAmount || !editCategory || !editDate) { setEditError("Tous les champs sont requis"); return; }
    setIsSaving(true);
    try {
      const cat = categories.find((c) => c.name === editCategory);
      if (!cat) { setEditError("Catégorie invalide"); return; }
      const amountValue = Math.abs(parseFloat(editAmount));
      if (isNaN(amountValue) || amountValue <= 0 || amountValue > 1_000_000) { setEditError("Montant invalide (max. 1 000 000 €)"); return; }
      const { error } = await supabase
        .from("transactions")
        .update({ amount: amountValue, note: editMerchant.slice(0, 255), category_id: cat.id, date: editDate, type: editType })
        .eq("id", editingId!)
        .eq("user_id", userId);
      if (error) throw error;
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === editingId
            ? { ...tx, amount: editType === "expense" ? -amountValue : amountValue, merchant: editMerchant, category: editCategory, date: editDate, type: editType }
            : tx,
        ),
      );
      setEditingId(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleAddTransaction(input: NewTransactionInput) {
    const amountValue = Math.abs(input.amount);
    const cat = categories.find((c) => c.id === input.categoryId);
    if (!cat) return;
    const { data, error } = await supabase
      .from("transactions")
      .insert({ user_id: userId, category_id: input.categoryId, amount: amountValue, type: input.type, note: input.description, date: input.date })
      .select("id, amount, type, date, note, category_id, categories(name)")
      .single();
    if (error || !data) return;
    const signed = data.type === "expense" ? -Math.abs(Number(data.amount ?? 0)) : Math.abs(Number(data.amount ?? 0));
    setTransactions((prev) => [{
      id: data.id,
      merchant: data.note ?? input.description,
      category: getCategoryName(data.categories) ?? cat.name,
      amount: signed,
      type: data.type,
      date: data.date,
    } as Transaction, ...prev]);
    setIsModalOpen(false);
  }

  const typeOptions: { id: "all" | "income" | "expense"; label: string }[] = [
    { id: "all", label: "Tout" },
    { id: "income", label: "Revenus" },
    { id: "expense", label: "Dépenses" },
  ];

  const inputClass = "w-full bg-surface-elevated border border-surface-border rounded-xl px-3 py-2.5 text-fg text-sm focus:outline-none focus:border-accent/50";

  return (
    <div className="min-h-screen w-full bg-surface">
      <Sidebar onLogout={onLogout} activeItem={activeItem} onNavigate={onNavigate} userProfile={userProfile ?? null} />

      <main className="lg:ml-[var(--sidebar-width)] transition-all duration-200">
        <header className="sticky top-0 z-20 glass border-b border-surface-border">
          <div className="flex items-center justify-between gap-3 px-5 py-4 lg:px-8">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setShowProfile(true)}
                className="lg:hidden w-9 h-9 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-xs font-bold text-accent hover:bg-accent/15 transition-colors flex-shrink-0"
                aria-label="Mon profil"
              >
                {getInitials(userProfile ?? null)}
              </button>
              <div className="min-w-0">
                <motion.h1
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="text-base font-semibold text-fg"
                >
                  Transactions
                </motion.h1>
                <p className="text-xs text-fg-subtle mt-0.5">{filteredTransactions.length} transaction{filteredTransactions.length > 1 ? "s" : ""}</p>
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-2 flex-1 justify-center mx-6">
              {typeOptions.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSelectedType(id)}
                  className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-150
                    ${selectedType === id
                      ? "bg-accent text-accent-fg"
                      : "border border-surface-border text-fg-muted hover:text-fg hover:border-surface-muted"
                    }
                  `}
                  style={selectedType === id ? { boxShadow: "var(--shadow-accent-ring)" } : {}}
                >
                  {label}
                </button>
              ))}
              <select
                value={selectedCategory ?? ""}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="ml-2 bg-surface-elevated border border-surface-border rounded-full px-3 py-1.5 text-xs text-fg-secondary focus:outline-none focus:border-accent/50"
              >
                <option value="">Toutes catégories</option>
                {categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
              </select>
              <select
                value={selectedMonth ?? ""}
                onChange={(e) => setSelectedMonth(e.target.value === "" ? null : Number(e.target.value))}
                className="bg-surface-elevated border border-surface-border rounded-full px-3 py-1.5 text-xs text-fg-secondary focus:outline-none focus:border-accent/50"
              >
                <option value="">Tous les mois</option>
                {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilterSheet(true)}
                className="lg:hidden flex items-center gap-2 px-3 py-2 rounded-xl border border-surface-border text-fg-muted hover:text-fg hover:border-surface-muted transition-colors min-h-[44px]"
                aria-label="Filtres"
              >
                <FilterIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors"
                style={{ boxShadow: "var(--shadow-accent-sm)" }}
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>
              <NotificationBell userId={userId} />
            </div>
          </div>
        </header>

        <div className="px-5 py-5 lg:px-8 lg:py-8 space-y-5 pb-8">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-3 gap-3"
          >
            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <p className="text-[11px] uppercase tracking-widest text-fg-subtle mb-1">Revenus</p>
              <p className="text-lg font-bold text-emerald-400 tabular-nums">
                +{totals.income.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} €
              </p>
            </div>
            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <p className="text-[11px] uppercase tracking-widest text-fg-subtle mb-1">Dépenses</p>
              <p className="text-lg font-bold text-red-400 tabular-nums">
                −{totals.expense.toLocaleString("fr-FR", { minimumFractionDigits: 0 })} €
              </p>
            </div>
            <div className="rounded-2xl border border-surface-border bg-surface-card p-4">
              <p className="text-[11px] uppercase tracking-widest text-fg-subtle mb-1">Solde</p>
              <p className={`text-lg font-bold tabular-nums ${totals.income - totals.expense >= 0 ? "text-accent" : "text-red-400"}`}>
                {(totals.income - totals.expense).toLocaleString("fr-FR", { minimumFractionDigits: 0 })} €
              </p>
            </div>
          </motion.div>

          {selectedMonth !== null && dailyChartData.some((d) => d.spent > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.08 }}
              className="rounded-2xl border border-surface-border bg-surface-card p-5"
            >
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-fg">Dépenses jour par jour</h2>
                <p className="text-xs text-fg-subtle mt-0.5">{months[selectedMonth]} {selectedYear}</p>
              </div>
              <DailySpendingChart data={dailyChartData} />
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.05 }}
            className="rounded-2xl border border-surface-border bg-surface-card overflow-hidden"
          >
            {isLoading ? (
              <div className="p-8 flex items-center justify-center gap-2 text-fg-subtle text-sm">
                <span className="w-4 h-4 rounded-full border-2 border-surface-border border-t-fg animate-spin" />
                Chargement...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="p-8 text-center">
                <CalendarIcon className="w-10 h-10 text-fg-disabled mx-auto mb-3" />
                <p className="text-sm text-fg-subtle">Aucune transaction</p>
              </div>
            ) : (
              <AnimatePresence>
                {groupedByDate.map(({ label, items }) => (
                  <div key={label}>
                    <div className="px-5 py-2 bg-surface-elevated border-b border-surface-border">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">{label}</p>
                    </div>
                    <div className="divide-y divide-surface-border/50">
                      {items.map((tx) => (
                        <SwipeableRow
                          key={tx.id}
                          tx={tx}
                          onDelete={handleSwipeDelete}
                          onEditRequest={handleRowActionRequest}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </AnimatePresence>
            )}
          </motion.div>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="hidden lg:flex fixed bottom-8 right-8 w-14 h-14 rounded-2xl bg-accent items-center justify-center hover:bg-accent-light transition-colors z-30"
          style={{ boxShadow: "var(--shadow-accent-lg)" }}
          aria-label="Ajouter une transaction"
        >
          <PlusIcon className="w-6 h-6 text-accent-fg stroke-[2.5]" />
        </button>
      </main>

      <AnimatePresence>
        {showFilterSheet && (
          <>
            <motion.div
              key="filter-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setShowFilterSheet(false)}
            />
            <motion.div
              key="filter-sheet"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="fixed bottom-0 inset-x-0 z-50 lg:hidden rounded-t-2xl bg-surface-card border-t border-surface-border pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-9 h-1 rounded-full bg-surface-muted" />
              </div>
              <div className="flex items-center justify-between px-5 pb-3 border-b border-surface-border">
                <p className="text-sm font-semibold text-fg">Filtres</p>
                <div className="flex items-center gap-2">
                  <button onClick={resetFilters} className="p-2 rounded-lg border border-surface-border text-fg-muted hover:text-fg transition-colors">
                    <RotateCcwIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowFilterSheet(false)} className="p-2 rounded-lg text-fg-muted hover:text-fg transition-colors">
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-fg-subtle mb-2">Type</p>
                  <div className="flex gap-2">
                    {typeOptions.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => setDraftType(id)}
                        className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${draftType === id ? "bg-accent text-accent-fg" : "border border-surface-border text-fg-muted"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-fg-subtle mb-2">Mois</p>
                  <select
                    value={draftMonth ?? ""}
                    onChange={(e) => setDraftMonth(e.target.value === "" ? null : Number(e.target.value))}
                    className={inputClass}
                  >
                    <option value="">Tous les mois</option>
                    {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <p className="text-xs text-fg-subtle mb-2">Catégorie</p>
                  <select
                    value={draftCategory ?? ""}
                    onChange={(e) => setDraftCategory(e.target.value || null)}
                    className={inputClass}
                  >
                    <option value="">Toutes les catégories</option>
                    {categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                  </select>
                </div>

                <button
                  onClick={() => { applyFilters(); setShowFilterSheet(false); }}
                  className="w-full py-3 rounded-xl bg-accent text-accent-fg font-semibold text-sm hover:bg-accent-light transition-colors"
                >
                  Appliquer
                </button>
              </div>
              <div className="h-4" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingAction && (
          <>
            <motion.div
              key="action-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setPendingAction(null)}
            />
            <motion.div
              key="action-sheet"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="fixed bottom-0 inset-x-0 z-50 rounded-t-2xl bg-surface-card border-t border-surface-border pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex justify-center pt-3 pb-2"><div className="w-9 h-1 rounded-full bg-surface-muted" /></div>
              <div className="px-5 pb-3 border-b border-surface-border">
                <p className="text-sm font-semibold text-fg truncate">{pendingAction.merchant || "Sans description"}</p>
                <p className="text-xs text-fg-subtle mt-0.5">{pendingAction.category}</p>
              </div>
              <div className="p-4 space-y-2">
                <button onClick={() => { handleEditStart(pendingAction); setPendingAction(null); }}
                  className="w-full py-3 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">
                  Modifier
                </button>
                <button onClick={() => { setPendingDelete(pendingAction); setPendingAction(null); }}
                  className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 font-medium hover:bg-red-500/18 transition-colors">
                  Supprimer
                </button>
                <button onClick={() => setPendingAction(null)}
                  className="w-full py-3 rounded-xl text-sm text-fg-subtle font-medium hover:text-fg-secondary transition-colors">
                  Annuler
                </button>
              </div>
              <div className="h-4" />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingId && (
          <>
            <motion.div key="edit-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setEditingId(null)} />
            <motion.div key="edit-modal"
              initial={{ opacity: 0, scale: 0.94, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: -12 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl max-w-md w-full">
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
                  <h2 className="text-sm font-semibold text-fg">Modifier la transaction</h2>
                  <button onClick={() => setEditingId(null)} className="text-fg-subtle hover:text-fg-muted transition-colors"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {editError && <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-xs text-red-400">{editError}</div>}
                  {[
                    { label: "Type", el: <select value={editType} onChange={(e) => setEditType(e.target.value as "income" | "expense")} className={inputClass}><option value="income">Revenu</option><option value="expense">Dépense</option></select> },
                    { label: "Montant", el: <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className={inputClass} /> },
                    { label: "Description", el: <input type="text" value={editMerchant} onChange={(e) => setEditMerchant(e.target.value)} className={inputClass} /> },
                    { label: "Catégorie", el: <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className={inputClass}>{categories.map((cat) => <option key={cat.id} value={cat.name}>{cat.name}</option>)}</select> },
                    { label: "Date", el: <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={inputClass} /> },
                  ].map(({ label, el }) => (
                    <div key={label}><label className="block text-xs font-medium text-fg-subtle mb-1">{label}</label>{el}</div>
                  ))}
                </div>
                <div className="px-5 py-4 border-t border-surface-border flex gap-3">
                  <button onClick={() => setEditingId(null)} className="flex-1 py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">Annuler</button>
                  <button onClick={handleSaveEdit} disabled={isSaving} className="flex-1 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
                    {isSaving ? <span className="w-4 h-4 border-2 border-surface-border border-t-fg rounded-full animate-spin" /> : "Enregistrer"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingDelete && (
          <>
            <motion.div key="del-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" onClick={() => setPendingDelete(null)} />
            <motion.div key="del-modal"
              initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
            >
              <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl max-w-sm w-full">
                <div className="px-5 py-4 border-b border-surface-border">
                  <h2 className="text-sm font-semibold text-fg">Supprimer la transaction ?</h2>
                </div>
                <div className="px-5 py-4">
                  <div className="rounded-xl bg-surface-elevated border border-surface-border p-3 mb-3">
                    <p className="text-sm font-medium text-fg-secondary">{pendingDelete.merchant || "Sans description"}</p>
                    <p className="text-xs text-fg-subtle mt-0.5">{pendingDelete.category} · {new Date(pendingDelete.date).toLocaleDateString("fr-FR")}</p>
                    <p className={`text-sm font-semibold mt-1 ${pendingDelete.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                      {pendingDelete.type === "income" ? "+" : "−"} {Math.abs(pendingDelete.amount).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                    </p>
                  </div>
                  <p className="text-xs text-fg-subtle">Cette action est irréversible.</p>
                  {deleteError && <p className="text-xs text-red-400 mt-2">{deleteError}</p>}
                </div>
                <div className="px-5 py-4 border-t border-surface-border flex gap-3">
                  <button onClick={() => { setPendingDelete(null); setDeleteError(""); }} className="flex-1 py-2.5 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">Annuler</button>
                  <button onClick={handleConfirmDelete} className="flex-1 py-2.5 rounded-xl bg-red-500/15 border border-red-500/25 text-sm text-red-400 font-semibold hover:bg-red-500/25 transition-colors">Supprimer</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddTransaction} categories={categories} />
      <ProfileSheet isOpen={showProfile} onClose={() => setShowProfile(false)} userProfile={userProfile ?? null} onNavigate={p => { setShowProfile(false); onNavigate?.(p); }} onLogout={onLogout} />
    </div>
  );
}
