import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangleIcon, BellIcon, CheckCircleIcon, TagIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

interface NotifItem {
  id: string;
  type: "uncategorized" | "over_budget" | "near_budget" | "quick_expense";
  title: string;
  detail: string;
  severity: "error" | "warning";
}

interface NotificationBellProps {
  userId: string;
}

function fmt2(v: number) {
  return v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function NotificationBell({ userId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const now = new Date();
      const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const nextKey = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split("T")[0];

      const [{ data: txs }, { data: cats }, { data: buds }, { data: recs }, { data: quickTxs }] = await Promise.all([
        supabase
          .from("transactions")
          .select("id, amount, category_id")
          .gte("date", monthKey)
          .lt("date", nextKey)
          .eq("type", "expense"),
        supabase.from("categories").select("id, name").eq("type", "expense"),
        supabase
          .from("budgets")
          .select("category_id, planned_amount")
          .eq("user_id", userId)
          .eq("month", monthKey),
        supabase.from("recurring_budgets").select("category_id").eq("user_id", userId),
        supabase
          .from("transactions")
          .select("id")
          .eq("type", "expense")
          .or("note.is.null,note.eq."),
      ]);

      const recurringCatIds = new Set((recs ?? []).map((r) => r.category_id as string));

      const notifs: NotifItem[] = [];

      const quickCount = (quickTxs ?? []).length;
      if (quickCount > 0) {
        notifs.push({
          id: "quick_expense",
          type: "quick_expense",
          title: `${quickCount} dépense${quickCount > 1 ? "s" : ""} rapide${quickCount > 1 ? "s" : ""} à compléter`,
          detail: "Ces dépenses n'ont pas encore de description — pensez à les renseigner.",
          severity: "warning",
        });
      }

      const catIds = new Set((cats ?? []).map((c) => c.id as string));

      const uncategorized = (txs ?? []).filter(
        (tx) => !tx.category_id || !catIds.has(tx.category_id as string)
      );
      if (uncategorized.length > 0) {
        const total = uncategorized.reduce((s, tx) => s + Math.abs(Number(tx.amount ?? 0)), 0);
        notifs.push({
          id: "uncategorized",
          type: "uncategorized",
          title: `${uncategorized.length} dépense${uncategorized.length > 1 ? "s" : ""} sans catégorie`,
          detail: `${fmt2(total)} € non classifiés ce mois`,
          severity: "warning",
        });
      }

      const spentByCat: Record<string, number> = {};
      (txs ?? []).forEach((tx) => {
        if (!tx.category_id) return;
        const id = tx.category_id as string;
        spentByCat[id] = (spentByCat[id] ?? 0) + Math.abs(Number(tx.amount ?? 0));
      });

      (buds ?? []).forEach((b) => {
        const spent = spentByCat[b.category_id as string] ?? 0;
        const limit = Number(b.planned_amount ?? 0);
        if (limit === 0) return;
        const cat = (cats ?? []).find((c) => c.id === b.category_id);
        const name = (cat?.name as string) ?? "Catégorie";
        const ratio = spent / limit;

        if (spent > limit) {
          notifs.push({
            id: `over_${b.category_id as string}`,
            type: "over_budget",
            title: `Dépassement · ${name}`,
            detail: `+${fmt2(spent - limit)} € au-dessus de la limite`,
            severity: "error",
          });
        } else if (ratio >= 0.9 && !recurringCatIds.has(b.category_id as string)) {
          notifs.push({
            id: `near_${b.category_id as string}`,
            type: "near_budget",
            title: `Limite proche · ${name}`,
            detail: `${Math.round(ratio * 100)}% du budget utilisé ce mois`,
            severity: "warning",
          });
        }
      });

      notifs.sort((a, b) => {
        if (a.severity === b.severity) return 0;
        return a.severity === "error" ? -1 : 1;
      });

      setItems(notifs);
    }

    void load();
  }, [userId]);

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const count = items.length;
  const hasError = items.some((n) => n.severity === "error");

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${count > 0 ? ` — ${count} alerte${count > 1 ? "s" : ""}` : ""}`}
        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-fg-muted hover:text-fg hover:bg-surface-hover transition-colors"
      >
        <BellIcon className="w-[18px] h-[18px]" />
        {count > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 18 }}
            className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none pointer-events-none ${hasError ? "bg-red-500" : "bg-warning"}`}
          >
            {count > 9 ? "9+" : count}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14, ease: "easeOut" }}
            className={[
              "z-[60] rounded-2xl border border-surface-border bg-surface-card shadow-xl overflow-hidden",
              "fixed inset-x-3 top-14",
              "lg:absolute lg:inset-x-auto lg:top-full lg:right-0 lg:mt-2 lg:w-80",
            ].join(" ")}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border">
              <p className="text-sm font-semibold text-fg">Notifications</p>
              <div className="flex items-center gap-2">
                {count > 0 && (
                  <span className="text-xs text-fg-subtle">
                    {count} alerte{count > 1 ? "s" : ""}
                  </span>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 rounded-lg text-fg-subtle hover:text-fg hover:bg-surface-hover transition-colors"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-surface-border/60 scrollbar-hide">
              {items.length === 0 ? (
                <div className="px-4 py-8 flex flex-col items-center gap-2.5 text-center">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-sm font-medium text-fg">Tout est en ordre</p>
                  <p className="text-xs text-fg-subtle">Aucune alerte pour ce mois</p>
                </div>
              ) : (
                items.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3.5 hover:bg-surface-hover/50 transition-colors"
                  >
                    <div
                      className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${
                        n.severity === "error"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {n.type === "uncategorized" ? (
                        <TagIcon className="w-3.5 h-3.5" />
                      ) : n.type === "quick_expense" ? (
                        <BellIcon className="w-3.5 h-3.5" />
                      ) : (
                        <AlertTriangleIcon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-semibold leading-tight ${
                          n.severity === "error" ? "text-red-400" : "text-warning"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs text-fg-subtle mt-0.5 leading-relaxed">{n.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
