import { useCallback, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AppBrand from "../components/AppBrand.jsx";
import useAuth from "../hooks/useAuth.js";

function getSafeNextPath(location) {
  const searchParams = new URLSearchParams(location.search);
  const nextPath = String(searchParams.get("next") || "").trim();

  if (!nextPath || !nextPath.startsWith("/")) {
    return "/";
  }

  return nextPath;
}

function getInfoMessage(location) {
  const searchParams = new URLSearchParams(location.search);
  const authStatus = String(searchParams.get("auth") || "").trim();

  if (authStatus === "session_required") {
    return "Reconnecte-toi a ton compte RunNSee avant de lier Strava.";
  }

  if (authStatus === "strava_refused") {
    return "La connexion Strava a ete annulee. Tu peux relancer l'autorisation quand tu veux.";
  }

  if (authStatus === "strava_already_linked") {
    return "Ce compte Strava est deja lie a un autre compte RunNSee. Deconnecte-toi de Strava dans ce navigateur ou utilise une fenetre privee pour lier ton propre compte.";
  }

  if (authStatus === "strava_app_missing") {
    return "L'application Strava personnelle utilisee pour cette connexion n'est plus disponible. Reenregistre-la puis reconnecte Strava.";
  }

  return "";
}

export default function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { error, isLoading, login, signup, clearError } = useAuth();
  const [mode, setMode] = useState("login");
  const [formState, setFormState] = useState({
    displayName: "",
    email: "",
    password: "",
  });
  const [localError, setLocalError] = useState("");
  const nextPath = useMemo(() => getSafeNextPath(location), [location]);
  const infoMessage = useMemo(() => getInfoMessage(location), [location]);

  const updateField = useCallback((name, value) => {
    setFormState((current) => ({
      ...current,
      [name]: value,
    }));
  }, []);

  const switchMode = useCallback((nextMode) => {
    setMode(nextMode);
    setLocalError("");
    clearError();
  }, [clearError]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();
    setLocalError("");
    clearError();

    const displayName = formState.displayName.trim();
    const email = formState.email.trim();
    const password = formState.password;

    if (mode === "signup" && displayName.length < 2) {
      setLocalError("Le nom affiche doit contenir au moins 2 caracteres.");
      return;
    }

    if (!email || !email.includes("@")) {
      setLocalError("Renseigne une adresse e-mail valide.");
      return;
    }

    // En signup : politique alignee sur backend validatePassword
    // (10 chars + 3 categories). En login : on accepte tout pour ne pas
    // bloquer les comptes existants avec un ancien mot de passe < 10 chars.
    if (mode === "signup") {
      if (password.length < 10) {
        setLocalError("Le mot de passe doit contenir au moins 10 caracteres.");
        return;
      }
      const categories = [
        /[A-Z]/.test(password),
        /[a-z]/.test(password),
        /\d/.test(password),
        /[^A-Za-z0-9]/.test(password),
      ].filter(Boolean).length;
      if (categories < 3) {
        setLocalError("Combine au moins 3 types : majuscule, minuscule, chiffre, caractere special.");
        return;
      }
    } else if (password.length < 1) {
      setLocalError("Saisis ton mot de passe.");
      return;
    }

    try {
      if (mode === "signup") {
        await signup({ displayName, email, password });
      } else {
        await login({ email, password });
      }

      navigate(nextPath, { replace: true });
    } catch {
      // Les messages d'erreur sont deja exposes par le contexte.
    }
  }, [clearError, formState.displayName, formState.email, formState.password, login, mode, navigate, nextPath, signup]);

  const submitLabel = mode === "signup" ? "Creer mon compte" : "Se connecter";
  const effectiveError = localError || error;

  return (
    <div className="auth-page">
      <div className="auth-layout">
        <section className="auth-hero">
          <AppBrand />
          <span className="eyebrow">Comptes RunNSee</span>
          <h1 className="auth-title">Un compte. Ton espace RunNSee.</h1>
        </section>

        <section className="auth-card">
          <div className="auth-card-head">
            <div>
              <span className="eyebrow">{mode === "signup" ? "Premiere etape" : "Connexion"}</span>
              <h2 className="card-title">
                {mode === "signup" ? "Creer ton compte RunNSee" : "Retrouver ton espace RunNSee"}
              </h2>
            </div>

            <div className="auth-mode-switch" role="tablist" aria-label="Choisir le mode de connexion">
              <button
                type="button"
                className={`button button-outline ${mode === "login" ? "is-selected" : ""}`.trim()}
                onClick={() => switchMode("login")}
              >
                Connexion
              </button>
              <button
                type="button"
                className={`button button-outline ${mode === "signup" ? "is-selected" : ""}`.trim()}
                onClick={() => switchMode("signup")}
              >
                Creer un compte
              </button>
            </div>
          </div>

          {infoMessage ? <div className="alert alert-info">{infoMessage}</div> : null}
          {effectiveError ? <div className="alert alert-error">{effectiveError}</div> : null}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === "signup" ? (
              <label className="field">
                <span className="field-label">Nom affiche</span>
                <input
                  type="text"
                  className="field-input"
                  autoComplete="name"
                  value={formState.displayName}
                  onChange={(event) => updateField("displayName", event.target.value)}
                  placeholder="Ex. Barth"
                />
              </label>
            ) : null}

            <label className="field">
              <span className="field-label">Adresse e-mail</span>
              <input
                type="email"
                className="field-input"
                autoComplete="email"
                value={formState.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="toi@exemple.com"
              />
            </label>

            <label className="field">
              <span className="field-label">Mot de passe</span>
              <input
                type="password"
                className="field-input"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={formState.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Au moins 8 caracteres"
              />
            </label>

            <button type="submit" className="button button-primary auth-submit" disabled={isLoading}>
              {isLoading ? "Chargement..." : submitLabel}
            </button>
          </form>

          <div className="small-text auth-footer">
            <Link to="/" className="auth-inline-link">
              Retour a l'application
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
