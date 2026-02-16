import { motion } from "framer-motion";
import {
  BriefcaseIcon,
  CreditCardIcon,
  FilmIcon,
  HeartPulseIcon,
  HomeIcon,
  ShoppingCartIcon,
  TrainFrontIcon,
  Trash2Icon,
  ZapIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";
import type { Transaction } from "../transaction";

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (transactionId: string) => void;
  onViewAll?: () => void;
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const categoryIconMap: Record<string, ComponentType<{ className?: string }>> = {
  Alimentation: ShoppingCartIcon,
  Transport: TrainFrontIcon,
  Logement: HomeIcon,
  Loisirs: FilmIcon,
  Santé: HeartPulseIcon,
  Revenu: BriefcaseIcon,
  Autres: CreditCardIcon,
  Électricité: ZapIcon,
  Éducation: CreditCardIcon,
  Vêtements: CreditCardIcon,
};
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

export function TransactionList({
  transactions,
  onDeleteTransaction,
  onViewAll,
}: TransactionListProps) {
  const [pendingDelete, setPendingDelete] = useState<Transaction | null>(null);

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const handleConfirmDelete = () => {
    if (pendingDelete) {
      onDeleteTransaction(pendingDelete.id);
      setPendingDelete(null);
    }
  };

  return (
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
        delay: 0.4,
      }}
      className="bg-dark-card border border-dark-border rounded-xl"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-dark-border">
        <h3 className="text-sm font-semibold text-white">
          Transactions récentes
        </h3>
        <button
          onClick={onViewAll}
          className="text-xs font-medium text-gold hover:text-gold-light transition-colors"
        >
          Voir tout
        </button>
      </div>

      <div className="divide-y divide-dark-border">
        {recentTransactions.map((tx) => {
          const Icon = categoryIconMap[tx.category] ?? CreditCardIcon;

          const isIncome = tx.type === "income";
          const displayDate = tx.date.includes("-")
            ? new Date(tx.date).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })
            : tx.date;

          return (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-dark-hover transition-colors duration-100"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isIncome ? "bg-emerald-500/10" : "bg-red-500/10"}`}
              >
                <Icon
                  className={`w-4 h-4 ${isIncome ? "text-emerald-400" : "text-red-400"}`}
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">
                  {tx.merchant}
                </p>
                <p className="text-xs text-gray-500">{tx.category}</p>
              </div>

              <div className="text-right flex-shrink-0">
                <p
                  className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-400" : "text-red-400"}`}
                >
                  {isIncome ? "+" : "-"}
                  {Math.abs(tx.amount).toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </p>
                <p className="text-xs text-gray-500">{displayDate}</p>
              </div>

              <button
                type="button"
                onClick={() => setPendingDelete(tx)}
                className="ml-1 p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-dark-elevated transition-colors"
                aria-label="Supprimer la transaction"
              >
                <Trash2Icon className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation modal */}
      {pendingDelete && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setPendingDelete(null)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-dark-card border border-dark-border rounded-xl shadow-2xl max-w-sm w-full">
              <div className="px-6 py-4 border-b border-dark-border">
                <h2 className="text-base font-semibold text-white">
                  Supprimer la transaction ?
                </h2>
              </div>

              <div className="px-6 py-4">
                <p className="text-sm text-gray-400 mb-4">
                  Êtes-vous sûr de vouloir supprimer cette transaction ?
                </p>
                <div className="bg-dark-elevated border border-dark-border rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-gray-200">
                    {pendingDelete.merchant || "Sans description"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {pendingDelete.category} • {pendingDelete.date}
                  </p>
                  <p className="text-sm font-semibold mt-2">
                    {pendingDelete.type === "income" ? "+" : "-"}
                    {Math.abs(pendingDelete.amount).toLocaleString("fr-FR", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    €
                  </p>
                </div>
                <p className="text-xs text-gray-500">
                  Cette action est irréversible.
                </p>
              </div>

              <div className="px-6 py-4 border-t border-dark-border flex gap-3">
                <button
                  onClick={() => setPendingDelete(null)}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-dark-elevated border border-dark-border text-gray-200 text-sm font-medium hover:bg-dark-hover transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/30 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
