import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRightIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  TagIcon,
  WalletIcon,
  XIcon,
} from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  onLogout: () => void;
  activeItem?: string;
  onNavigate?: (itemId: string) => void;
  userProfile?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

const navItems: {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "dashboard",
    label: "Tableau de bord",
    icon: LayoutDashboardIcon as React.ComponentType<{ className?: string }>,
  },
  {
    id: "transactions",
    label: "Transactions",
    icon: ArrowLeftRightIcon as React.ComponentType<{ className?: string }>,
  },
  {
    id: "budget",
    label: "Budget",
    icon: WalletIcon as React.ComponentType<{ className?: string }>,
  },
  {
    id: "categories",
    label: "Catégories",
    icon: TagIcon as React.ComponentType<{ className?: string }>,
  },
  {
    id: "settings",
    label: "Paramètres",
    icon: SettingsIcon as React.ComponentType<{ className?: string }>,
  },
];

export function Sidebar({
  onLogout,
  activeItem,
  onNavigate,
  userProfile,
}: SidebarProps) {
  const [internalActiveItem, setInternalActiveItem] = useState("dashboard");
  const currentActiveItem = activeItem ?? internalActiveItem;
  const [mobileOpen, setMobileOpen] = useState(false);

  // Generate initials from user profile
  const getInitials = () => {
    if (!userProfile) return "U";
    const firstInitial = userProfile.firstName?.charAt(0) || "";
    const lastInitial = userProfile.lastName?.charAt(0) || "";
    return (firstInitial + lastInitial).toUpperCase() || "U";
  };

  const getFullName = () => {
    if (!userProfile) return "Utilisateur";
    return (
      `${userProfile.firstName} ${userProfile.lastName}`.trim() || "Utilisateur"
    );
  };
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
            <WalletIcon className="w-5 h-5 text-dark" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            COBOLORO
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 mt-2" aria-label="Navigation principale">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = currentActiveItem === item.id;
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate(item.id);
                    } else {
                      setInternalActiveItem(item.id);
                    }
                    setMobileOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors duration-150 relative
                    ${isActive ? "text-gold bg-gold-muted" : "text-gray-400 hover:text-gray-200 hover:bg-dark-hover"}
                  `}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="px-3 pb-6">
        <div className="border-t border-dark-border pt-4 mb-3 mx-3" />
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-9 h-9 rounded-full bg-dark-elevated border border-dark-border flex items-center justify-center text-sm font-semibold text-gold">
            {getInitials()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">
              {getFullName()}
            </p>
            <p className="text-xs text-gray-500 truncate">
              {userProfile?.email || "utilisateur@email.com"}
            </p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 mt-1 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-400/5 transition-colors duration-150"
        >
          <LogOutIcon className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-dark-card border border-dark-border text-gray-400 hover:text-white transition-colors"
        aria-label="Ouvrir le menu"
      >
        <MenuIcon className="w-5 h-5" />
      </button>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-dark-card border-r border-dark-border z-30">
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.2,
              }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setMobileOpen(false)}
            />

            <motion.aside
              initial={{
                x: -280,
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: -280,
              }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
              className="fixed inset-y-0 left-0 w-64 bg-dark-card border-r border-dark-border z-50 lg:hidden"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-white transition-colors"
                aria-label="Fermer le menu"
              >
                <XIcon className="w-5 h-5" />
              </button>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
