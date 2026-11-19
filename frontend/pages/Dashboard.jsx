// Tableau de bord du citoyen : une grille « bento » avec ses données réelles.
import { Head, Link, usePage } from "@inertiajs/react";
import { motion } from "motion/react";
import { ArrowUpRight, Bike, Building2, CalendarCheck, CalendarHeart, PawPrint, Plus, ShoppingBasket, Sparkles, Store, TriangleAlert } from "lucide-react";
import { appLayout } from "../layouts/AppShell";
import { Btn, Card, MODULES, STATION_ICONS, STATUS_TONE, cn, ease, fmtDateTime, fmtDay, fmtMonth, fmtRelative, fmtTime } from "../lib/ui";

const BAR = { coral: "bg-coral", amber: "bg-[#f4c95d]", green: "bg-green" };

function Tile({ children, className, delay = 0 }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay, ease }} className={className}>
      {children}
    </motion.div>
  );
}

export default function Dashboard({ modules, city, mine, report_status, next_reservation, events }) {
  const { auth, urls } = usePage().props;
  const hour = new Date().getHours();
  const hello = hour < 5 || hour >= 18 ? "Bonsoir" : "Bonjour";
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const totalReports = report_status.reduce((n, s) => n + s.count, 0);
  const NextIcon = next_reservation ? STATION_ICONS[next_reservation.type] || Bike : Bike;

  const cityStats = [
    [city.units, "unités de mobilité disponibles", Bike],
    [city.events, "événements à venir", CalendarHeart],
    [city.open_reports, "signalements en cours", TriangleAlert],
    [city.products, "produits locaux", ShoppingBasket],
  ];
  const myStats = [
    [mine.reservations, "Réservations", CalendarCheck, urls.reservations],
    [mine.reports, "Signalements", TriangleAlert, urls.infrastructures],
    [mine.observations, "Animaux signalés", PawPrint, urls.animaux],
    [mine.products, "Produits", ShoppingBasket, urls.marketplace],
  ];

  return (
    <>
      <Head title="Mon espace" />
      <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase first-letter:uppercase">{today}</p>
          <h1 className="font-serif text-5xl leading-[1.02] font-medium tracking-tight sm:text-6xl">
            {hello} <em className="text-green">{auth.user.first_name || auth.user.username}</em>,
          </h1>
          <p className="mt-2 text-muted">Voici ce qui se passe à My City et dans votre espace.</p>
        </div>
        {!auth.user?.is_staff && (
          <Btn href={urls.infrastructures_create} icon={Plus} size="lg">
            Nouveau signalement
          </Btn>
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-6">
        {/* La ville en chiffres */}
        <Tile className="grain relative overflow-hidden rounded-[2rem] bg-deep p-7 text-paper sm:p-9 lg:col-span-4">
          <div aria-hidden="true" className="absolute -top-24 -right-24 size-80 animate-blob rounded-full bg-green/50 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-lime uppercase">
                  <span className="relative flex size-1.5">
                    <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-lime" />
                    <span className="relative inline-flex size-1.5 rounded-full bg-lime" />
                  </span>
                  En direct
                </p>
                <h2 className="mt-2 font-serif text-4xl leading-tight">
                  Le pouls de <em className="text-lime">My City</em>
                </h2>
              </div>
              <Link href={urls.home} className="group flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/10">
                <Building2 className="size-4 text-lime" /> Explorer la ville en 3D
                <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            </div>
            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-white/10 sm:grid-cols-4">
              {cityStats.map(([n, label, Icon]) => (
                <div key={label} className="bg-deep/90 p-5">
                  <Icon className="size-5 text-lime" />
                  <p className="mt-5 font-serif text-5xl leading-none font-medium">{n}</p>
                  <p className="mt-2 text-xs leading-snug text-paper/55">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </Tile>

        {/* Prochaine réservation */}
        <Tile delay={0.06} className="rounded-[2rem] bg-lime p-7 text-deep lg:col-span-2">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold tracking-[0.14em] uppercase">Prochain départ</p>
              <span className="grid size-11 place-items-center rounded-full bg-deep text-lime">
                <NextIcon className="size-5" />
              </span>
            </div>
            {next_reservation ? (
              <>
                <p className="mt-6 font-serif text-5xl leading-none font-medium">{fmtTime(next_reservation.date)}</p>
                <p className="mt-2 text-sm font-semibold first-letter:uppercase">{fmtRelative(next_reservation.date)}</p>
                <p className="mt-5 font-serif text-2xl leading-tight">{next_reservation.station}</p>
                <p className="mt-1 text-sm text-deep/70 first-letter:uppercase">
                  {fmtDateTime(next_reservation.date)} · {next_reservation.units} unité{next_reservation.units > 1 ? "s" : ""}
                </p>
                <Link href={urls.reservations} className="group mt-auto flex items-center gap-1.5 pt-6 text-sm font-bold">
                  Mes réservations <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-6 font-serif text-3xl leading-tight">Aucun trajet prévu.</p>
                <p className="mt-2 text-sm text-deep/70">Réservez un vélo, une trottinette ou une place en bus électrique.</p>
                <div className="mt-auto pt-6">
                  <Btn href={urls.mobilite} variant="dark" arrow>
                    Trouver une station
                  </Btn>
                </div>
              </>
            )}
          </div>
        </Tile>

        {/* Mon activité */}
        <Tile delay={0.1} className="lg:col-span-2">
          <Card className="h-full p-7">
            <h2 className="font-serif text-2xl">Mon activité</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {myStats.map(([n, label, Icon, href]) => (
                <Link key={label} href={href} className="group rounded-2xl bg-pale p-4 transition hover:bg-mint">
                  <Icon className="size-4 text-green" />
                  <p className="mt-3 font-serif text-4xl leading-none font-medium">{n}</p>
                  <p className="mt-1.5 text-xs text-muted">{label}</p>
                </Link>
              ))}
            </div>
          </Card>
        </Tile>

        {/* Suivi de mes signalements */}
        <Tile delay={0.14} className="lg:col-span-2">
          <Card className="flex h-full flex-col p-7">
            <h2 className="font-serif text-2xl">Mes signalements</h2>
            {totalReports === 0 ? (
              <p className="mt-3 text-sm text-muted">Vous n'avez encore rien signalé. Un lampadaire en panne, un trou dans la chaussée ?</p>
            ) : (
              <>
                <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-ink/5">
                  {report_status.map((s) => s.count > 0 && <div key={s.key} className={BAR[STATUS_TONE[s.key]]} style={{ width: `${(s.count / totalReports) * 100}%` }} />)}
                </div>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {report_status.map((s) => (
                    <li key={s.key} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2.5">
                        <i className={cn("size-2.5 rounded-full", BAR[STATUS_TONE[s.key]])} /> {s.label}
                      </span>
                      <b className="font-serif text-xl font-medium">{s.count}</b>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <Link href={urls.infrastructures} className="group mt-auto flex items-center gap-1.5 pt-6 text-sm font-semibold text-green">
              Voir les signalements <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Card>
        </Tile>

        {/* Événements à venir */}
        <Tile delay={0.18} className="lg:col-span-2">
          <Card className="flex h-full flex-col p-7">
            <h2 className="font-serif text-2xl">À venir à My City</h2>
            {events.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucun événement annoncé pour le moment. Et si vous en proposiez un ?</p>
            ) : (
              <ul className="mt-5 flex flex-col gap-3">
                {events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3.5">
                    <div className="w-14 shrink-0 rounded-2xl bg-mint py-2 text-center leading-none">
                      <b className="block font-serif text-2xl font-medium">{fmtDay(e.date)}</b>
                      <span className="text-[10px] font-semibold tracking-wide text-green uppercase">{fmtMonth(e.date)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{e.title}</p>
                      <p className="truncate text-xs text-muted">
                        {fmtTime(e.date)} · {e.place}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <Link href={events.length ? urls.evenements : urls.evenements_create} className="group mt-auto flex items-center gap-1.5 pt-6 text-sm font-semibold text-green">
              {events.length ? "Tous les événements" : "Créer un événement"} <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </Card>
        </Tile>

        {/* Services */}
        <Tile delay={0.22} className="lg:col-span-6">
          <h2 className="mt-6 mb-4 font-serif text-3xl">Vos services de proximité</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((m, i) => {
              const Icon = m.url.includes("nouveau") ? Store : MODULES[m.ns]?.icon || Sparkles;
              return (
                <Link key={m.label} href={m.url} className="group flex items-start gap-4 rounded-[1.75rem] border border-line bg-paper p-5 transition hover:-translate-y-0.5 hover:shadow-[0_18px_45px_#15362e17]">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mint text-green transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-110">
                    <Icon className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <b className="font-serif text-xl font-medium">{m.label}</b>
                      <span className="font-serif text-sm text-muted">0{i + 1}</span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-muted">{m.desc}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </Tile>
      </div>
    </>
  );
}

Dashboard.layout = appLayout;
