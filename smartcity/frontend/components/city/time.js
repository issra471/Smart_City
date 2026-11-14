// Outils partagés entre le hero (HTML) et la scène 3D : heure, jour/nuit, couleurs.

const smooth = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** 1 en plein jour, 0 en pleine nuit, transitions douces à l'aube et au crépuscule. */
export const dayFactor = (h) => smooth(5.2, 6.7, h) * (1 - smooth(18.3, 19.8, h));

/** Pic au lever (~7h) et au coucher (~18h) du soleil, quand il fait encore clair. */
export const duskFactor = (h) => Math.min(1, Math.exp(-(((h - 7) / 0.8) ** 2)) + Math.exp(-(((h - 18) / 0.8) ** 2)));

/** Couleur du ciel : crème le jour, pêche au lever/coucher, bleu-vert au crépuscule, nuit profonde. */
export const skyColor = (h) => {
  const n = 1 - dayFactor(h);
  const light = mix("#f7f6ef", "#f7d3b3", duskFactor(h) * 0.85);
  return n < 0.5 ? mix(light, "#3f6f6b", n * 2) : mix("#3f6f6b", "#071d18", (n - 0.5) * 2);
};

export const nowHour = () => {
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
};

export const formatHour = (h) => {
  const m = Math.round(h * 60) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Mélange deux couleurs hexadécimales (#rrggbb). */
export const mix = (a, b, t) => {
  const p = (hex, i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0")).join("");
};
