// Composants et outils partagés par toutes les pages de l'application.
import { Link } from "@inertiajs/react";
import { ArrowRight, Bike, Bus, CalendarHeart, Car, PawPrint, ShoppingBasket, TriangleAlert, Zap } from "lucide-react";

export const cn = (...parts) => parts.filter(Boolean).join(" ");
export const ease = [0.22, 1, 0.36, 1];

/* ----------------------------- Modules ----------------------------- */

export const MODULES = {
  mobilite: { icon: Bike, short: "Mobilité" },
  infrastructures: { icon: TriangleAlert, short: "Signalements" },
  evenements: { icon: CalendarHeart, short: "Événements" },
  animaux: { icon: PawPrint, short: "Observations" },
  marketplace: { icon: ShoppingBasket, short: "Marché local" },
};

export const STATION_ICONS = { velo: Bike, trottinette: Zap, bus: Bus, covoiturage: Car };

/* ------------------------------ Dates ------------------------------ */

const F = (o) => new Intl.DateTimeFormat("fr-FR", o);
const f = {
  dateTime: F({ weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }),
  date: F({ day: "numeric", month: "long", year: "numeric" }),
  short: F({ day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  day: F({ day: "2-digit" }),
  month: F({ month: "short" }),
  time: F({ hour: "2-digit", minute: "2-digit" }),
  weekday: F({ weekday: "long" }),
};
const D = (iso) => (iso ? new Date(iso) : null);
export const fmtDateTime = (iso) => (iso ? f.dateTime.format(D(iso)) : "");
export const fmtDate = (iso) => (iso ? f.date.format(D(iso)) : "");
export const fmtShort = (iso) => (iso ? f.short.format(D(iso)) : "");
export const fmtDay = (iso) => (iso ? f.day.format(D(iso)) : "");
export const fmtMonth = (iso) => (iso ? f.month.format(D(iso)).replace(".", "") : "");
export const fmtTime = (iso) => (iso ? f.time.format(D(iso)) : "");
export const fmtWeekday = (iso) => (iso ? f.weekday.format(D(iso)) : "");

const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
/** « il y a 3 jours », « dans 2 heures »… */
export function fmtRelative(iso) {
  if (!iso) return "";
  const s = (D(iso) - Date.now()) / 1000;
  const steps = [[60, "second"], [3600, "minute"], [86400, "hour"], [2592000, "day"], [31536000, "month"], [Infinity, "year"]];
  let div = 1;
  for (const [limit, unit] of steps) {
    if (Math.abs(s) < limit) return rtf.format(Math.round(s / div), unit);
    div = limit;
  }
  return "";
}

/* ----------------------------- Boutons ----------------------------- */

const BTN = {
  primary: "bg-green text-paper shadow-[0_6px_18px_#087a5b33] hover:bg-dark",
  dark: "bg-deep text-paper hover:bg-ink",
  lime: "bg-lime text-deep hover:brightness-95",
  ghost: "border border-line bg-paper text-ink hover:border-ink/30",
  soft: "bg-mint text-green hover:bg-mint/70",
  danger: "border border-coral/40 bg-paper text-[#b4532f] hover:bg-coral/10",
};
const SIZE = { sm: "px-3.5 py-2 text-[13px]", md: "px-5 py-2.75 text-sm", lg: "px-6 py-3.5 text-[15px]" };

/** Bouton ou lien. `href` -> navigation sans rechargement ; `external` -> lien classique. */
export function Btn({ href, external, variant = "primary", size = "md", arrow, icon: Icon, className, children, ...rest }) {
  const cls = cn(
    "group inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-60",
    BTN[variant],
    SIZE[size],
    className,
  );
  const inner = (
    <>
      {Icon && <Icon className="size-4 shrink-0" />}
      {children}
      {arrow && <ArrowRight className="size-4 shrink-0 transition-transform group-hover:translate-x-1" />}
    </>
  );
  if (href && external) return <a href={href} className={cls} {...rest}>{inner}</a>;
  if (href) return <Link href={href} className={cls} {...rest}>{inner}</Link>;
  return <button type="button" className={cls} {...rest}>{inner}</button>;
}

/* ------------------------------ Badges ----------------------------- */

const TONES = {
  green: "bg-mint text-green",
  lime: "bg-lime/60 text-deep",
  coral: "bg-coral/15 text-[#b4532f]",
  amber: "bg-[#f4c95d]/30 text-[#7a5a10]",
  ink: "bg-deep text-paper",
  muted: "bg-ink/5 text-muted",
  paper: "bg-paper/90 text-ink backdrop-blur",
};
export const STATUS_TONE = { ouvert: "coral", en_cours: "amber", resolu: "green", confirmee: "green", annulee: "muted" };

export function Badge({ tone = "green", dot, className, children }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide whitespace-nowrap", TONES[tone], className)}>
      {dot && <i className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/* ------------------------------ Blocs ------------------------------ */

export function Card({ className, children, ...rest }) {
  return (
    <div className={cn("rounded-[1.75rem] border border-line bg-paper", className)} {...rest}>
      {children}
    </div>
  );
}

export function PageHeader({ eyebrow, title, subtitle, icon: Icon, children }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div className="flex items-start gap-4">
        {Icon && (
          <span className="mt-1 hidden size-14 shrink-0 place-items-center rounded-2xl bg-deep text-lime sm:grid">
            <Icon className="size-7" />
          </span>
        )}
        <div>
          {eyebrow && <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">{eyebrow}</p>}
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-2 max-w-xl text-muted">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function EmptyState({ icon: Icon, title, text, children }) {
  return (
    <div className="grid place-items-center rounded-[2rem] border border-dashed border-line bg-paper/60 px-6 py-16 text-center">
      {Icon && (
        <span className="mb-5 grid size-16 place-items-center rounded-full bg-mint text-green">
          <Icon className="size-7" />
        </span>
      )}
      <h2 className="font-serif text-2xl font-medium">{title}</h2>
      {text && <p className="mt-2 max-w-sm text-muted">{text}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

export function Avatar({ initials, className }) {
  return <span className={cn("grid shrink-0 place-items-center rounded-full bg-lime font-semibold text-deep", className)}>{initials}</span>;
}

/** Puces de filtre (« Tous », « Ouvert »…) avec compteur. */
export function Chips({ options, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition",
              on ? "border-deep bg-deep text-paper" : "border-line bg-paper text-ink hover:border-ink/30",
            )}
          >
            {o.icon && <o.icon className="size-4" />}
            {o.label}
            {o.count != null && <span className={cn("rounded-full px-1.5 text-[11px] font-semibold", on ? "bg-lime text-deep" : "bg-ink/5 text-muted")}>{o.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
