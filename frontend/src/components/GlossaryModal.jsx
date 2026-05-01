import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES } from "../content/glossary.js";

const OPEN_GLOSSARY_EVENT = "runsee:open-glossary";

function normalizeQuery(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim();
}

function entryMatchesQuery(entry, query) {
  if (!query) {
    return true;
  }

  const haystack = [
    entry.term,
    entry.short,
    entry.definition,
    entry.category,
    ...(entry.aliases || []),
  ]
    .filter(Boolean)
    .map(normalizeQuery)
    .join(" ");

  return haystack.includes(query);
}

// Rendu sous condition par le parent : quand isOpen passe a true le composant
// est monte avec un etat frais ; quand il repasse a false il est demonte.
// Pas besoin de reset manuel via useEffect (qui declenchait un avertissement
// react-hooks/set-state-in-effect).
function GlossaryModalContent({ activeEntryKey, onActiveEntryChange, onClose }) {
  const [searchValue, setSearchValue] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.classList.add("modal-open");

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.classList.remove("modal-open");
    };
  }, [onClose]);

  const normalizedQuery = useMemo(() => normalizeQuery(searchValue), [searchValue]);

  const filteredEntries = useMemo(() => {
    return GLOSSARY_ENTRIES.filter((entry) => {
      if (activeCategory !== "all" && entry.category !== activeCategory) {
        return false;
      }

      return entryMatchesQuery(entry, normalizedQuery);
    });
  }, [activeCategory, normalizedQuery]);

  const activeEntry = useMemo(() => {
    if (!activeEntryKey) {
      return null;
    }

    return GLOSSARY_ENTRIES.find((entry) => entry.key === activeEntryKey) || null;
  }, [activeEntryKey]);

  if (typeof document === "undefined") {
    return null;
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  }

  return createPortal(
    <div
      className="glossary-modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        className="glossary-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Glossaire RunNSee"
      >
        <header className="glossary-modal-header">
          <div>
            <span className="eyebrow">Glossaire</span>
            <h2 className="card-title">Tous les termes en un coup d'oeil</h2>
            <p className="card-subtitle">
              Definitions vulgarisees, seuils indicatifs et references scientifiques pour mieux lire ton tableau de bord.
            </p>
          </div>
          <button
            type="button"
            className="button button-outline glossary-modal-close"
            onClick={onClose}
            aria-label="Fermer le glossaire"
          >
            Fermer
          </button>
        </header>

        <div className="glossary-modal-toolbar">
          <label className="field glossary-search-field">
            <span className="field-label">Rechercher</span>
            <input
              className="field-input"
              type="search"
              value={searchValue}
              placeholder="Ex. CTL, monotonie, vitesse critique"
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>
          <div className="glossary-categories" role="tablist" aria-label="Categories">
            <button
              type="button"
              className={`glossary-category-pill ${activeCategory === "all" ? "is-active" : ""}`}
              onClick={() => setActiveCategory("all")}
            >
              Tous
            </button>
            {GLOSSARY_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                className={`glossary-category-pill ${activeCategory === category ? "is-active" : ""}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="glossary-modal-body">
          <div className="glossary-list">
            {filteredEntries.length ? (
              filteredEntries.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  className={`glossary-entry ${activeEntryKey === entry.key ? "is-active" : ""}`}
                  onClick={() => onActiveEntryChange(entry.key)}
                >
                  <div className="glossary-entry-header">
                    <strong>{entry.term}</strong>
                    <span className="status-pill status-idle">{entry.category}</span>
                  </div>
                  <span className="small-text">{entry.short}</span>
                </button>
              ))
            ) : (
              <div className="empty-state">
                Aucun terme ne correspond a ta recherche.
              </div>
            )}
          </div>

          <div className="glossary-detail">
            {activeEntry ? (
              <article>
                <header className="glossary-detail-header">
                  <span className="eyebrow">{activeEntry.category}</span>
                  <h3>{activeEntry.term}</h3>
                  {activeEntry.aliases?.length ? (
                    <p className="small-text">Aussi appele : {activeEntry.aliases.join(", ")}.</p>
                  ) : null}
                </header>

                <section className="glossary-detail-section">
                  <span className="field-label">Definition</span>
                  <p>{activeEntry.definition}</p>
                </section>

                {activeEntry.formula ? (
                  <section className="glossary-detail-section">
                    <span className="field-label">Formule</span>
                    <code className="glossary-formula">{activeEntry.formula}</code>
                  </section>
                ) : null}

                {activeEntry.thresholds ? (
                  <section className="glossary-detail-section">
                    <span className="field-label">Reperes / seuils</span>
                    <p>{activeEntry.thresholds}</p>
                  </section>
                ) : null}

                {activeEntry.reference ? (
                  <section className="glossary-detail-section">
                    <span className="field-label">Pour aller plus loin</span>
                    <p className="small-text">{activeEntry.reference}</p>
                  </section>
                ) : null}
              </article>
            ) : (
              <div className="glossary-detail-placeholder">
                <p className="small-text">
                  Selectionne un terme dans la liste pour afficher sa definition complete, sa formule eventuelle, les seuils indicatifs et les references scientifiques associees.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function GlossaryModal({ isOpen = false, onClose }) {
  const [isEventOpen, setIsEventOpen] = useState(false);
  const [activeEntryKey, setActiveEntryKey] = useState(null);

  useEffect(() => {
    function handleOpenGlossary(event) {
      const entryKey = String(event?.detail?.entryKey || "").trim();
      setActiveEntryKey(entryKey || null);
      setIsEventOpen(true);
    }

    window.addEventListener(OPEN_GLOSSARY_EVENT, handleOpenGlossary);

    return () => {
      window.removeEventListener(OPEN_GLOSSARY_EVENT, handleOpenGlossary);
    };
  }, []);

  const resolvedIsOpen = Boolean(isOpen || isEventOpen);

  const handleClose = () => {
    setIsEventOpen(false);
    setActiveEntryKey(null);
    onClose?.();
  };

  if (!resolvedIsOpen) {
    return null;
  }

  return (
    <GlossaryModalContent
      activeEntryKey={activeEntryKey}
      onActiveEntryChange={setActiveEntryKey}
      onClose={handleClose}
    />
  );
}
