import { motion } from "framer-motion";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CalendarIcon,
  PiggyBankIcon,
  PlusIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { DailySpendingChart } from "../components/DailySpendingChart";
import { MobileSpendingPie } from "../components/MobileSpendingPie";
import { MonthlyTrendChart } from "../components/MonthlyTrendChart";
import { NotificationBell } from "../components/NotificationBell";
import { Sidebar } from "../components/Sidebar";
import { TopExpenseCategoriesChart } from "../components/TopExpenseCategoriesChart";
import { TransactionList } from "../components/TransactionList";
import { supabase } from "../lib/supabaseClient";
import type {
  Category,
  NewTransactionInput,
  Transaction,
} from "../transaction";

interface SavingsGoal {
  id: string;
  name: string;
  current_amount: number;
  target_amount: number;
  color: string;
  emoji: string;
}

interface DashboardPageProps {
  onLogout: () => void;
  userId: string;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
}

const defaultCategories: Array<Omit<Category, "id">> = [
  { name: "A completer", type: "expense" },
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
  "#4F7EFF",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#EC4899",
];

function getCategoryName(categories: unknown) {
  if (Array.isArray(categories)) {
    return (categories[0] as { name?: string } | undefined)?.name;
  }
  return (categories as { name?: string } | null)?.name;
}

function monthKey(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(key: string, n: number): string {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1, 1);
  const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function SavingsWidget({ goals }: { goals: SavingsGoal[] }) {
  const total    = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTgt = goals.reduce((s, g) => s + g.target_amount, 0);
  const globalPct = totalTgt > 0 ? Math.round((total / totalTgt) * 100) : 0;
  const fmt = (n: number) => n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  const circumference = 2 * Math.PI * 14;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay: 0.18 }}
      className="rounded-2xl border border-surface-border bg-surface-card p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PiggyBankIcon className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-fg">Épargne</span>
        </div>
        <span className="text-xs font-semibold text-accent">
          {fmt(total)} € épargnés
        </span>
      </div>

      {/* Barres de progression */}
      <div className="space-y-2.5 mb-4">
        {goals.map((g) => {
          const pct = g.target_amount > 0
            ? Math.min((g.current_amount / g.target_amount) * 100, 100)
            : 0;
          return (
            <div key={g.id}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-fg-subtle">
                  {g.emoji} {g.name}
                </span>
                <span className="text-xs font-semibold" style={{ color: g.color }}>
                  {fmt(g.current_amount)}{" "}
                  <span className="text-fg-disabled font-normal">
                    / {fmt(g.target_amount)} €
                  </span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(90deg, ${g.color}70, ${g.color})`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Synthèse globale */}
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-elevated">
        <svg width="36" height="36" viewBox="0 0 36 36" className="flex-shrink-0">
          <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-surface-border)" strokeWidth="4" />
          <circle
            cx="18" cy="18" r="14"
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="4"
            strokeDasharray={`${(globalPct / 100) * circumference} ${circumference}`}
            strokeLinecap="round"
            transform="rotate(-90 18 18)"
          />
          <text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--color-accent)">
            {globalPct}%
          </text>
        </svg>
        <div>
          <p className="text-xs font-semibold text-fg">
            {fmt(total)} € / {fmt(totalTgt)} €
          </p>
          <p className="text-[10px] text-fg-subtle mt-0.5">Progression globale</p>
        </div>
      </div>
    </motion.div>
  );
}

interface KpiCardProps {
  label: string;
  value: number;
  delta?: number;
  color: "accent" | "blue" | "red" | "green";
  delay?: number;
}

function KpiCard({ label, value, delta, color, delay = 0 }: KpiCardProps) {
  const colorMap = { accent: "text-accent", blue: "text-blue-400", red: "text-red-400", green: "text-emerald-400" };
  const bgMap = { accent: "bg-accent/8", blue: "bg-blue-500/8", red: "bg-red-500/8", green: "bg-emerald-500/8" };
  const borderMap = { accent: "border-accent/20", blue: "border-blue-500/20", red: "border-red-500/20", green: "border-emerald-500/20" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay }}
      className={`card-hover rounded-2xl border p-4 lg:p-5 ${bgMap[color]} ${borderMap[color]}`}
    >
      <p className="text-[10px] lg:text-[11px] uppercase tracking-[0.14em] text-fg-subtle font-medium mb-2 lg:mb-3">
        {label}
      </p>
      <p className={`tabular-nums text-xl lg:text-2xl font-bold ${colorMap[color]}`}>
        {value.toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })}
      </p>
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-1.5">
          {delta >= 0 ? (
            <ArrowUpIcon className="w-3 h-3 text-red-400" />
          ) : (
            <ArrowDownIcon className="w-3 h-3 text-emerald-400" />
          )}
          <span className={`text-[10px] font-medium ${delta >= 0 ? "text-red-400" : "text-emerald-400"}`}>
            {Math.abs(delta).toFixed(0)}% vs mois dernier
          </span>
        </div>
      )}
    </motion.div>
  );
}

export function DashboardPage({ onLogout, userId, activeItem, onNavigate }: DashboardPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [monthlyBudgetTotal, setMonthlyBudgetTotal] = useState(0);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey());
  const [userProfile, setUserProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user?.email) return;
      const { data } = await supabase.from("profiles").select("first_name, last_name").eq("id", userId).single();
      if (data && mounted) {
        setUserProfile({ firstName: data.first_name || "", lastName: data.last_name || "", email: user.user.email });
      }
    }

    async function loadCategories() {
      const { data } = await supabase.from("categories").select("id, name, type").order("name");
      if (data && data.length > 0) { if (mounted) setCategories(data as Category[]); return; }
      await supabase.from("categories").insert(defaultCategories.map((c) => ({ ...c, user_id: userId })));
      const { data: seeded } = await supabase.from("categories").select("id, name, type").order("name");
      if (mounted) setCategories((seeded ?? []) as Category[]);
    }

    async function loadTransactions() {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("transactions")
        .select("id, amount, type, date, note, category_id, categories(name)")
        .lte("date", today)
        .order("date", { ascending: false });
      if (!mounted || !data) return;
      setTransactions(data.map((row) => {
        const abs = Math.abs(Number(row.amount ?? 0));
        return { id: row.id, merchant: row.note ?? "", category: getCategoryName(row.categories) ?? "Autres", amount: row.type === "expense" ? -abs : abs, type: row.type, date: row.date } as Transaction;
      }));
    }

    async function loadSavingsGoals() {
      const { data } = await supabase
        .from("savings_goals")
        .select("id, name, current_amount, target_amount, color, emoji")
        .order("created_at", { ascending: true });
      if (data && mounted) setSavingsGoals(data as SavingsGoal[]);
    }

    void loadProfile();
    void loadCategories();
    void loadTransactions();
    void loadSavingsGoals();
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    const [year, month] = selectedMonthKey.split("-").map(Number);
    supabase.from("budgets").select("planned_amount").eq("user_id", userId).eq("month", `${year}-${String(month).padStart(2, "0")}-01`).then(({ data }) => {
      if (data) setMonthlyBudgetTotal(data.reduce((s, r) => s + (r.planned_amount ?? 0), 0));
    });
  }, [userId, selectedMonthKey]);

  const prevMonthKey = addMonths(selectedMonthKey, -1);

  const { selIncome, selExpense, prevExpense } = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        const v = Math.abs(tx.amount);
        const key = monthKey(tx.date);
        if (tx.type === "income") { if (key === selectedMonthKey) acc.selIncome += v; }
        else { if (key === selectedMonthKey) acc.selExpense += v; if (key === prevMonthKey) acc.prevExpense += v; }
        return acc;
      },
      { selIncome: 0, selExpense: 0, prevExpense: 0 },
    );
  }, [transactions, selectedMonthKey, prevMonthKey]);

  const expenseDelta = prevExpense > 0 ? ((selExpense - prevExpense) / prevExpense) * 100 : undefined;
  const selNetBalance = selIncome - selExpense;
  const selBudgetRestant = monthlyBudgetTotal > 0 ? Math.max(0, monthlyBudgetTotal - selExpense) : 0;
  const todayStr = new Date().toISOString().split("T")[0];
  const todaySpending = useMemo(() => transactions.filter((tx) => tx.date === todayStr && tx.type === "expense").reduce((s, tx) => s + Math.abs(tx.amount), 0), [transactions, todayStr]);
  const todayLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  const chartData = useMemo(() => {
    const byCategory: Record<string, number> = {};
    transactions.filter((tx) => tx.type === "expense" && monthKey(tx.date) === selectedMonthKey).forEach((tx) => {
      byCategory[tx.category] = (byCategory[tx.category] ?? 0) + Math.abs(tx.amount);
    });
    return Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, color: chartPalette[i % chartPalette.length] }));
  }, [transactions, selectedMonthKey]);

  const monthlyTrendData = useMemo(() => {
    const now = new Date();
    const months: Record<string, { income: number; expense: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months[d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" })] = { income: 0, expense: 0 };
    }
    transactions.forEach((tx) => {
      const key = new Date(tx.date).toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
      if (!months[key]) return;
      if (tx.type === "income") months[key].income += Math.abs(tx.amount);
      else months[key].expense += Math.abs(tx.amount);
    });
    return Object.entries(months).map(([month, d]) => ({ month, ...d }));
  }, [transactions]);

  async function handleAddTransaction(input: NewTransactionInput) {
    const cat = categories.find((c) => c.id === input.categoryId);
    if (!cat) return;
    const { data, error } = await supabase
      .from("transactions")
      .insert({ user_id: userId, category_id: input.categoryId, amount: Math.abs(input.amount), type: input.type, note: input.description, date: input.date })
      .select("id, amount, type, date, note, category_id, categories(name)").single();
    if (error || !data) return;
    const signed = data.type === "expense" ? -Math.abs(Number(data.amount)) : Math.abs(Number(data.amount));
    setTransactions((prev) => [{ id: data.id, merchant: data.note ?? input.description, category: getCategoryName(data.categories) ?? cat.name, amount: signed, type: data.type, date: data.date } as Transaction, ...prev]);
    setIsModalOpen(false);
  }

  async function handleDeleteTransaction(id: string) {
    await supabase.from("transactions").delete().eq("id", id);
    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }

  const selMonthTransactions = useMemo(() => transactions.filter((tx) => monthKey(tx.date) === selectedMonthKey), [transactions, selectedMonthKey]);

  const dailyData = useMemo(() => {
    const [year, month] = selectedMonthKey.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const byDay: Record<string, number> = {};
    for (let d = 1; d <= daysInMonth; d++) byDay[String(d)] = 0;
    selMonthTransactions
      .filter((tx) => tx.type === "expense")
      .forEach((tx) => {
        const d = String(new Date(tx.date).getDate());
        byDay[d] = (byDay[d] ?? 0) + Math.abs(tx.amount);
      });
    return Object.entries(byDay).map(([day, spent]) => ({ day, spent }));
  }, [selMonthTransactions, selectedMonthKey]);

  return (
    <div className="min-h-screen w-full bg-surface">
      <Sidebar onLogout={onLogout} activeItem={activeItem} onNavigate={onNavigate} userProfile={userProfile} todaySpending={todaySpending} />

      <main className="lg:ml-[var(--sidebar-width)] transition-all duration-200">
        <header className="sticky top-0 z-20 glass border-b border-surface-border">
          <div className="flex items-center justify-between px-4 py-3.5 lg:px-8 lg:py-4">
            <div>
              <motion.h1 initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="text-sm lg:text-base font-semibold text-fg">
                Bonjour, {userProfile?.firstName || "vous"} 👋
              </motion.h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CalendarIcon className="w-3 h-3 text-fg-subtle" />
                <p className="text-[10px] text-fg-subtle capitalize">{todayLabel}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <button onClick={() => setSelectedMonthKey((k) => addMonths(k, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors" aria-label="Mois précédent">
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-fg min-w-[80px] text-center hidden sm:inline">{formatMonthLabel(selectedMonthKey)}</span>
              <button onClick={() => setSelectedMonthKey((k) => addMonths(k, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors" aria-label="Mois suivant">
                <ArrowRightIcon className="w-4 h-4" />
              </button>
              <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-fg text-xs font-semibold hover:bg-accent-light transition-colors min-h-[44px]" style={{ boxShadow: "var(--shadow-accent-sm)" }}>
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>
              <NotificationBell userId={userId} />
            </div>
          </div>
        </header>

        <div className="px-4 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-8 space-y-4 lg:space-y-5 pb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <KpiCard label="Solde net" value={selNetBalance} color={selNetBalance >= 0 ? "accent" : "red"} delay={0} />
            <KpiCard label="Dépenses" value={selExpense} delta={expenseDelta} color="red" delay={0.05} />
            <KpiCard label="Revenus" value={selIncome} color="blue" delay={0.1} />
            <KpiCard label={monthlyBudgetTotal > 0 ? "Budget restant" : "Économies"} value={monthlyBudgetTotal > 0 ? selBudgetRestant : selNetBalance} color={monthlyBudgetTotal > 0 ? (selBudgetRestant > 0 ? "green" : "red") : "accent"} delay={0.15} />
          </div>

          {/* Widget épargne — mobile uniquement, entre KPIs et graphique dépenses */}
          {savingsGoals.length > 0 && (
            <div className="lg:hidden">
              <SavingsWidget goals={savingsGoals} />
            </div>
          )}

          {/* Mobile: pie + recent transactions */}
          <div className="lg:hidden space-y-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.1 }}>
              <MobileSpendingPie data={chartData} total={selExpense} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: 0.18 }}>
              <TransactionList transactions={selMonthTransactions.slice(0, 5)} onDeleteTransaction={handleDeleteTransaction} onViewAll={() => onNavigate?.("transactions")} />
            </motion.div>
          </div>

          {/* Desktop: full chart layout */}
          <div className="hidden lg:grid grid-cols-12 gap-5">
            <div className="col-span-8 space-y-5">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.2 }} className="rounded-2xl border border-surface-border bg-surface-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUpIcon className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-semibold text-fg">Tendance 12 mois</h2>
                </div>
                <MonthlyTrendChart data={monthlyTrendData} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.25 }} className="rounded-2xl border border-surface-border bg-surface-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-sm font-semibold text-fg">Dépenses jour par jour</h2>
                    <p className="text-xs text-fg-subtle mt-0.5">{formatMonthLabel(selectedMonthKey)}</p>
                  </div>
                </div>
                <DailySpendingChart data={dailyData} />
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.3 }} className="rounded-2xl border border-surface-border bg-surface-card p-5">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-fg">Top catégories</h2>
                  <p className="text-xs text-fg-subtle mt-0.5">Dépenses ce mois par catégorie</p>
                </div>
                <TopExpenseCategoriesChart data={chartData} />
              </motion.div>
            </div>

            <div className="col-span-4 space-y-4">
              <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25, delay: 0.22 }}>
                <TransactionList transactions={selMonthTransactions.slice(0, 8)} onDeleteTransaction={handleDeleteTransaction} onViewAll={() => onNavigate?.("transactions")} />
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <AddTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddTransaction} categories={categories} />
    </div>
  );
}
