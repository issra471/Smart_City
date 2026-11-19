// Symbole du site : trois immeubles (comme des barres de données) et un point de signal.
// tone="green" : fond vert, pour les fonds clairs. tone="lime" : fond citron, pour les fonds sombres.
export default function LogoMark({ tone = "green", className = "size-9" }) {
  const c = tone === "lime" ? { bg: "#c8f169", fg: "#0b2a23", dot: "#087a5b" } : { bg: "#087a5b", fg: "#fffefa", dot: "#c8f169" };
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className={`shrink-0 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-6 ${className}`}>
      <rect width="36" height="36" rx="11" fill={c.bg} />
      <rect x="8" y="17" width="5" height="11" rx="2.5" fill={c.fg} />
      <rect x="15.5" y="9" width="5" height="19" rx="2.5" fill={c.fg} />
      <rect x="23" y="20" width="5" height="8" rx="2.5" fill={c.fg} />
      <circle cx="25.5" cy="13" r="2.6" fill={c.dot} />
    </svg>
  );
}
