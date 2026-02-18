import { motion } from "framer-motion";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { BudgetSummaryCards } from "../components/BudgetSummaryCards";
import { IncomeExpenseRatioChart } from "../components/IncomeExpenseRatioChart";
import { MonthlyTrendChart } from "../components/MonthlyTrendChart";
import { Sidebar } from "../components/Sidebar";
import { SpendingChart } from "../components/SpendingChart";
import { TopExpenseCategoriesChart } from "../components/TopExpenseCategoriesChart";
import { TransactionList } from "../components/TransactionList";
import { supabase } from "../lib/supabaseClient";
import type {
  Category,
  NewTransactionInput,
  Transaction,
} from "../transaction";

interface DashboardPageProps {
  onLogout: () => void;
  userId: string;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
}
const defaultCategories: Array<Omit<Category, "id">> = [
  { name: "Alimentation", type: "expense" },
  { name: "Transport", type: "expense" },
  { name: "Logement", type: "expense" },
  { name: "Loisirs", type: "expense" },
  { name: "Santé", type: "expense" },
  { name: "Éducation", type: "expense" },
  { name: "Vêtements", type: "expense" },
  { name: "Autres", type: "expense" },
  { name: "Revenu", type: "income" },
  { name: "Freelance", type: "income" },
  { name: "Autres revenus", type: "income" },
];

const chartPalette = [
  "#C9A84C",
  "#A08535",
  "#E8D48B",
  "#D4A853",
  "#8B7332",
  "#6B5A2E",
  "#BFA35A",
  "#9B7C3C",
];

function getCategoryName(categories: unknown) {
  if (Array.isArray(categories)) {
    return (categories[0] as { name?: string } | undefined)?.name;
  }
  return (categories as { name?: string } | null)?.name;
}

export function DashboardPage({
  onLogout,
  userId,
  activeItem,
  onNavigate,
}: DashboardPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [userProfile, setUserProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

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

      if (data && data.length > 0) {
        if (isMounted) {
          setCategories(data as Category[]);
        }
        return;
      }

      const { error: seedError } = await supabase.from("categories").insert(
        defaultCategories.map((category) => ({
          ...category,
          user_id: userId,
        })),
      );

      if (seedError) {
        console.error("Failed to seed categories", seedError);
        return;
      }

      const { data: seeded, error: seededError } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("name");

      if (seededError) {
        console.error("Failed to reload categories", seededError);
        return;
      }

      if (isMounted) {
        setCategories((seeded ?? []) as Category[]);
      }
    }

    async function loadTransactions() {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("transactions")
        .select("id, amount, type, date, note, category_id, categories(name)")
        .lte("date", today)
        .order("date", { ascending: false });

      if (error) {
        console.error("Failed to load transactions", error);
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
          category: getCategoryName(row.categories) ?? "Autres",
          amount: signedAmount,
          type: row.type,
          date: row.date,
        } as Transaction;
      });

      if (isMounted) {
        setTransactions(mapped);
      }
    }

    void loadProfile();
    void loadCategories();
    void loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [userId]);

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
      category: getCategoryName(data.categories) ?? selectedCategory.name,
      amount: signedAmount,
      type: data.type,
      date: data.date,
    };

    setTransactions((prev) => [newTx, ...prev]);
    setIsModalOpen(false);
  }

  async function handleDeleteTransaction(transactionId: string) {
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transactionId);

    if (error) {
      console.error("Failed to delete transaction", error);
      return;
    }

    setTransactions((prev) => prev.filter((tx) => tx.id !== transactionId));
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const totals = transactions.reduce(
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

  const expenseByCategory = transactions.reduce(
    (acc, tx) => {
      if (tx.type !== "expense") return acc;
      const value = Math.abs(tx.amount);
      acc[tx.category] = (acc[tx.category] ?? 0) + value;
      return acc;
    },
    {} as Record<string, number>,
  );

  const chartData = Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      color: chartPalette[index % chartPalette.length],
    }));

  const monthlyTrendData = (() => {
    const now = new Date();
    const months: Record<string, { income: number; expense: number }> = {};

    // Initialiser les 12 derniers mois
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      });
      months[key] = { income: 0, expense: 0 };
    }

    // Remplir les données
    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      const key = txDate.toLocaleDateString("fr-FR", {
        month: "short",
        year: "2-digit",
      });

      if (!months[key]) return;

      const value = Math.abs(tx.amount);
      if (tx.type === "income") {
        months[key].income += value;
      } else {
        months[key].expense += value;
      }
    });

    return Object.entries(months).map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
    }));
  })();
  return (
    <div className="min-h-screen w-full bg-dark">
      <Sidebar
        onLogout={onLogout}
        activeItem={activeItem}
        onNavigate={onNavigate}
        userProfile={userProfile}
      />

      {/* Main content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-dark/80 backdrop-blur-lg border-b border-dark-border">
          <div className="flex flex-nowrap gap-3 px-6 py-4 lg:px-8 items-center justify-between">
            <div className="ml-12 lg:ml-0 min-w-0">
              <motion.h1
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.3,
                }}
                className="text-base sm:text-lg font-semibold text-white"
              >
                Bonjour, {userProfile?.firstName || "Utilisateur"} 👋
              </motion.h1>
              <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs text-gray-500 capitalize">{today}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-dark text-sm font-semibold hover:bg-gold-light transition-colors duration-200 whitespace-nowrap"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-6 py-6 lg:px-8 lg:py-8 space-y-6">
          <BudgetSummaryCards
            incomeTotal={totals.income}
            expenseTotal={totals.expense}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SpendingChart data={chartData} />

            <IncomeExpenseRatioChart
              income={totals.income}
              expense={totals.expense}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MonthlyTrendChart data={monthlyTrendData} />

            <TopExpenseCategoriesChart data={chartData} />
          </div>

          <TransactionList
            transactions={transactions}
            onDeleteTransaction={handleDeleteTransaction}
            onViewAll={() => onNavigate?.("transactions")}
          />
        </div>
      </main>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
        categories={categories}
      />
    </div>
  );
}
