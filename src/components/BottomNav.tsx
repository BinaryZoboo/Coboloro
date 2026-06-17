import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRightIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MoonIcon,
  PiggyBankIcon,
  PlusIcon,
  SunIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

interface BottomNavProps {
  activePage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userProfile?: { firstName: string; lastName: string; email: string } | null;
}

interface Tab {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  isCta?: boolean;
}

const tabs: Tab[] = [
  { id: "dashboard",    label: "Accueil",    Icon: LayoutDashboardIcon },
  { id: "transactions", label: "Historique", Icon: ArrowLeftRightIcon },
  { id: "quick-entry",  label: "",           Icon: PlusIcon, isCta: true },
  { id: "budget",       label: "Budget",     Icon: WalletIcon },
  { id: "profil",       label: "Profil",     Icon: UserIcon },
];

export function BottomNav({ activePage, onNavigate, onLogout, userProfile }: BottomNavProps) {
  const [showProfile, setShowProfile] = useState(false);

  const [theme, setTheme] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("theme") as "dark" | "light") ?? "dark"; } catch { return "dark"; }
  });

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

  const handleTab = (id: string) => {
    if (id === "profil") { setShowProfile(true); return; }
    onNavigate(id);
  };

  const isQuickEntry = activePage === "quick-entry";

  return (
    <>
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-surface-border">
        <div className="flex items-end h-[60px] px-1">
          {tabs.map(({ id, label, Icon, isCta }) => {
            const isActive = activePage === id;

            if (isCta) {
              return (
                <div key={id} className="flex-1 flex justify-center items-end pb-2">
                  <motion.button
                    onClick={() => handleTab(id)}
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
                  onClick={() => handleTab(id)}
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

      {/* Profile bottom sheet */}
      <AnimatePresence>
        {showProfile && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setShowProfile(false)}
            />

            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 40 }}
              className="fixed bottom-0 inset-x-0 z-50 lg:hidden rounded-t-2xl bg-surface-card border-t border-surface-border pb-[env(safe-area-inset-bottom)]"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-9 h-1 rounded-full bg-surface-muted" />
              </div>

              <div className="flex items-center gap-4 px-6 py-4 border-b border-surface-border">
                <div className="w-12 h-12 rounded-full bg-accent/15 border border-accent/20 flex items-center justify-center text-base font-bold text-accent">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg truncate">{fullName}</p>
                  <p className="text-xs text-fg-subtle truncate">{userProfile?.email ?? ""}</p>
                </div>
              </div>

              <div className="p-4 space-y-2">
                <button
                  onClick={() => { setShowProfile(false); onNavigate("savings"); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-elevated text-sm text-fg-secondary hover:text-fg hover:bg-surface-hover transition-colors min-h-[44px]"
                >
                  <PiggyBankIcon className="w-4 h-4" />
                  Épargne
                </button>

                <button
                  onClick={() => { setShowProfile(false); onNavigate("categories"); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-elevated text-sm text-fg-secondary hover:text-fg hover:bg-surface-hover transition-colors min-h-[44px]"
                >
                  Mes catégories
                </button>

                <button
                  onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-elevated text-sm text-fg-secondary hover:text-fg hover:bg-surface-hover transition-colors min-h-[44px]"
                >
                  {theme === "dark"
                    ? <><SunIcon className="w-4 h-4" /><span>Mode clair</span></>
                    : <><MoonIcon className="w-4 h-4" /><span>Mode sombre</span></>
                  }
                </button>

                <button
                  onClick={() => { setShowProfile(false); onLogout(); }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/8 transition-colors min-h-[44px]"
                >
                  <LogOutIcon className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>

              <div className="h-4" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
