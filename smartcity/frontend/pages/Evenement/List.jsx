import { lazy, Suspense, useMemo, useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, CalendarHeart, Clock3, MapPin, Plus, Search, ShieldCheck, Users, X } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Chips, EmptyState, EVENT_COLORS, EVENT_ICONS, PageHeader, STATUS_TONE, cn, fmtDay, fmtMonth, fmtRelative, fmtTime, fmtWeekday } from "../../lib/ui";

const ReportMap = lazy(() => import("../../components/ReportMap"));

export function ParticipateButton({ e, size = "sm" }) {
  const [busy, setBusy] = useState(false);
  if (e.mine || e.status === "passe") return null;

  const toggle = (ev) => {
    ev.stopPropagation();
    router.post(e.participate_url, { next: window.location.pathname }, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  };

  return (
    <button
      type="button"
      disabled={busy}
      onClick={toggle}
      className={cn(
        "flex cursor-pointer items-center gap-1.5 rounded-full font-semibold transition",
        size === "lg" ? "px-5 py-2.5 text-sm" : "px-3 py-1.5 text-[13px]",
        e.participating ? "bg-green text-paper hover:bg-dark" : "border border-line bg-paper text-green hover:bg-mint",
      )}
    >
      <Users className={size === "lg" ? "size-4" : "size-3.5"} />
      {e.participating ? "Je participe ✓" : "J'y vais"}
      {e.participants > 0 && <span className="text-xs opacity-70">({e.participants})</span>}
    </button>
  );
}

function EventCard({ e, selected, onSelect, index }) {
  const Icon = EVENT_ICONS[e.category] || CalendarHeart;
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.3) }}
      onClick={() => onSelect?.(e.id)}
      className={cn(
        "group flex cursor-pointer gap-4 rounded-[1.5rem] border bg-paper p-4 transition hover:shadow-[0_16px_40px_#15362e14]",
        selected ? "border-deep ring-2 ring-lime" : "border-line",
      )}
    >
      {e.image ? (
        <img src={e.image} alt="" className="size-16 shrink-0 rounded-2xl object-cover sm:size-20" />
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl text-paper sm:size-20" style={{ background: EVENT_COLORS[e.status] }}>
          <Icon className="size-8" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={STATUS_TONE[e.status]} dot>{e.status_label}</Badge>
          <Badge tone="muted">{e.category_label}</Badge>
          {e.mine && <Badge tone="lime">Organisateur</Badge>}
        </div>
        <h3 className="mt-1.5 truncate font-serif text-xl leading-tight font-medium">{e.title}</h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
          <MapPin className="size-3.5 shrink-0" /> {e.place}
          {e.date && (
            <>
              <span className="mx-1">·</span>
              <span className="capitalize">{fmtWeekday(e.date)} {fmtDay(e.date)} à {fmtTime(e.date)}</span>
            </>
          )}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted">
            <Users className="size-3" /> {e.participants} participant{e.participants > 1 ? "s" : ""}
          </span>
          <Link href={e.url} onClick={(ev) => ev.stopPropagation()} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-green hover:bg-mint">
            Détail <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function EvenementList({ items, categories, create_url, manage_url }) {
  const { auth } = usePage().props;
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [participOnly, setParticipOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (e) =>
        (!status || e.status === status) &&
        (!category || e.category === category) &&
        (!mineOnly || e.mine) &&
        (!participOnly || e.participating) &&
        (!q || e.title.toLowerCase().includes(q) || (e.place || "").toLowerCase().includes(q)),
    );
  }, [items, status, category, mineOnly, participOnly, query]);

  const sel = shown.find((e) => e.id === selected) || null;
  const withCoords = shown.filter((e) => e.lat != null);
  const statusChips = [
    { value: "", label: "Tous", count: items.length },
    { value: "avenir", label: "À venir", count: items.filter((e) => e.status === "avenir").length },
    { value: "en_cours", label: "En cours", count: items.filter((e) => e.status === "en_cours").length },
    { value: "passe", label: "Passés", count: items.filter((e) => e.status === "passe").length },
  ];
  const catChips = [{ value: "", label: "Toutes" }, ...categories.map((c) => ({ ...c, icon: EVENT_ICONS[c.value] }))];
  const mineCount = items.filter((e) => e.mine).length;
  const participCount = items.filter((e) => e.participating).length;
  const reset = () => (setStatus(""), setCategory(""), setMineOnly(false), setParticipOnly(false), setQuery(""));

  return (
    <>
      <Head title="Événements" />
      <PageHeader eyebrow="Services citoyens" title="Sortir à My City" subtitle="Culture, nature, marchés, ateliers : découvrez les événements et participez." icon={CalendarHeart}>
        {create_url && (
          <Btn href={create_url} icon={Plus} size="lg">
            Créer un événement
          </Btn>
        )}
        {manage_url && (
          <Btn href={manage_url} icon={ShieldCheck} size="lg">
            Tableau de gestion
          </Btn>
        )}
      </PageHeader>

      {/* Chiffres */}
      <div className="grain relative mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-[1.75rem] bg-deep text-paper">
        {statusChips.slice(1).map((s) => (
          <button key={s.value} type="button" onClick={() => setStatus(status === s.value ? "" : s.value)} className={cn("relative cursor-pointer px-5 py-4 text-left transition hover:bg-white/5", status === s.value && "bg-white/10")}>
            <p className="flex items-center gap-2 font-serif text-4xl leading-none font-medium" style={{ color: s.value === "avenir" ? "#c8f169" : EVENT_COLORS[s.value] }}>
              {s.count}
            </p>
            <p className="mt-1.5 text-sm text-paper/60">{s.label.toLowerCase()}</p>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={CalendarHeart} title="Rien de prévu pour l'instant." text="Soyez le premier à proposer un événement aux habitants.">
          {create_url && (
            <Btn href={create_url} icon={Plus}>
              Créer un événement
            </Btn>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Chips options={statusChips} value={status} onChange={setStatus} />
            <label className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input type="search" value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Titre ou lieu…" aria-label="Rechercher" className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none transition focus:border-green focus:ring-4 focus:ring-green/10" />
            </label>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Chips options={catChips} value={category} onChange={setCategory} />
            {auth.user && participCount > 0 && (
              <button type="button" onClick={() => (setParticipOnly((v) => !v), setMineOnly(false))} className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition", participOnly ? "border-green bg-green text-paper" : "border-line bg-paper hover:border-ink/30")}>
                <span className="flex items-center gap-1.5"><Users className="size-3.5" /> Mes participations ({participCount})</span>
              </button>
            )}
            {auth.user && mineCount > 0 && (
              <button type="button" onClick={() => (setMineOnly((v) => !v), setParticipOnly(false))} className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition", mineOnly ? "border-lime bg-lime text-deep" : "border-line bg-paper hover:border-ink/30")}>
                Mes événements ({mineCount})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
            {withCoords.length > 0 && (
              <div className="lg:sticky lg:top-6">
                <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
                  <Suspense fallback={<div className="h-[22rem] animate-pulse rounded-[1.4rem] bg-pale sm:h-[34rem]" />}>
                    <ReportMap reports={withCoords} selectedId={selected} onSelect={setSelected} iconFor={(e) => EVENT_ICONS[e.category]} colorFor={(e) => EVENT_COLORS[e.status]} label="Lieu de l'événement" className="h-[22rem] rounded-[1.4rem] sm:h-[34rem]" />
                  </Suspense>
                  {sel && (
                    <div className="absolute inset-x-5 bottom-5 z-[500] flex items-center gap-3 rounded-2xl bg-paper/95 p-3 shadow-xl backdrop-blur">
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl text-paper" style={{ background: EVENT_COLORS[sel.status] }}>
                        {(() => { const I = EVENT_ICONS[sel.category] || CalendarHeart; return <I className="size-5" />; })()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{sel.title}</p>
                        <p className="truncate text-xs text-muted">{sel.status_label} · {sel.participants} participant{sel.participants > 1 ? "s" : ""}</p>
                      </div>
                      <Btn href={sel.url} size="sm" arrow>Voir</Btn>
                      <button type="button" aria-label="Fermer" onClick={() => setSelected(null)} className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-mint"><X className="size-4" /></button>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className={cn("flex flex-col gap-3", withCoords.length === 0 && "lg:col-span-2")}>
              <p className="px-1 text-sm text-muted">{shown.length} événement{shown.length > 1 ? "s" : ""}</p>
              {shown.length === 0 ? (
                <EmptyState icon={Search} title="Aucun résultat" text="Essayez un autre filtre.">
                  <Btn variant="ghost" onClick={reset}>Tout afficher</Btn>
                </EmptyState>
              ) : (
                <AnimatePresence mode="popLayout">
                  {shown.map((e, i) => <EventCard key={e.id} e={e} selected={e.id === selected} onSelect={setSelected} index={i} />)}
                </AnimatePresence>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

EvenementList.layout = appLayout;
