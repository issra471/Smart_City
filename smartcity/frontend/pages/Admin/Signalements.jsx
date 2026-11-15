// Tableau de gestion des signalements (administration) : carte, file d'attente triée, actions rapides.
import { lazy, Suspense, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AlarmClock, ArrowUpRight, Flame, HardHat, Inbox, LoaderCircle, Search, ThumbsUp, TriangleAlert, UserX, Wrench } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Chips, EmptyState, PageHeader, REPORT_COLORS, REPORT_ICONS, cn, fmtRelative } from "../../lib/ui";

const ReportMap = lazy(() => import("../../components/ReportMap"));

const SELECT = "w-full cursor-pointer rounded-xl border border-line bg-paper px-2.5 py-2 text-[13px] font-medium outline-none transition hover:border-ink/30 focus:border-green focus:ring-2 focus:ring-green/15 disabled:opacity-60";

function Quick({ label, value, options, onChange, disabled, empty }) {
  return (
    <label className="min-w-0 flex-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
      {label}
      <select className={cn(SELECT, "mt-1 normal-case tracking-normal text-ink")} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {empty && <option value="">{empty}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Row({ r, rank, selected, onSelect, statuses, priorities, teams }) {
  const Icon = REPORT_ICONS[r.category] || TriangleAlert;
  const [busy, setBusy] = useState(false);
  const update = (field, value) =>
    router.post(r.quick_url, { [field]: value, next: window.location.pathname }, { forceFormData: true, preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });

  return (
    <article
      onClick={() => onSelect(r.id)}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-[1.5rem] border bg-paper p-4 pl-5 transition hover:shadow-[0_14px_36px_#15362e14]",
        selected ? "border-deep ring-2 ring-lime" : "border-line",
        r.status === "resolu" && "opacity-70",
      )}
    >
      <i aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: REPORT_COLORS[r.status] }} />
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl text-paper" style={{ background: REPORT_COLORS[r.status] }}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-muted">#{rank}</span>
            {r.priority === "urgente" && r.status !== "resolu" && (
              <Badge tone="coral">
                <Flame className="size-3" /> Urgent
              </Badge>
            )}
            {r.late && (
              <Badge tone="coral">
                <AlarmClock className="size-3" /> En retard
              </Badge>
            )}
            {!r.team && r.status !== "resolu" && <Badge tone="amber">Sans équipe</Badge>}
            <Badge tone="muted">{r.category_label}</Badge>
          </div>
          <Link href={r.url} onClick={(e) => e.stopPropagation()} className="mt-1 block truncate font-serif text-xl leading-tight font-medium hover:underline">
            {r.title}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            <span>{fmtRelative(r.date)}</span>
            <span className="flex items-center gap-1">
              <ThumbsUp className="size-3" /> {r.supports}
            </span>
            {r.address && <span className="truncate">{r.address}</span>}
          </p>
        </div>
        {busy ? <LoaderCircle className="size-4 shrink-0 animate-spin text-muted" /> : (
          <Link href={r.url} onClick={(e) => e.stopPropagation()} aria-label="Ouvrir le signalement" className="grid size-8 shrink-0 place-items-center rounded-full text-green hover:bg-mint">
            <ArrowUpRight className="size-4" />
          </Link>
        )}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
        <Quick label="Statut" value={r.status} options={statuses} disabled={busy} onChange={(v) => update("statut", v)} />
        <Quick label="Priorité" value={r.priority} options={priorities} disabled={busy} onChange={(v) => update("priorite", v)} />
        <Quick label="Équipe" value={r.team_id} options={teams} disabled={busy} empty="— Aucune —" onChange={(v) => update("equipe", v)} />
      </div>
    </article>
  );
}

export default function AdminSignalements({ reports, categories, statuses, priorities, teams, teams_url, late_days }) {
  const [view, setView] = useState("todo"); // todo | urgent | late | noteam | all | resolu
  const [team, setTeam] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const open = reports.filter((r) => r.status !== "resolu");
  const VIEWS = [
    { value: "todo", label: "À traiter", icon: Inbox, test: (r) => r.status !== "resolu" },
    { value: "urgent", label: "Urgents", icon: Flame, test: (r) => r.status !== "resolu" && r.priority === "urgente" },
    { value: "late", label: `En retard (+${late_days} j)`, icon: AlarmClock, test: (r) => r.late },
    { value: "noteam", label: "Sans équipe", icon: UserX, test: (r) => r.status !== "resolu" && !r.team_id },
    { value: "resolu", label: "Résolus", icon: Wrench, test: (r) => r.status === "resolu" },
    { value: "all", label: "Tous", icon: TriangleAlert, test: () => true },
  ];
  const current = VIEWS.find((v) => v.value === view);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports.filter(
      (r) =>
        current.test(r) &&
        (!team || (team === "none" ? !r.team_id : String(r.team_id) === team)) &&
        (!category || r.category === category) &&
        (!q || r.title.toLowerCase().includes(q) || (r.address || "").toLowerCase().includes(q)),
    );
  }, [reports, view, team, category, query]);

  const tiles = [
    ["todo", open.length, "à traiter (ouverts ou en cours)", "#e0603a"],
    ["urgent", reports.filter(VIEWS[1].test).length, "urgents en attente", "#f0906a"],
    ["late", reports.filter(VIEWS[2].test).length, `ouverts depuis ${late_days} jours ou plus`, "#f0906a"],
    ["noteam", reports.filter(VIEWS[3].test).length, "sans équipe", "#d99a16"],
  ];

  return (
    <>
      <Head title="Gestion des signalements" />
      <PageHeader eyebrow="Gestion" title="Signalements" subtitle="Les plus importants d'abord : urgents, puis les plus soutenus par les citoyens, puis les plus anciens." icon={TriangleAlert}>
        <Btn href={teams_url} icon={HardHat} size="lg">
          Équipes
        </Btn>
      </PageHeader>

      {/* Compteurs */}
      <div className="grain relative mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] bg-deep text-paper lg:grid-cols-4">
        {tiles.map(([v, n, label, color]) => (
          <button key={v} type="button" onClick={() => setView(v)} className={cn("relative cursor-pointer px-5 py-4 text-left transition hover:bg-white/5", view === v && "bg-white/10")}>
            <p className="font-serif text-4xl leading-none font-medium" style={{ color: n ? color : "#c8f169" }}>
              {n}
            </p>
            <p className="mt-1.5 text-sm text-paper/60">{label}</p>
          </button>
        ))}
      </div>

      {/* Filtres */}
      <div className="mb-3">
        <Chips options={VIEWS.map((v) => ({ value: v.value, label: v.label, icon: v.icon, count: reports.filter(v.test).length }))} value={view} onChange={setView} />
      </div>
      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        <select className={cn(SELECT, "rounded-full px-4 py-2.5 text-sm")} value={team} onChange={(e) => setTeam(e.target.value)} aria-label="Filtrer par équipe">
          <option value="">Toutes les équipes</option>
          {teams.map((t) => (
            <option key={t.value} value={String(t.value)}>
              {t.label} ({t.active} en cours)
            </option>
          ))}
          <option value="none">Sans équipe</option>
        </select>
        <select className={cn(SELECT, "rounded-full px-4 py-2.5 text-sm")} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Filtrer par catégorie">
          <option value="">Toutes les catégories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titre, rue, quartier…" aria-label="Rechercher" className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none focus:border-green focus:ring-4 focus:ring-green/10" />
        </label>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_1.15fr]">
        <div className="xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
            <Suspense fallback={<div className="h-[22rem] animate-pulse rounded-[1.4rem] bg-pale xl:h-[38rem]" />}>
              <ReportMap reports={shown} selectedId={selected} onSelect={setSelected} className="h-[22rem] rounded-[1.4rem] xl:h-[38rem]" />
            </Suspense>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <p className="px-1 text-sm text-muted">
            {shown.length} signalement{shown.length > 1 ? "s" : ""} · {current.label.toLowerCase()}
          </p>
          {shown.length === 0 ? (
            <EmptyState icon={Inbox} title="Rien ici" text={view === "todo" ? "Tous les signalements sont traités. Bravo !" : "Aucun signalement ne correspond à ces filtres."} />
          ) : (
            shown.map((r, i) => <Row key={r.id} r={r} rank={i + 1} selected={r.id === selected} onSelect={setSelected} statuses={statuses} priorities={priorities} teams={teams} />)
          )}
        </div>
      </div>
    </>
  );
}

AdminSignalements.layout = adminLayout;
