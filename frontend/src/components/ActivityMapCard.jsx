import { useMemo } from "react";
import { MapContainer, Marker, Polyline, TileLayer } from "react-leaflet";
import L from "leaflet";

const startIcon = new L.DivIcon({ className: "custom-map-marker custom-map-marker-start", html: "<span></span>", iconSize: [18, 18], iconAnchor: [9, 9] });
const endIcon = new L.DivIcon({ className: "custom-map-marker custom-map-marker-end", html: "<span></span>", iconSize: [18, 18], iconAnchor: [9, 9] });

function decodePolyline(str, precision = 5) {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates = [];
  const factor = 10 ** precision;

  while (index < str.length) {
    let result = 1;
    let shift = 0;
    let byte;

    do {
      byte = str.charCodeAt(index++) - 63 - 1;
      result += byte << shift;
      shift += 5;
    } while (byte >= 0x1f && index <= str.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;
    do {
      byte = str.charCodeAt(index++) - 63 - 1;
      result += byte << shift;
      shift += 5;
    } while (byte >= 0x1f && index <= str.length);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    coordinates.push([lat / factor, lng / factor]);
  }

  return coordinates;
}

export default function ActivityMapCard({ activity = null, detailedPayload = null }) {
  const polyline = activity?.mapPolyline || detailedPayload?.map?.polyline || activity?.mapSummaryPolyline || detailedPayload?.map?.summary_polyline;
  const points = useMemo(() => {
    if (!polyline) return [];
    try {
      return decodePolyline(polyline).filter((point) => Array.isArray(point) && point.length === 2 && point.every((value) => Number.isFinite(value)));
    } catch {
      return [];
    }
  }, [polyline]);
  const center = points.length ? points[Math.floor(points.length / 2)] : [43.2965, 5.3698];
  const start = points[0] || null;
  const end = points[points.length - 1] || null;

  return (
    <section className="card top-gap-sm">
      <div className="card-header-row">
        <div>
          <h3 className="card-title">Parcours</h3>
          <p className="card-subtitle">Fond de carte OpenStreetMap avec le tracé de l'activité.</p>
        </div>
      </div>
      {points.length ? (
        <div className="map-shell leaflet-shell">
          <MapContainer center={center} zoom={13} scrollWheelZoom className="activity-map-leaflet">
            <TileLayer
              attribution="&copy; OpenStreetMap contributors &copy; CARTO"
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            <Polyline positions={points} pathOptions={{ color: "#F97316", weight: 5, opacity: 0.85 }} />
            {start ? <Marker position={start} icon={startIcon} /> : null}
            {end ? <Marker position={end} icon={endIcon} /> : null}
          </MapContainer>
          <div className="map-legend">
            <span><span className="legend-dot legend-dot-start" /> Départ</span>
            <span><span className="legend-dot legend-dot-end" /> Arrivée</span>
          </div>
        </div>
      ) : (
        <div className="empty-state">Aucun tracé disponible localement. Lance l'enrichissement Strava pour récupérer la carte détaillée.</div>
      )}
    </section>
  );
}
