import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";

import { Suspense, lazy, useEffect, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { supabase } from "./lib/supabaseClient";

const BudgetPage = lazy(() =>
  import("./pages/BudgetPage").then((m) => ({ default: m.BudgetPage })),
);
const CategoriesPage = lazy(() =>
  import("./pages/CategoriesPage").then((m) => ({ default: m.CategoriesPage })),
);
const DashboardPage = lazy(() =>
  import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const LoginPage = lazy(() =>
  import("./pages/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const QuickExpensePage = lazy(() =>
  import("./pages/QuickExpensePage").then((m) => ({ default: m.QuickExpensePage })),
);
const TransactionsPage = lazy(() =>
  import("./pages/TransactionsPage").then((m) => ({ default: m.TransactionsPage })),
);
const SavingsPage = lazy(() =>
  import("./pages/SavingsPage").then((m) => ({ default: m.SavingsPage })),
);

type PageId = "dashboard" | "categories" | "transactions" | "budget" | "quick-entry" | "savings";

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 1023px)").matches;
}

function isValidPage(id: string): id is PageId {
  return ["dashboard", "categories", "transactions", "budget", "quick-entry", "savings"].includes(id);
}

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"default" | "recovery">("default");
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [userProfile, setUserProfile] = useState<{
    firstName: string;
    lastName: string;
    email: string;
  } | null>(null);

  const fallback = (
    <div className="min-h-screen flex items-center justify-center bg-surface text-fg-muted text-sm">
      Chargement…
    </div>
  );

  async function loadProfile(userId: string, email: string) {
    const { data } = await supabase
      .from("profiles")
      .select("first_name, last_name")
      .eq("id", userId)
      .single();
    if (data) {
      setUserProfile({
        firstName: data.first_name || "",
        lastName: data.last_name || "",
        email,
      });
    }
  }


  useEffect(() => {
    const needsNav = !!session && activePage !== "quick-entry";
    document.body.setAttribute("data-mobile-nav", needsNav ? "true" : "false");
  }, [session, activePage]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      if (data.session?.user?.email) {
        void loadProfile(data.session.user.id, data.session.user.email);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession ?? null);

      if (event === "PASSWORD_RECOVERY") {
        setAuthMode("recovery");
      }
      if (event === "SIGNED_IN" && newSession?.user) {
        const { id, email } = newSession.user;
        setActivePage(isMobileViewport() ? "quick-entry" : "dashboard");
        if (email) void loadProfile(id, email);
      }
      if (event === "SIGNED_OUT") {
        setAuthMode("default");
        setActivePage("dashboard");
        setUserProfile(null);
        try { sessionStorage.clear(); } catch {}
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const navigate = (id: string) => {
    if (isValidPage(id)) setActivePage(id);
  };

  const sharedProps = {
    onLogout: () => supabase.auth.signOut(),
    userId: session?.user.id ?? "",
    activeItem: activePage,
    onNavigate: navigate,
    userProfile,
  };

  function renderPage() {
    switch (activePage) {
      case "categories":
        return <CategoriesPage {...sharedProps} />;
      case "budget":
        return <BudgetPage {...sharedProps} />;
      case "transactions":
        return <TransactionsPage {...sharedProps} />;
      case "quick-entry":
        return (
          <QuickExpensePage
            onLogout={sharedProps.onLogout}
            userId={sharedProps.userId}
            onHome={() => setActivePage("dashboard")}
          />
        );
      case "savings":
        return <SavingsPage {...sharedProps} />;
      default:
        return <DashboardPage {...sharedProps} />;
    }
  }

  return (
    <>
      <AnimatePresence mode="wait">
        {authMode === "recovery" ? (
          <motion.div
            key="recovery"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Suspense fallback={fallback}>
              <LoginPage
                mode="recovery"
                onRecoveryComplete={() => setAuthMode("default")}
              />
            </Suspense>
          </motion.div>
        ) : session ? (
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={fallback}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePage}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Suspense fallback={fallback}>
              <LoginPage />
            </Suspense>
          </motion.div>
        )}
      </AnimatePresence>

      {session && activePage !== "quick-entry" && (
        <BottomNav
          activePage={activePage}
          onNavigate={navigate}
        />
      )}

    </>
  );
}
