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
      {/* Revenus */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.4,
          delay: 0.1,
        }}
        className="bg-dark-card border border-dark-border rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-400">Revenus</span>
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUpIcon className="w-4.5 h-4.5 text-emerald-400" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {formatAmount(incomeTotal)} €
        </p>
        <p className="text-xs text-gray-500 mt-2">Total enregistre</p>
      </motion.div>

      {/* Dépenses */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.4,
          delay: 0.2,
        }}
        className="bg-dark-card border border-dark-border rounded-xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-400">Dépenses</span>
          <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDownIcon className="w-4.5 h-4.5 text-red-400" />
          </div>
        </div>
        <p className="text-2xl font-bold text-white tracking-tight">
          {formatAmount(expenseTotal)} €
        </p>
        <p className="text-xs text-gray-500 mt-2">Total enregistre</p>
      </motion.div>

      {/* Solde */}
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.4,
          delay: 0.3,
        }}
        className="bg-dark-card border border-dark-border rounded-xl p-5 ring-1 ring-gold/20"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-400">Solde</span>
          <div className="w-9 h-9 rounded-lg bg-gold/10 flex items-center justify-center">
            <WalletIcon className="w-4.5 h-4.5 text-gold" />
          </div>
        </div>
        <p className="text-2xl font-bold text-gold tracking-tight">
          {formatAmount(balance)} €
        </p>
        <p className="text-xs text-gray-500 mt-2">Balance actuelle</p>
      </motion.div>
    </div>
  );
}
