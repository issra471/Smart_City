import { useMemo, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { ArrowUpRight, CalendarHeart, LoaderCircle, MapPin, Search, Trash2, Users } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Chips, EmptyState, EVENT_COLORS, EVENT_ICONS, PageHeader, STATUS_TONE, cn, fmtDateTime, fmtRelative } from "../../lib/ui";

function Row({ e }) {
  const Icon = EVENT_ICONS[e.category] || CalendarHeart;
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const remove = () => router.post(`/evenements/${e.id}/supprimer/`, {}, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });

  return (
    <article className={cn("relative overflow-hidden rounded-[1.5rem] border bg-paper p-4 pl-5 transition hover:shadow-[0_14px_36px_#15362e14]", e.status === "passe" && "opacity-70", "border-line")}>
      <i aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5" style={{ background: EVENT_COLORS[e.status] }} />
      <div className="flex items-start gap-3">
        {e.image ? (
          <img src={e.image} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-xl text-paper" style={{ background: EVENT_COLORS[e.status] }}>
            <Icon className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone={STATUS_TONE[e.status]} dot>{e.status_label}</Badge>
            <Badge tone="muted">{e.category_label}</Badge>
          </div>
          <Link href={e.url} className="mt-1 block truncate font-serif text-xl leading-tight font-medium hover:underline">
            {e.title}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
            <span>{fmtDateTime(e.date)}</span>
            {e.place && <span className="flex items-center gap-1"><MapPin className="size-3" />{e.place}</span>}
            <span>{e.author}</span>
            <span className="flex items-center gap-1"><Users className="size-3" />{e.participants}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {confirm ? (
            <span className="flex items-center gap-1 text-xs">
              <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={busy}>Non</Btn>
              <Btn size="sm" variant="danger" onClick={remove} disabled={busy}>
                {busy && <LoaderCircle className="size-3 animate-spin" />} Oui
              </Btn>
            </span>
          ) : (
            <button type="button" onClick={() => setConfirm(true)} title="Supprimer" className="grid size-8 cursor-pointer place-items-center rounded-full text-muted hover:bg-coral/10 hover:text-[#b4532f]">
              <Trash2 className="size-4" />
            </button>
          )}
          <Link href={e.url} aria-label="Ouvrir" className="grid size-8 place-items-center rounded-full text-green hover:bg-mint">
            <ArrowUpRight className="size-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function AdminEvenements({ items, categories }) {
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [query, setQuery] = useState("");

  const statusChips = [
    { value: "", label: "Tous", count: items.length },
    { value: "avenir", label: "À venir", count: items.filter((e) => e.status === "avenir").length },
    { value: "en_cours", label: "En cours", count: items.filter((e) => e.status === "en_cours").length },
    { value: "passe", label: "Passés", count: items.filter((e) => e.status === "passe").length },
  ];
  const catChips = [{ value: "", label: "Toutes" }, ...categories.map((c) => ({ ...c, icon: EVENT_ICONS[c.value] }))];

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (e) =>
        (!status || e.status === status) &&
        (!category || e.category === category) &&
        (!q || e.title.toLowerCase().includes(q) || (e.place || "").toLowerCase().includes(q) || (e.author || "").toLowerCase().includes(q)),
    );
  }, [items, status, category, query]);

  const tiles = [
    ["avenir", items.filter((e) => e.status === "avenir").length, "à venir", "#c8f169"],
    ["en_cours", items.filter((e) => e.status === "en_cours").length, "en cours", "#d99a16"],
    ["passe", items.filter((e) => e.status === "passe").length, "passés", "#9aa8a3"],
  ];

  return (
    <>
      <Head title="Gestion des événements" />
      <PageHeader eyebrow="Gestion" title="Événements" subtitle="Consultez, filtrez et supprimez les événements publiés par les citoyens." icon={CalendarHeart} />

      <div className="grain relative mb-6 grid grid-cols-3 gap-px overflow-hidden rounded-[1.75rem] bg-deep text-paper">
        {tiles.map(([v, n, label, color]) => (
          <button key={v} type="button" onClick={() => setStatus(status === v ? "" : v)} className={cn("relative cursor-pointer px-5 py-4 text-left transition hover:bg-white/5", status === v && "bg-white/10")}>
            <p className="font-serif text-4xl leading-none font-medium" style={{ color }}>{n}</p>
            <p className="mt-1.5 text-sm text-paper/60">{label}</p>
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Chips options={statusChips} value={status} onChange={setStatus} />
        <label className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Titre, lieu, organisateur…" aria-label="Rechercher" className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none focus:border-green focus:ring-4 focus:ring-green/10" />
        </label>
      </div>
      <div className="mb-6">
        <Chips options={catChips} value={category} onChange={setCategory} />
      </div>

      {items.length === 0 ? (
        <EmptyState icon={CalendarHeart} title="Aucun événement" text="Les citoyens n'ont pas encore proposé d'événement." />
      ) : shown.length === 0 ? (
        <EmptyState icon={Search} title="Aucun résultat" text="Essayez un autre filtre.">
          <Btn variant="ghost" onClick={() => (setStatus(""), setCategory(""), setQuery(""))}>Tout afficher</Btn>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="px-1 text-sm text-muted">{shown.length} événement{shown.length > 1 ? "s" : ""}</p>
          {shown.map((e) => <Row key={e.id} e={e} />)}
        </div>
      )}
    </>
  );
}

AdminEvenements.layout = adminLayout;
