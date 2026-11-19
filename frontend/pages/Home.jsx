import { useEffect, useRef, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { animate, motion, useInView, useScroll, useSpring, useTransform } from "motion/react";
import {
  ArrowRight,
  ArrowUpRight,
  Bike,
  CalendarHeart,
  Check,
  ClipboardList,
  HeartHandshake,
  LayoutDashboard,
  MapPin,
  MousePointerClick,
  PawPrint,
  ShoppingBasket,
  Sparkles,
  Store,
  TriangleAlert,
  X,
} from "lucide-react";
import SiteHeader from "../components/SiteHeader";
import SiteFooter from "../components/SiteFooter";
import CityHero from "../components/city/CityHero";
import Toasts from "../components/Toasts";

const IMG = (name) => `/static/images/${name}`;
const ease = [0.22, 1, 0.36, 1];

const ICONS = {
  mobilite: Bike,
  infrastructures: TriangleAlert,
  evenements: CalendarHeart,
  animaux: PawPrint,
  marketplace: ShoppingBasket,
};

/* ------------------------------------------------------------------ */
/* Petits composants réutilisables                                     */
/* ------------------------------------------------------------------ */

function Eyebrow({ children, light = false }) {
  return (
    <p
      className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.14em] uppercase ${
        light ? "border-paper/20 text-lime" : "border-green/20 bg-paper/60 text-green"
      }`}
    >
      <span className="relative flex size-1.5">
        <span className={`absolute inline-flex size-full animate-ping-slow rounded-full ${light ? "bg-lime" : "bg-green"}`} />
        <span className={`relative inline-flex size-1.5 rounded-full ${light ? "bg-lime" : "bg-green"}`} />
      </span>
      {children}
    </p>
  );
}

function Reveal({ children, delay = 0, className = "" }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

/** Titre qui apparaît mot par mot. */
function SplitTitle({ text, className = "", delay = 0 }) {
  return (
    <span className={className}>
      {text.split(" ").map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.9, delay: delay + i * 0.07, ease }}
          >
            {word}&nbsp;
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Bouton qui suit légèrement la souris. */
function MagneticButton({ href, children, variant = "primary" }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 250, damping: 18 });
  const y = useSpring(0, { stiffness: 250, damping: 18 });
  const styles =
    variant === "primary"
      ? "bg-green text-paper shadow-[0_8px_24px_#087a5b40] hover:bg-dark"
      : "border border-ink/15 bg-paper/70 text-ink backdrop-blur hover:border-ink/40";

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x, y }}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width / 2) * 0.25);
        y.set((e.clientY - r.top - r.height / 2) * 0.35);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onClick={(e) => {
        // Lien vers une autre page : navigation sans rechargement.
        if (!href.startsWith("#")) {
          e.preventDefault();
          router.visit(href);
        }
      }}
      className={`group inline-flex items-center gap-2 rounded-full px-6 py-3.5 font-semibold transition-colors ${styles}`}
    >
      {children}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </motion.a>
  );
}

/** Compteur animé quand il devient visible. */
function Counter({ value }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, value, { duration: 1.8, ease, onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => controls.stop();
  }, [inView, value]);

  return <span ref={ref}>{display}</span>;
}

/** Carte avec halo lumineux qui suit la souris. */
function SpotlightCard({ children, className = "", dark = false }) {
  const ref = useRef(null);
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--x", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--y", `${e.clientY - r.top}px`);
      }}
      className={`group relative overflow-hidden rounded-[2rem] border transition-all duration-500 hover:-translate-y-1 ${
        dark ? "border-paper/10 bg-deep text-paper" : "border-line bg-paper hover:shadow-[0_24px_60px_#15362e1f]"
      } ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `radial-gradient(420px circle at var(--x) var(--y), ${dark ? "rgb(200 241 105 / .18)" : "rgb(8 122 91 / .10)"}, transparent 60%)`,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

function Hero({ stats }) {
  const { auth, urls } = usePage().props;
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "18%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);

  return (
    <section ref={ref} className="grain relative isolate overflow-hidden pt-32 pb-20 sm:pt-40">
      {/* Fond : taches de couleur animées */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-32 size-[38rem] animate-blob rounded-full bg-mint blur-3xl" />
        <div className="absolute top-20 right-[-10rem] size-[30rem] animate-blob rounded-full bg-lime/40 blur-3xl [animation-delay:-6s]" />
        <div className="absolute bottom-[-12rem] left-1/3 size-[28rem] animate-blob rounded-full bg-green/15 blur-3xl [animation-delay:-12s]" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <Eyebrow>My City · services en ligne</Eyebrow>
          </motion.div>

          <h1 className="font-serif text-5xl leading-[0.98] font-medium tracking-tight sm:text-7xl lg:text-[5.4rem]">
            <SplitTitle text="Plus proche de la ville." />
            <br />
            <SplitTitle text="Plus simple à vivre." delay={0.3} className="text-green italic" />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease }}
            className="mt-7 max-w-lg text-lg leading-relaxed text-muted"
          >
            Se déplacer, signaler, participer, acheter local. Tous les services de votre ville réunis dans un même espace.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.85, ease }}
            className="mt-9 flex flex-wrap items-center gap-3"
          >
            <MagneticButton href="#services">Découvrir les services</MagneticButton>
            <MagneticButton href={auth.user ? urls.dashboard : urls.login} variant="ghost">
              {auth.user ? "Mon espace" : "Se connecter"}
            </MagneticButton>
          </motion.div>
        </div>

        {/* Visuel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 1.1, delay: 0.2, ease }}
          className="relative mx-auto w-full max-w-md lg:max-w-none"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[3rem] rounded-tr-[9rem] shadow-[0_40px_80px_#15362e33]">
            <motion.img
              src={IMG("hero-park.jpg")}
              alt="Promenade dans un parc arboré"
              style={{ y: imgY, scale: imgScale }}
              className="absolute inset-0 size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-deep/50 via-transparent to-transparent" />
            <p className="absolute bottom-6 left-6 font-serif text-2xl text-paper italic">À quelques pas de chez vous</p>
          </div>

          {/* Badge rotatif */}
          <div className="absolute -top-6 -left-6 hidden size-32 place-items-center rounded-full bg-lime text-deep shadow-xl sm:grid">
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full animate-[spin_16s_linear_infinite]">
              <defs>
                <path id="circle" d="M50,50 m-37,0 a37,37 0 1,1 74,0 a37,37 0 1,1 -74,0" />
              </defs>
              <text className="fill-deep text-[10.5px] font-semibold tracking-[0.2em] uppercase">
                <textPath href="#circle">Ville vivante · Ville proche ·</textPath>
              </text>
            </svg>
            <Sparkles className="size-7" />
          </div>

          {/* Cartes flottantes avec les vraies données */}
          <div className="absolute top-1/4 -right-3 animate-float rounded-2xl border border-line/80 bg-paper/90 p-4 shadow-xl backdrop-blur sm:-right-8">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-mint text-green">
                <Bike className="size-5" />
              </span>
              <div>
                <p className="font-serif text-2xl leading-none font-semibold">{stats.stations || "Mobilité"}</p>
                <p className="text-xs text-muted">{stats.stations ? "stations de mobilité" : "stations près de chez vous"}</p>
              </div>
            </div>
          </div>
          <div className="absolute bottom-16 -left-3 animate-float rounded-2xl bg-deep p-4 text-paper shadow-xl [animation-delay:-3s] sm:-left-10">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-lime text-deep">
                <CalendarHeart className="size-5" />
              </span>
              <div>
                <p className="font-serif text-2xl leading-none font-semibold">{stats.evenements || "Sortir"}</p>
                <p className="text-xs text-paper/60">{stats.evenements ? "événements à My City" : "culture, nature, rencontres"}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Marquee() {
  const words = ["Se déplacer", "Signaler", "Sortir", "Observer", "Acheter local", "Participer"];
  const row = [...words, ...words];
  return (
    <div className="-rotate-1 overflow-hidden bg-green py-5 text-paper">
      <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
        {[...row, ...row].map((w, i) => (
          <span key={i} className="flex items-center gap-10 font-serif text-3xl italic sm:text-4xl">
            {w}
            <Sparkles className="size-5 text-lime" />
          </span>
        ))}
      </div>
    </div>
  );
}

function Services({ modules }) {
  return (
    <section id="services" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-28 sm:px-6">
      <Reveal className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Ce que nous proposons</Eyebrow>
          <h2 className="max-w-xl font-serif text-4xl leading-tight font-medium sm:text-6xl">
            Une ville entière, <em className="text-green">à portée de main.</em>
          </h2>
        </div>
        <p className="max-w-xs text-muted">Six services pensés pour le quotidien des habitants de My City.</p>
      </Reveal>

      <div className="grid auto-rows-[minmax(15rem,auto)] gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((m, i) => {
          const Icon = m.url.includes("create") ? Store : ICONS[m.ns] || Sparkles;
          const featured = i === 0;
          return (
            <Reveal key={m.label} delay={i * 0.06} className={featured ? "lg:col-span-2 lg:row-span-2" : ""}>
              <SpotlightCard dark={featured} className="h-full">
                <Link href={m.url} className={`flex h-full flex-col p-7 ${featured ? "sm:p-10" : ""}`}>
                  <div className="flex items-start justify-between">
                    <span
                      className={`grid place-items-center rounded-2xl transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110 ${
                        featured ? "size-16 bg-lime text-deep" : "size-12 bg-mint text-green"
                      }`}
                    >
                      <Icon className={featured ? "size-8" : "size-6"} />
                    </span>
                    <span className="font-serif text-sm text-muted">0{i + 1}</span>
                  </div>
                  <div className="mt-auto pt-10">
                    <h3 className={`font-serif font-medium ${featured ? "text-4xl sm:text-6xl" : "text-2xl"}`}>{m.label}</h3>
                    <p className={`mt-3 leading-relaxed ${featured ? "max-w-md text-lg text-paper/70" : "text-muted"}`}>{m.desc}</p>
                    <span
                      className={`mt-6 inline-flex items-center gap-1.5 text-sm font-semibold ${featured ? "text-lime" : "text-green"}`}
                    >
                      Accéder
                      <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </Link>
              </SpotlightCard>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function Pulse({ stats }) {
  const items = [
    ["Stations de mobilité", stats.stations, Bike],
    ["Événements", stats.evenements, CalendarHeart],
    ["Signalements", stats.signalements, TriangleAlert],
    ["Animaux signalés", stats.observations, PawPrint],
    ["Produits locaux", stats.produits, ShoppingBasket],
  ];
  return (
    <section id="pouls" className="grain relative scroll-mt-24 overflow-hidden bg-deep py-28 text-paper">
      <div aria-hidden="true" className="absolute top-0 right-0 size-[40rem] animate-blob rounded-full bg-green/40 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <Eyebrow light>En direct</Eyebrow>
          <h2 className="max-w-2xl font-serif text-4xl leading-tight font-medium sm:text-6xl">
            Le pouls de <em className="text-lime">My City.</em>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-paper/10 bg-paper/10 sm:grid-cols-2 lg:grid-cols-5">
          {items.map(([label, value, Icon], i) => (
            <Reveal key={label} delay={i * 0.08} className="bg-deep/90 p-7 transition-colors hover:bg-dark">
              <Icon className="size-6 text-lime" />
              <p className="mt-8 font-serif text-6xl leading-none font-medium">
                <Counter value={value} />
              </p>
              <p className="mt-3 text-sm text-paper/60">{label}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function CityMap() {
  const { urls } = usePage().props;
  const pins = [
    { x: 22, y: 30, label: "Mobilité", icon: Bike },
    { x: 68, y: 22, label: "Événement", icon: CalendarHeart },
    { x: 48, y: 58, label: "My City", icon: MapPin, main: true },
    { x: 78, y: 70, label: "Marché", icon: ShoppingBasket },
    { x: 18, y: 76, label: "Parc", icon: PawPrint },
  ];
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-28 sm:px-6 lg:grid-cols-2">
      <Reveal>
        <Eyebrow>Autour de vous</Eyebrow>
        <h2 className="font-serif text-4xl leading-tight font-medium sm:text-6xl">
          Le bon service, <em className="text-green">au bon endroit.</em>
        </h2>
        <p className="mt-6 max-w-md text-lg text-muted">Explorez les services et les initiatives qui font vivre My City au quotidien.</p>
        <div className="mt-8">
          <MagneticButton href={urls.dashboard}>Voir mon espace</MagneticButton>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <div className="relative aspect-square overflow-hidden rounded-[2.5rem] border border-line bg-pale" aria-label="Carte illustrée de My City">
          <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
            <defs>
              <pattern id="grid" width="6" height="6" patternUnits="userSpaceOnUse">
                <path d="M6 0H0V6" fill="none" stroke="#d8ded7" strokeWidth=".25" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
            <path d="M-5 62 C 20 50, 35 80, 60 64 S 95 40, 110 52" fill="none" stroke="#bfe0d1" strokeWidth="7" strokeLinecap="round" />
            <rect x="8" y="64" width="22" height="20" rx="5" fill="#d6ead9" />
            <rect x="60" y="10" width="26" height="18" rx="5" fill="#e6eedd" />
            {["M0 40 H100", "M35 0 V100", "M0 88 H100", "M72 0 L90 100"].map((d, i) => (
              <motion.path
                key={d}
                d={d}
                fill="none"
                stroke="#fffefa"
                strokeWidth="2.2"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.6, delay: i * 0.2, ease }}
              />
            ))}
          </svg>

          {pins.map(({ x, y, label, icon: Icon, main }, i) => (
            <motion.div
              key={label}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.6 + i * 0.15 }}
            >
              <div className="group relative flex flex-col items-center">
                <span className={`absolute inset-0 animate-ping-slow rounded-full ${main ? "bg-green/40" : "bg-lime/50"}`} />
                <span
                  className={`relative grid place-items-center rounded-full shadow-lg transition-transform group-hover:scale-110 ${
                    main ? "size-14 bg-green text-paper" : "size-10 bg-paper text-green"
                  }`}
                >
                  <Icon className={main ? "size-6" : "size-4"} />
                </span>
                <span
                  className={`mt-2 rounded-full px-2.5 py-1 text-xs font-semibold shadow ${main ? "bg-deep text-paper" : "bg-paper text-ink"}`}
                >
                  {label}
                </span>
              </div>
            </motion.div>
          ))}

          <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-paper/90 px-3 py-1.5 text-xs font-medium shadow backdrop-blur">
            <span className="size-2 rounded-full bg-green" /> Services à proximité
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function Steps() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 70%", "end 60%"] });
  const line = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const steps = [
    [MousePointerClick, "Choisissez un service", "Accédez rapidement à la mobilité, aux événements ou aux services de quartier."],
    [ClipboardList, "Faites votre démarche", "Remplissez un formulaire simple avec vos informations et vos besoins."],
    [LayoutDashboard, "Retrouvez tout dans votre espace", "Suivez vos réservations, signalements et contributions au même endroit."],
  ];
  return (
    <section id="fonctionnement" className="scroll-mt-24 bg-mint py-28">
      <div className="mx-auto grid max-w-6xl gap-14 px-4 sm:px-6 lg:grid-cols-[.8fr_1.2fr]">
        <Reveal className="lg:sticky lg:top-32 lg:self-start">
          <Eyebrow>Comment ça marche ?</Eyebrow>
          <h2 className="font-serif text-4xl leading-tight font-medium sm:text-6xl">
            Trois étapes. <em className="text-green">C'est tout.</em>
          </h2>
        </Reveal>

        <div ref={ref} className="relative flex flex-col gap-6 pl-10">
          <div className="absolute top-2 bottom-2 left-[1.1rem] w-0.5 rounded bg-green/15" />
          <motion.div style={{ scaleY: line }} className="absolute top-2 bottom-2 left-[1.1rem] w-0.5 origin-top rounded bg-green" />
          {steps.map(([Icon, title, text], i) => (
            <Reveal key={title} delay={i * 0.1}>
              <div className="relative rounded-[2rem] border border-green/10 bg-paper p-8 transition-shadow hover:shadow-[0_24px_60px_#15362e1a]">
                <span className="absolute top-8 -left-[2.65rem] grid size-7 place-items-center rounded-full bg-green text-xs font-bold text-paper ring-4 ring-mint">
                  {i + 1}
                </span>
                <Icon className="size-7 text-green" />
                <h3 className="mt-5 font-serif text-2xl font-medium sm:text-3xl">{title}</h3>
                <p className="mt-2 text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Editorial() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center center"] });
  const clip = useTransform(scrollYProgress, [0, 1], ["inset(18% 18% 18% 18% round 3rem)", "inset(0% 0% 0% 0% round 2.5rem)"]);
  return (
    <section ref={ref} className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-28 sm:px-6 lg:grid-cols-2">
      <motion.img
        src={IMG("walk.jpg")}
        alt="Promenade collective dans un parc"
        style={{ clipPath: clip }}
        className="aspect-[4/5] w-full object-cover"
      />
      <Reveal>
        <Eyebrow>L'humain avant tout</Eyebrow>
        <h2 className="font-serif text-4xl leading-tight font-medium sm:text-6xl">
          Des services utiles <em className="text-green">et respectueux.</em>
        </h2>
        <p className="mt-6 max-w-md text-lg text-muted">
          Chaque service est pensé pour faciliter la vie locale, encourager la participation et rendre l'information plus accessible.
        </p>
        <a href="#engagements" className="group mt-8 inline-flex items-center gap-2 font-semibold text-green">
          Lire nos engagements <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
        </a>
      </Reveal>
    </section>
  );
}

function Commitments() {
  const items = [
    ["Des informations claires", "Des services simples à comprendre, sans détour."],
    ["Une présence locale", "Des initiatives ancrées dans les quartiers de My City."],
    ["Une ville participative", "Vos signalements et vos idées contribuent à l'améliorer."],
  ];
  return (
    <section id="engagements" className="scroll-mt-24 px-4 pb-28 sm:px-6">
      <div className="grain relative mx-auto max-w-6xl overflow-hidden rounded-[3rem] bg-green px-6 py-20 text-paper sm:px-14">
        <div aria-hidden="true" className="absolute -right-20 -bottom-20 size-96 animate-blob rounded-full bg-lime/30 blur-3xl" />
        <Reveal className="relative">
          <Eyebrow light>Nos engagements</Eyebrow>
          <h2 className="max-w-2xl font-serif text-4xl leading-tight font-medium sm:text-6xl">
            À vos côtés, <em className="text-lime">avec attention.</em>
          </h2>
        </Reveal>
        <div className="relative mt-14 grid gap-4 md:grid-cols-3">
          {items.map(([title, text], i) => (
            <Reveal key={title} delay={i * 0.1}>
              <div className="h-full rounded-[2rem] border border-paper/15 bg-paper/5 p-7 backdrop-blur transition-colors hover:bg-paper/10">
                <b className="font-serif text-5xl font-medium text-lime italic">0{i + 1}</b>
                <h3 className="mt-6 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-paper/70">{text}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="relative mt-14 flex flex-wrap items-center justify-between gap-6 border-t border-paper/15 pt-10">
          <p className="flex items-center gap-3 font-serif text-2xl italic sm:text-3xl">
            <HeartHandshake className="size-8 text-lime" /> Prêt à vivre My City autrement ?
          </p>
          <CtaButton />
        </Reveal>
      </div>
    </section>
  );
}

function CtaButton() {
  const { auth, urls } = usePage().props;
  return (
    <Link
      href={auth.user ? urls.dashboard : urls.signup}
      className="group inline-flex items-center gap-2 rounded-full bg-lime px-7 py-4 font-semibold text-deep transition hover:bg-paper"
    >
      {auth.user ? "Aller à mon espace" : "Créer mon compte"}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
    </Link>
  );
}

/* ------------------------------------------------------------------ */

export default function Home({ modules, stats }) {
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30 });
  const [night, setNight] = useState(false); // la ville 3D est en mode nuit -> en-tête clair

  return (
    <>
      <Head title="Des services proches de chez vous" />
      <motion.div style={{ scaleX: progress }} className="fixed inset-x-0 top-0 z-[70] h-1 origin-left bg-green" />
      <SiteHeader overDark={night} />
      <main>
        {/* Ville 3D ; si le navigateur ne gère pas la 3D, on garde le hero photo. */}
        <CityHero modules={modules} stats={stats} onNightChange={setNight} fallback={<Hero stats={stats} />} />
        <Marquee />
        <Services modules={modules} />
        <Pulse stats={stats} />
        <CityMap />
        <Steps />
        <Editorial />
        <Commitments />
      </main>
      <SiteFooter />
      <Toasts />
    </>
  );
}
