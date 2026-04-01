import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getDisplaySportLabel } from "../utils/activityAggregations.js";

function formatDistance(distance) {
  return distance ? (distance / 1000).toFixed(2) : "0.00";
}

function formatMinutes(seconds) {
  return seconds ? Math.round(seconds / 60) : 0;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildPageItems(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1);
    pages.add(totalPages - 2);
    pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const result = [];

  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    const previous = sorted[index - 1];
    if (index > 0 && page - previous > 1) {
      result.push(`ellipsis-${index}`);
    }
    result.push(page);
  }

  return result;
}

export default function ActivitiesTable({
  activities,
  currentAnchor,
  onAnchorHandled,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) {
  const navigate = useNavigate();

  const totalRows = Array.isArray(activities) ? activities.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (safePage !== currentPage) {
      onPageChange?.(safePage);
    }
  }, [currentPage, onPageChange, safePage]);

  useEffect(() => {
    if (!currentAnchor) return undefined;
    const target = document.getElementById(currentAnchor);
    if (!target) return undefined;

    requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("row-highlight");
    });

    const timer = window.setTimeout(() => {
      target.classList.remove("row-highlight");
      onAnchorHandled?.();
    }, 1800);

    return () => window.clearTimeout(timer);
  }, [currentAnchor, onAnchorHandled, activities, safePage]);

  const rows = useMemo(() => {
    if (!Array.isArray(activities)) return [];
    const start = (safePage - 1) * pageSize;
    return activities.slice(start, start + pageSize);
  }, [activities, pageSize, safePage]);

  const startIndex = totalRows === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(totalRows, safePage * pageSize);
  const pageItems = useMemo(() => buildPageItems(safePage, totalPages), [safePage, totalPages]);

  const openDetail = (activity) => {
    const anchorId = `activity-row-${activity.stravaActivityId}`;
    sessionStorage.setItem("runsee-return-hash", anchorId);
    navigate(`/activities/${activity.stravaActivityId}`, {
      state: {
        returnHash: anchorId,
      },
    });
  };

  return (
    <section className="card">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <h2 className="card-title">Activités</h2>
          <p className="card-subtitle">Clique sur une ligne pour ouvrir sa fiche détail, puis revenir exactement au même endroit avec les mêmes filtres.</p>
        </div>
        <div className="table-toolbar">
          <div className="small-text">{startIndex}-{endIndex} / {totalRows}</div>
          <label className="inline-field">
            <span className="field-label inline-label">Lignes visibles</span>
            <select className="field-input field-input-small" value={pageSize} onChange={(event) => onPageSizeChange?.(Number(event.target.value))}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </label>
        </div>
      </div>

      {!rows.length ? (
        <div className="empty-state">Aucune activité disponible pour les filtres sélectionnés.</div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="table premium-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activité</th>
                  <th>Sport</th>
                  <th>Distance</th>
                  <th>Temps</th>
                  <th>D+</th>
                  <th>FC moy.</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((activity) => {
                  const anchorId = `activity-row-${activity.stravaActivityId}`;
                  return (
                    <tr
                      key={activity.id || activity.stravaActivityId}
                      id={anchorId}
                      className="clickable-row"
                      onClick={() => openDetail(activity)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openDetail(activity);
                        }
                      }}
                      tabIndex={0}
                    >
                      <td>{formatDate(activity.startDate || activity.startDateLocal)}</td>
                      <td>
                        <div className="activity-name-cell">
                          <strong>{activity.name || "-"}</strong>
                          <span className="small-text">#{activity.stravaActivityId}</span>
                        </div>
                      </td>
                      <td>{getDisplaySportLabel(activity)}</td>
                      <td>{formatDistance(activity.distance)} km</td>
                      <td>{formatMinutes(activity.movingTime)} min</td>
                      <td>{Math.round(activity.totalElevationGain || 0)} m</td>
                      <td>{activity.averageHeartrate ? `${Math.round(activity.averageHeartrate)} bpm` : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pagination-shell top-gap-sm">
            <button className="button button-outline pagination-button" onClick={() => onPageChange?.(Math.max(1, safePage - 1))} disabled={safePage <= 1}>
              ←
            </button>

            <div className="pagination-pages">
              {pageItems.map((item) => {
                if (String(item).startsWith("ellipsis")) {
                  return <span className="pagination-ellipsis" key={item}>…</span>;
                }

                return (
                  <button
                    key={item}
                    className={`pagination-page ${item === safePage ? "is-active" : ""}`}
                    onClick={() => onPageChange?.(item)}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <button className="button button-outline pagination-button" onClick={() => onPageChange?.(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}>
              →
            </button>
          </div>
        </>
      )}
    </section>
  );
}
