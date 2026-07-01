import { motion } from "framer-motion";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  PencilIcon,
  PiggyBankIcon,
  RefreshCwIcon,
  SaveIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DailySpendingChart } from "../components/DailySpendingChart";
import { MobileSpendingPie } from "../components/MobileSpendingPie";
import { NotificationBell } from "../components/NotificationBell";
import { ProfileSheet, getInitials } from "../components/ProfileSheet";
import { Sidebar } from "../components/Sidebar";
import { supabase } from "../lib/supabaseClient";
import { nextAndAfterMonthKeys, toDateKey, toMonthKey } from "../lib/utils";
import type { Category } from "../transaction";

interface BudgetPageProps {
  onLogout: () => void;
  userId: string;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
  userProfile?: { firstName: string; lastName: string; email: string } | null;
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

interface SavingsBudgetItem {
  id: string;
  source_type: "goal" | "placement";
  source_id: string;
  month: string;
  planned_amount: number;
}

interface SimpleSavingsItem {
  id: string;
  name: string;
  emoji: string;
  badge?: string;
  sourceType: "goal" | "placement";
}

const pieColors = [
  "#4F7EFF", "#2B5CE8", "#7BA0FF", "#6190FF",
  "#1A45C4", "#3B6AE0", "#5C8AFF", "#8FB0FF",
];

const PLACEMENT_LABELS: Record<string, string> = {
  livret: "Livret", ldds: "LDDS", pel: "PEL",
  assurance_vie: "Ass. vie", pea: "PEA",
  actions: "Actions", crypto: "Crypto", autre: "Autre",
};

function fmt(v: number) {
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(v: number) {
  return v.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function getBarColorHex(ratio: number, isExact = false): string {
  if (isExact) return "#6366f1";
  if (ratio >= 0.9) return "#ef4444";
  if (ratio >= 0.7) return "#f59e0b";
  return "#10b981";
}

function getBarColor(ratio: number, isExact = false): string {
  if (isExact) return "bg-indigo-500";
  if (ratio >= 0.9) return "bg-red-500";
  if (ratio >= 0.7) return "bg-warning";
  return "bg-success";
}

function addMonthsToDate(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function formatMonthYear(d: Date): string {
  const label = d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

interface CategoryRowProps {
  cat: Category;
  budget?: BudgetRow;
  spent: number;
  isRecurring: boolean;
  isCurrentMonth: boolean;
  onSave: (catId: string, value: string) => Promise<void>;
  onToggleRecurring: (catId: string) => Promise<void>;
  isSavingId: string | null;
}

function CategoryRow({ cat, budget, spent, isRecurring, isCurrentMonth, onSave, onToggleRecurring, isSavingId }: CategoryRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(budget?.planned_amount?.toString() ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const limit = budget?.planned_amount ?? 0;
  const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0;
  const isOver = spent > limit && limit > 0;
  const isExact = limit > 0 && Math.abs(spent - limit) < 0.005;
  const isSaving = isSavingId === cat.id;

  function handleEdit() {
    setDraft(budget?.planned_amount?.toString() ?? "");
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  function handleCancel() {
    setDraft(budget?.planned_amount?.toString() ?? "");
    setIsEditing(false);
  }

  async function handleSave() {
    await onSave(cat.id, draft);
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") void handleSave();
    if (e.key === "Escape") handleCancel();
  }

  return (
    <div className={`group rounded-xl transition-all duration-150 ${isEditing ? "bg-accent/5 border border-accent/25 p-3" : "hover:bg-surface-elevated border border-transparent p-3"}`}>
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-sm font-medium text-fg truncate">{cat.name}</span>
            {!isEditing && limit > 0 && (
              <span className={`text-xs tabular-nums flex-shrink-0 ${isExact ? "text-indigo-400 font-semibold" : isOver ? "text-red-400 font-semibold" : "text-fg-subtle"}`}>
                {fmtShort(spent)} / {fmtShort(limit)} €
              </span>
            )}
          </div>
          {!isEditing && limit > 0 && (
            <div className="mt-1.5 h-1.5 rounded-full bg-surface border border-surface-border overflow-hidden">
              <div style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: getBarColorHex(ratio, isExact) }} className="h-full rounded-full transition-all duration-500" />
            </div>
          )}
          {!isEditing && limit === 0 && (
            <p className="text-[11px] text-fg-disabled mt-0.5">Aucune limite définie</p>
          )}
        </div>
        {!isEditing && (
          <button onClick={handleEdit} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-hover transition-all flex-shrink-0" aria-label="Modifier">
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {isEditing && (
        <div className="mt-2.5 space-y-2">
          <div className="flex items-center gap-2">
            <input ref={inputRef} type="number" min="0" step="0.01" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKeyDown} placeholder="Montant mensuel"
              className="flex-1 text-sm px-3 py-2 rounded-lg bg-surface border border-surface-border text-fg focus:border-accent/60 focus:ring-2 focus:ring-accent/20 outline-none" />
            <span className="text-xs text-fg-subtle flex-shrink-0">€</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => void handleSave()} disabled={isSaving || !draft}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent text-accent-fg text-xs font-semibold hover:bg-accent-light transition-colors disabled:opacity-50">
              {isSaving ? <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}
              Enregistrer
            </button>
            {budget && (
              <button onClick={handleCancel} className="p-2 rounded-lg border border-surface-border text-fg-subtle hover:text-fg hover:bg-surface-hover transition-colors">
                <XIcon className="w-4 h-4" />
              </button>
            )}
            {isCurrentMonth && budget && (
              <button onClick={() => void onToggleRecurring(cat.id)}
                title={isRecurring ? "Désactiver la récurrence" : "Activer la récurrence mensuelle"}
                className={`p-2 rounded-lg border transition-colors ${isRecurring ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-400" : "border-surface-border text-fg-subtle hover:text-fg hover:bg-surface-hover"}`}>
                <RefreshCwIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SavingsRowProps {
  item: SimpleSavingsItem;
  planned: number;
  onSave: (sourceType: "goal" | "placement", sourceId: string, value: string) => Promise<void>;
  isSavingKey: string | null;
}

function SavingsRow({ item, planned, onSave, isSavingKey }: SavingsRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(planned > 0 ? String(planned) : "");
  const inputRef = useRef<HTMLInputElement>(null);
  const rowKey = `${item.sourceType}-${item.id}`;
  const isSaving = isSavingKey === rowKey;

  function handleEdit() {
    setDraft(planned > 0 ? String(planned) : "");
    setIsEditing(true);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function handleSave() {
    await onSave(item.sourceType, item.id, draft);
    setIsEditing(false);
  }

  return (
    <div className={`group rounded-xl transition-all duration-150 ${isEditing ? "bg-accent/5 border border-accent/25 p-3" : "hover:bg-surface-elevated border border-transparent p-3"}`}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-lg flex-shrink-0 select-none">{item.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium text-fg truncate">{item.name}</span>
              {item.badge && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-elevated border border-surface-border text-fg-subtle flex-shrink-0">{item.badge}</span>
              )}
            </div>
            {!isEditing && (
              <span className={`text-xs tabular-nums flex-shrink-0 font-medium ${planned > 0 ? "text-accent" : "text-fg-disabled"}`}>
                {planned > 0 ? `${fmtShort(planned)} €` : "—"}
              </span>
            )}
          </div>
        </div>
        {!isEditing && (
          <button onClick={handleEdit} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-hover transition-all flex-shrink-0">
            <PencilIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {isEditing && (
        <div className="mt-2.5 flex items-center gap-2">
          <input ref={inputRef} type="number" min="0" step="0.01" value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void handleSave(); if (e.key === "Escape") setIsEditing(false); }}
            placeholder="Montant mensuel"
            className="flex-1 text-sm px-3 py-2 rounded-lg bg-surface border border-surface-border text-fg focus:border-accent/60 focus:ring-2 focus:ring-accent/20 outline-none" />
          <span className="text-xs text-fg-subtle">€</span>
          <button onClick={() => void handleSave()} disabled={isSaving}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-accent text-accent-fg text-xs font-semibold hover:bg-accent-light transition-colors disabled:opacity-50">
            {isSaving ? <RefreshCwIcon className="w-3.5 h-3.5 animate-spin" /> : <SaveIcon className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setIsEditing(false)} className="p-2 rounded-lg border border-surface-border text-fg-subtle hover:text-fg hover:bg-surface-hover transition-colors">
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export function BudgetPage({ onLogout, userId, activeItem, onNavigate, userProfile }: BudgetPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [transactions, setTransactions] = useState<BudgetTransaction[]>([]);
  const [recurringBudgets, setRecurringBudgets] = useState<RecurringBudget[]>([]);
  const [savingsItems, setSavingsItems] = useState<SimpleSavingsItem[]>([]);
  const [savingsBudgetItems, setSavingsBudgetItems] = useState<SavingsBudgetItem[]>([]);
  const [showProfile, setShowProfile] = useState(false);
  const [activeMonthStart, setActiveMonthStart] = useState(() => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savingSavingsId, setSavingSavingsId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const activeMonthKey = useMemo(() => toMonthKey(activeMonthStart), [activeMonthStart]);

  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    return activeMonthStart.getFullYear() === now.getFullYear() && activeMonthStart.getMonth() === now.getMonth();
  }, [activeMonthStart]);

  useEffect(() => {
    let mounted = true;

    async function loadAll() {
      const [{ data: cats }, { data: buds }, { data: txs }, { data: recs }, { data: goals }, { data: placements }, { data: savBudgets }] = await Promise.all([
        supabase.from("categories").select("id, name, type").eq("user_id", userId).order("name"),
        supabase.from("budgets").select("id, category_id, month, planned_amount").eq("user_id", userId).eq("month", activeMonthKey),
        supabase.from("transactions").select("amount, type, date, category_id").eq("user_id", userId).lte("date", toDateKey(new Date())).order("date", { ascending: false }),
        supabase.from("recurring_budgets").select("id, category_id, amount").eq("user_id", userId),
        supabase.from("savings_goals").select("id, name, emoji").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("savings_placements").select("id, name, emoji, type").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("savings_budget_items").select("*").eq("user_id", userId).eq("month", activeMonthKey),
      ]);

      if (!mounted) return;
      if (cats) setCategories(cats as Category[]);
      if (buds) setBudgets(buds as BudgetRow[]);
      if (txs) setTransactions(txs.map((r) => ({ category_id: r.category_id as string, amount: Number(r.amount ?? 0), type: r.type as "income" | "expense", date: r.date as string })));

      const merged: SimpleSavingsItem[] = [
        ...((goals ?? []) as { id: string; name: string; emoji: string }[]).map(g => ({ id: g.id, name: g.name, emoji: g.emoji, sourceType: "goal" as const })),
        ...((placements ?? []) as { id: string; name: string; emoji: string; type: string }[]).map(p => ({ id: p.id, name: p.name, emoji: p.emoji, badge: PLACEMENT_LABELS[p.type] ?? p.type, sourceType: "placement" as const })),
      ];
      setSavingsItems(merged);
      if (savBudgets) setSavingsBudgetItems(savBudgets as SavingsBudgetItem[]);

      if (recs) {
        setRecurringBudgets(recs as RecurringBudget[]);
        if (isCurrentMonth && recs.length > 0) {
          const { nextKey } = nextAndAfterMonthKeys(new Date());
          const rows = (recs as RecurringBudget[]).map((r) => ({
            user_id: userId,
            category_id: r.category_id,
            month: nextKey,
            planned_amount: r.amount,
          }));
          await supabase.from("budgets").upsert(rows, { onConflict: "user_id,category_id,month", ignoreDuplicates: true });
        }
      }
    }

    void loadAll();
    return () => { mounted = false; };
  }, [userId, activeMonthKey, isCurrentMonth]);

  const expenseCategories = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);

  const budgetsByCategory = useMemo(() => {
    return budgets.filter((b) => b.month === activeMonthKey).reduce((acc, b) => { acc[b.category_id] = b; return acc; }, {} as Record<string, BudgetRow>);
  }, [budgets, activeMonthKey]);

  const activeMonthTx = useMemo(() => {
    return transactions.filter((tx) => {
      const d = new Date(tx.date);
      return d.getFullYear() === activeMonthStart.getFullYear() && d.getMonth() === activeMonthStart.getMonth();
    });
  }, [transactions, activeMonthStart]);

  const lastThreeMonthKeys = useMemo(() => {
    const keys: string[] = [];
    for (let i = 1; i <= 3; i++) keys.push(toMonthKey(new Date(activeMonthStart.getFullYear(), activeMonthStart.getMonth() - i, 1)));
    return keys;
  }, [activeMonthStart]);

  const activeMonthIncome = useMemo(() => activeMonthTx.filter((tx) => tx.type === "income").reduce((s, tx) => s + Math.abs(tx.amount), 0), [activeMonthTx]);

  const spentByCategory = useMemo(() => {
    return activeMonthTx.reduce((acc, tx) => {
      if (tx.type !== "expense") return acc;
      acc[tx.category_id] = (acc[tx.category_id] ?? 0) + Math.abs(tx.amount);
      return acc;
    }, {} as Record<string, number>);
  }, [activeMonthTx]);

  const avgThreeMonths = useMemo(() => {
    const totals: Record<string, number> = {};
    const monthsByCat: Record<string, Set<string>> = {};
    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      const key = toMonthKey(new Date(tx.date));
      if (!lastThreeMonthKeys.includes(key)) return;
      totals[tx.category_id] = (totals[tx.category_id] ?? 0) + Math.abs(tx.amount);
      if (!monthsByCat[tx.category_id]) monthsByCat[tx.category_id] = new Set();
      monthsByCat[tx.category_id].add(key);
    });
    return Object.entries(totals).reduce((acc, [id, total]) => {
      const count = monthsByCat[id]?.size ?? 0;
      if (count > 0) acc[id] = total / count;
      return acc;
    }, {} as Record<string, number>);
  }, [transactions, lastThreeMonthKeys]);

  const savingsBudgetByKey = useMemo(() => {
    return savingsBudgetItems.reduce((acc, item) => {
      acc[`${item.source_type}-${item.source_id}`] = item;
      return acc;
    }, {} as Record<string, SavingsBudgetItem>);
  }, [savingsBudgetItems]);

  const totalAllocated = useMemo(() => expenseCategories.reduce((s, c) => s + (budgetsByCategory[c.id]?.planned_amount ?? 0), 0), [expenseCategories, budgetsByCategory]);
  const totalSpent = useMemo(() => expenseCategories.reduce((s, c) => s + (spentByCategory[c.id] ?? 0), 0), [expenseCategories, spentByCategory]);
  const totalSavingsPlanned = useMemo(() => savingsBudgetItems.reduce((s, i) => s + i.planned_amount, 0), [savingsBudgetItems]);
  const totalEngaged = totalAllocated + totalSavingsPlanned;
  const reste = activeMonthIncome - totalEngaged;
  const usageRatio = totalAllocated > 0 ? Math.min(totalSpent / totalAllocated, 1) : 0;

  const dailySpendingData = useMemo(() => {
    const totals: Record<string, number> = {};
    const end = new Date(activeMonthStart.getFullYear(), activeMonthStart.getMonth() + 1, 0);
    for (let d = 1; d <= end.getDate(); d++) totals[String(d)] = 0;
    transactions.forEach((tx) => {
      if (tx.type !== "expense") return;
      const d = new Date(tx.date);
      if (d.getFullYear() !== activeMonthStart.getFullYear() || d.getMonth() !== activeMonthStart.getMonth()) return;
      totals[d.getDate().toString()] = (totals[d.getDate().toString()] ?? 0) + Math.abs(tx.amount);
    });
    return Object.entries(totals).map(([day, spent]) => ({ day, spent }));
  }, [transactions, activeMonthStart]);

  const pieData = useMemo(() => {
    return expenseCategories
      .filter((c) => (spentByCategory[c.id] ?? 0) > 0)
      .map((c, i) => ({ name: c.name, value: spentByCategory[c.id] ?? 0, color: pieColors[i % pieColors.length] }))
      .sort((a, b) => b.value - a.value);
  }, [expenseCategories, spentByCategory]);

  const categoriesWithBudget = expenseCategories.filter((c) => (budgetsByCategory[c.id]?.planned_amount ?? 0) > 0);

  async function handleSaveBudget(catId: string, rawValue: string) {
    setError("");
    const amount = Number(rawValue);
    if (!rawValue || isNaN(amount) || amount <= 0 || amount > 1_000_000) { setError("Montant invalide (entre 0 et 1 000 000 €)."); return; }
    setSavingId(catId);
    const existing = budgetsByCategory[catId];
    if (existing) {
      const { data, error: err } = await supabase.from("budgets").update({ planned_amount: amount }).eq("id", existing.id).eq("user_id", userId).select("id, category_id, month, planned_amount").single();
      if (err) { setError("Impossible de mettre à jour ce budget."); } else { setBudgets((p) => p.map((b) => b.id === existing.id ? (data as BudgetRow) : b)); }
    } else {
      const { data, error: err } = await supabase.from("budgets").insert({ user_id: userId, category_id: catId, month: activeMonthKey, planned_amount: amount }).select("id, category_id, month, planned_amount").single();
      if (err) { setError("Impossible d'ajouter ce budget."); } else if (data) { setBudgets((p) => [...p, data as BudgetRow]); }
    }
    setSavingId(null);
  }

  async function handleSaveSavingsBudget(sourceType: "goal" | "placement", sourceId: string, rawValue: string) {
    setError("");
    const amount = Number(rawValue);
    if (isNaN(amount) || amount < 0) { setError("Montant invalide."); return; }
    const key = `${sourceType}-${sourceId}`;
    setSavingSavingsId(key);
    const existing = savingsBudgetByKey[key];
    try {
      if (!rawValue || amount === 0) {
        if (existing) {
          const { error: deleteErr } = await supabase.from("savings_budget_items").delete().eq("id", existing.id);
          if (!deleteErr) setSavingsBudgetItems(prev => prev.filter(i => i.id !== existing.id));
        }
      } else if (existing) {
        const { data, error: err } = await supabase.from("savings_budget_items").update({ planned_amount: amount }).eq("id", existing.id).select("*").single();
        if (err) setError("Impossible de mettre à jour.");
        else if (data) setSavingsBudgetItems(prev => prev.map(i => i.id === existing.id ? data as SavingsBudgetItem : i));
      } else {
        const { data, error: err } = await supabase.from("savings_budget_items").insert({ user_id: userId, month: activeMonthKey, source_type: sourceType, source_id: sourceId, planned_amount: amount }).select("*").single();
        if (err) setError("Impossible d'ajouter.");
        else if (data) setSavingsBudgetItems(prev => [...prev, data as SavingsBudgetItem]);
      }
    } finally {
      setSavingSavingsId(null);
    }
  }

  async function handleToggleRecurring(catId: string) {
    setError("");
    if (!isCurrentMonth) { setError("La récurrence ne peut être modifiée que pour le mois en cours."); return; }
    const existing = recurringBudgets.find((r) => r.category_id === catId);
    if (existing) {
      const { error: err } = await supabase.from("recurring_budgets").delete().eq("id", existing.id);
      if (err) { setError("Erreur lors de la suppression."); return; }
      const { nextKey } = nextAndAfterMonthKeys(new Date());
      await supabase.from("budgets").delete().eq("user_id", userId).eq("category_id", catId).eq("month", nextKey);
      setRecurringBudgets((p) => p.filter((r) => r.id !== existing.id));
    } else {
      const bud = budgetsByCategory[catId];
      if (!bud) { setError("Définis d'abord une limite pour cette catégorie."); return; }
      const { data, error: err } = await supabase.from("recurring_budgets").insert({ user_id: userId, category_id: catId, amount: bud.planned_amount }).select("id, category_id, amount").single();
      if (err) { setError("Erreur lors de l'activation."); return; }
      if (data) {
        setRecurringBudgets((p) => [...p, data as RecurringBudget]);
        const { nextKey } = nextAndAfterMonthKeys(new Date());
        await supabase.from("budgets").upsert(
          { user_id: userId, category_id: catId, month: nextKey, planned_amount: bud.planned_amount },
          { onConflict: "user_id,category_id,month", ignoreDuplicates: true },
        );
      }
    }
  }

  return (
    <div className="min-h-screen w-full bg-surface">
      <Sidebar onLogout={onLogout} activeItem={activeItem} onNavigate={onNavigate} userProfile={userProfile ?? null} />

      <main className="lg:ml-[var(--sidebar-width)] transition-all duration-200 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 glass border-b border-surface-border flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-3.5 lg:px-8 lg:py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfile(true)}
                className="lg:hidden w-9 h-9 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-xs font-bold text-accent hover:bg-accent/15 transition-colors flex-shrink-0"
                aria-label="Mon profil"
              >
                {getInitials(userProfile ?? null)}
              </button>
              <h1 className="text-sm lg:text-base font-semibold text-fg">Budget</h1>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setActiveMonthStart((d) => addMonthsToDate(d, -1))} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors" aria-label="Mois précédent">
                <ArrowLeftIcon className="w-4 h-4" />
              </button>
              <span className="text-xs font-medium text-fg min-w-[110px] text-center">{formatMonthYear(activeMonthStart)}</span>
              <button onClick={() => setActiveMonthStart((d) => addMonthsToDate(d, 1))} className="w-8 h-8 flex items-center justify-center rounded-lg text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors" aria-label="Mois suivant">
                <ArrowRightIcon className="w-4 h-4" />
              </button>
              <NotificationBell userId={userId} />
            </div>
          </div>
        </header>

        {error && (
          <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")}><XIcon className="w-4 h-4" /></button>
          </div>
        )}

        {/* ── Mobile layout ── */}
        <div className="lg:hidden flex-1 px-4 py-5 space-y-4 pb-8">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-fg-subtle">Revenus</p>
                <p className="text-lg font-bold text-emerald-400 tabular-nums">{fmtShort(activeMonthIncome)} €</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-fg-subtle">Dépenses</p>
                <p className="text-lg font-bold text-red-400 tabular-nums">{fmtShort(totalSpent)} €</p>
              </div>
            </div>
            {totalSavingsPlanned > 0 && (
              <div className="flex items-center justify-between rounded-xl bg-accent/8 border border-accent/20 px-3 py-2.5">
                <div className="flex items-center gap-1.5">
                  <PiggyBankIcon className="w-3.5 h-3.5 text-accent" />
                  <p className="text-xs text-fg-subtle">Épargne prévue</p>
                </div>
                <p className="text-sm font-bold text-accent tabular-nums">{fmtShort(totalSavingsPlanned)} €</p>
              </div>
            )}
            {totalAllocated > 0 && (
              <div>
                <div className="flex items-center justify-between text-[11px] text-fg-subtle mb-1.5">
                  <span>Budget alloué: {fmtShort(totalAllocated)} €</span>
                  <span className={usageRatio >= 0.9 ? "text-red-400" : usageRatio >= 0.7 ? "text-warning" : "text-success"}>{Math.round(usageRatio * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface border border-surface-border overflow-hidden">
                  <motion.div initial={{ width: "0%" }} animate={{ width: `${Math.round(usageRatio * 100)}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className={`h-full rounded-full ${getBarColor(usageRatio)}`} />
                </div>
                {activeMonthIncome > 0 && (
                  <p className={`text-[11px] mt-1.5 ${reste >= 0 ? "text-success" : "text-red-400"}`}>
                    Reste disponible : {fmtShort(reste)} €
                  </p>
                )}
              </div>
            )}
          </div>

          <MobileSpendingPie data={pieData} total={totalSpent} />

          <div className="rounded-2xl border border-surface-border bg-surface-card overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-border">
              <p className="text-sm font-semibold text-fg">Progression par catégorie</p>
            </div>
            <div className="divide-y divide-surface-border/60">
              {categoriesWithBudget.map((cat) => {
                const spent = spentByCategory[cat.id] ?? 0;
                const limit = budgetsByCategory[cat.id]?.planned_amount ?? 0;
                const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0;
                const isOver = spent > limit;
                const isExact = limit > 0 && Math.abs(spent - limit) < 0.005;
                return (
                  <div key={cat.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-fg">{cat.name}</span>
                      <span className={`text-xs tabular-nums ${isExact ? "text-indigo-400 font-semibold" : isOver ? "text-red-400 font-semibold" : "text-fg-subtle"}`}>
                        {fmtShort(spent)} / {fmtShort(limit)} €
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-surface border border-surface-border overflow-hidden">
                      <div style={{ width: `${Math.round(ratio * 100)}%`, backgroundColor: getBarColorHex(ratio, isExact) }} className="h-full rounded-full transition-all duration-500" />
                    </div>
                  </div>
                );
              })}
              {categoriesWithBudget.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-fg-subtle">Aucune limite définie. Configurez vos budgets sur ordinateur.</div>
              )}
            </div>
          </div>

          {savingsItems.length > 0 && (
            <div className="rounded-2xl border border-surface-border bg-surface-card overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-border flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <PiggyBankIcon className="w-4 h-4 text-accent" />
                  <p className="text-sm font-semibold text-fg">Épargne prévue</p>
                </div>
                {totalSavingsPlanned > 0 && <span className="text-xs font-semibold text-accent tabular-nums">{fmtShort(totalSavingsPlanned)} €</span>}
              </div>
              <div className="divide-y divide-surface-border/60">
                {savingsItems.map(item => {
                  const key = `${item.sourceType}-${item.id}`;
                  const planned = savingsBudgetByKey[key]?.planned_amount ?? 0;
                  return (
                    <div key={key} className="px-4 py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg">{item.emoji}</span>
                        <span className="text-sm text-fg truncate">{item.name}</span>
                        {item.badge && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-surface-elevated border border-surface-border text-fg-subtle flex-shrink-0">{item.badge}</span>}
                      </div>
                      <span className={`text-sm font-medium tabular-nums flex-shrink-0 ${planned > 0 ? "text-accent" : "text-fg-disabled"}`}>
                        {planned > 0 ? `${fmtShort(planned)} €` : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Desktop layout ── */}
        <div className="hidden lg:flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
          {/* Left panel */}
          <aside className="w-80 xl:w-96 flex-shrink-0 border-r border-surface-border overflow-y-auto flex flex-col">
            {/* Summary */}
            <div className="p-5 border-b border-surface-border space-y-4 flex-shrink-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-emerald-500/8 border border-emerald-500/20 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-fg-subtle mb-1">Revenus</p>
                  <p className="text-base font-bold text-emerald-400 tabular-nums">{fmtShort(activeMonthIncome)} €</p>
                </div>
                <div className="rounded-xl bg-red-500/8 border border-red-500/20 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-fg-subtle mb-1">Dépenses</p>
                  <p className="text-base font-bold text-red-400 tabular-nums">{fmtShort(totalSpent)} €</p>
                </div>
              </div>

              {totalSavingsPlanned > 0 && (
                <div className="rounded-xl bg-accent/8 border border-accent/20 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <PiggyBankIcon className="w-3.5 h-3.5 text-accent" />
                    <p className="text-[10px] uppercase tracking-widest text-fg-subtle">Épargne prévue</p>
                  </div>
                  <p className="text-base font-bold text-accent tabular-nums">{fmtShort(totalSavingsPlanned)} €</p>
                </div>
              )}

              {totalAllocated > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs text-fg-subtle mb-2">
                    <span>Budget alloué: {fmtShort(totalAllocated)} €</span>
                    <span className={`font-medium ${usageRatio >= 0.9 ? "text-red-400" : usageRatio >= 0.7 ? "text-warning" : "text-success"}`}>
                      {Math.round(usageRatio * 100)}% utilisé
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface border border-surface-border overflow-hidden">
                    <motion.div initial={{ width: "0%" }} animate={{ width: `${Math.round(usageRatio * 100)}%` }} transition={{ duration: 0.6, ease: "easeOut" }} className={`h-full rounded-full ${getBarColor(usageRatio)}`} />
                  </div>

                  {totalEngaged > activeMonthIncome && activeMonthIncome > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-warning">
                      <TrendingDownIcon className="w-3.5 h-3.5" />
                      <span>Budget total supérieur aux revenus</span>
                    </div>
                  )}
                  {totalEngaged <= activeMonthIncome && activeMonthIncome > 0 && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-success">
                      <TrendingUpIcon className="w-3.5 h-3.5" />
                      <span>Reste disponible : {fmtShort(reste)} €</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Expense categories */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Limites par catégorie</p>
                {isCurrentMonth && (
                  <span className="text-[10px] text-fg-disabled">
                    <RefreshCwIcon className="w-2.5 h-2.5 inline mr-1 text-emerald-400" />Récurrence active
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {expenseCategories.map((cat) => {
                  const isRecurring = recurringBudgets.some((r) => r.category_id === cat.id);
                  return (
                    <CategoryRow key={cat.id} cat={cat} budget={budgetsByCategory[cat.id]} spent={spentByCategory[cat.id] ?? 0}
                      isRecurring={isRecurring} isCurrentMonth={isCurrentMonth} onSave={handleSaveBudget}
                      onToggleRecurring={handleToggleRecurring} isSavingId={savingId} />
                  );
                })}
              </div>
              {isCurrentMonth && (
                <div className="mt-4 pt-4 border-t border-surface-border">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-surface-elevated border border-surface-border text-xs text-fg-subtle">
                    <RefreshCwIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-emerald-400" />
                    <span>Activez la récurrence via l'icône <RefreshCwIcon className="w-3 h-3 inline" /> lors de l'édition pour reporter automatiquement ce budget le mois prochain.</span>
                  </div>
                </div>
              )}

              {/* ── Savings section ── */}
              <div className="mt-4 pt-4 border-t border-surface-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1.5">
                    <PiggyBankIcon className="w-3.5 h-3.5 text-accent" />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-subtle">Épargne planifiée</p>
                  </div>
                  {totalSavingsPlanned > 0 && (
                    <span className="text-[11px] font-semibold text-accent tabular-nums">{fmtShort(totalSavingsPlanned)} €</span>
                  )}
                </div>

                {savingsItems.length === 0 ? (
                  <button
                    onClick={() => onNavigate?.("savings")}
                    className="w-full text-left p-3 rounded-xl bg-surface-elevated border border-dashed border-surface-border text-xs text-fg-subtle hover:border-accent/40 hover:text-accent/80 transition-colors"
                  >
                    <PiggyBankIcon className="w-3.5 h-3.5 inline mr-1.5" />
                    Créer des objectifs ou placements dans la page Épargne
                  </button>
                ) : (
                  <div className="space-y-1">
                    {savingsItems.map(item => (
                      <SavingsRow
                        key={`${item.sourceType}-${item.id}`}
                        item={item}
                        planned={savingsBudgetByKey[`${item.sourceType}-${item.id}`]?.planned_amount ?? 0}
                        onSave={handleSaveSavingsBudget}
                        isSavingKey={savingSavingsId}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Right panel */}
          <div className="flex-1 overflow-y-auto p-6 xl:p-8">
            {activeMonthIncome === 0 && totalAllocated === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-xs">
                  <div className="w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                    <CheckIcon className="w-6 h-6 text-accent" />
                  </div>
                  <p className="text-sm font-medium text-fg mb-1">Aucune donnée pour ce mois</p>
                  <p className="text-xs text-fg-subtle">Ajoutez des transactions ou définissez vos limites dans le panneau de gauche.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Répartition du budget (épargne incluse) */}
                {(totalAllocated > 0 || totalSavingsPlanned > 0) && activeMonthIncome > 0 && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                    className="rounded-2xl border border-surface-border bg-surface-card p-5">
                    <h2 className="text-sm font-semibold text-fg mb-1">Répartition du budget</h2>
                    <p className="text-xs text-fg-subtle mb-4">Revenus alloués ce mois</p>
                    <div className="space-y-3">
                      {totalAllocated > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-fg-secondary">Dépenses prévues</span>
                            <span className="tabular-nums text-fg-subtle">{fmt(totalAllocated)} € · {activeMonthIncome > 0 ? Math.round((totalAllocated / activeMonthIncome) * 100) : 0}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface border border-surface-border overflow-hidden">
                            <motion.div initial={{ width: "0%" }} animate={{ width: `${Math.min((totalAllocated / activeMonthIncome) * 100, 100)}%` }}
                              transition={{ duration: 0.6, ease: "easeOut" }} className="h-full rounded-full bg-red-400" />
                          </div>
                        </div>
                      )}
                      {totalSavingsPlanned > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-fg-secondary flex items-center gap-1"><PiggyBankIcon className="w-3 h-3" />Épargne prévue</span>
                            <span className="tabular-nums text-fg-subtle">{fmt(totalSavingsPlanned)} € · {activeMonthIncome > 0 ? Math.round((totalSavingsPlanned / activeMonthIncome) * 100) : 0}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface border border-surface-border overflow-hidden">
                            <motion.div initial={{ width: "0%" }} animate={{ width: `${Math.min((totalSavingsPlanned / activeMonthIncome) * 100, 100)}%` }}
                              transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }} className="h-full rounded-full bg-accent" />
                          </div>
                        </div>
                      )}
                      {reste > 0 && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-fg-secondary">Reste disponible</span>
                            <span className="tabular-nums text-success font-medium">{fmt(reste)} €</span>
                          </div>
                          <div className="h-2 rounded-full bg-surface border border-surface-border overflow-hidden">
                            <motion.div initial={{ width: "0%" }} animate={{ width: `${Math.min((reste / activeMonthIncome) * 100, 100)}%` }}
                              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }} className="h-full rounded-full bg-emerald-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Progression par catégorie */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="rounded-2xl border border-surface-border bg-surface-card p-5">
                  <h2 className="text-sm font-semibold text-fg mb-1">Progression par catégorie</h2>
                  <p className="text-xs text-fg-subtle mb-5">Dépenses vs limites ce mois</p>
                  {categoriesWithBudget.length === 0 ? (
                    <p className="text-sm text-fg-subtle text-center py-6">Définissez des limites dans le panneau gauche.</p>
                  ) : (
                    <div className="space-y-4">
                      {categoriesWithBudget.map((cat, idx) => {
                        const spent = spentByCategory[cat.id] ?? 0;
                        const limit = budgetsByCategory[cat.id]?.planned_amount ?? 0;
                        const ratio = limit > 0 ? Math.min(spent / limit, 1) : 0;
                        const isOver = spent > limit;
                        const isExact = limit > 0 && Math.abs(spent - limit) < 0.005;
                        const avgS = avgThreeMonths[cat.id] ?? 0;
                        return (
                          <motion.div key={cat.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * idx }}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                              <span className="font-medium text-fg-secondary">{cat.name}</span>
                              <span className={isExact ? "text-indigo-400 font-semibold" : isOver ? "text-red-400 font-semibold" : "text-fg-subtle"}>
                                {fmt(spent)} / {fmt(limit)} €<span className="ml-1 opacity-60">{Math.round(ratio * 100)}%</span>
                              </span>
                            </div>
                            <div className="h-2 rounded-full bg-surface border border-surface-border overflow-hidden">
                              <motion.div initial={{ width: "0%" }} animate={{ width: `${Math.round(ratio * 100)}%` }} transition={{ duration: 0.6, ease: "easeOut", delay: 0.06 * idx }} style={{ backgroundColor: getBarColorHex(ratio, isExact) }} className="h-full rounded-full" />
                            </div>
                            {avgS > 0 && <p className="text-[10px] text-fg-subtle mt-1">Moy. 3 derniers mois : {fmt(avgS)} €</p>}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>

                {/* Daily chart */}
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }} className="rounded-2xl border border-surface-border bg-surface-card p-5">
                  <div className="mb-4">
                    <h2 className="text-sm font-semibold text-fg">Dépenses jour par jour</h2>
                    <p className="text-xs text-fg-subtle mt-0.5">{activeMonthStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</p>
                  </div>
                  <DailySpendingChart data={dailySpendingData} />
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </main>
      <ProfileSheet isOpen={showProfile} onClose={() => setShowProfile(false)} userProfile={userProfile ?? null} onNavigate={p => { setShowProfile(false); onNavigate?.(p); }} onLogout={onLogout} />
    </div>
  );
}
