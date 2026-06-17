import { AnimatePresence, motion } from "framer-motion";
import { EyeIcon, EyeOffIcon, LoaderIcon, PlayIcon, TrophyIcon, WalletIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { SnakeBackground } from "../components/SnakeBackground";
import { supabase } from "../lib/supabaseClient";

interface LoginPageProps {
  mode?: "default" | "recovery";
  onRecoveryComplete?: () => void;
}

type ViewMode = "login" | "signup" | "reset" | "updatePassword";

export function LoginPage({ mode = "default", onRecoveryComplete }: LoginPageProps) {
  const [view, setView] = useState<ViewMode>(mode === "recovery" ? "updatePassword" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string; password?: string; confirmPassword?: string; firstName?: string; lastName?: string;
  }>({});
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [impactActive, setImpactActive] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
  const impactTimerRef = useRef<number | null>(null);

  const [easterEggRevealed, setEasterEggRevealed] = useState(false);
  const [gameMode, setGameMode] = useState(false);
  const [gameScore, setGameScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [snakeKey, setSnakeKey] = useState(0);
  const logoClickCountRef = useRef(0);
  const logoTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (impactTimerRef.current) window.clearTimeout(impactTimerRef.current);
      if (logoTimerRef.current) window.clearTimeout(logoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (mode === "recovery") setView("updatePassword");
  }, [mode]);

  useEffect(() => {
    if (!gameMode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") exitGame();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [gameMode]);

  function handleLogoClick() {
    logoClickCountRef.current += 1;
    if (logoTimerRef.current) window.clearTimeout(logoTimerRef.current);
    if (logoClickCountRef.current >= 2) {
      logoClickCountRef.current = 0;
      setEasterEggRevealed(true);
      return;
    }
    logoTimerRef.current = window.setTimeout(() => {
      logoClickCountRef.current = 0;
    }, 2000);
  }

  function enterGame() {
    setGameMode(true);
    setGameOver(false);
    setGameScore(0);
    setSnakeKey((k) => k + 1);
  }

  function exitGame() {
    setGameMode(false);
    setGameOver(false);
    setGameScore(0);
  }

  function restartGame() {
    setGameOver(false);
    setGameScore(0);
    setSnakeKey((k) => k + 1);
  }

  function switchView(nextView: ViewMode) {
    setView(nextView);
    setEmail(""); setPassword(""); setConfirmPassword("");
    setFirstName(""); setLastName("");
    setErrors({}); setFormError(""); setStatusMessage("");
  }

  function validate() {
    const newErrors: typeof errors = {};
    if (view === "signup") {
      if (!firstName.trim()) newErrors.firstName = "Prénom requis";
      if (!lastName.trim()) newErrors.lastName = "Nom requis";
    }
    if (view !== "updatePassword") {
      if (!email.trim()) newErrors.email = "Adresse e-mail requise";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Adresse e-mail invalide";
    }
    if (view === "login" || view === "signup" || view === "updatePassword") {
      if (!password) newErrors.password = "Mot de passe requis";
      else if (password.length < 6) newErrors.password = "Minimum 6 caractères";
    }
    if (view === "updatePassword") {
      if (!confirmPassword) newErrors.confirmPassword = "Confirmation requise";
      else if (password !== confirmPassword) newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (impactTimerRef.current) window.clearTimeout(impactTimerRef.current);
    setImpactActive(true);
    impactTimerRef.current = window.setTimeout(() => { setImpactActive(false); impactTimerRef.current = null; }, 900);
    setFormError(""); setStatusMessage("");
    if (!validate()) return;
    setIsLoading(true);

    try {
      if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      if (view === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            user_id: data.user.id,
            first_name: firstName,
            last_name: lastName,
            created_at: new Date().toISOString(),
          });
          if (profileError) console.error("Failed to create profile", profileError);
        }
        if (!data.session) setStatusMessage("Compte créé. Vérifie ta boîte e-mail.");
      }
      if (view === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
        if (error) throw error;
        setStatusMessage("Lien de réinitialisation envoyé.");
      }
      if (view === "updatePassword") {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setStatusMessage("Mot de passe mis à jour.");
        onRecoveryComplete?.();
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Erreur inattendue");
    } finally {
      setIsLoading(false);
    }
  }

  const showEmailField      = view !== "updatePassword";
  const showPasswordField   = view === "login" || view === "signup" || view === "updatePassword";
  const showConfirmPassword = view === "updatePassword";
  const passwordLabel       = view === "updatePassword" ? "Nouveau mot de passe" : "Mot de passe";
  const passwordAutoComplete = view === "login" ? "current-password" : "new-password";
  const submitLabel = view === "login" ? "Se connecter" : view === "signup" ? "Créer un compte" : view === "reset" ? "Envoyer le lien" : "Mettre à jour";

  const inputClass = (hasError?: string) =>
    `w-full h-12 bg-surface-elevated border rounded-xl px-4 text-fg text-sm placeholder-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors disabled:opacity-50 ${hasError ? "border-red-500" : "border-surface-border"}`;

  return (
    <div className="min-h-screen w-full bg-surface flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/[0.025] rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(var(--grid-color) 1px, transparent 1px), linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
        <SnakeBackground
          key={gameMode ? `play-${snakeKey}` : "demo"}
          interactive={gameMode}
          onScoreChange={gameMode ? setGameScore : undefined}
          onGameOver={gameMode ? (score) => { setGameScore(score); setGameOver(true); } : undefined}
        />
      </div>

      <AnimatePresence>
        {gameMode && !gameOver && (
          <>
            <motion.div
              key="score-hud"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute top-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/10 px-5 py-2.5 rounded-2xl pointer-events-none"
            >
              <span className="text-[11px] font-medium text-white/60 uppercase tracking-widest">Score</span>
              <span className="text-2xl font-bold text-white tabular-nums">{gameScore}</span>
            </motion.div>

            <motion.button
              key="quit-btn"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
              onClick={exitGame}
              aria-label="Quitter le jeu"
              className="absolute top-4 right-4 z-20 w-11 h-11 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/60 transition-colors"
            >
              <XIcon className="w-5 h-5" />
            </motion.button>

            <motion.div
              key="controls-hint"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.3, delay: 0.2, ease: "easeOut" }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none"
            >
              <div className="flex items-center gap-3 bg-black/35 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl">
                <div className="flex gap-1">
                  {["↑", "↓", "←", "→"].map((k) => (
                    <kbd key={k} className="w-6 h-6 rounded bg-white/10 border border-white/20 flex items-center justify-center text-[11px] font-mono text-white/80">{k}</kbd>
                  ))}
                </div>
                <span className="text-xs text-white/40">ou</span>
                <div className="flex gap-1">
                  {["W", "A", "S", "D"].map((k) => (
                    <kbd key={k} className="w-6 h-6 rounded bg-white/10 border border-white/20 flex items-center justify-center text-[11px] font-mono text-white/80">{k}</kbd>
                  ))}
                </div>
                <span className="w-px h-4 bg-white/20" />
                <span className="text-[11px] text-white/40">ESC pour quitter</span>
              </div>
            </motion.div>
          </>
        )}

        {gameOver && (
          <motion.div
            key="game-over"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-20 flex flex-col items-center gap-6 bg-black/55 backdrop-blur-xl border border-white/12 rounded-3xl px-10 py-10 w-full max-w-xs text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/8 border border-white/12 flex items-center justify-center">
              <TrophyIcon className="w-7 h-7 text-[rgb(245,193,136)]" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">Game Over</p>
              <p className="text-4xl font-bold text-[rgb(245,193,136)] mt-1 tabular-nums">{gameScore}</p>
              <p className="text-xs text-white/50 mt-1">pièce{gameScore !== 1 ? "s" : ""} collectée{gameScore !== 1 ? "s" : ""}</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={restartGame}
                className="flex-1 h-11 rounded-xl bg-[rgb(245,193,136)] text-[rgb(19,19,19)] font-semibold text-sm hover:brightness-110 transition-all"
              >
                Rejouer
              </button>
              <button
                onClick={exitGame}
                className="flex-1 h-11 rounded-xl bg-white/10 border border-white/15 text-white/80 font-medium text-sm hover:bg-white/15 transition-colors"
              >
                Quitter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!gameMode && (
          <motion.div
            key="login-panel"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-sm z-10"
          >
            <div
              className={`bg-surface-card/80 backdrop-blur-xl border border-surface-border rounded-3xl shadow-2xl shadow-black/20 overflow-visible ripple-surface ${hoverActive ? "ripple-surface--hover" : ""} ${impactActive ? "ripple-surface--impact" : ""}`}
            >
              <div className="h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

              <div className="px-8 pt-10 pb-8">
                <div className="flex flex-col items-center mb-10">
                  <motion.div
                    onClick={!easterEggRevealed ? handleLogoClick : undefined}
                    animate={easterEggRevealed ? {
                      y: [0, -14, 4, -6, 2, 0],
                      rotate: [0, -6, 6, -3, 2, 0],
                      scale: [1, 1.12, 0.96, 1.05, 1],
                    } : {}}
                    transition={{ duration: 0.55, ease: "easeOut" }}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 select-none ${!easterEggRevealed ? "cursor-default" : ""}`}
                    style={{
                      background: "linear-gradient(135deg, rgb(var(--accent)) 0%, rgb(var(--accent-dark)) 100%)",
                      boxShadow: easterEggRevealed ? "var(--shadow-accent-lg)" : "var(--shadow-accent-md)",
                    }}
                  >
                    <WalletIcon className="w-7 h-7 text-accent-fg" />
                  </motion.div>

                  <AnimatePresence>
                    {easterEggRevealed && (
                      <motion.button
                        key="play-btn"
                        initial={{ opacity: 0, scale: 0.75 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.75 }}
                        transition={{ type: "spring", stiffness: 380, damping: 24 }}
                        onClick={enterGame}
                        className="mb-4 flex items-center gap-2 px-5 h-9 rounded-xl bg-accent text-accent-fg text-sm font-semibold hover:bg-accent-light active:scale-95 transition-all"
                        style={{ boxShadow: "var(--shadow-accent-sm)" }}
                      >
                        <PlayIcon className="w-3.5 h-3.5 fill-current" />
                        Jouer
                      </motion.button>
                    )}
                  </AnimatePresence>

                  <h1
                    className="text-2xl font-bold tracking-tight select-none"
                    style={{
                      background: `linear-gradient(90deg, rgb(var(--accent-dark)) 0%, rgb(var(--accent-light)) 50%, rgb(var(--accent-dark)) 100%)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    COBOLORO
                  </h1>
                  <p className="text-sm text-fg-subtle mt-1">Vos finances, maîtrisées.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  {formError && (
                    <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-400" role="alert">
                      {formError}
                    </div>
                  )}
                  {statusMessage && (
                    <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-xs text-accent">
                      {statusMessage}
                    </div>
                  )}

                  {view === "signup" && (
                    <>
                      <div>
                        <label htmlFor="signup-firstname" className="block text-xs font-medium text-fg-muted mb-1.5">Prénom</label>
                        <input
                          id="signup-firstname" type="text" autoComplete="given-name" placeholder="John"
                          value={firstName} onChange={(e) => { setFirstName(e.target.value); if (errors.firstName) setErrors((p) => ({ ...p, firstName: undefined })); }}
                          disabled={isLoading} className={inputClass(errors.firstName)}
                        />
                        {errors.firstName && <p className="text-xs text-red-400 mt-1" role="alert">{errors.firstName}</p>}
                      </div>
                      <div>
                        <label htmlFor="signup-lastname" className="block text-xs font-medium text-fg-muted mb-1.5">Nom</label>
                        <input
                          id="signup-lastname" type="text" autoComplete="family-name" placeholder="Doe"
                          value={lastName} onChange={(e) => { setLastName(e.target.value); if (errors.lastName) setErrors((p) => ({ ...p, lastName: undefined })); }}
                          disabled={isLoading} className={inputClass(errors.lastName)}
                        />
                        {errors.lastName && <p className="text-xs text-red-400 mt-1" role="alert">{errors.lastName}</p>}
                      </div>
                    </>
                  )}

                  {showEmailField && (
                    <div>
                      <label htmlFor="login-email" className="block text-xs font-medium text-fg-muted mb-1.5">Adresse e-mail</label>
                      <input
                        id="login-email" type="email" autoComplete="email" placeholder="johndoe@email.com"
                        value={email} onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
                        disabled={isLoading} className={inputClass(errors.email)}
                      />
                      {errors.email && <p className="text-xs text-red-400 mt-1" role="alert">{errors.email}</p>}
                    </div>
                  )}

                  {showPasswordField && (
                    <div>
                      <label htmlFor="login-password" className="block text-xs font-medium text-fg-muted mb-1.5">{passwordLabel}</label>
                      <div className="relative">
                        <input
                          id="login-password" type={showPassword ? "text" : "password"}
                          autoComplete={passwordAutoComplete} placeholder="••••••••"
                          value={password} onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                          disabled={isLoading} className={`${inputClass(errors.password)} pr-11`}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-muted transition-colors"
                          aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                          {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="text-xs text-red-400 mt-1" role="alert">{errors.password}</p>}
                    </div>
                  )}

                  {showConfirmPassword && (
                    <div>
                      <label htmlFor="login-password-confirm" className="block text-xs font-medium text-fg-muted mb-1.5">Confirmer le mot de passe</label>
                      <input
                        id="login-password-confirm" type={showPassword ? "text" : "password"}
                        autoComplete="new-password" placeholder="••••••••"
                        value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: undefined })); }}
                        disabled={isLoading} className={inputClass(errors.confirmPassword)}
                      />
                      {errors.confirmPassword && <p className="text-xs text-red-400 mt-1" role="alert">{errors.confirmPassword}</p>}
                    </div>
                  )}

                  {view === "login" && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => switchView("reset")} className="text-xs text-fg-subtle hover:text-accent transition-colors">
                        Mot de passe oublié ?
                      </button>
                    </div>
                  )}

                  <button
                    type="submit" disabled={isLoading}
                    className="w-full h-12 rounded-xl bg-accent text-accent-fg font-semibold text-sm hover:bg-accent-light transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-card disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
                    style={{ boxShadow: "var(--shadow-accent-md)" }}
                    onMouseEnter={() => setHoverActive(true)} onMouseLeave={() => setHoverActive(false)}
                    onFocus={() => setHoverActive(true)} onBlur={() => setHoverActive(false)}
                  >
                    {isLoading ? <><LoaderIcon className="w-4 h-4 animate-spin" /><span>Traitement...</span></> : <span>{submitLabel}</span>}
                  </button>

                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-surface-border" />
                    <span className="text-xs text-fg-subtle">ou</span>
                    <div className="flex-1 h-px bg-surface-border" />
                  </div>

                  {view === "login" && (
                    <p className="text-sm text-fg-subtle text-center">
                      Pas encore de compte ?{" "}
                      <button type="button" onClick={() => switchView("signup")} className="text-accent hover:text-accent-light transition-colors">
                        Créer un compte
                      </button>
                    </p>
                  )}
                  {view === "signup" && (
                    <p className="text-sm text-fg-subtle text-center">
                      Déjà un compte ?{" "}
                      <button type="button" onClick={() => switchView("login")} className="text-accent hover:text-accent-light transition-colors">
                        Se connecter
                      </button>
                    </p>
                  )}
                  {view === "reset" && (
                    <p className="text-sm text-fg-subtle text-center">
                      <button type="button" onClick={() => switchView("login")} className="text-accent hover:text-accent-light transition-colors">
                        Revenir à la connexion
                      </button>
                    </p>
                  )}
                </form>
              </div>
            </div>

            <p className="text-center text-xs text-fg-subtle mt-6">© 2026 Coboloro · Conditions · Confidentialité</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
