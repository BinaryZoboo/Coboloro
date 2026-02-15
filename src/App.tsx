import type { Session } from "@supabase/supabase-js";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authMode, setAuthMode] = useState<"default" | "recovery">("default");

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
      if (event === "SIGNED_OUT") {
        setAuthMode("default");
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return (
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
          <DashboardPage onLogout={() => supabase.auth.signOut()} />
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
  );
}
