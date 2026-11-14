// Mise en page des écrans de connexion : formulaire à gauche, visuel à droite.
import { Link, usePage } from "@inertiajs/react";
import { motion } from "motion/react";
import { ArrowLeft, Bike, CalendarHeart, ShoppingBasket } from "lucide-react";
import LogoMark from "../components/LogoMark";
import Toasts from "../components/Toasts";
import { ease } from "../lib/ui";

const VISUALS = {
  bench: { src: "/static/images/bench.jpg", alt: "Un moment calme dans un parc" },
  park: { src: "/static/images/hero-park.jpg", alt: "Promenade dans un parc arboré" },
  walk: { src: "/static/images/walk.jpg", alt: "Promenade collective dans un parc" },
};

export default function AuthLayout({ children, visual = "bench", quote = "Calme, utile, tout près.", caption = "Un espace unique pour organiser vos services de proximité." }) {
  const { urls } = usePage().props;
  const img = VISUALS[visual];
  const chips = [
    [Bike, "Réserver un vélo", "top-[16%] -left-6"],
    [CalendarHeart, "Sortir ce soir", "top-[46%] -right-4"],
    [ShoppingBasket, "Acheter local", "bottom-[30%] -left-8"],
  ];

  return (
    <div className="grain relative isolate grid min-h-screen overflow-clip bg-cream lg:grid-cols-[1fr_1.05fr]">
      <div aria-hidden="true" className="absolute -top-40 -left-32 -z-10 size-[36rem] animate-blob rounded-full bg-mint blur-3xl" />
      <div aria-hidden="true" className="absolute right-1/3 bottom-[-14rem] -z-10 size-[28rem] animate-blob rounded-full bg-lime/30 blur-3xl [animation-delay:-8s]" />

      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href={urls.home} className="group flex items-center gap-2.5">
            <LogoMark />
            <b className="font-semibold tracking-tight">Smart City</b>
          </Link>
          <Link href={urls.home} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm text-muted hover:bg-mint hover:text-ink">
            <ArrowLeft className="size-4" /> Retour à la ville
          </Link>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }} className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          {children}
        </motion.div>
      </div>

      <div className="hidden p-4 lg:block">
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease }} className="relative h-full min-h-[36rem]">
          <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] rounded-tl-[8rem]">
            <img src={img.src} alt={img.alt} className="size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-deep/85 via-deep/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-10 text-paper">
              <p className="font-serif text-5xl leading-[1.05] italic">{quote}</p>
              <p className="mt-4 max-w-sm text-paper/75">{caption}</p>
            </div>
          </div>
          {chips.map(([Icon, label, pos], i) => (
            <div key={label} className={`absolute ${pos} flex animate-float items-center gap-2.5 rounded-2xl border border-line/70 bg-paper/95 px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur`} style={{ animationDelay: `${-i * 2}s` }}>
              <span className="grid size-9 place-items-center rounded-xl bg-mint text-green">
                <Icon className="size-4" />
              </span>
              {label}
            </div>
          ))}
        </motion.div>
      </div>
      <Toasts />
    </div>
  );
}

export function AuthTitle({ eyebrow, title, text }) {
  return (
    <div className="mb-8">
      {eyebrow && <p className="mb-2 text-xs font-semibold tracking-[0.14em] text-green uppercase">{eyebrow}</p>}
      <h1 className="font-serif text-5xl leading-[1.02] font-medium tracking-tight">{title}</h1>
      {text && <p className="mt-3 text-muted">{text}</p>}
    </div>
  );
}
