import { motion } from "framer-motion";
import {
  ArrowLeftRightIcon,
  LayoutDashboardIcon,
  PiggyBankIcon,
  PlusIcon,
  WalletIcon,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

interface Tab {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  isCta?: boolean;
}

const tabs: Tab[] = [
  { id: "dashboard",    label: "Accueil",      Icon: LayoutDashboardIcon },
  { id: "transactions", label: "Transactions",  Icon: ArrowLeftRightIcon },
  { id: "quick-entry",  label: "",             Icon: PlusIcon, isCta: true },
  { id: "budget",       label: "Budget",       Icon: WalletIcon },
  { id: "savings",      label: "Épargne",      Icon: PiggyBankIcon },
];

export function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  // Apply saved theme on mount so it persists between page navigations
  useTheme();

  const isQuickEntry = activePage === "quick-entry";

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-surface-border">
      <div className="flex items-end h-[60px] px-1">
        {tabs.map(({ id, label, Icon, isCta }) => {
          const isActive = activePage === id;

          if (isCta) {
            return (
              <div key={id} className="flex-1 flex justify-center items-end pb-2">
                <motion.button
                  onClick={() => onNavigate(id)}
                  animate={{ rotate: isQuickEntry ? 45 : 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="w-16 h-16 -mt-6 rounded-[22px] bg-accent flex items-center justify-center active:scale-95 transition-transform duration-100"
                  style={{ boxShadow: "var(--shadow-accent-lg)" }}
                  aria-label="Saisie rapide"
                >
                  <PlusIcon className="w-7 h-7 text-accent-fg stroke-[2.5]" />
                </motion.button>
              </div>
            );
          }

          return (
            <div key={id} className="flex-1 flex justify-center">
              <button
                onClick={() => onNavigate(id)}
                className="relative flex flex-col items-center justify-end gap-0.5 py-2 w-full min-h-[44px]"
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-x-3 inset-y-1 rounded-xl bg-accent/10"
                    transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative transition-colors duration-150 ${isActive ? "text-accent" : "text-fg-subtle"}`} />
                {label && (
                  <span className={`text-[10px] relative transition-colors duration-150 ${isActive ? "text-accent font-semibold" : "text-fg-disabled font-medium"}`}>
                    {label}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
