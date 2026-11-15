// Toutes les réservations (administration) : filtres et annulation avec motif.
import { useMemo, useState } from "react";
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, ArrowRight, Bike, CalendarCheck, Search } from "lucide-react";
import CancelWithReason from "../../components/CancelWithReason";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Card, Chips, EmptyState, PageHeader, STATION_ICONS, STATUS_TONE, cn, fmtDateTime, fmtRelative } from "../../lib/ui";

const SELECT = "w-full cursor-pointer rounded-full border border-line bg-paper px-4 py-2.5 text-sm outline-none focus:border-green focus:ring-4 focus:ring-green/10";

export default function AdminReservations({ reservations, stations, today, back_url }) {
  const [period, setPeriod] = useState("upcoming");
  const [station, setStation] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  const isToday = (r) => r.date.slice(0, 10) === today;
  const PERIODS = [
    { value: "today", label: "Aujourd'hui", test: isToday },
    { value: "upcoming", label: "À venir", test: (r) => r.upcoming },
    { value: "past", label: "Passées", test: (r) => !r.upcoming && r.status === "confirmee" },
    { value: "all", label: "Toutes", test: () => true },
  ];
  const current = PERIODS.find((p) => p.value === period);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = reservations.filter(
      (r) =>
        current.test(r) &&
        (!station || String(r.from_id) === station || String(r.to_id) === station) &&
        (!status || r.status === status) &&
        (!q || r.user.toLowerCase().includes(q) || r.username.toLowerCase().includes(q)),
    );
    // À venir : la plus proche en premier.
    return period === "upcoming" || period === "today" ? [...list].reverse() : list;
  }, [reservations, period, station, status, query]);

  return (
    <>
      <Head title="Réservations" />
      <Link href={back_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Gestion mobilité
      </Link>
      <PageHeader eyebrow="Gestion" title="Réservations" subtitle="Les balades réservées par les citoyens. Vous pouvez en annuler une en indiquant le motif : le citoyen le verra." icon={CalendarCheck} />

      <div className="mb-3">
        <Chips options={PERIODS.map((p) => ({ value: p.value, label: p.label, count: reservations.filter(p.test).length }))} value={period} onChange={setPeriod} />
      </div>
      <div className="mb-6 grid gap-2 sm:grid-cols-3">
        <select className={SELECT} value={station} onChange={(e) => setStation(e.target.value)} aria-label="Filtrer par station">
          <option value="">Toutes les stations</option>
          {stations.map((s) => (
            <option key={s.value} value={String(s.value)}>
              {s.label}
            </option>
          ))}
        </select>
        <select className={SELECT} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          <option value="confirmee">Confirmées</option>
          <option value="annulee">Annulées</option>
        </select>
        <label className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nom du citoyen…" aria-label="Rechercher un citoyen" className="w-full rounded-full border border-line bg-paper py-2.5 pr-4 pl-11 text-sm outline-none focus:border-green focus:ring-4 focus:ring-green/10" />
        </label>
      </div>

      {shown.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Aucune réservation" text="Rien ne correspond à ces filtres." />
      ) : (
        <Card className="divide-y divide-line/70">
          {shown.map((r) => {
            const Icon = STATION_ICONS[r.type] || Bike;
            return (
              <div key={r.id} className={cn("flex flex-wrap items-center gap-4 px-5 py-4", r.status === "annulee" && "opacity-70")}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-mint text-green">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 font-semibold">
                    {r.from} <ArrowRight className="size-4 text-green" /> {r.to}
                    <Badge tone={STATUS_TONE[r.status]} dot>
                      {r.status_label}
                    </Badge>
                  </p>
                  <p className="mt-0.5 text-sm text-muted">
                    {r.user} (@{r.username}) · {r.units} {r.type_label.toLowerCase()} · {fmtDateTime(r.date)}
                    {r.upcoming && <span className="text-green"> · {fmtRelative(r.date)}</span>}
                  </p>
                  {r.reason && <p className="mt-1 text-[13px] text-[#b4532f]">Annulée par l'administration : {r.reason}</p>}
                </div>
                {r.upcoming && (
                  <div className="w-full sm:w-auto">
                    <CancelWithReason url={r.cancel_url} />
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      )}
      {reservations.length >= 500 && <p className="mt-3 text-xs text-muted">Seules les 500 réservations les plus récentes sont affichées.</p>}
    </>
  );
}

AdminReservations.layout = adminLayout;
