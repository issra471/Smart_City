// Signalements : carte de tous les problèmes + liste filtrable.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowUpRight, Clock3, MapPin, Plus, Search, ShieldCheck, TriangleAlert, X } from "lucide-react";
import SupportButton from "../../components/SupportButton";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Chips, EmptyState, PageHeader, REPORT_COLORS, REPORT_ICONS, STATUS_TONE, cn, fmtRelative } from "../../lib/ui";

const ReportMap = lazy(() => import("../../components/ReportMap"));

function ReportCard({ r, selected, onSelect }) {
  const Icon = REPORT_ICONS[r.category] || TriangleAlert;
  const ref = useRef(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);
  return (
    <article
      ref={ref}
      onClick={() => onSelect(r.id)}
      className={cn(
        "group flex cursor-pointer gap-4 rounded-[1.5rem] border bg-paper p-4 transition hover:shadow-[0_16px_40px_#15362e14]",
        selected ? "border-deep ring-2 ring-lime" : "border-line",
      )}
    >
      {r.photo ? (
        <img src={r.photo} alt="" className="size-16 shrink-0 rounded-2xl object-cover sm:size-20" />
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl text-paper sm:size-20" style={{ background: REPORT_COLORS[r.status] }}>
          <Icon className="size-8" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={STATUS_TONE[r.status]} dot>{r.status_label}</Badge>
          {r.priority === "urgente" && r.status !== "resolu" && <Badge tone="coral">Urgent</Badge>}
          {r.mine && <Badge tone="lime">Le mien</Badge>}
          {r.team && r.status !== "resolu" && <Badge tone="muted">{r.team}</Badge>}
        </div>
        <h3 className="mt-1.5 truncate font-serif text-xl leading-tight font-medium">{r.title}</h3>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-muted">
          <Icon className="size-3.5 shrink-0" /> {r.category_label}
          {r.address && (
            <>
              <span className="mx-1">·</span>
              <span className="truncate">{r.address}</span>
            </>
          )}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted">
            <Clock3 className="size-3" /> {fmtRelative(r.date)}
          </span>
          <div className="flex items-center gap-2">
            <SupportButton r={r} />
            <Link href={r.url} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-green hover:bg-mint">
              Détail <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function SignalementList({ reports, categories, statuses, create_url, manage_url }) {
  const { auth } = usePage().props;
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter(
      (r) =>
        (!status || r.status === status) &&
        (!category || r.category === category) &&
        (!mineOnly || r.mine) &&
        (!q || r.title.toLowerCase().includes(q) || (r.address || "").toLowerCase().includes(q)),
    );
  }, [reports, status, category, mineOnly, query]);
  const sel = shown.find((r) => r.id === selected) || null;
  const count = (k) => reports.filter((r) => r.status === k).length;

  const statusChips = [{ value: "", label: "Tous", count: reports.length }, ...statuses.map((s) => ({ ...s, count: count(s.value) }))];
  const catChips = [{ value: "", label: "Toutes" }, ...categories.map((c) => ({ ...c, icon: REPORT_ICONS[c.value] }))];
  const mineCount = reports.filter((r) => r.mine).length;
  const reset = () => (setStatus(""), setCategory(""), setMineOnly(false), setQuery(""));

  return (
    <>
      <Head title="Signalements" />
      <PageHeader eyebrow="Services citoyens" title="Signaler un problème" subtitle="Voirie, éclairage, fuites, déchets : placez le problème sur la carte et suivez sa résolution." icon={TriangleAlert}>
        {create_url && (
          <Btn href={create_url} icon={Plus} size="lg">
            Nouveau signalement
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
        {statuses.map((s) => (
          <button key={s.value} type="button" onClick={() => setStatus(status === s.value ? "" : s.value)} className={cn("relative cursor-pointer px-5 py-4 text-left transition hover:bg-white/5", status === s.value && "bg-white/10")}>
            <p className="flex items-center gap-2 font-serif text-4xl leading-none font-medium" style={{ color: s.value === "resolu" ? "#c8f169" : REPORT_COLORS[s.value] }}>
              {count(s.value)}
            </p>
            <p className="mt-1.5 text-sm text-paper/60">{s.label.toLowerCase()}</p>
          </button>
        ))}
      </div>

      {reports.length === 0 ? (
        <EmptyState icon={TriangleAlert} title="Aucun signalement pour le moment." text="Vous voyez un problème dans votre quartier ? Soyez le premier à le signaler.">
          {create_url && (
            <Btn href={create_url} icon={Plus}>
              Nouveau signalement
            </Btn>
          )}
        </EmptyState>
      ) : (
        <>
          {/* Filtres */}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Chips options={statusChips} value={status} onChange={setStatus} />
            <label className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Titre ou adresse…"
                aria-label="Rechercher un signalement"
                className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none transition focus:border-green focus:ring-4 focus:ring-green/10"
              />
            </label>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Chips options={catChips} value={category} onChange={setCategory} />
            {auth.user && mineCount > 0 && (
              <button
                type="button"
                onClick={() => setMineOnly((v) => !v)}
                className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition", mineOnly ? "border-lime bg-lime text-deep" : "border-line bg-paper hover:border-ink/30")}
              >
                Mes signalements ({mineCount})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
            {/* Carte */}
            <div className="lg:sticky lg:top-6">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
                <Suspense fallback={<div className="h-[22rem] animate-pulse rounded-[1.4rem] bg-pale sm:h-[34rem]" />}>
                  <ReportMap reports={shown} selectedId={selected} onSelect={setSelected} className="h-[22rem] rounded-[1.4rem] sm:h-[34rem]" />
                </Suspense>
                {sel && (
                  <div className="absolute inset-x-5 bottom-5 z-[500] flex items-center gap-3 rounded-2xl bg-paper/95 p-3 shadow-xl backdrop-blur">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl text-paper" style={{ background: REPORT_COLORS[sel.status] }}>
                      {(() => {
                        const I = REPORT_ICONS[sel.category] || MapPin;
                        return <I className="size-5" />;
                      })()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{sel.title}</p>
                      <p className="truncate text-xs text-muted">
                        {sel.status_label} · {sel.supports} soutien{sel.supports > 1 ? "s" : ""}
                      </p>
                    </div>
                    <Btn href={sel.url} size="sm" arrow>
                      Voir
                    </Btn>
                    <button type="button" aria-label="Fermer" onClick={() => setSelected(null)} className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-mint">
                      <X className="size-4" />
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-2 text-xs text-muted">
                {statuses.map((s) => (
                  <span key={s.value} className="flex items-center gap-1.5">
                    <i className="size-2.5 rounded-full" style={{ background: REPORT_COLORS[s.value] }} /> {s.label}
                  </span>
                ))}
              </p>
            </div>

            {/* Liste */}
            <div className="flex flex-col gap-3">
              <p className="px-1 text-sm text-muted">
                {shown.length} signalement{shown.length > 1 ? "s" : ""}
              </p>
              {shown.length === 0 ? (
                <EmptyState icon={Search} title="Aucun résultat" text="Essayez un autre filtre.">
                  <Btn variant="ghost" onClick={reset}>
                    Tout afficher
                  </Btn>
                </EmptyState>
              ) : (
                shown.map((r) => <ReportCard key={r.id} r={r} selected={r.id === selected} onSelect={setSelected} />)
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

SignalementList.layout = appLayout;
