import AppShell from "../layouts/AppShell.jsx";
import EmptyState from "../components/visuals/alpine/EmptyState.jsx";

/**
 * ProgressionPage — Placeholder Lot 7.
 *
 * La vue complète "Progression" avec ses 4 sous-onglets (Cumul annuel,
 * Évolution depuis le début de l'année, Comparaisons, Tendances long terme)
 * sera implémentée en Lot 7 du chantier Alpine Light.
 *
 * Voir `docs/backlog/BACKLOG_FONCTIONNALITES_FUTURES.md` section 4.
 */
export default function ProgressionPage() {
  return (
    <AppShell
      eyebrow="Progression"
      title="Progression"
      subtitle="Construction long terme : cumul annuel, évolution depuis le début de l'année, comparaisons N-1 et tendances multi-mois."
    >
      <EmptyState
        icon="🏔️"
        title="Page en construction"
        description="La vue Progression arrive prochainement. Tu pourras y suivre ton volume hebdomadaire, tes cumuls annuels, comparer avec l'année précédente et observer tes tendances long terme."
      />
    </AppShell>
  );
}
