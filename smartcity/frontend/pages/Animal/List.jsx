// Animaux : carte de tous les signalements (animaux en difficulté + observations) et liste filtrable.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowUpRight, Binoculars, Clock3, PawPrint, Plus, Search, ShieldCheck, Siren, X } from "lucide-react";
import SupportButton from "../../components/SupportButton";
import { appLayout } from "../../layouts/AppShell";
import { ANIMAL_ICONS, Badge, Btn, CASE_ICONS, Chips, EmptyState, OBSERVATION_COLOR, PageHeader, REPORT_COLORS, STATUS_TONE, animalColor, cn, fmtRelative } from "../../lib/ui";

const ReportMap = lazy(() => import("../../components/ReportMap"));
const iconFor = (a) => ANIMAL_ICONS[a.animal] || PawPrint;

export function SeenButton({ a, size }) {
  if (!a.urgent) return null;
  return <SupportButton r={a} size={size} label="Je l'ai vu aussi" doneLabel="Vu aussi" title="J'ai vu le même animal" />;
}

export function CaseBadge({ a }) {
  const I = CASE_ICONS[a.case];
  if (a.urgent)
    return (
      <Badge tone="coral">
        {I && <I className="size-3" />} {a.case_label}
      </Badge>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#3a7bb8]/12 px-2.5 py-1 text-[11px] font-semibold tracking-wide whitespace-nowrap text-[#2c5f8f]">
      {I && <I className="size-3" />} {a.case_label}
    </span>
  );
}

function Card({ a, selected, onSelect }) {
  const Icon = iconFor(a);
  const ref = useRef(null);
  useEffect(() => {
    if (selected) ref.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);
  return (
    <article
      ref={ref}
      onClick={() => onSelect(a.id)}
      className={cn("flex cursor-pointer gap-4 rounded-[1.5rem] border bg-paper p-4 transition hover:shadow-[0_16px_40px_#15362e14]", selected ? "border-deep ring-2 ring-lime" : "border-line")}
    >
      {a.photo ? (
        <img src={a.photo} alt="" className="size-16 shrink-0 rounded-2xl object-cover sm:size-20" />
      ) : (
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl text-paper sm:size-20" style={{ background: animalColor(a) }}>
          <Icon className="size-8" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <CaseBadge a={a} />
          {a.urgent && <Badge tone={STATUS_TONE[a.status]} dot>{a.status_label}</Badge>}
          {a.result_label && <Badge tone="green">{a.result_label}</Badge>}
          {a.mine && <Badge tone="lime">Le mien</Badge>}
        </div>
        <h3 className="mt-1.5 truncate font-serif text-xl leading-tight font-medium">
          {a.title}
          {a.count > 1 && <span className="ml-1.5 font-sans text-sm text-muted">×{a.count}</span>}
        </h3>
        <p className="mt-0.5 truncate text-[13px] text-muted">
          {a.animal_label}
          {a.address && ` · ${a.address}`}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-muted">
            <Clock3 className="size-3" /> vu {fmtRelative(a.seen_at)}
            {a.partner && a.urgent && !["resolu", "rejete"].includes(a.status) && <span className="ml-1">· {a.partner}</span>}
          </span>
          <div className="flex items-center gap-2">
            <SeenButton a={a} />
            <Link href={a.url} onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold text-green hover:bg-mint">
              Détail <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function AnimalList({ items, animals, statuses, create_url, manage_url }) {
  const { auth } = usePage().props;
  const [kind, setKind] = useState(""); // "" | urgent | observation
  const [status, setStatus] = useState("");
  const [animal, setAnimal] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);

  const urgent = items.filter((a) => a.urgent);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (a) =>
        (!kind || (kind === "urgent" ? a.urgent : !a.urgent)) &&
        (!status || (a.urgent && a.status === status)) &&
        (!animal || a.animal === animal) &&
        (!mineOnly || a.mine) &&
        (!q || a.title.toLowerCase().includes(q) || (a.address || "").toLowerCase().includes(q)),
    );
  }, [items, kind, status, animal, mineOnly, query]);
  const sel = shown.find((a) => a.id === selected) || null;
  const mineCount = items.filter((a) => a.mine).length;

  const tiles = [
    ["urgent", "ouvert", urgent.filter((a) => a.status === "ouvert").length, "en attente d'aide", REPORT_COLORS.ouvert],
    ["urgent", "en_cours", urgent.filter((a) => a.status === "en_cours").length, "pris en charge", REPORT_COLORS.en_cours],
    ["urgent", "resolu", urgent.filter((a) => a.status === "resolu").length, "aidés", "#c8f169"],
    ["observation", "", items.length - urgent.length, "observations", "#9cc6ec"],
  ];

  return (
    <>
      <Head title="Animaux" />
      <PageHeader eyebrow="Services citoyens" title="Animaux" subtitle="Un animal blessé, errant ou en danger ? Placez-le sur la carte, un partenaire de la ville intervient. Vous pouvez aussi partager un animal observé." icon={PawPrint}>
        {create_url && (
          <Btn href={create_url} icon={Plus} size="lg">
            Signaler un animal
          </Btn>
        )}
        {manage_url && (
          <Btn href={manage_url} icon={ShieldCheck} size="lg">
            Tableau de gestion
          </Btn>
        )}
      </PageHeader>

      {/* Chiffres */}
      <div className="grain relative mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-[1.75rem] bg-deep text-paper sm:grid-cols-4">
        {tiles.map(([k, s, n, label, color]) => {
          const on = kind === k && status === s;
          return (
            <button key={label} type="button" onClick={() => (on ? (setKind(""), setStatus("")) : (setKind(k), setStatus(s)))} className={cn("relative cursor-pointer px-5 py-4 text-left transition hover:bg-white/5", on && "bg-white/10")}>
              <p className="font-serif text-4xl leading-none font-medium" style={{ color }}>
                {n}
              </p>
              <p className="mt-1.5 text-sm text-paper/60">{label}</p>
            </button>
          );
        })}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={PawPrint} title="Aucun animal signalé pour le moment." text="Un animal en difficulté ou une belle rencontre ? Partagez-le.">
          {create_url && (
            <Btn href={create_url} icon={Plus}>
              Signaler un animal
            </Btn>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <Chips
              options={[
                { value: "", label: "Tout", count: items.length },
                { value: "urgent", label: "En difficulté", icon: Siren, count: urgent.length },
                { value: "observation", label: "Observations", icon: Binoculars, count: items.length - urgent.length },
              ]}
              value={kind}
              onChange={(v) => (setKind(v), setStatus(""))}
            />
            <label className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Espèce ou lieu…" aria-label="Rechercher" className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none transition focus:border-green focus:ring-4 focus:ring-green/10" />
            </label>
          </div>
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <Chips options={[{ value: "", label: "Tous les animaux" }, ...animals.map((a) => ({ ...a, icon: ANIMAL_ICONS[a.value] }))]} value={animal} onChange={setAnimal} />
            {kind === "urgent" && (
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrer par statut" className="cursor-pointer rounded-full border border-line bg-paper px-4 py-2 text-sm">
                <option value="">Tous les statuts</option>
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
            {auth.user && mineCount > 0 && (
              <button type="button" onClick={() => setMineOnly((v) => !v)} className={cn("cursor-pointer rounded-full border px-4 py-2 text-sm font-medium transition", mineOnly ? "border-lime bg-lime text-deep" : "border-line bg-paper hover:border-ink/30")}>
                Mes signalements ({mineCount})
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.25fr_1fr]">
            <div className="lg:sticky lg:top-6">
              <div className="relative overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
                <Suspense fallback={<div className="h-[22rem] animate-pulse rounded-[1.4rem] bg-pale sm:h-[34rem]" />}>
                  <ReportMap reports={shown} selectedId={selected} onSelect={setSelected} iconFor={iconFor} colorFor={animalColor} label="Carte des animaux" className="h-[22rem] rounded-[1.4rem] sm:h-[34rem]" />
                </Suspense>
                {sel && (
                  <div className="absolute inset-x-5 bottom-5 z-[500] flex items-center gap-3 rounded-2xl bg-paper/95 p-3 shadow-xl backdrop-blur">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl text-paper" style={{ background: animalColor(sel) }}>
                      {(() => {
                        const I = iconFor(sel);
                        return <I className="size-5" />;
                      })()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{sel.title}</p>
                      <p className="truncate text-xs text-muted">
                        {sel.case_label}
                        {sel.urgent && ` · ${sel.status_label}`}
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
                <span className="flex items-center gap-1.5">
                  <i className="size-2.5 rounded-full" style={{ background: REPORT_COLORS.ouvert }} /> en attente d'aide
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="size-2.5 rounded-full" style={{ background: REPORT_COLORS.en_cours }} /> pris en charge
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="size-2.5 rounded-full" style={{ background: REPORT_COLORS.resolu }} /> aidé
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="size-2.5 rounded-full" style={{ background: OBSERVATION_COLOR }} /> observation
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <p className="px-1 text-sm text-muted">
                {shown.length} résultat{shown.length > 1 ? "s" : ""}
              </p>
              {shown.length === 0 ? (
                <EmptyState icon={Search} title="Aucun résultat" text="Essayez un autre filtre.">
                  <Btn variant="ghost" onClick={() => (setKind(""), setStatus(""), setAnimal(""), setMineOnly(false), setQuery(""))}>
                    Tout afficher
                  </Btn>
                </EmptyState>
              ) : (
                shown.map((a) => <Card key={a.id} a={a} selected={a.id === selected} onSelect={setSelected} />)
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

AnimalList.layout = appLayout;
