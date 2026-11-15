// Hero de la page d'accueil : la ville 3D sert de menu.
// La scène (three.js) est chargée à la demande pour ne pas ralentir la page.
import { Component, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { router } from "@inertiajs/react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, List, Minus, Moon, Plus, Sun, Sunset, X } from "lucide-react";
import { dayFactor, duskFactor, formatHour, nowHour, skyColor } from "./time";

const CityScene = lazy(() => import("./CityScene"));
const ease = [0.22, 1, 0.36, 1];

function useMedia(query) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatch(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return match;
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Si la 3D plante (vieux navigateur, carte graphique bloquée), on affiche l'ancien hero. */
class Boundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFail?.();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const plural = (n, one, many) => (n ? `${n} ${n > 1 ? many : one}` : null);

function Stars({ opacity }) {
  const stars = useMemo(() => {
    let s = 11;
    const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
    return Array.from({ length: 80 }, () => ({ left: `${rnd() * 100}%`, top: `${rnd() * 62}%`, size: 1 + rnd() * 2, o: 0.3 + rnd() * 0.7 }));
  }, []);
  return (
    <div aria-hidden="true" className="absolute inset-0 transition-opacity duration-500" style={{ opacity }}>
      {stars.map((st, i) => (
        <i key={i} className="absolute rounded-full bg-paper" style={{ left: st.left, top: st.top, width: st.size, height: st.size, opacity: st.o }} />
      ))}
    </div>
  );
}

export default function CityHero({ modules, stats, fallback, onNightChange }) {
  const [webgl] = useState(hasWebGL);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [hour, setHour] = useState(nowHour);
  const [live, setLive] = useState(true); // l'heure suit l'horloge réelle
  const [active, setActive] = useState(null);
  const [entering, setEntering] = useState(null);
  const [zoom, setZoom] = useState(1);

  const compact = useMedia("(max-width: 1023px)");
  const canHover = useMedia("(hover: hover)");
  const reduced = useReducedMotion();
  const section = useRef(null);
  const inView = useInView(section, { margin: "150px" });
  const rot = useRef(0);
  const drag = useRef(null);
  const hoverTimer = useRef(0);

  const day = dayFactor(hour);
  const n = 1 - day;
  const dusk = duskFactor(hour);
  const dark = n > 0.35;
  const sky = skyColor(hour);

  useEffect(() => onNightChange?.(dark), [dark, onNightChange]);

  // Heure réelle, rafraîchie toutes les 30 s tant qu'on n'a pas touché au curseur.
  useEffect(() => {
    if (!live) return;
    setHour(nowHour());
    const id = setInterval(() => setHour(nowHour()), 30000);
    return () => clearInterval(id);
  }, [live]);

  // Retour arrière du navigateur : on enlève l'écran de transition.
  useEffect(() => {
    const reset = (e) => e.persisted && ((leaving.current = false), setEntering(null), setActive(null));
    const up = () => (drag.current = null);
    window.addEventListener("pageshow", reset);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("pageshow", reset);
      window.removeEventListener("pointerup", up);
    };
  }, []);

  const onOver = useCallback(
    (i) => {
      if (!canHover) return;
      clearTimeout(hoverTimer.current);
      setActive(i);
    },
    [canHover],
  );
  const onOut = useCallback(() => {
    if (!canHover) return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setActive(null), 380);
  }, [canHover]);

  const leaving = useRef(false); // évite deux entrées en même temps
  const enter = useCallback(
    (i, pt) => {
      if (leaving.current) return;
      leaving.current = true;
      clearTimeout(hoverTimer.current);
      setEntering({ i, x: pt?.x ?? window.innerWidth / 2, y: pt?.y ?? window.innerHeight / 2 });
      // On laisse le cercle recouvrir l'écran, puis on change de page sans rechargement.
      setTimeout(() => router.visit(modules[i].url), reduced ? 50 : 650);
    },
    [modules, reduced],
  );
  // Souris : un clic entre directement. Tactile : 1er appui = fiche, 2e = entrer.
  const onPick = useCallback((i, pt) => (canHover || active === i ? enter(i, pt) : setActive(i)), [canHover, active, enter]);

  if (!webgl || failed) return fallback;

  const info = [
    plural(stats.stations, "station", "stations"),
    plural(stats.signalements, "signalement", "signalements"),
    plural(stats.evenements, "événement", "événements"),
    plural(stats.observations, "observation", "observations"),
    plural(stats.produits, "produit local", "produits locaux"),
    null,
  ];
  const Phase = dark ? Moon : dusk > 0.45 ? Sunset : Sun;
  const phase = dark ? "Nuit" : dusk > 0.45 ? (hour < 12 ? "Lever du soleil" : "Coucher du soleil") : "Jour";
  const glass = dark ? "border-white/10 bg-white/[0.06] text-paper" : "border-line bg-paper/80 text-ink";
  const soft = dark ? "text-paper/60" : "text-muted";
  const sunT = Math.min(1, Math.max(0, (hour - 6) / 12));

  return (
    <section ref={section} className={`relative isolate h-[100svh] min-h-[800px] overflow-clip lg:min-h-[740px] ${dark ? "text-paper" : "text-ink"}`} style={{ background: sky }}>
      {/* Ciel : taches de couleur le jour, étoiles la nuit, lueur orangée au lever/coucher */}
      <div aria-hidden="true" className="absolute inset-0" style={{ opacity: day }}>
        <div className="absolute -top-40 -left-32 size-[38rem] animate-blob rounded-full bg-mint blur-3xl" />
        <div className="absolute top-20 right-[-10rem] size-[30rem] animate-blob rounded-full bg-lime/40 blur-3xl [animation-delay:-6s]" />
      </div>
      <Stars opacity={n} />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-coral/50 via-coral/10 to-transparent" style={{ opacity: dusk * day }} />
      <div
        aria-hidden="true"
        className="absolute size-40 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#fff1b8] blur-2xl"
        style={{ left: `${12 + sunT * 76}%`, top: `${46 - Math.sin(sunT * Math.PI) * 34}%`, opacity: day * 0.9 }}
      />
      <div aria-hidden="true" className="absolute top-[17%] left-[62%] size-12 rounded-full bg-[#fff6c9] shadow-[0_0_40px_#fff6c9aa]" style={{ opacity: n }}>
        <i className="absolute -top-1 left-3 size-11 rounded-full" style={{ background: sky }} />
      </div>

      {/* Scène 3D */}
      <div
        className={`absolute inset-x-0 top-[23rem] bottom-0 touch-pan-y select-none lg:top-0 ${active != null && canHover ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}`}
        onPointerDown={(e) => (drag.current = { x: e.clientX, r: rot.current })}
        onPointerMove={(e) => drag.current && (rot.current = drag.current.r + (e.clientX - drag.current.x) * 0.006)}
        onPointerCancel={() => (drag.current = null)}
      >
        <Boundary onFail={() => setFailed(true)}>
          <Suspense fallback={null}>
            <CityScene
              hour={hour}
              modules={modules}
              info={info}
              active={active}
              entering={entering?.i ?? null}
              zoom={zoom}
              compact={compact}
              dark={dark}
              rot={rot}
              paused={!inView}
              reduced={reduced}
              onOver={onOver}
              onOut={onOut}
              onPick={onPick}
              onEnter={enter}
              onMiss={() => !canHover && setActive(null)}
              onReady={() => setReady(true)}
            />
          </Suspense>
        </Boundary>
        {!ready && (
          <div className={`absolute inset-0 grid place-items-center ${soft}`}>
            <p className="flex items-center gap-3 font-serif text-xl italic">
              <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              La ville se construit…
            </p>
          </div>
        )}
      </div>

      {/* Titre */}
      <div className="pointer-events-none relative mx-auto max-w-[1280px] px-4 pt-24 sm:px-6 lg:pt-32">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease }} className="max-w-md">
          <p className={`mb-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase lg:mb-4 ${dark ? "border-lime/30 text-lime" : "border-green/20 bg-paper/60 text-green"}`}>
            <span className="relative flex size-1.5">
              <span className={`absolute inline-flex size-full animate-ping-slow rounded-full ${dark ? "bg-lime" : "bg-green"}`} />
              <span className={`relative inline-flex size-1.5 rounded-full ${dark ? "bg-lime" : "bg-green"}`} />
            </span>
            My City · ville interactive
          </p>
          <h1 className="font-serif text-[2.6rem] leading-[0.98] font-medium tracking-tight sm:text-6xl lg:text-[4.1rem]">
            Explorez la ville. <em className={dark ? "text-lime" : "text-green"}>Entrez où vous voulez.</em>
          </h1>
          <p className={`mt-4 max-w-xs text-base leading-relaxed lg:mt-5 ${soft}`}>Chaque lieu est un service. {canHover ? "Cliquez sur" : "Touchez"} un bâtiment pour y entrer.</p>
        </motion.div>
      </div>

      {/* Horloge : la ville suit l'heure réelle, le curseur permet de voyager dans la journée */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, delay: 0.15, ease }}
        className={`absolute top-[21.5rem] right-4 left-4 rounded-2xl border px-4 py-2.5 backdrop-blur-xl sm:left-6 sm:max-w-sm lg:top-32 lg:right-[max(1.5rem,calc((100vw-1280px)/2+1.5rem))] lg:left-auto lg:w-64 lg:rounded-3xl lg:p-5 ${glass}`}
      >
        <div className="flex items-center gap-3 lg:block">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className={`flex items-center gap-1.5 ${soft}`}>
              <Phase className="size-3.5" /> <span className="hidden lg:inline">{phase}</span>
            </span>
            {live ? (
              <span className={`hidden items-center gap-1.5 lg:flex ${soft}`}>
                <i className="size-1.5 rounded-full bg-coral" /> En direct
              </span>
            ) : (
              <button type="button" onClick={() => setLive(true)} className={`hidden cursor-pointer rounded-full px-2 py-0.5 font-semibold underline-offset-2 hover:underline lg:block ${dark ? "text-lime" : "text-green"}`}>
                Maintenant
              </button>
            )}
          </div>
          <p className="font-serif text-2xl leading-none tabular-nums lg:mt-2 lg:text-[2.6rem]">{formatHour(hour)}</p>
          <div className="flex-1 lg:mt-4">
            <input
              type="range"
              min="0"
              max="23.75"
              step="0.25"
              value={hour}
              onChange={(e) => (setLive(false), setHour(Number(e.target.value)))}
              aria-label="Heure de la journée"
              className="time-range w-full"
            />
            <div className={`mt-1 hidden justify-between text-[10.5px] lg:flex ${soft}`}>
              <span>00h</span>
              <span>06h</span>
              <span>12h</span>
              <span>18h</span>
              <span>24h</span>
            </div>
          </div>
          {!live && (
            <button type="button" onClick={() => setLive(true)} className={`cursor-pointer text-xs font-semibold lg:hidden ${dark ? "text-lime" : "text-green"}`}>
              Maintenant
            </button>
          )}
        </div>
      </motion.div>

      {/* Barre du bas */}
      <div className="pointer-events-none absolute inset-x-0 bottom-5 mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <p className={`hidden items-center gap-2.5 text-sm xl:flex ${soft}`}>
          <i className="size-2 rounded-full bg-coral shadow-[0_0_0_5px_rgb(240_144_106/0.25)]" /> La ville vit à l'heure réelle
        </p>
        <p className={`hidden items-center gap-4 rounded-full border px-5 py-2.5 text-sm backdrop-blur-xl md:flex ${glass} ${soft}`}>
          <span>
            <b className={dark ? "text-paper" : "text-ink"}>Glisser</b> pour tourner
          </span>
          <i className={`h-3.5 w-px ${dark ? "bg-white/15" : "bg-line"}`} />
          <span>
            <b className={dark ? "text-paper" : "text-ink"}>{canHover ? "Clic" : "Toucher"}</b> pour entrer
          </span>
        </p>
        <div className="pointer-events-auto ml-auto flex items-center gap-2 md:ml-0">
          <div className={`flex rounded-full border p-1 backdrop-blur-xl ${glass}`}>
            <button type="button" aria-label="Dézoomer" onClick={() => setZoom((z) => Math.max(0.75, z - 0.2))} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-black/5">
              <Minus className="size-4" />
            </button>
            <button type="button" aria-label="Zoomer" onClick={() => setZoom((z) => Math.min(1.8, z + 0.2))} className="grid size-9 cursor-pointer place-items-center rounded-full hover:bg-black/5">
              <Plus className="size-4" />
            </button>
          </div>
          <a href="#services" className={`flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold backdrop-blur-xl ${glass}`}>
            <List className="size-4" /> Vue liste
          </a>
        </div>
      </div>

      {/* Mobile : fiche du lieu sélectionné */}
      <AnimatePresence>
        {compact && active != null && !entering && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.3, ease }}
            className="absolute inset-x-4 bottom-20 z-50 mx-auto max-w-md rounded-3xl bg-deep p-5 text-paper shadow-2xl"
          >
            <button type="button" aria-label="Fermer" onClick={() => setActive(null)} className="absolute top-4 right-4 grid size-8 place-items-center rounded-full bg-white/10">
              <X className="size-4" />
            </button>
            <p className="text-[11px] font-bold tracking-[0.14em] text-lime uppercase">
              0{active + 1}
              {info[active] ? ` · ${info[active]}` : ""}
            </p>
            <h3 className="mt-1 font-serif text-3xl font-medium">{modules[active].label}</h3>
            <p className="mt-1.5 pr-6 text-sm leading-relaxed text-paper/70">{modules[active].desc}</p>
            <button type="button" onClick={(e) => enter(active, { x: e.clientX, y: e.clientY })} className="mt-4 inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-sm font-bold text-deep">
              Entrer <ArrowRight className="size-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transition d'entrée : un cercle part du clic et recouvre l'écran */}
      <AnimatePresence>
        {entering && (
          <motion.div
            initial={{ clipPath: `circle(0px at ${entering.x}px ${entering.y}px)` }}
            animate={{ clipPath: `circle(${Math.ceil(Math.hypot(window.innerWidth, window.innerHeight))}px at ${entering.x}px ${entering.y}px)` }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease }}
            className="fixed inset-0 z-[90] grid place-items-center bg-deep px-6 text-center text-paper"
          >
            <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.5 }} className="font-serif text-4xl sm:text-6xl">
              <em className="text-lime">{modules[entering.i].label}</em>
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
