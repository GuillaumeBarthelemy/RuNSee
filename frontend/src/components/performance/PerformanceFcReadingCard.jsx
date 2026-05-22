import { memo } from "react";

/**
 * Lecture de l'effort (spec section 10.2 obligatoire).
 * Bloc texte coach interpretant la reponse cardiaque.
 */
function PerformanceFcReadingCard({ paragraphs = [], fcRepos = null, warning = "" }) {
  return (
    <section className="performance-panel performance-fc-reading-card">
      <div className="performance-panel-head">
        <h3>Lecture de l'effort</h3>
      </div>
      <div className="performance-fc-reading-body">
        {paragraphs.map((p, idx) => (
          <p key={`fc-reading-${idx}`}>{p}</p>
        ))}
      </div>
      {fcRepos ? (
        <small className="performance-fc-reading-rest">
          FC repos (réglages) : <b>{fcRepos.value} bpm</b>
        </small>
      ) : null}
      {warning ? (
        <p className="performance-fc-reading-warning">{warning}</p>
      ) : null}
    </section>
  );
}

export default memo(PerformanceFcReadingCard);
