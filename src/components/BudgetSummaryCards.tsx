import { motion } from "framer-motion";
import { TrendingDownIcon, TrendingUpIcon, WalletIcon } from "lucide-react";
export function BudgetSummaryCards() {
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
          4 250,00 €
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">
            +12,5%
          </span>
          <span className="text-xs text-gray-500">vs mois dernier</span>
        </div>
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
          2 847,50 €
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-medium text-red-400 bg-red-400/10 px-1.5 py-0.5 rounded">
            +3,2%
          </span>
          <span className="text-xs text-gray-500">vs mois dernier</span>
        </div>
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
          1 402,50 €
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-xs font-medium text-gold bg-gold/10 px-1.5 py-0.5 rounded">
            +28,1%
          </span>
          <span className="text-xs text-gray-500">vs mois dernier</span>
        </div>
      </motion.div>
    </div>
  );
}
