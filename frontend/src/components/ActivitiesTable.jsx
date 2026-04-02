import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { getDisplaySportLabel } from "../utils/activityAggregations.js";

const ALLOWED_PAGE_SIZES = [10, 20, 50, 100];
const noop = () => {};

function formatDistance(distance) {
  const numeric = Number(distance);
  return Number.isFinite(numeric) && numeric > 0 ? (numeric / 1000).toFixed(2) : "0.00";
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
    pages.add(2); pages.add(3); pages.add(4);
  }
  if (currentPage >= totalPages - 2) {
    pages.add(totalPages - 1); pages.add(totalPages - 2); pages.add(totalPages - 3);
  }

  const sorted = Array.from(pages).filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const result = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    const previous = sorted[index - 1];
    if (index > 0 && page - previous > 1) result.push(`ellipsis-${index}`);
    result.push(page);
  }
  return result;
}

export default function ActivitiesTable({
  activities = [],
  groupSports = true,
  currentAnchor = "",
  onAnchorHandled = noop,
  currentPage = 1,
  pageSize = 20,
  onPageChange = noop,
  onPageSizeChange = noop,
}) {
  const navigate = useNavigate();
  const safeActivities = useMemo(() => (Array.isArray(activities) ? activities : []), [activities]);
  const safePageSize = ALLOWED_PAGE_SIZES.includes(Number(pageSize)) ? Number(pageSize) : 20;
  const normalizedPage = Math.max(1, Number(currentPage) || 1);
  const totalRows = safeActivities.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / safePageSize));
  const safePage = Math.min(normalizedPage, totalPages);

  const rows = useMemo(() => {
    const start = (safePage - 1) * safePageSize;
    return safeActivities.slice(start, start + safePageSize);
  }, [safeActivities, safePage, safePageSize]);

  useEffect(() => {
    if (safePage !== normalizedPage) onPageChange(safePage);
  }, [safePage, normalizedPage, onPageChange]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!currentAnchor) return;
    const target = document.getElementById(currentAnchor);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("row-highlight");
    const timer = window.setTimeout(() => {
      target.classList.remove("row-highlight");
      onAnchorHandled?.();
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [currentAnchor, onAnchorHandled, rows]);

  const startIndex = totalRows === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endIndex = Math.min(totalRows, safePage * safePageSize);
  const pageItems = useMemo(() => buildPageItems(safePage, totalPages), [safePage, totalPages]);

  const openDetail = (activity) => {
    if (!activity?.stravaActivityId) return;
    const anchorId = `activity-row-${activity.stravaActivityId}`;
    if (typeof window !== "undefined" && window.sessionStorage) {
      sessionStorage.setItem("runsee-return-hash", anchorId);
    }
    navigate(`/activities/${activity.stravaActivityId}`, { state: { returnHash: anchorId } });
  };

  return (
    <section className="card">
      <div className="card-header-row align-center wrap-on-mobile">
        <div>
          <h2 className="card-title">Activités</h2>
          <p className="card-subtitle">Clic sur une ligne pour ouvrir sa fiche détail puis revenir exactement au bon endroit.</p>
        </div>
        <div className="table-toolbar">
          <div className="small-text">{startIndex}-{endIndex} / {totalRows}</div>
          <label className="inline-field">
            <span className="field-label inline-label">Lignes</span>
            <select className="field-input field-input-small" value={safePageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
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
                {rows.map((activity, index) => {
                  const key = activity?.id || activity?.stravaActivityId || activity?.name || `activity-${safePage}-${index}`;
                  const anchorId = activity?.stravaActivityId ? `activity-row-${activity.stravaActivityId}` : undefined;
                  const isClickable = Boolean(activity?.stravaActivityId);
                  return (
                    <tr
                      key={key}
                      id={anchorId}
                      className={isClickable ? "clickable-row" : ""}
                      onClick={() => openDetail(activity)}
                      onKeyDown={(event) => {
                        if (isClickable && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          openDetail(activity);
                        }
                      }}
                      tabIndex={isClickable ? 0 : -1}
                    >
                      <td>{formatDate(activity.startDate || activity.startDateLocal)}</td>
                      <td>
                        <div className="activity-name-cell">
                          <strong>{activity.name || "-"}</strong>
                          <span className="small-text">{activity?.stravaActivityId ? `#${activity.stravaActivityId}` : "-"}</span>
                        </div>
                      </td>
                      <td>{getDisplaySportLabel(activity, { groupSports })}</td>
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
            <button className="button button-outline pagination-button" onClick={() => onPageChange(Math.max(1, safePage - 1))} disabled={safePage <= 1}>
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
                    onClick={() => onPageChange(item)}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <button className="button button-outline pagination-button" onClick={() => onPageChange(Math.min(totalPages, safePage + 1))} disabled={safePage >= totalPages}>
              →
            </button>
          </div>
        </>
      )}
    </section>
  );
}
