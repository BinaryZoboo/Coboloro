import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarIcon,
  CheckCircle2Icon,
  PencilIcon,
  PiggyBankIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
  TrendingDownIcon,
  TrendingUpIcon,
  XIcon,
} from "lucide-react";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { NotificationBell } from "../components/NotificationBell";
import { ProfileSheet, getInitials } from "../components/ProfileSheet";
import { Sidebar } from "../components/Sidebar";
import { supabase } from "../lib/supabaseClient";

interface SavingsPageProps {
  onLogout: () => void;
  userId: string;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
  userProfile?: { firstName: string; lastName: string; email: string } | null;
}

interface SavingsGoal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  emoji: string;
  color: string;
  created_at: string;
}

type PlacementType = "livret" | "assurance_vie" | "pea" | "ldds" | "pel" | "crypto" | "actions" | "autre";

interface SavingsPlacement {
  id: string;
  name: string;
  institution: string | null;
  type: PlacementType;
  current_value: number;
  initial_deposit: number;
  annual_rate: number | null;
  emoji: string;
  color: string;
  created_at: string;
}

interface GoalFormState {
  name: string; target_amount: string; current_amount: string;
  target_date: string; emoji: string; color: string;
}

interface PlacementFormState {
  name: string; institution: string; type: PlacementType;
  current_value: string; initial_deposit: string; annual_rate: string;
  emoji: string; color: string;
}

const EMOJIS = ["🎯","🏠","🚗","✈️","💒","🎓","💻","🏖️","🎮","💰","🛡️","💍","🐾","🏋️","📱","🌍","🎸","🎬","🌿","⛵","🏦","📈","📊","🪙","💼","🌟","🎵","🧳","🍀","🔑"];
const COLORS = ["#4F7EFF","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316","#EC4899"];
const PLACEMENT_TYPE_COLORS: Record<string, string> = {
  livret: "#4F7EFF", assurance_vie: "#F5C188", pea: "#2DB87A",
  ldds: "#06B6D4", pel: "#8B5CF6", crypto: "#F97316",
  actions: "#EC4899", autre: "#9D9890",
};
const PLACEMENT_TYPES: { value: PlacementType; label: string }[] = [
  { value: "livret",        label: "Livret" },
  { value: "ldds",          label: "LDDS" },
  { value: "pel",           label: "PEL" },
  { value: "assurance_vie", label: "Assurance-vie" },
  { value: "pea",           label: "PEA" },
  { value: "actions",       label: "Actions" },
  { value: "crypto",        label: "Crypto" },
  { value: "autre",         label: "Autre" },
];

const DEFAULT_GOAL_FORM: GoalFormState = {
  name: "", target_amount: "", current_amount: "0", target_date: "", emoji: "🎯", color: "#4F7EFF",
};
const DEFAULT_PLACEMENT_FORM: PlacementFormState = {
  name: "", institution: "", type: "livret", current_value: "",
  initial_deposit: "0", annual_rate: "", emoji: "🏦", color: "#4F7EFF",
};

const inputCls = "w-full h-11 bg-surface-elevated border border-surface-border rounded-xl px-4 text-fg text-sm placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors";
const MODAL_SPRING = { type: "spring", stiffness: 320, damping: 30 } as const;
const BACKDROP_CLS = "fixed inset-0 bg-black/60 backdrop-blur-sm z-50";
const MODAL_WRAP_CLS = "fixed inset-0 z-50 flex items-center justify-center p-4";

function fmt(v: number) {
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function daysLeft(s: string | null) {
  if (!s) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(s).getTime() - t.getTime()) / 86_400_000);
}

function DaysChip({ days }: { days: number | null }) {
  if (days === null) return null;
  const label = days > 0 ? `${days} j` : days === 0 ? "Aujourd'hui" : "Dépassé";
  const cls = days <= 0 ? "text-red-400 bg-red-500/10" : days <= 30 ? "text-warning bg-warning/10" : "text-fg-subtle bg-surface-elevated";
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function GoalsSummaryCard({ goals }: { goals: SavingsGoal[] }) {
  const total    = goals.reduce((s, g) => s + g.current_amount, 0);
  const totalTgt = goals.reduce((s, g) => s + g.target_amount, 0);
  const pct      = totalTgt > 0 ? Math.min((total / totalTgt) * 100, 100) : 0;
  const r = 36; const circ = 2 * Math.PI * r;
  const active    = goals.filter(g => g.current_amount < g.target_amount || g.target_amount === 0).length;
  const completed = goals.filter(g => g.current_amount >= g.target_amount && g.target_amount > 0).length;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-surface-border bg-surface-card p-4 mb-2">
      <div className="flex items-center gap-5">
        <svg width="88" height="88" viewBox="0 0 88 88" className="flex-shrink-0">
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-surface-elevated)" strokeWidth="10" />
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-accent)" strokeWidth="10"
            strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round" transform="rotate(-90 44 44)" />
          <text x="44" y="40" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--color-fg)">{Math.round(pct)}%</text>
          <text x="44" y="55" textAnchor="middle" fontSize="9" fill="var(--color-fg-subtle)">progression</text>
        </svg>
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div>
            <p className="text-2xl font-bold text-accent tabular-nums">{fmt(total)} €</p>
            <p className="text-xs text-fg-subtle mt-0.5">épargné sur {fmt(totalTgt)} €</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-surface-elevated px-3 py-2">
              <p className="text-base font-bold text-blue-400 tabular-nums">{active}</p>
              <p className="text-[10px] text-fg-subtle">en cours</p>
            </div>
            <div className="rounded-xl bg-surface-elevated px-3 py-2">
              <p className="text-base font-bold text-emerald-400 tabular-nums">{completed}</p>
              <p className="text-[10px] text-fg-subtle">complétés</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function PlacementsSummaryCard({ placements }: { placements: SavingsPlacement[] }) {
  const groups = PLACEMENT_TYPES
    .map(t => ({
      value: t.value, label: t.label,
      color: PLACEMENT_TYPE_COLORS[t.value] ?? "#9D9890",
      total: placements.filter(p => p.type === t.value).reduce((s, p) => s + p.current_value, 0),
    }))
    .filter(g => g.total > 0);

  const grandTotal = groups.reduce((s, g) => s + g.total, 0);
  const totalGain  = placements.reduce((s, p) => s + (p.current_value - p.initial_deposit), 0);
  if (groups.length === 0) return null;

  const r = 32; const circ = 2 * Math.PI * r;
  let cumPct = 0;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-surface-border bg-surface-card p-4 mb-2">
      <p className="text-xs font-semibold text-fg-subtle uppercase tracking-wider mb-3">Répartition</p>
      <div className="flex items-center gap-5">
        <svg width="84" height="84" viewBox="0 0 84 84" className="flex-shrink-0">
          {groups.map((seg, i) => {
            const pct    = seg.total / grandTotal;
            const dash   = pct * circ;
            const gap    = circ - dash;
            const rot    = -90 + cumPct * 360;
            cumPct += pct;
            return (
              <circle key={i} cx="42" cy="42" r={r} fill="none" stroke={seg.color}
                strokeWidth="14" strokeDasharray={`${dash} ${gap}`} transform={`rotate(${rot} 42 42)`} />
            );
          })}
          <circle cx="42" cy="42" r="24" fill="var(--color-surface-card)" />
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {groups.map(seg => (
            <div key={seg.value} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
              <span className="text-xs text-fg-subtle flex-1 truncate">{seg.label}</span>
              <span className="text-xs font-semibold text-fg tabular-nums">{fmt(seg.total)} €</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-surface-border flex items-center justify-between">
        <span className="text-xs text-fg-subtle">Plus-value totale</span>
        <span className={`text-sm font-bold tabular-nums ${totalGain >= 0 ? "text-emerald-400" : "text-red-400"}`}>
          {totalGain >= 0 ? "+" : ""}{fmt(totalGain)} €
        </span>
      </div>
    </motion.div>
  );
}

function EmptyState({ icon, title, desc, onAdd, addLabel }: {
  icon: ReactNode; title: string; desc: string; onAdd: () => void; addLabel: string;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="w-20 h-20 rounded-3xl bg-accent/10 border border-accent/20 flex items-center justify-center">{icon}</div>
      <div className="text-center">
        <p className="text-base font-semibold text-fg">{title}</p>
        <p className="text-sm text-fg-subtle mt-1">{desc}</p>
      </div>
      <button onClick={onAdd}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors"
        style={{ boxShadow: "var(--shadow-accent-md)" }}
      >
        <PlusIcon className="w-4 h-4" />{addLabel}
      </button>
    </motion.div>
  );
}

function GoalCard({ goal, onEdit, onDelete, onDeposit }: {
  goal: SavingsGoal; onEdit: () => void; onDelete: () => void; onDeposit: () => void;
}) {
  const pct = goal.target_amount > 0 ? Math.min((goal.current_amount / goal.target_amount) * 100, 100) : 0;
  const done = goal.current_amount >= goal.target_amount && goal.target_amount > 0;
  const days = daysLeft(goal.target_date);
  return (
    <motion.div layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl bg-surface-card border overflow-hidden flex flex-col"
      style={{ borderColor: `${goal.color}40` }}
    >
      <div className="h-1 w-full flex-shrink-0" style={{ background: goal.color }} />
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl leading-none flex-shrink-0 select-none">{goal.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg truncate">{goal.name}</p>
              {days !== null && <div className="mt-1"><DaysChip days={days} /></div>}
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-hover transition-colors"><PencilIcon className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-fg-subtle hover:text-red-400 hover:bg-red-500/8 transition-colors"><Trash2Icon className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div>
          <div className="flex items-end justify-between mb-2.5">
            <div>
              <p className="text-xl font-bold tabular-nums" style={{ color: done ? "#10B981" : goal.color }}>{fmt(goal.current_amount)} €</p>
              <p className="text-xs text-fg-subtle mt-0.5">sur {fmt(goal.target_amount)} €</p>
            </div>
            {done ? <CheckCircle2Icon className="w-6 h-6 text-emerald-400" /> : <p className="text-2xl font-bold tabular-nums text-fg-disabled">{Math.round(pct)}%</p>}
          </div>
          <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
              className="h-full rounded-full" style={{ background: `linear-gradient(90deg, ${goal.color}80, ${goal.color})` }} />
          </div>
        </div>
        <button onClick={onDeposit}
          className="mt-auto w-full h-10 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
          style={{ background: `${goal.color}14`, color: goal.color, border: `1px solid ${goal.color}30` }}>
          <PlusIcon className="w-4 h-4" />Déposer
        </button>
      </div>
    </motion.div>
  );
}

function PlacementCard({ placement, onEdit, onDelete, onUpdate }: {
  placement: SavingsPlacement; onEdit: () => void; onDelete: () => void; onUpdate: () => void;
}) {
  const gain = placement.current_value - placement.initial_deposit;
  const gainPct = placement.initial_deposit > 0 ? (gain / placement.initial_deposit) * 100 : null;
  const isPos = gain >= 0;
  const typeLabel = PLACEMENT_TYPES.find(t => t.value === placement.type)?.label ?? "";
  return (
    <motion.div layout initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="group relative rounded-2xl bg-surface-card border overflow-hidden flex flex-col"
      style={{ borderColor: `${placement.color}40` }}
    >
      <div className="h-1 w-full flex-shrink-0" style={{ background: placement.color }} />
      <div className="p-5 flex flex-col gap-4 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-3xl leading-none flex-shrink-0 select-none">{placement.emoji}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg truncate">{placement.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-surface-elevated border border-surface-border text-fg-subtle">{typeLabel}</span>
                {placement.institution && <span className="text-[11px] text-fg-disabled truncate">{placement.institution}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex-shrink-0">
            <button onClick={onEdit} className="w-7 h-7 rounded-lg flex items-center justify-center text-fg-subtle hover:text-fg hover:bg-surface-hover transition-colors"><PencilIcon className="w-3.5 h-3.5" /></button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg flex items-center justify-center text-fg-subtle hover:text-red-400 hover:bg-red-500/8 transition-colors"><Trash2Icon className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xl font-bold tabular-nums" style={{ color: placement.color }}>{fmt(placement.current_value)} €</p>
              <p className="text-xs text-fg-subtle mt-0.5">Déposé : {fmt(placement.initial_deposit)} €</p>
            </div>
            {gainPct !== null && (
              <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${isPos ? "text-emerald-400" : "text-red-400"}`}>
                {isPos ? <TrendingUpIcon className="w-4 h-4" /> : <TrendingDownIcon className="w-4 h-4" />}
                {isPos ? "+" : ""}{gainPct.toFixed(1)}%
              </div>
            )}
          </div>
          {placement.initial_deposit > 0 && (
            <p className={`text-xs font-medium tabular-nums ${isPos ? "text-emerald-400" : "text-red-400"}`}>
              {gain >= 0 ? "+" : ""}{fmt(gain)} €
            </p>
          )}
          {placement.annual_rate !== null && (
            <div className="text-xs text-fg-subtle flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: placement.color }} />
              Taux annuel : <span className="font-semibold text-fg">{placement.annual_rate}%</span>
            </div>
          )}
          {placement.annual_rate !== null && placement.annual_rate > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl mt-1" style={{ background: `${placement.color}12` }}>
              <TrendingUpIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: placement.color }} />
              <div>
                <p className="text-[10px] text-fg-subtle">Gain annuel estimé</p>
                <p className="text-sm font-bold tabular-nums" style={{ color: placement.color }}>
                  +{fmt(placement.current_value * placement.annual_rate / 100)} €
                </p>
              </div>
            </div>
          )}
        </div>
        <button onClick={onUpdate}
          className="mt-auto w-full h-10 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
          style={{ background: `${placement.color}14`, color: placement.color, border: `1px solid ${placement.color}30` }}>
          <RefreshCwIcon className="w-3.5 h-3.5" />Mettre à jour
        </button>
      </div>
    </motion.div>
  );
}

export function SavingsPage({ onLogout, userId, activeItem, onNavigate, userProfile }: SavingsPageProps) {
  const [activeTab, setActiveTab] = useState<"goals" | "placements">("goals");
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [placements, setPlacements] = useState<SavingsPlacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showProfile, setShowProfile] = useState(false);

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [goalForm, setGoalForm] = useState<GoalFormState>(DEFAULT_GOAL_FORM);
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<SavingsGoal | null>(null);
  const [depositAmt, setDepositAmt] = useState("");
  const [depositType, setDepositType] = useState<"add" | "sub">("add");
  const [depositError, setDepositError] = useState("");

  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [editingPlacement, setEditingPlacement] = useState<SavingsPlacement | null>(null);
  const [placementForm, setPlacementForm] = useState<PlacementFormState>(DEFAULT_PLACEMENT_FORM);
  const [updatePlacement, setUpdatePlacement] = useState<SavingsPlacement | null>(null);
  const [deletePlacement, setDeletePlacement] = useState<SavingsPlacement | null>(null);
  const [updateValue, setUpdateValue] = useState("");
  const [updateError, setUpdateError] = useState("");

  const [formError, setFormError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const depositInputRef = useRef<HTMLInputElement>(null);
  const updateInputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const [{ data: goalData }, { data: placementData }] = await Promise.all([
        supabase.from("savings_goals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("savings_placements").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      if (!mounted) return;
      setGoals((goalData ?? []) as SavingsGoal[]);
      setPlacements((placementData ?? []) as SavingsPlacement[]);
      setIsLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [userId]);

  useEffect(() => {
    if (depositGoal) {
      setDepositAmt(""); setDepositType("add"); setDepositError("");
      setTimeout(() => depositInputRef.current?.focus(), 120);
    }
  }, [depositGoal]);

  useEffect(() => {
    if (updatePlacement) {
      setUpdateValue(""); setUpdateError("");
      setTimeout(() => updateInputRef.current?.focus(), 120);
    }
  }, [updatePlacement]);

  function openGoalCreate() { setEditingGoal(null); setGoalForm(DEFAULT_GOAL_FORM); setFormError(""); setGoalModalOpen(true); }
  function openGoalEdit(g: SavingsGoal) {
    setEditingGoal(g);
    setGoalForm({ name: g.name, target_amount: String(g.target_amount), current_amount: String(g.current_amount), target_date: g.target_date ?? "", emoji: g.emoji, color: g.color });
    setFormError(""); setGoalModalOpen(true);
  }

  async function handleGoalSubmit() {
    const name = goalForm.name.trim();
    const target = parseFloat(goalForm.target_amount);
    const current = parseFloat(goalForm.current_amount || "0");
    if (!name) { setFormError("Le nom est requis."); return; }
    if (isNaN(target) || target <= 0) { setFormError("Montant cible invalide."); return; }
    if (isNaN(current) || current < 0) { setFormError("Montant actuel invalide."); return; }
    setIsSaving(true); setFormError("");
    const payload = { name, target_amount: target, current_amount: current, target_date: goalForm.target_date || null, emoji: goalForm.emoji, color: goalForm.color };
    try {
      if (editingGoal) {
        const { data, error } = await supabase.from("savings_goals").update(payload).eq("id", editingGoal.id).select("*").single();
        if (error) throw error;
        setGoals(prev => prev.map(g => g.id === editingGoal.id ? data as SavingsGoal : g));
      } else {
        const { data, error } = await supabase.from("savings_goals").insert({ ...payload, user_id: userId }).select("*").single();
        if (error) throw error;
        setGoals(prev => [data as SavingsGoal, ...prev]);
      }
      setGoalModalOpen(false); setEditingGoal(null);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Erreur inattendue."); }
    finally { setIsSaving(false); }
  }

  async function handleGoalDelete() {
    if (!deleteGoal) return;
    const { error } = await supabase.from("savings_goals").delete().eq("id", deleteGoal.id);
    if (error) { setDeleteError("Impossible de supprimer cet objectif."); return; }
    setGoals(prev => prev.filter(g => g.id !== deleteGoal.id));
    setDeleteGoal(null);
    setDeleteError("");
  }

  async function handleDeposit() {
    if (!depositGoal) return;
    const amt = parseFloat(depositAmt);
    if (isNaN(amt) || amt <= 0 || amt > 1_000_000) { setDepositError("Montant invalide (max. 1 000 000 €)."); return; }
    const next = depositType === "add" ? depositGoal.current_amount + amt : Math.max(0, depositGoal.current_amount - amt);
    setIsSaving(true);
    const { data, error } = await supabase.from("savings_goals").update({ current_amount: next }).eq("id", depositGoal.id).select("*").single();
    setIsSaving(false);
    if (error) { setDepositError(error.message); return; }
    setGoals(prev => prev.map(g => g.id === depositGoal.id ? data as SavingsGoal : g));
    setDepositGoal(null);
  }

  function openPlacementCreate() { setEditingPlacement(null); setPlacementForm(DEFAULT_PLACEMENT_FORM); setFormError(""); setPlacementModalOpen(true); }
  function openPlacementEdit(p: SavingsPlacement) {
    setEditingPlacement(p);
    setPlacementForm({ name: p.name, institution: p.institution ?? "", type: p.type, current_value: String(p.current_value), initial_deposit: String(p.initial_deposit), annual_rate: p.annual_rate !== null ? String(p.annual_rate) : "", emoji: p.emoji, color: p.color });
    setFormError(""); setPlacementModalOpen(true);
  }

  async function handlePlacementSubmit() {
    const name = placementForm.name.trim();
    const currentValue = parseFloat(placementForm.current_value);
    const initialDeposit = parseFloat(placementForm.initial_deposit || "0");
    const annualRate = placementForm.annual_rate.trim() ? parseFloat(placementForm.annual_rate) : null;
    if (!name) { setFormError("Le nom est requis."); return; }
    if (isNaN(currentValue) || currentValue < 0) { setFormError("Valeur actuelle invalide."); return; }
    if (isNaN(initialDeposit) || initialDeposit < 0) { setFormError("Montant déposé invalide."); return; }
    setIsSaving(true); setFormError("");
    const payload = { name, institution: placementForm.institution.trim() || null, type: placementForm.type, current_value: currentValue, initial_deposit: initialDeposit, annual_rate: annualRate, emoji: placementForm.emoji, color: placementForm.color };
    try {
      if (editingPlacement) {
        const { data, error } = await supabase.from("savings_placements").update(payload).eq("id", editingPlacement.id).select("*").single();
        if (error) throw error;
        setPlacements(prev => prev.map(p => p.id === editingPlacement.id ? data as SavingsPlacement : p));
      } else {
        const { data, error } = await supabase.from("savings_placements").insert({ ...payload, user_id: userId }).select("*").single();
        if (error) throw error;
        setPlacements(prev => [data as SavingsPlacement, ...prev]);
      }
      setPlacementModalOpen(false); setEditingPlacement(null);
    } catch (e) { setFormError(e instanceof Error ? e.message : "Erreur inattendue."); }
    finally { setIsSaving(false); }
  }

  async function handlePlacementDelete() {
    if (!deletePlacement) return;
    const { error } = await supabase.from("savings_placements").delete().eq("id", deletePlacement.id);
    if (error) { setDeleteError("Impossible de supprimer ce placement."); return; }
    setPlacements(prev => prev.filter(p => p.id !== deletePlacement.id));
    setDeletePlacement(null);
    setDeleteError("");
  }

  async function handleUpdateValue() {
    if (!updatePlacement) return;
    const val = parseFloat(updateValue);
    if (isNaN(val) || val < 0 || val > 999_999_999) { setUpdateError("Valeur invalide (max. 999 999 999 €)."); return; }
    setIsSaving(true);
    const { data, error } = await supabase.from("savings_placements").update({ current_value: val }).eq("id", updatePlacement.id).select("*").single();
    setIsSaving(false);
    if (error) { setUpdateError(error.message); return; }
    setPlacements(prev => prev.map(p => p.id === updatePlacement.id ? data as SavingsPlacement : p));
    setUpdatePlacement(null);
  }

  const goalStats = useMemo(() => ({
    totalSaved:     goals.reduce((s, g) => s + g.current_amount, 0),
    activeCount:    goals.filter(g => g.current_amount < g.target_amount || g.target_amount === 0).length,
    completedCount: goals.filter(g => g.current_amount >= g.target_amount && g.target_amount > 0).length,
  }), [goals]);

  const placementStats = useMemo(() => ({
    totalPlaced: placements.reduce((s, p) => s + p.current_value, 0),
    totalGain:   placements.reduce((s, p) => s + (p.current_value - p.initial_deposit), 0),
    count:       placements.length,
  }), [placements]);

  function setGF(k: keyof GoalFormState, v: string) { setGoalForm(f => ({ ...f, [k]: v })); setFormError(""); }
  function setPF(k: keyof PlacementFormState, v: string) { setPlacementForm(f => ({ ...f, [k]: v })); setFormError(""); }

  const colorMap: Record<string, string> = {
    accent: "text-accent bg-accent/8 border-accent/20",
    blue:   "text-blue-400 bg-blue-500/8 border-blue-500/20",
    green:  "text-emerald-400 bg-emerald-500/8 border-emerald-500/20",
    red:    "text-red-400 bg-red-500/8 border-red-500/20",
  };

  const kpi = activeTab === "goals"
    ? [
        { label: "Total épargné", value: `${fmt(goalStats.totalSaved)} €`, sub: "sur tous les objectifs", color: "accent" },
        { label: "En cours",      value: String(goalStats.activeCount),    sub: `objectif${goalStats.activeCount !== 1 ? "s" : ""} actif${goalStats.activeCount !== 1 ? "s" : ""}`, color: "blue" },
        { label: "Complétés",     value: String(goalStats.completedCount), sub: `objectif${goalStats.completedCount !== 1 ? "s" : ""} atteint${goalStats.completedCount !== 1 ? "s" : ""}`, color: "green" },
      ]
    : [
        { label: "Total placé",  value: `${fmt(placementStats.totalPlaced)} €`, sub: "valeur actuelle", color: "accent" },
        { label: "Plus-value",   value: `${placementStats.totalGain >= 0 ? "+" : ""}${fmt(placementStats.totalGain)} €`, sub: "gain total net", color: placementStats.totalGain >= 0 ? "green" : "red" },
        { label: "Placements",   value: String(placementStats.count), sub: `véhicule${placementStats.count !== 1 ? "s" : ""}`, color: "blue" },
      ];

  const Spinner = () => <span className="w-4 h-4 border-2 border-accent-fg/30 border-t-accent-fg rounded-full animate-spin" />;

  return (
    <div className="min-h-screen w-full bg-surface">
      <Sidebar onLogout={onLogout} activeItem={activeItem} onNavigate={onNavigate} userProfile={userProfile ?? null} />

      <main className="lg:ml-[var(--sidebar-width)] transition-all duration-200">
        <header className="sticky top-0 z-20 glass border-b border-surface-border">
          <div className="flex items-center justify-between px-4 py-3.5 lg:px-8 lg:py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfile(true)}
                className="lg:hidden w-9 h-9 rounded-lg bg-accent/10 border border-accent/25 flex items-center justify-center text-xs font-bold text-accent hover:bg-accent/15 transition-colors flex-shrink-0"
                aria-label="Mon profil"
              >
                {getInitials(userProfile ?? null)}
              </button>
              <div>
                <motion.h1 initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="text-base font-semibold text-fg">Épargne</motion.h1>
                <p className="text-[11px] text-fg-subtle mt-0.5">Objectifs et placements financiers</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={activeTab === "goals" ? openGoalCreate : openPlacementCreate}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-accent-fg text-xs font-semibold hover:bg-accent-light transition-colors min-h-[44px]"
                style={{ boxShadow: "var(--shadow-accent-sm)" }}
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">{activeTab === "goals" ? "Nouvel objectif" : "Nouveau placement"}</span>
              </button>
              <NotificationBell userId={userId} />
            </div>
          </div>
        </header>

        <div className="px-4 py-5 lg:px-8 lg:py-8 space-y-5 pb-24">
          {/* Tab switcher */}
          <div className="relative flex rounded-2xl bg-surface-elevated border border-surface-border p-1">
            <motion.div
              className="absolute top-1 bottom-1 rounded-xl bg-surface-card border border-surface-border shadow-sm"
              style={{ width: "calc(50% - 4px)" }}
              animate={{ x: activeTab === "goals" ? 0 : "calc(100% + 4px)" }}
              transition={{ type: "spring", stiffness: 420, damping: 36 }}
            />
            {(["goals", "placements"] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition-colors z-10 ${
                  activeTab === tab ? "text-fg" : "text-fg-muted hover:text-fg"
                }`}
              >
                {tab === "goals"
                  ? <><PiggyBankIcon className="w-4 h-4" /><span>Objectifs</span></>
                  : <><TrendingUpIcon className="w-4 h-4" /><span>Placements</span></>
                }
              </button>
            ))}
          </div>

          {/* KPI */}
          <div className="grid grid-cols-3 gap-3 lg:gap-4">
            <AnimatePresence>
              {kpi.map(({ label, value, sub, color }, i) => (
                <motion.div key={`${activeTab}-kpi-${i}`}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, delay: i * 0.04 }}
                  className={`rounded-2xl border p-4 ${colorMap[color]}`}
                >
                  <p className="text-[10px] uppercase tracking-widest text-fg-subtle mb-1.5">{label}</p>
                  <p className={`text-lg font-bold tabular-nums ${colorMap[color].split(" ")[0]}`}>{value}</p>
                  <p className="text-[11px] text-fg-subtle mt-0.5">{sub}</p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={activeTab}
              initial={{ opacity: 0, x: activeTab === "goals" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: activeTab === "goals" ? 20 : -20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-16 gap-2 text-fg-subtle text-sm">
                  <span className="w-4 h-4 rounded-full border-2 border-surface-border border-t-fg animate-spin" />Chargement…
                </div>
              ) : activeTab === "goals" ? (
                goals.length === 0
                  ? <EmptyState icon={<PiggyBankIcon className="w-10 h-10 text-accent" />} title="Aucun objectif d'épargne" desc="Créez votre premier objectif pour commencer à épargner." onAdd={openGoalCreate} addLabel="Créer un objectif" />
                  : <>
                      <GoalsSummaryCard goals={goals} />
                      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                        <AnimatePresence mode="popLayout">
                          {goals.map(g => <GoalCard key={g.id} goal={g} onEdit={() => openGoalEdit(g)} onDelete={() => setDeleteGoal(g)} onDeposit={() => setDepositGoal(g)} />)}
                        </AnimatePresence>
                      </motion.div>
                    </>
              ) : (
                placements.length === 0
                  ? <EmptyState icon={<TrendingUpIcon className="w-10 h-10 text-accent" />} title="Aucun placement" desc="Ajoutez votre premier placement pour suivre vos investissements." onAdd={openPlacementCreate} addLabel="Ajouter un placement" />
                  : <>
                      <PlacementsSummaryCard placements={placements} />
                      <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                        <AnimatePresence mode="popLayout">
                          {placements.map(p => <PlacementCard key={p.id} placement={p} onEdit={() => openPlacementEdit(p)} onDelete={() => setDeletePlacement(p)} onUpdate={() => setUpdatePlacement(p)} />)}
                        </AnimatePresence>
                      </motion.div>
                    </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Goal create/edit ── */}
      <AnimatePresence>
        {goalModalOpen && (
          <>
            <motion.div key="gm-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={BACKDROP_CLS} onClick={() => setGoalModalOpen(false)} />
            <motion.div key="gm" initial={{ opacity: 0, scale: 0.94, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={MODAL_SPRING} className={MODAL_WRAP_CLS}>
              <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
                  <h2 className="text-sm font-semibold text-fg">{editingGoal ? "Modifier l'objectif" : "Nouvel objectif"}</h2>
                  <button onClick={() => setGoalModalOpen(false)} className="text-fg-subtle hover:text-fg"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {formError && <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-xs text-red-400">{formError}</div>}
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-2">Icône</label>
                    <div className="grid grid-cols-10 gap-1">
                      {EMOJIS.map(e => <button key={e} onClick={() => setGF("emoji", e)} className={`h-9 rounded-lg text-xl transition-colors ${goalForm.emoji === e ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-surface-hover"}`}>{e}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5">Nom de l'objectif</label>
                    <input type="text" placeholder="Ex : Vacances en Italie" value={goalForm.name} onChange={e => setGF("name", e.target.value)} onKeyDown={e => e.key === "Enter" && void handleGoalSubmit()} className={inputCls} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg-muted mb-1.5">Montant cible (€)</label>
                      <input type="number" min="0" step="0.01" placeholder="2 000" value={goalForm.target_amount} onChange={e => setGF("target_amount", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg-muted mb-1.5">Déjà épargné (€)</label>
                      <input type="number" min="0" step="0.01" placeholder="0" value={goalForm.current_amount} onChange={e => setGF("current_amount", e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5"><CalendarIcon className="inline w-3 h-3 mr-1" />Date cible (optionnel)</label>
                    <input type="date" value={goalForm.target_date} onChange={e => setGF("target_date", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-2">Couleur</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => <button key={c} onClick={() => setGF("color", c)} aria-label={c} className="w-8 h-8 rounded-full transition-transform active:scale-90" style={{ background: c, outline: goalForm.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />)}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-surface-border flex gap-3">
                  <button onClick={() => setGoalModalOpen(false)} className="flex-1 h-11 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">Annuler</button>
                  <button onClick={() => void handleGoalSubmit()} disabled={isSaving} className="flex-1 h-11 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2" style={{ boxShadow: "var(--shadow-accent-sm)" }}>
                    {isSaving ? <Spinner /> : editingGoal ? "Enregistrer" : "Créer l'objectif"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Goal deposit ── */}
      <AnimatePresence>
        {depositGoal && (
          <>
            <motion.div key="dep-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={BACKDROP_CLS} onClick={() => setDepositGoal(null)} />
            <motion.div key="dep" initial={{ opacity: 0, scale: 0.94, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={MODAL_SPRING} className={MODAL_WRAP_CLS}>
              <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
                  <div className="flex items-center gap-2"><span className="text-2xl">{depositGoal.emoji}</span><h2 className="text-sm font-semibold text-fg truncate">{depositGoal.name}</h2></div>
                  <button onClick={() => setDepositGoal(null)} className="text-fg-subtle hover:text-fg"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="rounded-xl bg-surface-elevated border border-surface-border p-3">
                    <div className="flex justify-between text-xs text-fg-subtle mb-1.5"><span>Épargne actuelle</span><span>{fmt(depositGoal.current_amount)} / {fmt(depositGoal.target_amount)} €</span></div>
                    <div className="h-1.5 rounded-full bg-surface-border overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min((depositGoal.current_amount / depositGoal.target_amount) * 100, 100)}%`, background: depositGoal.color }} />
                    </div>
                  </div>
                  <div className="flex rounded-xl overflow-hidden border border-surface-border">
                    {(["add", "sub"] as const).map(t => (
                      <button key={t} onClick={() => { setDepositType(t); setDepositError(""); }} className={`flex-1 py-2.5 text-sm font-medium transition-colors ${depositType === t ? "bg-accent text-accent-fg" : "text-fg-muted hover:text-fg hover:bg-surface-hover"}`}>
                        {t === "add" ? "Ajouter" : "Retirer"}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5">Montant (€)</label>
                    <input ref={depositInputRef} type="number" min="0.01" step="0.01" placeholder="0,00" value={depositAmt} onChange={e => { setDepositAmt(e.target.value); setDepositError(""); }} onKeyDown={e => e.key === "Enter" && void handleDeposit()} className={inputCls} />
                    {depositError && <p className="text-xs text-red-400 mt-1">{depositError}</p>}
                  </div>
                  {depositAmt && !isNaN(parseFloat(depositAmt)) && parseFloat(depositAmt) > 0 && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-surface-elevated border border-surface-border px-3 py-2 text-xs text-fg-subtle">
                      Nouveau solde : <span className="font-semibold text-fg">{fmt(depositType === "add" ? depositGoal.current_amount + parseFloat(depositAmt) : Math.max(0, depositGoal.current_amount - parseFloat(depositAmt)))} €</span>
                    </motion.div>
                  )}
                </div>
                <div className="px-5 py-4 border-t border-surface-border flex gap-3">
                  <button onClick={() => setDepositGoal(null)} className="flex-1 h-11 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">Annuler</button>
                  <button onClick={() => void handleDeposit()} disabled={isSaving} className="flex-1 h-11 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2" style={{ boxShadow: "var(--shadow-accent-sm)" }}>
                    {isSaving ? <Spinner /> : depositType === "add" ? "Déposer" : "Retirer"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Goal delete ── */}
      <AnimatePresence>
        {deleteGoal && (
          <>
            <motion.div key="gdel-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={BACKDROP_CLS} onClick={() => setDeleteGoal(null)} />
            <motion.div key="gdel" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={MODAL_SPRING} className={MODAL_WRAP_CLS}>
              <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="px-5 py-4 border-b border-surface-border"><h2 className="text-sm font-semibold text-fg">Supprimer l'objectif ?</h2></div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-surface-elevated border border-surface-border p-3">
                    <span className="text-2xl">{deleteGoal.emoji}</span>
                    <div><p className="text-sm font-medium text-fg">{deleteGoal.name}</p><p className="text-xs text-fg-subtle mt-0.5">{fmt(deleteGoal.current_amount)} € épargnés</p></div>
                  </div>
                  <p className="text-xs text-fg-subtle">Cette action est irréversible.</p>
                  {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
                </div>
                <div className="px-5 py-4 border-t border-surface-border flex gap-3">
                  <button onClick={() => { setDeleteGoal(null); setDeleteError(""); }} className="flex-1 h-11 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">Annuler</button>
                  <button onClick={() => void handleGoalDelete()} className="flex-1 h-11 rounded-xl bg-red-500/15 border border-red-500/25 text-sm text-red-400 font-semibold hover:bg-red-500/25 transition-colors">Supprimer</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Placement create/edit ── */}
      <AnimatePresence>
        {placementModalOpen && (
          <>
            <motion.div key="pm-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={BACKDROP_CLS} onClick={() => setPlacementModalOpen(false)} />
            <motion.div key="pm" initial={{ opacity: 0, scale: 0.94, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={MODAL_SPRING} className={MODAL_WRAP_CLS}>
              <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
                  <h2 className="text-sm font-semibold text-fg">{editingPlacement ? "Modifier le placement" : "Nouveau placement"}</h2>
                  <button onClick={() => setPlacementModalOpen(false)} className="text-fg-subtle hover:text-fg"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="px-6 py-5 space-y-4">
                  {formError && <div className="rounded-xl border border-red-500/30 bg-red-500/8 px-4 py-3 text-xs text-red-400">{formError}</div>}
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-2">Icône</label>
                    <div className="grid grid-cols-10 gap-1">
                      {EMOJIS.map(e => <button key={e} onClick={() => setPF("emoji", e)} className={`h-9 rounded-lg text-xl transition-colors ${placementForm.emoji === e ? "bg-accent/15 ring-1 ring-accent/40" : "hover:bg-surface-hover"}`}>{e}</button>)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5">Nom</label>
                    <input type="text" placeholder="Ex : Livret A Société Générale" value={placementForm.name} onChange={e => setPF("name", e.target.value)} onKeyDown={e => e.key === "Enter" && void handlePlacementSubmit()} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5">Établissement (optionnel)</label>
                    <input type="text" placeholder="Ex : Boursorama, BNP…" value={placementForm.institution} onChange={e => setPF("institution", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-2">Type de placement</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PLACEMENT_TYPES.map(({ value, label }) => (
                        <button key={value} onClick={() => setPF("type", value)}
                          className={`py-2 rounded-xl text-xs font-medium transition-colors border ${placementForm.type === value ? "bg-accent/15 border-accent/40 text-accent" : "bg-surface-elevated border-surface-border text-fg-muted hover:text-fg hover:bg-surface-hover"}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-fg-muted mb-1.5">Valeur actuelle (€)</label>
                      <input type="number" min="0" step="0.01" placeholder="0,00" value={placementForm.current_value} onChange={e => setPF("current_value", e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-fg-muted mb-1.5">Montant déposé (€)</label>
                      <input type="number" min="0" step="0.01" placeholder="0,00" value={placementForm.initial_deposit} onChange={e => setPF("initial_deposit", e.target.value)} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5">Taux annuel % (optionnel)</label>
                    <input type="number" min="0" step="0.01" placeholder="Ex : 3" value={placementForm.annual_rate} onChange={e => setPF("annual_rate", e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-2">Couleur</label>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => <button key={c} onClick={() => setPF("color", c)} aria-label={c} className="w-8 h-8 rounded-full transition-transform active:scale-90" style={{ background: c, outline: placementForm.color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />)}
                    </div>
                  </div>
                </div>
                <div className="px-6 py-4 border-t border-surface-border flex gap-3">
                  <button onClick={() => setPlacementModalOpen(false)} className="flex-1 h-11 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">Annuler</button>
                  <button onClick={() => void handlePlacementSubmit()} disabled={isSaving} className="flex-1 h-11 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2" style={{ boxShadow: "var(--shadow-accent-sm)" }}>
                    {isSaving ? <Spinner /> : editingPlacement ? "Enregistrer" : "Ajouter le placement"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Placement update value ── */}
      <AnimatePresence>
        {updatePlacement && (
          <>
            <motion.div key="upd-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={BACKDROP_CLS} onClick={() => setUpdatePlacement(null)} />
            <motion.div key="upd" initial={{ opacity: 0, scale: 0.94, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }} transition={MODAL_SPRING} className={MODAL_WRAP_CLS}>
              <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border">
                  <div className="flex items-center gap-2"><span className="text-2xl">{updatePlacement.emoji}</span><h2 className="text-sm font-semibold text-fg truncate">{updatePlacement.name}</h2></div>
                  <button onClick={() => setUpdatePlacement(null)} className="text-fg-subtle hover:text-fg"><XIcon className="w-5 h-5" /></button>
                </div>
                <div className="px-5 py-4 space-y-4">
                  <div className="rounded-xl bg-surface-elevated border border-surface-border px-4 py-3">
                    <p className="text-xs text-fg-subtle">Valeur actuelle</p>
                    <p className="text-lg font-bold tabular-nums mt-0.5" style={{ color: updatePlacement.color }}>{fmt(updatePlacement.current_value)} €</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-fg-muted mb-1.5">Nouvelle valeur (€)</label>
                    <input ref={updateInputRef} type="number" min="0" step="0.01" placeholder="0,00" value={updateValue} onChange={e => { setUpdateValue(e.target.value); setUpdateError(""); }} onKeyDown={e => e.key === "Enter" && void handleUpdateValue()} className={inputCls} />
                    {updateError && <p className="text-xs text-red-400 mt-1">{updateError}</p>}
                  </div>
                  {updateValue && !isNaN(parseFloat(updateValue)) && (() => {
                    const diff = parseFloat(updateValue) - updatePlacement.current_value;
                    return (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl bg-surface-elevated border border-surface-border px-3 py-2 flex items-center justify-between text-xs">
                        <span className="text-fg-subtle">Variation</span>
                        <span className={`font-semibold tabular-nums ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>{diff >= 0 ? "+" : ""}{fmt(diff)} €</span>
                      </motion.div>
                    );
                  })()}
                </div>
                <div className="px-5 py-4 border-t border-surface-border flex gap-3">
                  <button onClick={() => setUpdatePlacement(null)} className="flex-1 h-11 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">Annuler</button>
                  <button onClick={() => void handleUpdateValue()} disabled={isSaving} className="flex-1 h-11 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light transition-colors disabled:opacity-60 flex items-center justify-center gap-2" style={{ boxShadow: "var(--shadow-accent-sm)" }}>
                    {isSaving ? <Spinner /> : "Mettre à jour"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Placement delete ── */}
      <AnimatePresence>
        {deletePlacement && (
          <>
            <motion.div key="pdel-bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={BACKDROP_CLS} onClick={() => setDeletePlacement(null)} />
            <motion.div key="pdel" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }} transition={MODAL_SPRING} className={MODAL_WRAP_CLS}>
              <div className="bg-surface-card border border-surface-border rounded-2xl shadow-2xl w-full max-w-sm">
                <div className="px-5 py-4 border-b border-surface-border"><h2 className="text-sm font-semibold text-fg">Supprimer le placement ?</h2></div>
                <div className="px-5 py-4 space-y-3">
                  <div className="flex items-center gap-3 rounded-xl bg-surface-elevated border border-surface-border p-3">
                    <span className="text-2xl">{deletePlacement.emoji}</span>
                    <div><p className="text-sm font-medium text-fg">{deletePlacement.name}</p><p className="text-xs text-fg-subtle mt-0.5">{fmt(deletePlacement.current_value)} € placés</p></div>
                  </div>
                  <p className="text-xs text-fg-subtle">Cette action est irréversible.</p>
                  {deleteError && <p className="text-xs text-red-400">{deleteError}</p>}
                </div>
                <div className="px-5 py-4 border-t border-surface-border flex gap-3">
                  <button onClick={() => { setDeletePlacement(null); setDeleteError(""); }} className="flex-1 h-11 rounded-xl bg-surface-elevated border border-surface-border text-sm text-fg-secondary font-medium hover:bg-surface-hover transition-colors">Annuler</button>
                  <button onClick={() => void handlePlacementDelete()} className="flex-1 h-11 rounded-xl bg-red-500/15 border border-red-500/25 text-sm text-red-400 font-semibold hover:bg-red-500/25 transition-colors">Supprimer</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <ProfileSheet isOpen={showProfile} onClose={() => setShowProfile(false)} userProfile={userProfile ?? null} onNavigate={p => { setShowProfile(false); onNavigate?.(p); }} onLogout={onLogout} />
    </div>
  );
}
