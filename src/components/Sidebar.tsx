import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  PiggyBankIcon,
  PlusIcon,
  TagIcon,
  TrendingDownIcon,
  WalletIcon,
} from "lucide-react";
import { Logo, LogoIcon } from "./Logo";
import { useEffect, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";

interface SidebarProps {
  onLogout: () => void;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
  userProfile?: { firstName: string; lastName: string; email: string } | null;
  todaySpending?: number;
}

const navItems = [
  { id: "dashboard",    label: "Tableau de bord", icon: LayoutDashboardIcon },
  { id: "transactions", label: "Transactions",     icon: ArrowLeftRightIcon },
  { id: "budget",       label: "Budget",           icon: WalletIcon },
  { id: "savings",      label: "Épargne",          icon: PiggyBankIcon },
  { id: "categories",  label: "Catégories",       icon: TagIcon },
] as const;

export function Sidebar({ onLogout, activeItem = "dashboard", onNavigate, userProfile, todaySpending }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") ?? "dark"; } catch { return "dark"; }
  });

  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-width", collapsed ? "64px" : "256px");
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); } catch {}
  }, [collapsed]);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  const initials = (() => {
    if (!userProfile) return "U";
    return ((userProfile.firstName?.[0] ?? "") + (userProfile.lastName?.[0] ?? "")).toUpperCase() || "U";
  })();

  const fullName = userProfile
    ? `${userProfile.firstName} ${userProfile.lastName}`.trim() || "Utilisateur"
    : "Utilisateur";

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 bg-surface-card border-r border-surface-border overflow-hidden"
    >
      {/* ── Logo ── */}
      <div className="flex items-center h-16 px-4 border-b border-surface-border flex-shrink-0">
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div
              key="icon-only"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <LogoIcon size={32} theme="dark" />
            </motion.div>
          ) : (
            <motion.div
              key="full-logo"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <Logo size={32} theme="dark" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Quick-entry CTA ── */}
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={() => onNavigate?.("quick-entry")}
          title={collapsed ? "Saisie rapide" : undefined}
          className={`w-full flex items-center rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/18 hover:border-accent/35 transition-colors duration-150 ${collapsed ? "justify-center p-3" : "gap-2.5 px-4 py-2.5"}`}
        >
          <PlusIcon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-semibold">Saisie rapide</span>}
        </button>
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 px-2 py-1 overflow-y-auto" aria-label="Navigation principale">
        <ul className="space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = activeItem === id;
            return (
              <li key={id} className="relative group">
                <button
                  onClick={() => onNavigate?.(id)}
                  aria-current={active ? "page" : undefined}
                  title={collapsed ? label : undefined}
                  className={`
                    w-full flex items-center rounded-lg text-sm font-medium transition-all duration-100
                    ${collapsed ? "justify-center p-3" : "gap-3 px-4 py-2.5"}
                    ${active
                      ? "text-accent bg-accent/10"
                      : "text-fg-muted hover:text-fg hover:bg-surface-hover"
                    }
                  `}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full" />
                  )}
                  <Icon className={`w-[18px] h-[18px] flex-shrink-0 transition-colors ${active ? "text-accent" : "group-hover:text-accent"}`} />
                  {!collapsed && <span>{label}</span>}
                </button>

                {collapsed && (
                  <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2.5 py-1.5 bg-surface-elevated border border-surface-border text-fg text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                    {label}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── Today spending ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="mx-3 mb-3 rounded-xl border border-surface-border bg-surface-elevated px-3 py-2.5 flex-shrink-0"
          >
            <div className="flex items-center gap-1.5">
              <TrendingDownIcon className="w-3 h-3 text-red-400" />
              <p className="text-[10px] uppercase tracking-widest text-fg-subtle">Aujourd'hui</p>
            </div>
            <p className="mt-1 text-base font-bold text-fg tabular-nums">
              {(todaySpending ?? 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User + theme + logout ── */}
      <div className="px-2 pb-4 border-t border-surface-border pt-3 flex-shrink-0">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              className="flex items-center gap-3 px-3 py-2 mb-1"
            >
              <div className="w-8 h-8 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-fg-secondary truncate">{fullName}</p>
                <p className="text-[11px] text-fg-subtle truncate">{userProfile?.email ?? ""}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ThemeToggle
          theme={theme}
          onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")}
          collapsed={collapsed}
        />

        <button
          onClick={onLogout}
          title={collapsed ? "Déconnexion" : undefined}
          className={`w-full flex items-center rounded-lg text-sm text-fg-muted hover:text-red-400 hover:bg-red-400/6 transition-colors duration-150 ${collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5"}`}
        >
          <LogOutIcon className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="absolute -right-3 top-[4.5rem] w-6 h-6 rounded-full bg-surface-elevated border border-surface-border flex items-center justify-center text-fg-muted hover:text-fg hover:bg-surface-muted transition-colors z-40"
        aria-label={collapsed ? "Développer" : "Réduire"}
      >
        {collapsed ? <ChevronRightIcon className="w-3 h-3" /> : <ChevronLeftIcon className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
