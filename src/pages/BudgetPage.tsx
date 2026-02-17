import { motion } from "framer-motion";
import { CalendarIcon, PencilIcon, SaveIcon, XIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Sidebar } from "../components/Sidebar";
import { supabase } from "../lib/supabaseClient";
import type { Category } from "../transaction";

interface BudgetPageProps {
  onLogout: () => void;
  userId: string;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
}

interface BudgetRow {
  id: string;
  category_id: string;
  month: string;
  planned_amount: number;
}

interface BudgetTransaction {
  category_id: string;
  amount: number;
  type: "income" | "expense";
  date: string;
}

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

function formatAmountValue(value: number) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface TooltipProps {
  active?: boolean;
  payload?: {
    payload: {
      name: string;
      value: number;
      color: string;
    };
  }[];
}

function BudgetTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="bg-dark-elevated border border-dark-border rounded-lg px-3 py-2 shadow-xl">
      <p className="text-sm font-medium text-white">{item.name}</p>
      <p className="text-sm text-gold font-semibold">
        {formatAmountValue(item.value)} €
      </p>
    </div>
  );
}

export function BudgetPage({
  onLogout,
  userId,
  activeItem,
  onNavigate,
}: BudgetPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [draftLimits, setDraftLimits] = useState<Record<string, string>>({});
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [savingCategoryId, setSavingCategoryId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLimitsOpen, setIsLimitsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  const monthOptions = useMemo(
    () => [
      "Janvier",
      "Fevrier",
      "Mars",
      "Avril",
      "Mai",
      "Juin",
      "Juillet",
      "Aout",
      "Septembre",
      "Octobre",
      "Novembre",
      "Decembre",
    ],
    [],
  );

  const initialMonthStart = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }, []);

  const [activeMonthStart, setActiveMonthStart] = useState(initialMonthStart);
  const [draftMonth, setDraftMonth] = useState(
    initialMonthStart.getMonth() + 1,
  );
  const [draftYear, setDraftYear] = useState(initialMonthStart.getFullYear());

  const yearOptions = useMemo(() => {
    const currentYear = initialMonthStart.getFullYear();
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
  }, [initialMonthStart]);

  const activeMonthKey = useMemo(
    () => activeMonthStart.toISOString().split("T")[0],
    [activeMonthStart],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      setIsLoading(true);

      const { data: user } = await supabase.auth.getUser();
      if (user.user?.email) {
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Failed to load profile", error);
        } else if (data && isMounted) {
          setUserProfile({
            firstName: data.first_name || "Utilisateur",
            lastName: data.last_name || "",
            email: user.user.email,
          });
        }
      }

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name, type")
        .order("name");

      if (categoriesError) {
        console.error("Failed to load categories", categoriesError);
      } else if (isMounted) {
        setCategories((categoriesData ?? []) as Category[]);
      }

      const { data: budgetsData, error: budgetsError } = await supabase
        .from("budgets")
        .select("id, category_id, month, planned_amount")
        .eq("user_id", userId)
        .eq("month", activeMonthKey);

      if (budgetsError) {
        console.error("Failed to load budgets", budgetsError);
      } else if (isMounted) {
        setBudgets((budgetsData ?? []) as BudgetRow[]);
      }

      const { data: transactionsData, error: transactionsError } =
        await supabase
          .from("transactions")
          .select("amount, type, date, category_id")
          .order("date", { ascending: false });

      if (transactionsError) {
        console.error("Failed to load transactions", transactionsError);
      } else if (isMounted) {
        const mapped = (transactionsData ?? []).map((row) => ({
          category_id: row.category_id as string,
          amount: Number(row.amount ?? 0),
          type: row.type as "income" | "expense",
          date: row.date as string,
        }));

        setTransactions(mapped);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [userId, activeMonthKey]);

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === "expense"),
    [categories],
  );

  const budgetsByCategory = useMemo(() => {
    return budgets
      .filter((budget) => budget.month === activeMonthKey)
      .reduce(
        (acc, budget) => {
          acc[budget.category_id] = budget;
          return acc;
        },
        {} as Record<string, BudgetRow>,
      );
  }, [budgets, activeMonthKey]);

  useEffect(() => {
    setDraftLimits((prev) => {
      const next = { ...prev };
      expenseCategories.forEach((category) => {
        if (next[category.id] === undefined) {
          const existing = budgetsByCategory[category.id];
          next[category.id] = existing
            ? existing.planned_amount.toString()
            : "";
        }
      });
      return next;
    });
  }, [expenseCategories, budgetsByCategory]);

  const activeMonthTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const date = new Date(tx.date);
      return (
        date.getFullYear() === activeMonthStart.getFullYear() &&
        date.getMonth() === activeMonthStart.getMonth()
      );
    });
  }, [transactions, activeMonthStart]);

  const lastSixMonthKeys = useMemo(() => {
    const keys: string[] = [];
    for (let i = 1; i <= 6; i += 1) {
      const date = new Date(
        activeMonthStart.getFullYear(),
        activeMonthStart.getMonth() - i,
        1,
      );
      keys.push(date.toISOString().split("T")[0]);
    }
    return keys;
  }, [activeMonthStart]);

  const activeMonthIncome = useMemo(() => {
    return activeMonthTransactions
      .filter((tx) => tx.type === "income")
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  }, [activeMonthTransactions]);

  const activeMonthSpentByCategory = useMemo(() => {
    return activeMonthTransactions.reduce(
      (acc, tx) => {
        if (tx.type !== "expense") return acc;
        acc[tx.category_id] = (acc[tx.category_id] ?? 0) + Math.abs(tx.amount);
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [activeMonthTransactions]);

  const avgSixMonthsSpentByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    const monthsByCategory: Record<string, Set<string>> = {};

    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      const date = new Date(tx.date);
      const key = new Date(date.getFullYear(), date.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      if (!lastSixMonthKeys.includes(key)) return;

      totals[tx.category_id] =
        (totals[tx.category_id] ?? 0) + Math.abs(tx.amount);

      if (!monthsByCategory[tx.category_id]) {
        monthsByCategory[tx.category_id] = new Set<string>();
      }
      monthsByCategory[tx.category_id].add(key);
    });

    return Object.entries(totals).reduce(
      (acc, [categoryId, total]) => {
        const monthCount = monthsByCategory[categoryId]?.size ?? 0;
        if (monthCount > 0) {
          acc[categoryId] = total / monthCount;
        }
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [transactions, lastSixMonthKeys]);

  const totalBudgetLimit = useMemo(() => {
    return expenseCategories.reduce((sum, category) => {
      const budget = budgetsByCategory[category.id];
      return sum + (budget?.planned_amount ?? 0);
    }, 0);
  }, [expenseCategories, budgetsByCategory]);

  const totalBudgetSpent = useMemo(() => {
    return expenseCategories.reduce((sum, category) => {
      return sum + (activeMonthSpentByCategory[category.id] ?? 0);
    }, 0);
  }, [expenseCategories, activeMonthSpentByCategory]);

  const budgetChartData = useMemo(() => {
    return expenseCategories
      .map((category, index) => {
        const budget = budgetsByCategory[category.id];
        const value = budget?.planned_amount ?? 0;
        return {
          name: category.name,
          value,
          color: chartPalette[index % chartPalette.length],
        };
      })
      .filter((item) => item.value > 0);
  }, [expenseCategories, budgetsByCategory]);

  const formatAmount = formatAmountValue;

  async function handleSaveBudget(categoryId: string) {
    setActionError("");
    const rawValue = draftLimits[categoryId];
    const amountValue = Number(rawValue);

    if (!rawValue || isNaN(amountValue) || amountValue <= 0) {
      setActionError("Le budget doit etre superieur a 0.");
      return;
    }

    setSavingCategoryId(categoryId);

    const existing = budgetsByCategory[categoryId];
    if (existing) {
      const { data, error } = await supabase
        .from("budgets")
        .update({ planned_amount: amountValue })
        .eq("id", existing.id)
        .select("id, category_id, month, planned_amount")
        .single();

      if (error) {
        console.error("Failed to update budget", error);
        setActionError("Impossible de mettre a jour ce budget.");
        setSavingCategoryId(null);
        return;
      }

      setBudgets((prev) =>
        prev.map((budget) =>
          budget.id === existing.id ? (data as BudgetRow) : budget,
        ),
      );
    } else {
      const { data, error } = await supabase
        .from("budgets")
        .insert({
          user_id: userId,
          category_id: categoryId,
          month: activeMonthKey,
          planned_amount: amountValue,
        })
        .select("id, category_id, month, planned_amount")
        .single();

      if (error) {
        console.error("Failed to create budget", error);
        setActionError("Impossible d'ajouter ce budget.");
        setSavingCategoryId(null);
        return;
      }

      if (data) {
        setBudgets((prev) => [data as BudgetRow, ...prev]);
      }
    }

    setEditingCategoryId(null);
    setSavingCategoryId(null);
  }

  function handleCancelEdit(categoryId: string) {
    const existing = budgetsByCategory[categoryId];
    setDraftLimits((prev) => ({
      ...prev,
      [categoryId]: existing ? existing.planned_amount.toString() : "",
    }));
    setEditingCategoryId(null);
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const topProgress =
    activeMonthIncome > 0
      ? Math.min(totalBudgetLimit / activeMonthIncome, 1)
      : 0;

  function handleApplyMonthFilter() {
    if (!draftYear || !draftMonth) return;
    setActiveMonthStart(new Date(draftYear, draftMonth - 1, 1));
  }

  return (
    <div className="min-h-screen w-full bg-dark">
      <Sidebar
        onLogout={onLogout}
        activeItem={activeItem}
        onNavigate={onNavigate}
        userProfile={userProfile}
      />

      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 bg-dark/80 backdrop-blur-lg border-b border-dark-border">
          <div className="flex items-start justify-between gap-3 px-6 py-4 lg:px-8 sm:items-center">
            <div className="ml-12 lg:ml-0">
              <motion.h1
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="text-lg font-semibold text-white"
              >
                Budget
              </motion.h1>
              <div className="flex items-center gap-1.5 mt-0.5 whitespace-nowrap">
                <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs text-gray-500 capitalize">{today}</p>
              </div>
            </div>
            <div className="flex w-full items-center justify-end sm:w-auto">
              <button
                type="button"
                onClick={() => setIsFilterOpen(true)}
                className="sm:hidden inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-gray-300 text-xs font-semibold hover:bg-dark-hover transition-colors"
              >
                Filtre
              </button>
              <div className="hidden sm:flex sm:flex-row sm:items-center sm:gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-gray-500">Mois</label>
                  <select
                    value={draftMonth}
                    onChange={(event) =>
                      setDraftMonth(Number(event.target.value))
                    }
                    className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
                  >
                    {monthOptions.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-gray-500">Annee</label>
                  <select
                    value={draftYear}
                    onChange={(event) =>
                      setDraftYear(Number(event.target.value))
                    }
                    className="bg-dark border border-dark-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleApplyMonthFilter}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-gray-300 text-xs font-semibold hover:bg-dark-hover transition-colors"
                >
                  Filtrer
                </button>
              </div>
            </div>
          </div>
        </header>

        {isFilterOpen ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 sm:hidden">
            <div className="w-full max-w-sm bg-dark-card border border-dark-border rounded-2xl shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
                <p className="text-sm font-semibold text-white">Filtrer</p>
                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-gray-300 text-xs font-semibold hover:bg-dark-hover transition-colors"
                >
                  Fermer
                </button>
              </div>
              <div className="px-5 py-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-500">Mois</label>
                  <select
                    value={draftMonth}
                    onChange={(event) =>
                      setDraftMonth(Number(event.target.value))
                    }
                    className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
                  >
                    {monthOptions.map((label, index) => (
                      <option key={label} value={index + 1}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-500">Annee</label>
                  <select
                    value={draftYear}
                    onChange={(event) =>
                      setDraftYear(Number(event.target.value))
                    }
                    className="w-full bg-dark border border-dark-border rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-gold/40"
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleApplyMonthFilter();
                    setIsFilterOpen(false);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-gray-300 text-xs font-semibold hover:bg-dark-hover transition-colors"
                >
                  Appliquer
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="px-6 py-6 lg:px-8 lg:py-8 space-y-6">
          {activeMonthIncome > 0 ? (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-dark-card border border-dark-border rounded-xl p-6"
              >
                <div className="space-y-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500">Revenu du mois</p>
                    <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-emerald-400 mt-2">
                      {formatAmount(activeMonthIncome)} €
                    </p>
                  </div>

                  <div className="w-full">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>Utilisation du budget</span>
                      <span>{Math.round(topProgress * 100)}%</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-dark border border-dark-border overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.round(topProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                  className="xl:col-span-2 bg-dark-card border border-dark-border rounded-xl p-6"
                >
                  <h2 className="text-sm font-semibold text-white">
                    Repartition du budget
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Limites definies pour le mois en cours.
                  </p>

                  {budgetChartData.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">
                      Definis des limites pour voir la repartition.
                    </div>
                  ) : (
                    <div className="mt-6 flex flex-col items-center gap-6">
                      <div className="w-48 h-48">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={budgetChartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              strokeWidth={0}
                            >
                              {budgetChartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index.toString()}`}
                                  fill={entry.color}
                                />
                              ))}
                            </Pie>
                            <Tooltip content={<BudgetTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="w-full space-y-3">
                        {budgetChartData.map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center gap-2.5">
                              <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: item.color }}
                              />
                              <span className="text-sm text-gray-300">
                                {item.name}
                              </span>
                            </div>
                            <span className="text-sm font-medium text-white">
                              {formatAmount(item.value)} €
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="xl:col-span-3 bg-dark-card border border-dark-border rounded-xl p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-semibold text-white">
                        Progression par categorie
                      </h2>
                      <p className="text-xs text-gray-500">
                        Consulte rapidement toutes les categories.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsLimitsOpen(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-dark-border text-gray-300 text-xs font-semibold hover:bg-dark-hover transition-colors"
                    >
                      Configurer les limites
                    </button>
                  </div>

                  <div className="mt-6 space-y-3">
                    {expenseCategories.map((category) => {
                      const spent =
                        activeMonthSpentByCategory[category.id] ?? 0;
                      const limit =
                        budgetsByCategory[category.id]?.planned_amount ?? 0;
                      const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0;
                      return (
                        <div key={category.id}>
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>{category.name}</span>
                            <span>
                              {formatAmount(spent)} / {formatAmount(limit)} €
                            </span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-dark border border-dark-border overflow-hidden">
                            <div
                              className="h-full bg-gold"
                              style={{ width: `${Math.round(ratio * 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              </div>

              {isLimitsOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                  <div className="w-full max-w-4xl bg-dark-card border border-dark-border rounded-2xl shadow-2xl">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          Limites par categorie
                        </p>
                        <p className="text-xs text-gray-500">
                          {activeMonthStart.toLocaleDateString("fr-FR", {
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsLimitsOpen(false)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-gray-300 text-xs font-semibold hover:bg-dark-hover transition-colors"
                      >
                        Fermer
                      </button>
                    </div>

                    <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                      {actionError ? (
                        <p className="mb-4 text-xs text-red-400">
                          {actionError}
                        </p>
                      ) : null}

                      <div className="space-y-4">
                        {isLoading ? (
                          <p className="text-sm text-gray-500">Chargement...</p>
                        ) : expenseCategories.length === 0 ? (
                          <p className="text-sm text-gray-500">
                            Aucune categorie de depense disponible.
                          </p>
                        ) : (
                          expenseCategories.map((category) => {
                            const budget = budgetsByCategory[category.id];
                            const spent =
                              activeMonthSpentByCategory[category.id] ?? 0;
                            const avgSpent =
                              avgSixMonthsSpentByCategory[category.id] ?? 0;
                            const limit = budget?.planned_amount ?? 0;
                            const remaining = limit - spent;
                            const ratio =
                              limit > 0 ? Math.min(spent / limit, 1) : 0;
                            const avgRatio =
                              limit > 0 ? Math.min(avgSpent / limit, 1) : 0;
                            const isAvgOver = limit > 0 && avgSpent > limit;
                            const isOver = remaining < 0;
                            const isEditing =
                              editingCategoryId === category.id || !budget;

                            return (
                              <div
                                key={category.id}
                                className="bg-dark-elevated border border-dark-border rounded-xl p-4"
                              >
                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                  <div>
                                    <p className="text-sm font-semibold text-white">
                                      {category.name}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={draftLimits[category.id] ?? ""}
                                        onChange={(event) =>
                                          setDraftLimits((prev) => ({
                                            ...prev,
                                            [category.id]: event.target.value,
                                          }))
                                        }
                                        disabled={!isEditing}
                                        className="w-32 bg-dark border border-dark-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:opacity-60"
                                        placeholder="0,00"
                                      />
                                      <span className="text-xs text-gray-500">
                                        €
                                      </span>
                                    </div>

                                    {isEditing ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleSaveBudget(category.id)
                                          }
                                          disabled={
                                            savingCategoryId === category.id
                                          }
                                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gold text-dark text-xs font-semibold hover:bg-gold-light transition-colors disabled:opacity-60"
                                        >
                                          <SaveIcon className="w-4 h-4" />
                                          Enregistrer
                                        </button>
                                        {budget ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleCancelEdit(category.id)
                                            }
                                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-gray-300 text-xs font-semibold hover:bg-dark-hover transition-colors"
                                          >
                                            <XIcon className="w-4 h-4" />
                                            Annuler
                                          </button>
                                        ) : null}
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setEditingCategoryId(category.id)
                                        }
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-gray-300 text-xs font-semibold hover:bg-dark-hover transition-colors"
                                      >
                                        <PencilIcon className="w-4 h-4" />
                                        Modifier
                                      </button>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-1">
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>
                                      Depense: {formatAmount(spent)} €
                                    </span>
                                    <span>
                                      {limit > 0
                                        ? `${Math.round(ratio * 100)}%`
                                        : "0%"}
                                    </span>
                                  </div>
                                  <div className="mt-2 relative">
                                    <div className="h-2 rounded-full bg-dark border border-dark-border overflow-hidden">
                                      <div
                                        className={`h-full ${
                                          isOver
                                            ? "bg-red-500"
                                            : "bg-emerald-500"
                                        }`}
                                        style={{
                                          width: `${Math.round(ratio * 100)}%`,
                                        }}
                                      />
                                    </div>
                                    {limit > 0 && avgSpent > 0 ? (
                                      <>
                                        <div
                                          className="absolute -top-1 h-4 w-0.5 bg-gold"
                                          style={{
                                            left: `${Math.round(avgRatio * 100)}%`,
                                            transform: "translateX(-50%)",
                                          }}
                                        />
                                        {isAvgOver ? (
                                          <span className="absolute -top-1 left-full ml-1 text-[10px] text-gold">
                                            +
                                          </span>
                                        ) : null}
                                      </>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dark-border bg-dark-card px-6 py-12 text-center">
              <p className="text-base sm:text-lg text-gray-300">
                Aucun revenu n'est present pour ce mois. Ajoute un revenu avant
                de configurer ton budget.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
