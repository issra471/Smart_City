// Carte des stations (Leaflet + fond OpenStreetMap, gratuit et sans compte).
// - `stations` : repères cliquables ; `fromId` / `toId` : départ et arrivée (ligne tracée entre les deux).
// - `onMapClick` + `marker` : mode « choisir une position » (ajout d'une station par l'administrateur).
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./station-map.css";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TUNIS = [36.85, 10.27];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const pin = (kind, badge, label) =>
  L.divIcon({ className: "", iconSize: [0, 0], html: `<div class="st-pin ${kind ? `st-pin--${kind}` : ""}"><b>${esc(badge)}</b>${label ? `<span>${esc(label)}</span>` : ""}</div>` });

export default function StationMap({ stations = [], fromId = null, toId = null, onPick, onMapClick, marker = null, className = "" }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const handlers = useRef({});
  handlers.current = { onPick, onMapClick };

  // Création de la carte (une seule fois).
  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false, zoomControl: true }).setView(TUNIS, 11);
    // OpenStreetMap refuse les images demandées sans « Referer » ; Django le masque par défaut (same-origin).
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 18, referrerPolicy: "strict-origin-when-cross-origin" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e) => handlers.current.onMapClick?.(e.latlng.lat, e.latlng.lng));
    map.current = m;
    const points = stations.map((s) => [s.lat, s.lng]);
    if (points.length > 1) m.fitBounds(points, { paddingTopLeft: [40, 40], paddingBottomRight: [130, 40] }); // place à droite pour les noms
    else if (points.length === 1) m.setView(points[0], 13);
    // La taille du bloc peut changer après l'animation d'entrée de la page.
    const t = setTimeout(() => m.invalidateSize(), 500);
    return () => (clearTimeout(t), m.remove());
  }, []);

  // Repères et ligne du trajet.
  useEffect(() => {
    const g = layer.current;
    g.clearLayers();
    const from = stations.find((s) => s.id === fromId);
    const to = stations.find((s) => s.id === toId);
    if (from && to) L.polyline([[from.lat, from.lng], [to.lat, to.lng]], { color: "#0b2a23", weight: 4, dashArray: "2 10", lineCap: "round" }).addTo(g);
    for (const s of stations) {
      const kind = s.id === fromId ? "from" : s.id === toId ? "to" : s.units === 0 ? "empty" : "";
      const badge = s.id === fromId ? "A" : s.id === toId ? "B" : (s.units ?? "•");
      const mk = L.marker([s.lat, s.lng], { icon: pin(kind, badge, s.name), zIndexOffset: kind === "from" || kind === "to" ? 500 : 0, riseOnHover: true, keyboard: false }).addTo(g);
      mk.on("click", (e) => (L.DomEvent.stopPropagation(e), handlers.current.onPick?.(s.id)));
    }
    if (marker) L.marker([marker.lat, marker.lng], { icon: pin("new", "+", "Nouvelle station"), zIndexOffset: 800, interactive: false }).addTo(g);
  }, [stations, fromId, toId, marker]);

  return <div ref={el} className={`st-map ${className}`} role="application" aria-label="Carte des stations" />;
}
