import AppShell from "../layouts/AppShell.jsx";
import BandPositioner from "../components/visuals/BandPositioner.jsx";
import MetricGauge from "../components/visuals/MetricGauge.jsx";
import MicroBars from "../components/visuals/MicroBars.jsx";
import RangeBar from "../components/visuals/RangeBar.jsx";
import TrendChip from "../components/visuals/TrendChip.jsx";
import CoachAdviceBar from "../components/visuals/alpine/CoachAdviceBar.jsx";
import EmptyState from "../components/visuals/alpine/EmptyState.jsx";
import InsightCard from "../components/visuals/alpine/InsightCard.jsx";
import KpiCard from "../components/visuals/alpine/KpiCard.jsx";
import MetricRow from "../components/visuals/alpine/MetricRow.jsx";
import PageHeader from "../components/visuals/alpine/PageHeader.jsx";
import RightRailCard from "../components/visuals/alpine/RightRailCard.jsx";
import SectionHeader from "../components/visuals/alpine/SectionHeader.jsx";
import SourceBadge from "../components/visuals/alpine/SourceBadge.jsx";
import SubTabs from "../components/visuals/alpine/SubTabs.jsx";
import {
  energyLevelTone,
  freshnessTone,
  load7dTone,
  readinessTone,
  restingHrDeltaTone,
  sleepScoreTone,
  vfcDeltaTone,
} from "../utils/tonePicker.js";

/**
 * Page de prévisualisation des composants visuels Phase G.
 * Accessible via /visuals-preview pour validation visuelle UX (dev/admin).
 */
export default function VisualsPreviewPage() {
  return (
    <AppShell
      eyebrow="Démo composants"
      title="Composants visuels Phase G"
      subtitle="Aperçu des composants canoniques. Cette page sert à la validation UX et n'est pas visible en navigation principale."
    >
      {/* --- MetricGauge -------------------------------------------------- */}
      <section className="card">
        <h2 className="card-title">MetricGauge — jauge demi-cercle</h2>
        <p className="card-subtitle">Score 0-100 avec tone selon valeur. Trois tailles : sm, md.</p>
        <div className="visuals-preview-row">
          <MetricGauge value={82} unit="/ 100" label="Sommeil" tone={sleepScoreTone(82)} />
          <MetricGauge value={65} unit="/ 100" label="Sommeil" tone={sleepScoreTone(65)} />
          <MetricGauge value={42} unit="/ 100" label="Sommeil" tone={sleepScoreTone(42)} />
          <MetricGauge value={null} unit="/ 100" label="Données absentes" tone={3} />
          <MetricGauge value={75} unit="/ 100" label="Aptitude" tone={readinessTone(75)} size="sm" />
        </div>
      </section>

      {/* --- RangeBar ----------------------------------------------------- */}
      <section className="card">
        <h2 className="card-title">RangeBar — barre + zones colorées</h2>
        <p className="card-subtitle">Idéal pour fraîcheur, charge 7j, dérive cardiaque.</p>

        <div className="visuals-preview-stack">
          <RangeBar
            label="Fraîcheur"
            value={12}
            min={-50}
            max={40}
            unit="pts"
            zones={[
              { from: -50, to: -30, tone: 5, label: "Surcharge" },
              { from: -30, to: -10, tone: 4, label: "Pression" },
              { from: -10, to: 5, tone: 3, label: "Neutre" },
              { from: 5, to: 25, tone: 1, label: "Optimum" },
              { from: 25, to: 40, tone: 4, label: "Désent." },
            ]}
            tone={freshnessTone(12)}
          />

          <RangeBar
            label="Charge 7 jours"
            value={420}
            min={0}
            max={800}
            unit="pts"
            zones={[
              { from: 0, to: 200, tone: 3, label: "Léger" },
              { from: 200, to: 400, tone: 2, label: "Standard" },
              { from: 400, to: 600, tone: 4, label: "Dense" },
              { from: 600, to: 800, tone: 5, label: "Très chargé" },
            ]}
            tone={load7dTone(420)}
          />

          <RangeBar
            label="Dérive cardiaque"
            value={3.2}
            min={0}
            max={12}
            unit="%"
            zones={[
              { from: 0, to: 2, tone: 1, label: "Excellent" },
              { from: 2, to: 5, tone: 2, label: "Bon" },
              { from: 5, to: 8, tone: 4, label: "Vigilance" },
              { from: 8, to: 12, tone: 5, label: "Alerte" },
            ]}
          />
        </div>
      </section>

      {/* --- MicroBars ---------------------------------------------------- */}
      <section className="card">
        <h2 className="card-title">MicroBars — remplaçant des sparklines</h2>
        <p className="card-subtitle">7 ou 14 valeurs avec couleur par tone. Plus lisible qu'une courbe.</p>
        <div className="visuals-preview-stack">
          <div>
            <span className="card-subtitle">Volume 7 jours (km)</span>
            <MicroBars
              series={[8, 12, 0, 15, 9, 18, 11]}
              tones={[2, 1, 3, 1, 2, 1, 2]}
              ariaLabel="Volume 7 derniers jours"
            />
          </div>
          <div>
            <span className="card-subtitle">VFC 14 derniers jours (delta)</span>
            <MicroBars
              series={[-5, -3, -2, 1, 3, 5, 4, 2, -1, 2, 5, 7, 6, 8]}
              tones={[4, 3, 3, 3, 3, 2, 3, 3, 3, 3, 2, 1, 2, 1]}
              ariaLabel="VFC delta 14 jours"
            />
          </div>
          <div>
            <span className="card-subtitle">Données partielles</span>
            <MicroBars
              series={[8, null, 12, 9, null, 15, 11]}
              tones={[2, 3, 1, 2, 3, 1, 2]}
            />
          </div>
        </div>
      </section>

      {/* --- TrendChip ---------------------------------------------------- */}
      <section className="card">
        <h2 className="card-title">TrendChip — pill delta avec flèche</h2>
        <p className="card-subtitle">Compact, stackable. Idéal pour deltas vs repère sur tuiles Recovery.</p>
        <div className="visuals-preview-row">
          <TrendChip delta={5.2} unit="%" tone={vfcDeltaTone(5.2)} label="vs repère" />
          <TrendChip delta={-8.1} unit="%" tone={vfcDeltaTone(-8.1)} label="vs repère" />
          <TrendChip delta={0.3} unit="%" tone={3} label="vs repère" />
          <TrendChip delta={12} unit="%" tone={1} />
          <TrendChip delta={-15} unit="bpm" tone={5} label="alerte" />
        </div>
      </section>

      {/* --- BandPositioner ----------------------------------------------- */}
      <section className="card">
        <h2 className="card-title">BandPositioner — bandes empilées avec curseur</h2>
        <p className="card-subtitle">Idéal pour monotonie Foster, polarisation, niveaux qualitatifs.</p>
        <div className="visuals-preview-stack">
          <BandPositioner
            label="Monotonie Foster"
            value={1.8}
            valueDisplay="1.8"
            bands={[
              { label: "Variation saine (< 1.5)", from: -Infinity, to: 1.5, tone: 1 },
              { label: "Modérée (1.5 - 2.2)", from: 1.5, to: 2.2, tone: 3 },
              { label: "Risque surcharge (> 2.2)", from: 2.2, to: Infinity, tone: 5 },
            ]}
          />
          <BandPositioner
            label="Polarisation"
            value={3}
            valueDisplay="Polarisée"
            bands={[
              { label: "Polarisée (~80% bas)", from: 2.5, to: 3.5, tone: 1 },
              { label: "Pyramidale", from: 1.5, to: 2.5, tone: 3 },
              { label: "Seuil (Z3 > 25%)", from: 0, to: 1.5, tone: 4 },
            ]}
          />
        </div>
      </section>

      {/* --- Palette tones ------------------------------------------------ */}
      <section className="card">
        <h2 className="card-title">Palette tones</h2>
        <p className="card-subtitle">Référence visuelle des 5 niveaux qualitatifs.</p>
        <div className="visuals-preview-tone-grid">
          {[1, 2, 3, 4, 5].map((tone) => (
            <div
              key={tone}
              className={`tone-${tone}-bg`}
              style={{
                background: `var(--tone-${tone}-bg)`,
                border: `2px solid var(--tone-${tone})`,
                padding: "16px",
                borderRadius: "10px",
              }}
            >
              <div className={`tone-${tone}`} style={{ fontWeight: 700, fontSize: "16px" }}>
                Tone {tone}
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                {["Très bon", "Bon", "Neutre", "Vigilance", "Alerte"][tone - 1]}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================
          Alpine Light — Lot 1 design system
          ============================================================ */}

      <PageHeader
        eyebrow="Alpine Light"
        title="Design system Lot 1"
        subtitle="Aperçu des primitives Alpine Light. Ces composants sont additifs et n'impactent pas les pages existantes tant qu'elles ne les consomment pas."
      />

      {/* --- KpiCard ----------------------------------------------------- */}
      <section className="card">
        <SectionHeader
          kicker="Cartes KPI"
          title="KpiCard"
          subtitle="Carte synthétique pour Charge, Fatigue, Volume, Dénivelé, Récupération, Disponibilité."
        />
        <div className="visuals-preview-row" style={{ gap: 12, alignItems: "stretch" }}>
          <div style={{ minWidth: 200, flex: "1 1 200px" }}>
            <KpiCard
              label="Charge (7 j)"
              value="380"
              unit="pts"
              hint="Bloc standard"
              tone={load7dTone(380)}
              trend={{ delta: 6.4, unit: "%", tone: 2, label: "vs sem -1" }}
            />
          </div>
          <div style={{ minWidth: 200, flex: "1 1 200px" }}>
            <KpiCard
              label="Fatigue"
              value="42"
              unit="pts"
              hint="Stable"
              tone={3}
              trend={{ delta: -2.1, unit: "%", tone: 3, label: "vs J-7" }}
            />
          </div>
          <div style={{ minWidth: 200, flex: "1 1 200px" }}>
            <KpiCard
              label="Volume (7 j)"
              value="42"
              unit="km"
              hint="Bonne semaine"
              tone={2}
            />
          </div>
          <div style={{ minWidth: 200, flex: "1 1 200px" }}>
            <KpiCard
              label="Énergie"
              value="—"
              unit=""
              hint="Donnée Garmin absente"
              tone={3}
            />
          </div>
        </div>
      </section>

      {/* --- InsightCard ------------------------------------------------- */}
      <section className="card">
        <SectionHeader
          kicker="Lecture du jour"
          title="InsightCard"
          subtitle="Cartes de lecture/conseil avec tone qualitatif."
        />
        <div className="visuals-preview-stack" style={{ marginTop: 12 }}>
          <InsightCard tone="success" title="Charge maitrisée" icon="✓">
            Tu construis une bonne base. Garde une semaine plus légère toutes les 3 à 4 semaines.
          </InsightCard>
          <InsightCard tone="info" title="Lecture du jour" icon="ℹ">
            Forme correcte, marge présente. Endurance ou séance modérée selon ton plan.
          </InsightCard>
          <InsightCard tone="warning" title="Vigilance" icon="⚠">
            Fatigue récente élevée. Privilégie une sortie facile aujourd'hui.
          </InsightCard>
          <InsightCard tone="alert" title="Alerte" icon="!">
            Trois nuits courtes consécutives détectées. Repos actif recommandé sur 24-48 h.
          </InsightCard>
        </div>
      </section>

      {/* --- SubTabs ----------------------------------------------------- */}
      <section className="card">
        <SectionHeader
          kicker="Navigation"
          title="SubTabs"
          subtitle="Sous-onglets compacts utilisés dans Analyse / Performance / Progression. Source de vérité = hash URL."
        />
        <SubTabs
          tabs={[
            { id: "vue-ensemble", label: "Vue d'ensemble" },
            { id: "charges", label: "Charges" },
            { id: "tendances", label: "Tendances" },
            { id: "intensites", label: "Intensités" },
            { id: "sommeil-recup", label: "Sommeil & récupération" },
          ]}
          defaultTabId="vue-ensemble"
        />
      </section>

      {/* --- MetricRow + RightRailCard ----------------------------------- */}
      <section className="card">
        <SectionHeader
          kicker="Listes denses"
          title="MetricRow + RightRailCard"
          subtitle="Affichage compact pour la colonne droite ou les listes physiologiques."
        />
        <div className="visuals-preview-row" style={{ gap: 16, alignItems: "stretch" }}>
          <div style={{ minWidth: 260, flex: "1 1 260px" }}>
            <RightRailCard title="Récupération du jour" subtitle="Sources Garmin">
              <MetricRow label="Sommeil" value={82} unit="/100" tone={sleepScoreTone(82)} />
              <MetricRow label="VFC" value={56} unit="ms" hint="+5 % vs repère" tone={vfcDeltaTone(5)} />
              <MetricRow label="FC repos" value={49} unit="bpm" hint="-1 % vs repère" tone={restingHrDeltaTone(-1)} />
              <MetricRow label="Énergie" value={75} unit="%" tone={energyLevelTone(75)} />
              <MetricRow label="Aptitude" value={78} unit="/100" tone={readinessTone(78)} />
            </RightRailCard>
          </div>
          <div style={{ minWidth: 260, flex: "1 1 260px" }}>
            <RightRailCard
              title="Synthèse hebdo"
              subtitle="7 derniers jours"
              variant="soft"
              footer={<a href="#progression-cumul">Voir Cumul annuel →</a>}
            >
              <MetricRow label="Distance" value={42.3} unit="km" />
              <MetricRow label="Temps" value="4 h 12" />
              <MetricRow label="Dénivelé" value={620} unit="m" />
              <MetricRow label="Activités" value={4} />
              <MetricRow label="Fréquence" value="4 / 7 j" hint="constance OK" />
            </RightRailCard>
          </div>
          <div style={{ minWidth: 240, flex: "1 1 240px" }}>
            <RightRailCard title="Sources" subtitle="Identité multi-source">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <SourceBadge source="strava" />
                <SourceBadge source="garmin" />
                <SourceBadge source="runsee" />
                <SourceBadge source="manual" label="Saisie manuelle" />
              </div>
            </RightRailCard>
          </div>
        </div>
      </section>

      {/* --- EmptyState -------------------------------------------------- */}
      <section className="card">
        <SectionHeader
          kicker="États vides"
          title="EmptyState"
          subtitle="Quand aucune donnée n'est disponible, ou qu'une connexion provider est requise."
        />
        <EmptyState
          icon="🏔️"
          title="Pas encore d'objectif actif"
          description="Définis un objectif course pour suivre l'avancement de ton plan, voir le compte à rebours et obtenir des estimations de chrono prudentes."
          action={{ label: "Définir un objectif", onClick: () => {} }}
          secondaryAction={{ label: "Voir Performance", onClick: () => {} }}
        />
      </section>

      {/* --- CoachAdviceBar ---------------------------------------------- */}
      <section>
        <SectionHeader
          kicker="Conseil"
          title="CoachAdviceBar"
          subtitle="Bandeau bas de page, ton coach, descriptif et prudent."
        />
        <CoachAdviceBar tone="info" icon="🏔️" action={{ label: "Voir analyse", onClick: () => {} }}>
          Charge maitrisée cette semaine. Surveille ton sommeil sur les 2-3 prochains jours pour
          préserver ta dynamique.
        </CoachAdviceBar>
        <CoachAdviceBar tone="success" icon="✓">
          Tu construis une bonne base. Garde une séance facile entre les blocs intenses.
        </CoachAdviceBar>
        <CoachAdviceBar tone="warning" icon="⚠">
          Trois sorties intenses sur 5 jours : pense à insérer une journée plus calme.
        </CoachAdviceBar>
      </section>
    </AppShell>
  );
}
