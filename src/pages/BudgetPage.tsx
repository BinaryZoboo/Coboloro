import { motion } from "framer-motion";
import {
  CalendarIcon,
  ChevronRightIcon,
  PencilIcon,
  RefreshCw,
  SaveIcon,
  Settings,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BudgetComparisonChart } from "../components/BudgetComparisonChart";
import { DailySpendingChart } from "../components/DailySpendingChart";
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

interface RecurringBudget {
  id: string;
  category_id: string;
  amount: number;
}

interface BudgetTransaction {
  category_id: string;
  amount: number;
  type: "income" | "expense";
  date: string;
}

const chartPalette = [
  // Bleus
  "#3B82F6", // Bleu vif
  "#0EA5E9", // Sky blue
  "#06B6D4", // Cyan
  "#0891B2", // Cyan foncé
  "#0369A1", // Bleu foncé

  // Verts
  "#10B981", // Vert émeraude
  "#84CC16", // Lime
  "#14B8A6", // Teal
  "#059669", // Vert foncé
  "#16A34A", // Vert classique

  // Rouges/Roses
  "#EF4444", // Rouge vif
  "#EC4899", // Rose
  "#F43F5E", // Rose foncé
  "#DC2626", // Rouge foncé
  "#BE123C", // Bordeaux

  // Oranges/Jaunes
  "#F59E0B", // Orange doré
  "#F97316", // Orange vif
  "#FBBF24", // Ambre
  "#FCD34D", // Or clair
  "#F59E0B", // Orange

  // Violets/Indigos
  "#8B5CF6", // Violet
  "#A855F7", // Violet vif
  "#D946EF", // Rose magenta
  "#7C3AED", // Indigo
  "#6366F1", // Indigo bleu

  // Teintes additionnelles
  "#14B8A6", // Turquoise
  "#06B6D4", // Cyan light
  "#0D9488", // Teal foncé
  "#059669", // Vert émeraude foncé
  "#10B981", // Vert bright
  "#34D399", // Vert clair
  "#6EE7B7", // Vert menthe
];

function formatAmountValue(value: number) {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  const [isRecurringOpen, setIsRecurringOpen] = useState(false);
  const [recurringBudgets, setRecurringBudgets] = useState<RecurringBudget[]>(
    [],
  );
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
          .lte("date", new Date().toISOString().split("T")[0])
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

      const { data: recurringData, error: recurringError } = await supabase
        .from("recurring_budgets")
        .select("id, category_id, amount")
        .eq("user_id", userId);

      if (recurringError) {
        console.error("Failed to load recurring budgets", recurringError);
      } else if (isMounted) {
        setRecurringBudgets((recurringData ?? []) as RecurringBudget[]);

        // Si on est dans le mois actuel, créer automatiquement les budgets et transactions du mois suivant
        const now = new Date();
        const currentMonthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        );
        const isCurrentMonth =
          activeMonthStart.getFullYear() === currentMonthStart.getFullYear() &&
          activeMonthStart.getMonth() === currentMonthStart.getMonth();

        if (isCurrentMonth && recurringData && recurringData.length > 0) {
          const today = new Date();
          const nextMonthMonth = today.getMonth() + 2;
          const nextMonthYear =
            nextMonthMonth > 12 ? today.getFullYear() + 1 : today.getFullYear();
          const normalizedMonth =
            nextMonthMonth > 12 ? nextMonthMonth - 12 : nextMonthMonth;
          const nextMonthDateStr = `${nextMonthYear}-${String(normalizedMonth).padStart(2, "0")}-01`;

          // Calculer le mois d'après pour la vérification
          const monthAfter = normalizedMonth + 1;
          const yearAfter = monthAfter > 12 ? nextMonthYear + 1 : nextMonthYear;
          const normalizedMonthAfter = monthAfter > 12 ? 1 : monthAfter;
          const monthAfterKey = `${yearAfter}-${String(normalizedMonthAfter).padStart(2, "0")}-01`;

          for (const recurring of recurringData as RecurringBudget[]) {
            // Créer le budget pour le mois suivant si inexistant
            const { data: existingBudget } = await supabase
              .from("budgets")
              .select("id")
              .eq("user_id", userId)
              .eq("category_id", recurring.category_id)
              .eq("month", nextMonthDateStr)
              .maybeSingle();

            if (!existingBudget) {
              await supabase.from("budgets").insert({
                user_id: userId,
                category_id: recurring.category_id,
                month: nextMonthDateStr,
                planned_amount: recurring.amount,
              });
            }

            // Créer la transaction pour le mois suivant si inexistante
            const { data: existingTx } = await supabase
              .from("transactions")
              .select("id")
              .eq("user_id", userId)
              .eq("category_id", recurring.category_id)
              .gte("date", nextMonthDateStr)
              .lt("date", monthAfterKey)
              .maybeSingle();

            if (!existingTx) {
              await supabase.from("transactions").insert({
                user_id: userId,
                category_id: recurring.category_id,
                amount: recurring.amount,
                type: "expense",
                date: nextMonthDateStr,
                note: "Dépense récurrente",
              });
            }
          }
        }
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

  const budgetChartData = useMemo(() => {
    // Filtrer d'abord les catégories avec budget > 0
    const categoriesWithBudget = expenseCategories
      .filter((category) => {
        const budget = budgetsByCategory[category.id];
        return (budget?.planned_amount ?? 0) > 0;
      })
      // Assigner les couleurs APRÈS le filtre pour éviter les doublons
      .map((category, index) => {
        const budget = budgetsByCategory[category.id];
        const value = budget?.planned_amount ?? 0;
        return {
          name: category.name,
          value,
          color: chartPalette[index % chartPalette.length],
        };
      });

    const totalBudget = activeMonthIncome;
    const allocatedBudget = categoriesWithBudget.reduce(
      (sum, item) => sum + item.value,
      0,
    );
    const remainingBudget = Math.max(0, totalBudget - allocatedBudget);

    // Structure pour stacked bar
    const stackedData: Record<string, string | number> = {
      name: "Répartition budgétaire",
    };

    categoriesWithBudget.forEach((item) => {
      stackedData[item.name] = item.value;
    });

    if (remainingBudget > 0) {
      stackedData["Budget non alloué"] = remainingBudget;
    }

    return {
      data: [stackedData],
      categories: categoriesWithBudget,
      remainingBudget,
      totalBudget,
    };
  }, [expenseCategories, budgetsByCategory, activeMonthIncome]);

  const budgetComparisonData = useMemo(() => {
    return expenseCategories
      .map((category) => {
        const budget = budgetsByCategory[category.id];
        const spent = activeMonthSpentByCategory[category.id] ?? 0;
        return {
          name: category.name,
          limit: budget?.planned_amount ?? 0,
          spent,
        };
      })
      .filter((item) => item.limit > 0 || item.spent > 0);
  }, [expenseCategories, budgetsByCategory, activeMonthSpentByCategory]);

  const dailySpendingData = useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    const currentMonthStart = activeMonthStart;
    const currentMonthEnd = new Date(
      currentMonthStart.getFullYear(),
      currentMonthStart.getMonth() + 1,
      0,
    );

    for (let d = 1; d <= currentMonthEnd.getDate(); d++) {
      const key = `${d}`;
      dailyTotals[key] = 0;
    }

    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();
      const txMonth = txDate.getMonth();

      if (
        txYear !== currentMonthStart.getFullYear() ||
        txMonth !== currentMonthStart.getMonth()
      ) {
        return;
      }

      const day = txDate.getDate().toString();
      dailyTotals[day] = (dailyTotals[day] ?? 0) + Math.abs(tx.amount);
    });

    return Object.entries(dailyTotals).map(([day, spent]) => ({
      day,
      spent,
    }));
  }, [transactions, activeMonthStart]);

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

  async function handleToggleRecurring(categoryId: string) {
    // Vérifier qu'on est dans le mois actuel (pas un mois futur)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    if (
      activeMonthStart.getFullYear() !== currentMonthStart.getFullYear() ||
      activeMonthStart.getMonth() !== currentMonthStart.getMonth()
    ) {
      setActionError(
        "Tu ne peux cocher une récurrence que pour le mois actuel. Cela évite les boucles infinies de pré-enregistrements.",
      );
      return;
    }

    const existing = recurringBudgets.find((r) => r.category_id === categoryId);

    if (existing) {
      // Supprimer la récurrence
      const { error } = await supabase
        .from("recurring_budgets")
        .delete()
        .eq("id", existing.id);

      if (error) {
        console.error("Failed to delete recurring budget", error);
        setActionError("Impossible de supprimer cette recurrence.");
        return;
      }

      // Supprimer aussi la transaction et le budget pré-enregistrés du mois suivant
      const today = new Date();
      const nextMonthMonth = today.getMonth() + 2;
      const nextMonthYear =
        nextMonthMonth > 12 ? today.getFullYear() + 1 : today.getFullYear();
      const normalizedMonth =
        nextMonthMonth > 12 ? nextMonthMonth - 12 : nextMonthMonth;
      const nextMonthPrefix = `${nextMonthYear}-${String(normalizedMonth).padStart(2, "0")}`;
      const nextMonthKey = `${nextMonthPrefix}-01`;

      // Calculer le mois d'après pour la borne supérieure
      const monthAfter = normalizedMonth + 1;
      const yearAfter = monthAfter > 12 ? nextMonthYear + 1 : nextMonthYear;
      const normalizedMonthAfter = monthAfter > 12 ? 1 : monthAfter;
      const monthAfterKey = `${yearAfter}-${String(normalizedMonthAfter).padStart(2, "0")}-01`;

      // Supprimer toutes les transactions du mois suivant pour cette catégorie
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", userId)
        .eq("category_id", categoryId)
        .gte("date", nextMonthKey)
        .lt("date", monthAfterKey);

      if (deleteError) {
        console.error("Erreur de suppression transaction:", deleteError);
      }

      // Supprimer le budget du mois suivant
      const { error: budgetDeleteError } = await supabase
        .from("budgets")
        .delete()
        .eq("user_id", userId)
        .eq("category_id", categoryId)
        .eq("month", nextMonthKey);

      if (budgetDeleteError) {
        console.error("Erreur de suppression budget:", budgetDeleteError);
      }

      // Recharger les transactions pour mettre à jour l'UI
      const { data: updatedTransactions } = await supabase
        .from("transactions")
        .select("amount, type, date, category_id")
        .order("date", { ascending: false });

      if (updatedTransactions) {
        const mapped = updatedTransactions.map((row) => ({
          category_id: row.category_id as string,
          amount: Number(row.amount ?? 0),
          type: row.type as "income" | "expense",
          date: row.date as string,
        }));
        setTransactions(mapped);
      }

      setRecurringBudgets((prev) => prev.filter((r) => r.id !== existing.id));
    } else {
      // Ajouter la récurrence avec le montant actuel du budget
      const currentBudget = budgetsByCategory[categoryId];
      const amount = currentBudget?.planned_amount ?? 0;

      if (amount === 0) {
        setActionError("Definis d'abord une limite pour cette categorie.");
        return;
      }

      const { data, error } = await supabase
        .from("recurring_budgets")
        .insert({
          user_id: userId,
          category_id: categoryId,
          amount: amount,
        })
        .select("id, category_id, amount")
        .single();

      if (error) {
        console.error("Failed to create recurring budget", error);
        setActionError("Impossible d'ajouter cette recurrence.");
        return;
      }

      if (data) {
        // Ajouter à la liste des récurrences
        setRecurringBudgets((prev) => [data as RecurringBudget, ...prev]);

        // Créer immédiatement une transaction pour le mois suivant
        const today = new Date();
        const nextMonthMonth = today.getMonth() + 2;
        const nextMonthYear =
          nextMonthMonth > 12 ? today.getFullYear() + 1 : today.getFullYear();
        const normalizedMonth =
          nextMonthMonth > 12 ? nextMonthMonth - 12 : nextMonthMonth;
        const nextMonthDateStr = `${nextMonthYear}-${String(normalizedMonth).padStart(2, "0")}-01`;

        // Calculer le mois d'après pour la vérification
        const monthAfter = normalizedMonth + 1;
        const yearAfter = monthAfter > 12 ? nextMonthYear + 1 : nextMonthYear;
        const normalizedMonthAfter = monthAfter > 12 ? 1 : monthAfter;
        const monthAfterKey = `${yearAfter}-${String(normalizedMonthAfter).padStart(2, "0")}-01`;

        // Créer le budget pour le mois suivant
        const nextMonthKey = nextMonthDateStr;

        const { data: existingBudget } = await supabase
          .from("budgets")
          .select("id")
          .eq("user_id", userId)
          .eq("category_id", categoryId)
          .eq("month", nextMonthKey)
          .maybeSingle();

        if (!existingBudget) {
          await supabase.from("budgets").insert({
            user_id: userId,
            category_id: categoryId,
            month: nextMonthKey,
            planned_amount: amount,
          });
        }

        // Vérifier directement dans la DB si une transaction existe déjà avec la même catégorie et date
        const { data: existingTx } = await supabase
          .from("transactions")
          .select("id")
          .eq("user_id", userId)
          .eq("category_id", categoryId)
          .gte("date", nextMonthKey)
          .lt("date", monthAfterKey)
          .maybeSingle();

        if (!existingTx) {
          await supabase.from("transactions").insert({
            user_id: userId,
            category_id: categoryId,
            amount: amount,
            type: "expense",
            date: nextMonthDateStr,
            note: "Dépense récurrente",
          });

          // Recharger les transactions pour mettre à jour l'UI
          const { data: updatedTransactions } = await supabase
            .from("transactions")
            .select("amount, type, date, category_id")
            .order("date", { ascending: false });

          if (updatedTransactions) {
            const mapped = updatedTransactions.map((row) => ({
              category_id: row.category_id as string,
              amount: Number(row.amount ?? 0),
              type: row.type as "income" | "expense",
              date: row.date as string,
            }));
            setTransactions(mapped);
          }
        }
      }
    }
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

              <div className="space-y-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <div
                    onClick={() => setIsLimitsOpen(true)}
                    className="bg-dark-card border border-dark-border rounded-xl p-6 cursor-pointer hover:bg-dark-hover hover:border-gold/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center group-hover:bg-gold/20 transition-colors">
                          <Settings className="w-6 h-6 text-gold" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-white group-hover:text-gold transition-colors">
                            Configurer les limites
                          </h2>
                          <p className="text-sm text-gray-400 mt-0.5">
                            Definis tes limites de depenses par categorie
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="w-5 h-5 text-gray-500 group-hover:text-gold group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>

                  <div
                    onClick={() => setIsRecurringOpen(true)}
                    className="bg-dark-card border border-dark-border rounded-xl p-6 cursor-pointer hover:bg-dark-hover hover:border-emerald-500/50 transition-all duration-200 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                          <RefreshCw className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold text-white group-hover:text-emerald-500 transition-colors">
                            Depenses recurrentes
                          </h2>
                          <p className="text-sm text-gray-400 mt-0.5">
                            Configure tes abonnements et factures
                          </p>
                        </div>
                      </div>
                      <ChevronRightIcon className="w-5 h-5 text-gray-500 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.35 }}
                  className="bg-dark-card border border-dark-border rounded-xl p-6"
                >
                  <h2 className="text-sm font-semibold text-white">
                    Répartition du budget
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    Limites définies pour le mois en cours.
                  </p>

                  {budgetChartData.categories.length === 0 &&
                  budgetChartData.remainingBudget <= 0 ? (
                    <div className="py-12 text-center text-sm text-gray-500">
                      Définis des limites pour voir la répartition.
                    </div>
                  ) : (
                    <>
                      <div className="mt-6 w-full space-y-6">
                        <div className="w-full h-80">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={budgetChartData.data}
                              margin={{
                                top: 20,
                                right: 30,
                                left: 100,
                                bottom: 20,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#374151"
                              />
                              <XAxis
                                dataKey="name"
                                stroke="#9CA3AF"
                                style={{ fontSize: "12px" }}
                              />
                              <YAxis
                                stroke="#9CA3AF"
                                style={{ fontSize: "12px" }}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#1F2937",
                                  border: "1px solid #374151",
                                  borderRadius: "8px",
                                }}
                              />
                              <Legend
                                wrapperStyle={{
                                  fontSize: "12px",
                                  paddingTop: "20px",
                                }}
                                verticalAlign="bottom"
                              />
                              {budgetChartData.categories.map((item, index) => (
                                <Bar
                                  key={`bar-${index.toString()}`}
                                  dataKey={item.name}
                                  stackId="budget"
                                  fill={item.color}
                                  name={item.name}
                                  radius={
                                    index === 0
                                      ? [8, 0, 0, 8]
                                      : index ===
                                          budgetChartData.categories.length - 1
                                        ? [0, 8, 8, 0]
                                        : 0
                                  }
                                />
                              ))}
                              {budgetChartData.remainingBudget > 0 && (
                                <Bar
                                  dataKey="Budget non alloué"
                                  stackId="budget"
                                  fill="#6B7280"
                                  name="Budget non alloué"
                                  radius={[0, 8, 8, 0]}
                                />
                              )}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BudgetComparisonChart
                    data={budgetComparisonData}
                    month={activeMonthStart.toLocaleDateString("fr-FR", {
                      month: "long",
                      year: "numeric",
                    })}
                  />

                  <DailySpendingChart
                    data={dailySpendingData}
                    month={activeMonthStart.toLocaleDateString("fr-FR", {
                      month: "long",
                    })}
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                  className="bg-dark-card border border-dark-border rounded-xl p-6"
                >
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Progression par categorie
                    </h2>
                    <p className="text-xs text-gray-500">
                      Consulte rapidement toutes les categories.
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    {expenseCategories
                      .filter((category) => {
                        const limit =
                          budgetsByCategory[category.id]?.planned_amount ?? 0;
                        return limit > 0;
                      })
                      .map((category) => {
                        const spent =
                          activeMonthSpentByCategory[category.id] ?? 0;
                        const limit =
                          budgetsByCategory[category.id]?.planned_amount ?? 0;
                        const ratio =
                          limit > 0 ? Math.min(spent / limit, 1) : 0;
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

              {isRecurringOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className="w-full max-w-3xl bg-dark-card border border-dark-border rounded-2xl shadow-2xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between px-6 py-4 border-b border-dark-border bg-dark-elevated">
                      <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <RefreshCw className="w-5 h-5 text-emerald-500" />
                          Depenses recurrentes
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">
                          Les montants seront automatiquement reportes chaque
                          mois
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsRecurringOpen(false)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border text-gray-300 text-xs font-semibold hover:bg-dark-hover transition-colors"
                      >
                        <XIcon className="w-4 h-4" />
                        Fermer
                      </button>
                    </div>

                    <div className="p-6 max-h-[70vh] overflow-y-auto">
                      {actionError ? (
                        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                          {actionError}
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        {expenseCategories
                          .filter((category) => {
                            const hasLimit =
                              budgetsByCategory[category.id]?.planned_amount >
                              0;
                            return hasLimit;
                          })
                          .map((category) => {
                            const isRecurring = recurringBudgets.some(
                              (r) => r.category_id === category.id,
                            );
                            const currentAmount =
                              budgetsByCategory[category.id]?.planned_amount ??
                              0;

                            return (
                              <div
                                key={category.id}
                                className={`p-4 rounded-xl border transition-all ${
                                  isRecurring
                                    ? "bg-emerald-500/5 border-emerald-500/30"
                                    : "bg-dark-elevated border-dark-border"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-3">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleRecurring(category.id)
                                          }
                                          className={`w-12 h-6 rounded-full transition-colors relative ${
                                            isRecurring
                                              ? "bg-emerald-500"
                                              : "bg-gray-600"
                                          }`}
                                        >
                                          <div
                                            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-lg transition-transform ${
                                              isRecurring
                                                ? "translate-x-6"
                                                : "translate-x-0.5"
                                            }`}
                                          />
                                        </button>
                                        <div>
                                          <h4 className="text-sm font-semibold text-white">
                                            {category.name}
                                          </h4>
                                          {isRecurring ? (
                                            <p className="text-xs text-emerald-400 mt-0.5">
                                              Recurrence activee
                                            </p>
                                          ) : (
                                            <p className="text-xs text-gray-500 mt-0.5">
                                              Non recurrent
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                      {currentAmount > 0 ? (
                                        <div className="text-right">
                                          <p className="text-xs text-gray-400">
                                            Montant mensuel
                                          </p>
                                          <p className="text-base font-semibold text-white">
                                            {formatAmount(currentAmount)} €
                                          </p>
                                        </div>
                                      ) : (
                                        <div className="text-right">
                                          <p className="text-xs text-orange-400">
                                            Aucune limite definie
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>

                      {expenseCategories.length === 0 ? (
                        <div className="py-12 text-center text-sm text-gray-500">
                          Aucune categorie de depense disponible
                        </div>
                      ) : null}
                    </div>
                  </motion.div>
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
