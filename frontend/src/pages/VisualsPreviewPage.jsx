import AppShell from "../layouts/AppShell.jsx";
import BandPositioner from "../components/visuals/BandPositioner.jsx";
import MetricGauge from "../components/visuals/MetricGauge.jsx";
import MicroBars from "../components/visuals/MicroBars.jsx";
import RangeBar from "../components/visuals/RangeBar.jsx";
import TrendChip from "../components/visuals/TrendChip.jsx";
import {
  freshnessTone,
  load7dTone,
  readinessTone,
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
    </AppShell>
  );
}
