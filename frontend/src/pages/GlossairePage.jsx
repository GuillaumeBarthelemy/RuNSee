import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import AppShell from "../layouts/AppShell.jsx";
import { GLOSSARY_CATEGORIES, GLOSSARY_ENTRIES } from "../content/glossary.js";

function normalize(value) {
  return String(value || "").toLowerCase().trim();
}

function entryMatchesSearch(entry, query) {
  if (!query) return true;
  const q = normalize(query);
  if (normalize(entry.term).includes(q)) return true;
  if (normalize(entry.short).includes(q)) return true;
  if (normalize(entry.definition).includes(q)) return true;
  return (entry.aliases || []).some((alias) => normalize(alias).includes(q));
}

export default function GlossairePage() {
  const location = useLocation();
  const [search, setSearch] = useState("");

  // Au montage : si l'URL contient un hash (ex: /glossaire#vfc), faire défiler
  // sur l'ancre correspondante.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.slice(1);
    requestAnimationFrame(() => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
        target.classList.add("glossary-entry--highlight");
        setTimeout(() => target.classList.remove("glossary-entry--highlight"), 2000);
      }
    });
  }, [location.hash]);

  const filteredByCategory = useMemo(() => {
    const result = new Map();
    for (const category of GLOSSARY_CATEGORIES) {
      const entries = GLOSSARY_ENTRIES
        .filter((entry) => entry.category === category)
        .filter((entry) => entryMatchesSearch(entry, search))
        .sort((a, b) => a.term.localeCompare(b.term, "fr"));
      if (entries.length) result.set(category, entries);
    }
    return result;
  }, [search]);

  const totalMatches = useMemo(
    () => Array.from(filteredByCategory.values()).reduce((sum, list) => sum + list.length, 0),
    [filteredByCategory],
  );

  return (
    <AppShell
      eyebrow="Glossaire"
      title="Indicateurs et terminologie"
      subtitle="Tous les indicateurs RunSee, leurs formules et leurs références scientifiques."
    >
      <section className="card glossary-search-card">
        <label className="glossary-search-label" htmlFor="glossary-search">
          Recherche
        </label>
        <input
          id="glossary-search"
          type="search"
          className="glossary-search-input"
          placeholder="VFC, GAP, charge, fraîcheur..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          autoComplete="off"
        />
        <p className="glossary-search-hint">
          {totalMatches} indicateur{totalMatches > 1 ? "s" : ""} trouvé{totalMatches > 1 ? "s" : ""}.
        </p>
      </section>

      {Array.from(filteredByCategory.entries()).map(([category, entries]) => (
        <section key={category} className="card glossary-category">
          <h2 className="glossary-category-title">{category}</h2>
          <div className="glossary-entries">
            {entries.map((entry) => (
              <article id={entry.key} key={entry.key} className="glossary-entry">
                <header className="glossary-entry-header">
                  <h3 className="glossary-entry-term">{entry.term}</h3>
                  {entry.aliases && entry.aliases.length > 0 ? (
                    <p className="glossary-entry-aliases">
                      Aussi appelé : {entry.aliases.join(" · ")}
                    </p>
                  ) : null}
                </header>

                <p className="glossary-entry-short">{entry.short}</p>

                <p className="glossary-entry-definition">{entry.definition}</p>

                {entry.formula ? (
                  <p className="glossary-entry-meta">
                    <strong>Calcul :</strong> {entry.formula}
                  </p>
                ) : null}

                {entry.thresholds ? (
                  <p className="glossary-entry-meta">
                    <strong>Repères :</strong> {entry.thresholds}
                  </p>
                ) : null}

                {entry.reference ? (
                  <p className="glossary-entry-meta glossary-entry-reference">
                    <strong>Source :</strong> {entry.reference}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}

      {totalMatches === 0 ? (
        <div className="card glossary-empty">
          Aucune entrée ne correspond à ta recherche.
        </div>
      ) : null}
    </AppShell>
  );
}
