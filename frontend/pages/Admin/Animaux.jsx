// Tableau de gestion des animaux (administration) : carte, file d'attente triée, actions rapides.
import { lazy, Suspense, useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AlarmClock, ArrowUpRight, Binoculars, CheckCheck, Flame, HandHeart, Inbox, LoaderCircle, PawPrint, Search, ThumbsUp, UserX } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { ANIMAL_ICONS, Badge, Btn, Chips, EmptyState, PageHeader, animalColor, cn, fmtRelative } from "../../lib/ui";
import { CaseBadge } from "../Animal/List";

const ReportMap = lazy(() => import("../../components/ReportMap"));
const iconFor = (a) => ANIMAL_ICONS[a.animal] || PawPrint;
const SELECT = "w-full cursor-pointer rounded-xl border border-line bg-paper px-2.5 py-2 text-[13px] font-medium outline-none transition hover:border-ink/30 focus:border-green focus:ring-2 focus:ring-green/15 disabled:opacity-60";

function Quick({ label, value, options, onChange, disabled, empty }) {
  return (
    <label className="min-w-28 flex-1 text-[11px] font-semibold tracking-wide text-muted uppercase">
      {label}
      <select className={cn(SELECT, "mt-1 tracking-normal text-ink normal-case")} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
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

function Row({ a, rank, selected, onSelect, statuses, priorities, partners, results }) {
  const Icon = iconFor(a);
  const [busy, setBusy] = useState(false);
  const update = (field, value) => router.post(a.quick_url, { [field]: value, next: window.location.pathname }, { forceFormData: true, preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  const done = ["resolu", "rejete"].includes(a.status);

  return (
    <article onClick={() => onSelect(a.id)} className={cn("relative cursor-pointer overflow-hidden rounded-[1.5rem] border bg-paper p-4 pl-5 transition hover:shadow-[0_14px_36px_#15362e14]", selected ? "border-deep ring-2 ring-lime" : "border-line", done && "opacity-70")}>
      <i aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: animalColor(a) }} />
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl text-paper" style={{ background: animalColor(a) }}>
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {a.urgent && <span className="text-xs font-bold text-muted">#{rank}</span>}
            <CaseBadge a={a} />
            {a.urgent && <Badge tone={a.status === "ouvert" ? "coral" : a.status === "en_cours" ? "amber" : "muted"} dot>{a.status_label}</Badge>}
            {a.urgent && a.priority === "urgente" && !done && (
              <Badge tone="coral">
                <Flame className="size-3" /> Urgent
              </Badge>
            )}
            {a.late && (
              <Badge tone="coral">
                <AlarmClock className="size-3" /> +24 h
              </Badge>
            )}
            {a.urgent && !a.partner && !done && <Badge tone="amber">Sans partenaire</Badge>}
          </div>
          <Link href={a.url} onClick={(e) => e.stopPropagation()} className="mt-1 block truncate font-serif text-xl leading-tight font-medium hover:underline">
            {a.title}
            {a.count > 1 && <span className="ml-1.5 font-sans text-sm text-muted">×{a.count}</span>}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            <span>vu {fmtRelative(a.seen_at)}</span>
            {a.urgent && (
              <span className="flex items-center gap-1">
                <ThumbsUp className="size-3" /> {a.supports}
              </span>
            )}
            {a.address && <span className="truncate">{a.address}</span>}
          </p>
        </div>
        {busy ? (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-muted" />
        ) : (
          <Link href={a.url} onClick={(e) => e.stopPropagation()} aria-label="Ouvrir" className="grid size-8 shrink-0 place-items-center rounded-full text-green hover:bg-mint">
            <ArrowUpRight className="size-4" />
          </Link>
        )}
      </div>
      {a.urgent && a.status !== "rejete" && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3" onClick={(e) => e.stopPropagation()}>
          <Quick label="Statut" value={a.status} options={statuses.filter((s) => s.value !== "rejete")} disabled={busy} onChange={(v) => update("statut", v)} />
          <Quick label="Priorité" value={a.priority} options={priorities} disabled={busy} onChange={(v) => update("priorite", v)} />
          <Quick label="Partenaire" value={a.partner_id} options={partners} disabled={busy} empty="— Aucun —" onChange={(v) => update("partenaire", v)} />
          {a.status === "resolu" && <Quick label="Résultat" value={a.result} options={results} disabled={busy} empty="— À indiquer —" onChange={(v) => update("resultat", v)} />}
        </div>
      )}
    </article>
  );
}

export default function AdminAnimaux({ items, animals, statuses, priorities, results, partners, partners_url }) {
  const [view, setView] = useState("todo");
  const [partner, setPartner] = useState("");
  const [animal, setAnimal] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const active = (a) => a.urgent && ["ouvert", "en_cours"].includes(a.status);
  const VIEWS = [
    { value: "todo", label: "À traiter", icon: Inbox, test: active },
    { value: "urgent", label: "Urgents", icon: Flame, test: (a) => active(a) && a.priority === "urgente" },
    { value: "late", label: "En retard (+24 h)", icon: AlarmClock, test: (a) => a.late },
    { value: "nopartner", label: "Sans partenaire", icon: UserX, test: (a) => active(a) && !a.partner_id },
    { value: "done", label: "Terminés", icon: CheckCheck, test: (a) => a.urgent && !active(a) },
    { value: "obs", label: "Observations", icon: Binoculars, test: (a) => !a.urgent },
    { value: "all", label: "Tous", icon: PawPrint, test: () => true },
  ];
  const current = VIEWS.find((v) => v.value === view);
  const count = (v) => items.filter(VIEWS.find((x) => x.value === v).test).length;

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (a) =>
        current.test(a) &&
        (!partner || (partner === "none" ? !a.partner_id : String(a.partner_id) === partner)) &&
        (!animal || a.animal === animal) &&
        (!q || a.title.toLowerCase().includes(q) || (a.address || "").toLowerCase().includes(q)),
    );
  }, [items, view, partner, animal, query]);

  const tiles = [
    ["todo", count("todo"), "animaux à aider", "#e0603a"],
    ["urgent", count("urgent"), "urgents", "#f0906a"],
    ["late", count("late"), "signalés depuis plus de 24 h", "#f0906a"],
    ["nopartner", count("nopartner"), "sans partenaire", "#d99a16"],
  ];

  return (
    <>
      <Head title="Gestion des animaux" />
      <PageHeader eyebrow="Gestion" title="Animaux" subtitle="Les animaux en difficulté d'abord : urgents, puis les plus confirmés par les citoyens, puis les plus anciens." icon={PawPrint}>
        <Btn href={partners_url} icon={HandHeart} size="lg">
          Partenaires
        </Btn>
      </PageHeader>

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

      <div className="mb-3">
        <Chips options={VIEWS.map((v) => ({ value: v.value, label: v.label, icon: v.icon, count: count(v.value) }))} value={view} onChange={setView} />
      </div>
      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        <select className={cn(SELECT, "rounded-full px-4 py-2.5 text-sm")} value={partner} onChange={(e) => setPartner(e.target.value)} aria-label="Filtrer par partenaire">
          <option value="">Tous les partenaires</option>
          {partners.map((p) => (
            <option key={p.value} value={String(p.value)}>
              {p.label} ({p.active} en cours)
            </option>
          ))}
          <option value="none">Sans partenaire</option>
        </select>
        <select className={cn(SELECT, "rounded-full px-4 py-2.5 text-sm")} value={animal} onChange={(e) => setAnimal(e.target.value)} aria-label="Filtrer par animal">
          <option value="">Tous les animaux</option>
          {animals.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </select>
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Espèce, rue, quartier…" aria-label="Rechercher" className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none focus:border-green focus:ring-4 focus:ring-green/10" />
        </label>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_1.15fr]">
        <div className="xl:sticky xl:top-6">
          <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
            <Suspense fallback={<div className="h-[22rem] animate-pulse rounded-[1.4rem] bg-pale xl:h-[38rem]" />}>
              <ReportMap reports={shown} selectedId={selected} onSelect={setSelected} iconFor={iconFor} colorFor={animalColor} label="Carte des animaux" className="h-[22rem] rounded-[1.4rem] xl:h-[38rem]" />
            </Suspense>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <p className="px-1 text-sm text-muted">
            {shown.length} résultat{shown.length > 1 ? "s" : ""} · {current.label.toLowerCase()}
          </p>
          {shown.length === 0 ? (
            <EmptyState icon={Inbox} title="Rien ici" text={view === "todo" ? "Aucun animal en attente d'aide. Bravo !" : "Rien ne correspond à ces filtres."} />
          ) : (
            shown.map((a, i) => <Row key={a.id} a={a} rank={i + 1} selected={a.id === selected} onSelect={setSelected} statuses={statuses} priorities={priorities} partners={partners} results={results} />)
          )}
        </div>
      </div>
    </>
  );
}

AdminAnimaux.layout = adminLayout;
