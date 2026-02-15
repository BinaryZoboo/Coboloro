import { motion } from "framer-motion";
import { BellIcon, CalendarIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { AddTransactionModal } from "../components/AddTransactionModal";
import { BudgetSummaryCards } from "../components/BudgetSummaryCards";
import { Sidebar } from "../components/Sidebar";
import { SpendingChart } from "../components/SpendingChart";
import { TransactionList } from "../components/TransactionList";
import type { NewTransactionInput, Transaction } from "../transaction";

interface DashboardPageProps {
  onLogout: () => void;
}

const initialTransactions: Transaction[] = [
  {
    id: "1",
    merchant: "Carrefour Market",
    category: "Alimentation",
    amount: -67.42,
    type: "expense",
    date: "2026-02-12",
  },
  {
    id: "2",
    merchant: "Salaire — Entreprise",
    category: "Revenu",
    amount: 3200.0,
    type: "income",
    date: "2026-02-10",
  },
  {
    id: "3",
    merchant: "SNCF — TGV Paris",
    category: "Transport",
    amount: -89.0,
    type: "expense",
    date: "2026-02-09",
  },
  {
    id: "4",
    merchant: "Loyer Février",
    category: "Logement",
    amount: -950.0,
    type: "expense",
    date: "2026-02-05",
  },
  {
    id: "5",
    merchant: "Netflix",
    category: "Loisirs",
    amount: -17.99,
    type: "expense",
    date: "2026-02-04",
  },
  {
    id: "6",
    merchant: "Pharmacie Centrale",
    category: "Santé",
    amount: -23.5,
    type: "expense",
    date: "2026-02-03",
  },
  {
    id: "7",
    merchant: "Freelance — Projet Web",
    category: "Revenu",
    amount: 1050.0,
    type: "income",
    date: "2026-02-02",
  },
  {
    id: "8",
    merchant: "EDF — Électricité",
    category: "Électricité",
    amount: -78.3,
    type: "expense",
    date: "2026-02-01",
  },
  {
    id: "9",
    merchant: "Boulangerie Paul",
    category: "Alimentation",
    amount: -8.4,
    type: "expense",
    date: "2026-01-31",
  },
  {
    id: "10",
    merchant: "Amazon",
    category: "Autres",
    amount: -45.99,
    type: "expense",
    date: "2026-01-30",
  },
];

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);

  function handleAddTransaction(input: NewTransactionInput) {
    const amount =
      input.type === "expense"
        ? -Math.abs(input.amount)
        : Math.abs(input.amount);

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());

    const newTx: Transaction = {
      id,
      merchant: input.description,
      category: input.category,
      amount,
      type: input.type,
      date: input.date,
    };

    setTransactions((prev) => [newTx, ...prev]);
    setIsModalOpen(false);
  }

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return (
    <div className="min-h-screen w-full bg-dark">
      <Sidebar onLogout={onLogout} />

      {/* Main content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-dark/80 backdrop-blur-lg border-b border-dark-border">
          <div className="flex items-center justify-between px-6 py-4 lg:px-8">
            <div className="ml-12 lg:ml-0">
              <motion.h1
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.3,
                }}
                className="text-lg font-semibold text-white"
              >
                Bonjour, Nathan 👋
              </motion.h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CalendarIcon className="w-3.5 h-3.5 text-gray-500" />
                <p className="text-xs text-gray-500 capitalize">{today}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="relative p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-card transition-colors"
                aria-label="Notifications"
              >
                <BellIcon className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold rounded-full" />
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gold text-dark text-sm font-semibold hover:bg-gold-light transition-colors duration-200"
              >
                <PlusIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="px-6 py-6 lg:px-8 lg:py-8 space-y-6">
          <BudgetSummaryCards />

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            <div className="xl:col-span-2">
              <SpendingChart />
            </div>
            <div className="xl:col-span-3">
              <TransactionList transactions={transactions} />
            </div>
          </div>
        </div>
      </main>

      <AddTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleAddTransaction}
      />
    </div>
  );
}
