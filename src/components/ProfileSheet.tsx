import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangleIcon, LogOutIcon, MoonIcon, SunIcon, TagIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useTheme } from "../hooks/useTheme";

interface ProfileSheetProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: { firstName: string; lastName: string; email: string } | null;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

export function getInitials(userProfile: { firstName: string; lastName: string; email: string } | null): string {
  if (!userProfile) return "U";
  const emailFallback = userProfile.email?.split("@")[0] ?? "U";
  const fromName = ((userProfile.firstName?.[0] ?? "") + (userProfile.lastName?.[0] ?? "")).toUpperCase();
  return fromName || emailFallback[0]?.toUpperCase() || "U";
}

export function ProfileSheet({ isOpen, onClose, userProfile, onNavigate, onLogout }: ProfileSheetProps) {
  const { theme, toggleTheme } = useTheme();
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm" | "deleting">("idle");

  useEffect(() => {
    if (!isOpen) setDeleteStep("idle");
  }, [isOpen]);

  const emailFallback = userProfile?.email?.split("@")[0] ?? "Utilisateur";
  const firstName = userProfile?.firstName || emailFallback;
  const initials = getInitials(userProfile);

  const today = new Date().toLocaleDateString("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="profile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
          />

          <motion.div
            key="profile-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="fixed bottom-0 inset-x-0 z-50 lg:hidden rounded-t-2xl bg-surface-card border-t border-surface-border pb-[env(safe-area-inset-bottom)]"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-9 h-1 rounded-full bg-surface-muted" />
            </div>

            {/* Date + greeting */}
            <div className="px-6 pt-2 pb-4 border-b border-surface-border">
              <p className="text-[11px] text-fg-subtle font-mono mb-3">{todayLabel}</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-[14px] bg-accent/15 border border-accent/20 flex items-center justify-center text-lg font-bold text-accent flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-fg leading-tight">Bonjour, {firstName} 👋</p>
                  <p className="text-xs text-fg-subtle truncate mt-0.5">{userProfile?.email ?? ""}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 space-y-2">
              <button
                onClick={() => { onClose(); onNavigate("categories"); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-elevated text-sm text-fg-secondary hover:text-fg hover:bg-surface-hover transition-colors min-h-[44px]"
              >
                <TagIcon className="w-4 h-4" />
                Mes catégories
              </button>

              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-elevated text-sm text-fg-secondary hover:text-fg hover:bg-surface-hover transition-colors min-h-[44px]"
              >
                {theme === "dark"
                  ? <><SunIcon className="w-4 h-4" /><span>Mode clair</span></>
                  : <><MoonIcon className="w-4 h-4" /><span>Mode sombre</span></>
                }
              </button>

              <button
                onClick={() => { onClose(); onLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-red-400 hover:bg-red-500/8 transition-colors min-h-[44px]"
              >
                <LogOutIcon className="w-4 h-4" />
                Déconnexion
              </button>

              {deleteStep === "idle" && (
                <button
                  onClick={() => setDeleteStep("confirm")}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-fg-subtle hover:text-red-400 hover:bg-red-500/8 transition-colors min-h-[44px]"
                >
                  <Trash2Icon className="w-4 h-4" />
                  Supprimer mon compte
                </button>
              )}

              {deleteStep === "confirm" && (
                <div className="rounded-xl border border-red-500/25 bg-red-500/8 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangleIcon className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400 leading-relaxed">
                      Toutes tes données seront <strong>définitivement supprimées</strong>. Cette action est irréversible.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteStep("idle")}
                      className="flex-1 py-2 rounded-lg bg-surface-elevated border border-surface-border text-xs text-fg-secondary font-medium hover:bg-surface-hover transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        setDeleteStep("deleting");
                        await supabase.rpc("delete_my_account");
                        await supabase.auth.signOut();
                      }}
                      className="flex-1 py-2 rounded-lg bg-red-500/15 border border-red-500/25 text-xs text-red-400 font-semibold hover:bg-red-500/25 transition-colors"
                    >
                      Confirmer la suppression
                    </button>
                  </div>
                </div>
              )}

              {deleteStep === "deleting" && (
                <div className="flex items-center justify-center gap-2 py-3 text-xs text-fg-subtle">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-surface-border border-t-fg-muted animate-spin" />
                  Suppression en cours…
                </div>
              )}
            </div>

            <div className="h-4" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
