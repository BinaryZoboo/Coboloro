import { motion } from "framer-motion";
import { EyeIcon, EyeOffIcon, LoaderIcon, WalletIcon } from "lucide-react";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { SnakeBackground } from "../components/SnakeBackground";
import { supabase } from "../lib/supabaseClient";

interface LoginPageProps {
  mode?: "default" | "recovery";
  onRecoveryComplete?: () => void;
}

type ViewMode = "login" | "signup" | "reset" | "updatePassword";

export function LoginPage({
  mode = "default",
  onRecoveryComplete,
}: LoginPageProps) {
  const [view, setView] = useState<ViewMode>(
    mode === "recovery" ? "updatePassword" : "login",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [impactActive, setImpactActive] = useState(false);
  const [hoverActive, setHoverActive] = useState(false);
  const impactTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (impactTimerRef.current) {
        window.clearTimeout(impactTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (mode === "recovery") {
      setView("updatePassword");
    }
  }, [mode]);

  function switchView(nextView: ViewMode) {
    setView(nextView);
    setErrors({});
    setFormError("");
    setStatusMessage("");
  }

  function validate() {
    const newErrors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    if (view !== "updatePassword") {
      if (!email.trim()) {
        newErrors.email = "Adresse e-mail requise";
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        newErrors.email = "Adresse e-mail invalide";
      }
    }

    if (view === "login" || view === "signup" || view === "updatePassword") {
      if (!password) {
        newErrors.password = "Mot de passe requis";
      } else if (password.length < 6) {
        newErrors.password = "Minimum 6 caractères";
      }
    }

    if (view === "updatePassword") {
      if (!confirmPassword) {
        newErrors.confirmPassword = "Confirmation requise";
      } else if (password !== confirmPassword) {
        newErrors.confirmPassword = "Les mots de passe ne correspondent pas";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (impactTimerRef.current) {
      window.clearTimeout(impactTimerRef.current);
    }
    setImpactActive(true);
    impactTimerRef.current = window.setTimeout(() => {
      setImpactActive(false);
      impactTimerRef.current = null;
    }, 900);
    setFormError("");
    setStatusMessage("");
    if (!validate()) return;
    setIsLoading(true);

    try {
      if (view === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }

      if (view === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (!data.session) {
          setStatusMessage("Compte créé. Vérifie ta boîte e-mail.");
        }
      }

      if (view === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setStatusMessage("Lien de réinitialisation envoyé.");
      }

      if (view === "updatePassword") {
        const { error } = await supabase.auth.updateUser({
          password,
        });
        if (error) throw error;
        setStatusMessage("Mot de passe mis à jour.");
        onRecoveryComplete?.();
      }
    } catch (error) {
      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Erreur inattendue");
      }
    } finally {
      setIsLoading(false);
    }
  }

  const showEmailField = view !== "updatePassword";
  const showPasswordField =
    view === "login" || view === "signup" || view === "updatePassword";
  const showConfirmPassword = view === "updatePassword";
  const passwordLabel =
    view === "updatePassword" ? "Nouveau mot de passe" : "Mot de passe";
  const passwordAutoComplete =
    view === "login" ? "current-password" : "new-password";
  const submitLabel =
    view === "login"
      ? "Se connecter"
      : view === "signup"
        ? "Créer un compte"
        : view === "reset"
          ? "Envoyer le lien"
          : "Mettre à jour";
  return (
    <div className="min-h-screen w-full bg-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gold/[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-gold/[0.02] rounded-full blur-3xl" />
        {/* Grid pattern — serves as the snake game board */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(rgba(201,168,76,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.4) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        {/* Snake game on the grid */}
        <SnakeBackground />
      </div>

      <motion.div
        initial={{
          opacity: 0,
          y: 24,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.5,
          ease: [0.22, 1, 0.36, 1],
        }}
        className="relative w-full max-w-sm"
      >
        {/* Card */}
        <div
          className={`bg-dark-card/80 backdrop-blur-xl border border-dark-border rounded-2xl shadow-2xl shadow-black/40 overflow-visible ripple-surface ${hoverActive ? "ripple-surface--hover" : ""} ${impactActive ? "ripple-surface--impact" : ""}`}
        >
          {/* Gold top accent line */}
          <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          <div className="px-8 pt-10 pb-8">
            {/* Logo */}
            <div className="flex flex-col items-center mb-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center mb-4 shadow-lg shadow-gold/20">
                <WalletIcon className="w-7 h-7 text-dark" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                COBOLORO
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Gestion budgétaire premium
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {formError && (
                <div
                  className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300"
                  role="alert"
                >
                  {formError}
                </div>
              )}
              {statusMessage && (
                <div className="rounded-lg border border-gold/30 bg-gold/10 px-4 py-3 text-xs text-gold">
                  {statusMessage}
                </div>
              )}

              {/* Email */}
              {showEmailField && (
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-medium text-gray-400 mb-2"
                  >
                    Adresse e-mail
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="jean@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email)
                        setErrors((prev) => ({
                          ...prev,
                          email: undefined,
                        }));
                    }}
                    disabled={isLoading}
                    className={`w-full bg-dark-elevated border rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors disabled:opacity-50 ${errors.email ? "border-red-500" : "border-dark-border"}`}
                  />

                  {errors.email && (
                    <p className="text-xs text-red-400 mt-1.5" role="alert">
                      {errors.email}
                    </p>
                  )}
                </div>
              )}

              {/* Password */}
              {showPasswordField && (
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-medium text-gray-400 mb-2"
                  >
                    {passwordLabel}
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={passwordAutoComplete}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (errors.password)
                          setErrors((prev) => ({
                            ...prev,
                            password: undefined,
                          }));
                      }}
                      disabled={isLoading}
                      className={`w-full bg-dark-elevated border rounded-lg px-4 py-3 pr-11 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors disabled:opacity-50 ${errors.password ? "border-red-500" : "border-dark-border"}`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                      aria-label={
                        showPassword
                          ? "Masquer le mot de passe"
                          : "Afficher le mot de passe"
                      }
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOffIcon className="w-4.5 h-4.5" />
                      ) : (
                        <EyeIcon className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-red-400 mt-1.5" role="alert">
                      {errors.password}
                    </p>
                  )}
                </div>
              )}

              {/* Confirm password */}
              {showConfirmPassword && (
                <div>
                  <label
                    htmlFor="login-password-confirm"
                    className="block text-xs font-medium text-gray-400 mb-2"
                  >
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="login-password-confirm"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword)
                        setErrors((prev) => ({
                          ...prev,
                          confirmPassword: undefined,
                        }));
                    }}
                    disabled={isLoading}
                    className={`w-full bg-dark-elevated border rounded-lg px-4 py-3 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-colors disabled:opacity-50 ${errors.confirmPassword ? "border-red-500" : "border-dark-border"}`}
                  />
                  {errors.confirmPassword && (
                    <p className="text-xs text-red-400 mt-1.5" role="alert">
                      {errors.confirmPassword}
                    </p>
                  )}
                </div>
              )}

              {/* Forgot password */}
              {view === "login" && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    className="text-xs text-gray-500 hover:text-gold transition-colors"
                    onClick={() => switchView("reset")}
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg bg-gold text-dark font-semibold text-sm hover:bg-gold-light transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-dark-card disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                onMouseEnter={() => setHoverActive(true)}
                onMouseLeave={() => setHoverActive(false)}
                onFocus={() => setHoverActive(true)}
                onBlur={() => setHoverActive(false)}
              >
                {isLoading ? (
                  <>
                    <LoaderIcon className="w-4 h-4 animate-spin" />
                    <span>Traitement...</span>
                  </>
                ) : (
                  <span>{submitLabel}</span>
                )}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-dark-border" />
                <span className="text-xs text-gray-600">ou</span>
                <div className="flex-1 h-px bg-dark-border" />
              </div>

              {view === "login" && (
                <div className="text-sm text-gray-500 text-center">
                  Pas encore de compte ?{" "}
                  <button
                    type="button"
                    className="text-gold hover:text-gold-light transition-colors"
                    onClick={() => switchView("signup")}
                  >
                    Créer un compte
                  </button>
                </div>
              )}

              {view === "signup" && (
                <div className="text-sm text-gray-500 text-center">
                  Déjà un compte ?{" "}
                  <button
                    type="button"
                    className="text-gold hover:text-gold-light transition-colors"
                    onClick={() => switchView("login")}
                  >
                    Se connecter
                  </button>
                </div>
              )}

              {view === "reset" && (
                <div className="text-sm text-gray-500 text-center">
                  <button
                    type="button"
                    className="text-gold hover:text-gold-light transition-colors"
                    onClick={() => switchView("login")}
                  >
                    Revenir à la connexion
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-600 mt-6">
          © 2026 Coboloro · Conditions · Confidentialité
        </p>
      </motion.div>
    </div>
  );
}
