import { motion } from "framer-motion";
import {
  BriefcaseIcon,
  CreditCardIcon,
  FilmIcon,
  HeartPulseIcon,
  HomeIcon,
  ShoppingCartIcon,
  TrainFrontIcon,
  ZapIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import type { Transaction } from "../transaction";

interface TransactionListProps {
  transactions: Transaction[];
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

export function TransactionList({ transactions }: TransactionListProps) {
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

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
        <button className="text-xs font-medium text-gold hover:text-gold-light transition-colors">
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
              className="flex items-center gap-3 px-5 py-3.5 hover:bg-dark-hover transition-colors duration-100 cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isIncome ? "bg-emerald-500/10" : "bg-dark-elevated"}`}
              >
                <Icon
                  className={`w-4 h-4 ${isIncome ? "text-emerald-400" : "text-gray-400"}`}
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
                  className={`text-sm font-semibold tabular-nums ${isIncome ? "text-emerald-400" : "text-gray-200"}`}
                >
                  {isIncome ? "+" : ""}
                  {tx.amount.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </p>
                <p className="text-xs text-gray-500">{displayDate}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
