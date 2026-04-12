import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { BellIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { BudgetPage } from "./pages/BudgetPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { QuickExpensePage } from "./pages/QuickExpensePage";
import { TransactionsPage } from "./pages/TransactionsPage";

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}
export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"default" | "recovery">("default");
  const [activePage, setActivePage] = useState("dashboard");
  const [quickReminderCount, setQuickReminderCount] = useState(0);

  async function checkQuickEntryReminder(userId: string) {
    const { data, error } = await supabase
      .from("transactions")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "expense")
      .or("note.is.null,note.eq.");

    if (error) {
      console.error("Failed to check quick-entry reminder", error);
      return;
    }

    setQuickReminderCount((data ?? []).length);
  }

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session ?? null);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession ?? null);
      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("recovery");
      }
      if (event === "SIGNED_IN") {
        setActivePage(isMobileViewport() ? "quick-entry" : "dashboard");
        if (newSession?.user?.id) {
          void checkQuickEntryReminder(newSession.user.id);
        }
      }
      if (event === "SIGNED_OUT") {
        setAuthMode("default");
        setActivePage("dashboard");
        setQuickReminderCount(0);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return (
    <>
      <AnimatePresence mode="wait">
        {authMode === "recovery" ? (
          <motion.div
            key="recovery"
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
              duration: 0.3,
            }}
          >
            <LoginPage
              mode="recovery"
              onRecoveryComplete={() => setAuthMode("default")}
            />
          </motion.div>
        ) : session ? (
          <motion.div
            key="dashboard"
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
              duration: 0.3,
            }}
          >
            {activePage === "categories" ? (
              <CategoriesPage
                onLogout={() => supabase.auth.signOut()}
                userId={session.user.id}
                activeItem={activePage}
                onNavigate={(itemId) => {
                  if (
                    itemId === "dashboard" ||
                    itemId === "categories" ||
                    itemId === "transactions" ||
                    itemId === "budget" ||
                    itemId === "quick-entry"
                  ) {
                    setActivePage(itemId);
                  }
                }}
              />
            ) : activePage === "budget" ? (
              <BudgetPage
                onLogout={() => supabase.auth.signOut()}
                userId={session.user.id}
                activeItem={activePage}
                onNavigate={(itemId) => {
                  if (
                    itemId === "dashboard" ||
                    itemId === "categories" ||
                    itemId === "transactions" ||
                    itemId === "budget" ||
                    itemId === "quick-entry"
                  ) {
                    setActivePage(itemId);
                  }
                }}
              />
            ) : activePage === "transactions" ? (
              <TransactionsPage
                onLogout={() => supabase.auth.signOut()}
                userId={session.user.id}
                activeItem={activePage}
                onNavigate={(itemId) => {
                  if (
                    itemId === "dashboard" ||
                    itemId === "categories" ||
                    itemId === "transactions" ||
                    itemId === "budget" ||
                    itemId === "quick-entry"
                  ) {
                    setActivePage(itemId);
                  }
                }}
              />
            ) : activePage === "quick-entry" ? (
              <QuickExpensePage
                onLogout={() => supabase.auth.signOut()}
                userId={session.user.id}
                onHome={() => setActivePage("dashboard")}
              />
            ) : (
              <DashboardPage
                onLogout={() => supabase.auth.signOut()}
                userId={session.user.id}
                activeItem={activePage}
                onNavigate={(itemId) => {
                  if (
                    itemId === "dashboard" ||
                    itemId === "categories" ||
                    itemId === "transactions" ||
                    itemId === "budget" ||
                    itemId === "quick-entry"
                  ) {
                    setActivePage(itemId);
                  }
                }}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="login"
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
              duration: 0.3,
            }}
          >
            <LoginPage />
          </motion.div>
        )}
      </AnimatePresence>

      {session && quickReminderCount > 0 && (
        <div className="fixed top-4 left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 rounded-xl border border-gold/30 bg-dark-card/95 backdrop-blur-lg shadow-2xl shadow-black/50">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gold/15 border border-gold/30 flex-shrink-0">
              <motion.div
                animate={{ rotate: [0, 14, -12, 10, -8, 4, 0] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                }}
                style={{ transformOrigin: "top center" }}
              >
                <BellIcon className="w-4 h-4 text-gold" />
              </motion.div>
              <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
                {quickReminderCount}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-200">
              Tu as {quickReminderCount} depense
              {quickReminderCount > 1 ? "s" : ""} rapide
              {quickReminderCount > 1 ? "s" : ""} a completer
              (categorie/description).
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActivePage("transactions");
                  setQuickReminderCount(0);
                }}
                className="rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-dark hover:bg-gold-light transition-colors"
              >
                Ouvrir
              </button>
              <button
                type="button"
                onClick={() => setQuickReminderCount(0)}
                className="rounded-lg border border-dark-border px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
