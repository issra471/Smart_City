// Carte des signalements (Leaflet + OpenStreetMap).
// - `reports` : épingles colorées selon le statut, avec l'icône de la catégorie ;
// - `selectedId` / `onSelect` : épingle mise en avant, la carte s'y déplace ;
// - `pick` = { pos, onPick } : mode « placer le problème » (clic sur la carte, épingle déplaçable, « Ma position »).
import { useEffect, useRef, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { LoaderCircle, LocateFixed, MapPin } from "lucide-react";
import { REPORT_COLORS, REPORT_ICONS } from "../lib/ui";
import "./report-map.css";

const TILES = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const TUNIS = [36.835, 10.24];

const svg = new Map();
const iconSvg = (Icon) => {
  if (!svg.has(Icon)) svg.set(Icon, renderToStaticMarkup(<Icon size={16} strokeWidth={2.4} />));
  return svg.get(Icon);
};
// Par défaut : signalements d'infrastructure (icône = catégorie, couleur = statut).
const defaultIcon = (r) => REPORT_ICONS[r.category] || MapPin;
const defaultColor = (r) => REPORT_COLORS[r.status] || "#0b2a23";

const reportIcon = (r, selected, faded, iconFor, colorFor) =>
  L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div class="rp-pin${selected ? " rp-pin--on" : ""}${faded ? " rp-pin--faded" : ""}" style="--c:${colorFor(r)}">${iconSvg(iconFor(r) || MapPin)}</div>`,
  });
const pickIcon = L.divIcon({ className: "", iconSize: [0, 0], html: `<div class="rp-new"><span></span></div>` });

export default function ReportMap({ reports = [], selectedId = null, onSelect, pick = null, iconFor = defaultIcon, colorFor = defaultColor, label = "Carte des signalements", className = "" }) {
  const el = useRef(null);
  const map = useRef(null);
  const layer = useRef(null);
  const pickMarker = useRef(null);
  const cb = useRef({});
  cb.current = { onSelect, onPick: pick?.onPick };
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState("");

  useEffect(() => {
    const m = L.map(el.current, { scrollWheelZoom: false }).setView(TUNIS, 12);
    // OpenStreetMap refuse les images demandées sans « Referer » ; Django le masque par défaut (same-origin).
    L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19, referrerPolicy: "strict-origin-when-cross-origin" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e) => cb.current.onPick?.(e.latlng.lat, e.latlng.lng));
    map.current = m;
    if (pick?.pos) m.setView([pick.pos.lat, pick.pos.lng], 17);
    else {
      const pts = reports.filter((r) => r.lat != null).map((r) => [r.lat, r.lng]);
      if (pts.length > 1) m.fitBounds(pts, { padding: [50, 50], maxZoom: 15 });
      else if (pts.length === 1) m.setView(pts[0], 15);
    }
    const t = setTimeout(() => m.invalidateSize(), 500);
    return () => (clearTimeout(t), m.remove());
  }, []);

  // Épingles des signalements.
  useEffect(() => {
    const g = layer.current;
    g.clearLayers();
    for (const r of reports) {
      if (r.lat == null) continue;
      const on = r.id === selectedId;
      const mk = L.marker([r.lat, r.lng], { icon: reportIcon(r, on, !!pick && !on, iconFor, colorFor), zIndexOffset: on ? 600 : 0, riseOnHover: true, keyboard: false, title: r.title }).addTo(g);
      mk.on("click", (e) => (L.DomEvent.stopPropagation(e), cb.current.onSelect?.(r.id)));
    }
  }, [reports, selectedId, !!pick]);

  // La carte va vers l'épingle choisie.
  useEffect(() => {
    const r = reports.find((x) => x.id === selectedId);
    if (r?.lat != null && !pick) map.current.flyTo([r.lat, r.lng], Math.max(map.current.getZoom(), 15), { duration: 0.6 });
  }, [selectedId]);

  // Épingle du nouveau signalement (déplaçable).
  const pos = pick?.pos;
  useEffect(() => {
    const m = map.current;
    if (!pos) {
      pickMarker.current?.remove();
      pickMarker.current = null;
      return;
    }
    if (!pickMarker.current) {
      pickMarker.current = L.marker([pos.lat, pos.lng], { icon: pickIcon, draggable: true, zIndexOffset: 1000, keyboard: false }).addTo(m);
      pickMarker.current.on("dragend", (e) => {
        const p = e.target.getLatLng();
        cb.current.onPick?.(p.lat, p.lng);
      });
    } else pickMarker.current.setLatLng([pos.lat, pos.lng]);
  }, [pos?.lat, pos?.lng]);

  function locate() {
    if (!navigator.geolocation) return setLocError("La localisation n'est pas disponible sur cet appareil.");
    setLocating(true);
    setLocError("");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        const { latitude: lat, longitude: lng } = p.coords;
        map.current.flyTo([lat, lng], 17, { duration: 0.8 });
        cb.current.onPick?.(lat, lng);
      },
      () => (setLocating(false), setLocError("Position introuvable. Autorisez la localisation ou cliquez sur la carte.")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <div ref={el} className={`rp-map size-full ${pick ? "cursor-crosshair" : ""}`} role="application" aria-label={label} />
      {pick && (
        <div className="pointer-events-none absolute inset-x-3 top-3 z-[500] flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={locate}
            disabled={locating}
            className="pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full bg-deep px-4 py-2.5 text-sm font-semibold text-paper shadow-lg transition hover:bg-ink disabled:opacity-70"
          >
            {locating ? <LoaderCircle className="size-4 animate-spin" /> : <LocateFixed className="size-4 text-lime" />} Ma position
          </button>
          {locError && <p className="pointer-events-auto max-w-xs rounded-2xl bg-paper px-3 py-2 text-xs text-[#b4532f] shadow-lg">{locError}</p>}
        </div>
      )}
    </div>
  );
}
