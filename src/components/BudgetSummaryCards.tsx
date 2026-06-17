import { motion } from "framer-motion";
import { TrendingDownIcon, TrendingUpIcon, WalletIcon } from "lucide-react";

interface BudgetSummaryCardsProps {
  incomeTotal: number;
  expenseTotal: number;
}

export function BudgetSummaryCards({
  incomeTotal,
  expenseTotal,
}: BudgetSummaryCardsProps) {
  const balance = incomeTotal - expenseTotal;
  const formatAmount = (value: number) =>
    value.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="bg-surface-card border border-surface-border rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-fg-muted">Revenus</span>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUpIcon className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <p className="text-2xl font-bold text-fg tracking-tight">
          {formatAmount(incomeTotal)} €
        </p>
        <p className="text-xs text-fg-subtle mt-2">Total enregistre</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="bg-surface-card border border-surface-border rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-fg-muted">Dépenses</span>
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDownIcon className="w-4 h-4 text-red-400" />
          </div>
        </div>
        <p className="text-2xl font-bold text-fg tracking-tight">
          {formatAmount(expenseTotal)} €
        </p>
        <p className="text-xs text-fg-subtle mt-2">Total enregistre</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="bg-surface-card border border-surface-border rounded-xl p-5 ring-1 ring-accent/20"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-fg-muted">Solde</span>
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center">
            <WalletIcon className="w-4 h-4 text-accent" />
          </div>
        </div>
        <p className="text-2xl font-bold text-accent tracking-tight">
          {formatAmount(balance)} €
        </p>
        <p className="text-xs text-fg-subtle mt-2">Balance actuelle</p>
      </motion.div>
    </div>
  );
}
