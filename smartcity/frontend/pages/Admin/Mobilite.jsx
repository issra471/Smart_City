// Tableau de gestion de la mobilité : stock des stations, alertes, réservations à venir.
import { Head, Link, router } from "@inertiajs/react";
import { AlertTriangle, ArrowRight, ArrowUpRight, Bike, CalendarCheck, Inbox, MapPin, Plus, Wrench } from "lucide-react";
import StationMap from "../../components/StationMap";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, STATION_ICONS, cn, fmtDateTime, fmtRelative } from "../../lib/ui";

const LEVEL = {
  vide: { label: "Vide", tone: "coral", bar: "bg-coral" },
  bas: { label: "Bientôt vide", tone: "amber", bar: "bg-[#d99a16]" },
  ok: { label: "OK", tone: "green", bar: "bg-green" },
};

export default function AdminMobilite({ stations, kpis, next, low_threshold, urls }) {
  const alerts = stations.filter((s) => s.level !== "ok");
  const max = Math.max(1, ...stations.map((s) => s.units));
  const tiles = [
    [kpis.units, "unités disponibles", Bike, null],
    [kpis.empty + kpis.low, "stations vides ou presque", AlertTriangle, null, kpis.empty + kpis.low > 0],
    [kpis.pending, "propositions à approuver", Inbox, urls.proposals, kpis.pending > 0],
    [kpis.today, "départs aujourd'hui", CalendarCheck, urls.reservations],
  ];

  return (
    <>
      <Head title="Gestion mobilité" />
      <PageHeader eyebrow="Gestion" title="Mobilité" subtitle={`${kpis.stations} stations · ${kpis.upcoming} réservation${kpis.upcoming > 1 ? "s" : ""} à venir · ${kpis.maintenance} unité${kpis.maintenance > 1 ? "s" : ""} en maintenance`} icon={Bike}>
        <Btn href={urls.transport_create} variant="ghost" icon={Plus}>
          Ajouter un transport
        </Btn>
        <Btn href={urls.station_create} icon={MapPin} size="lg">
          Ajouter une station
        </Btn>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(([n, label, Icon, href, hot], i) => {
          const cls = cn("group relative block overflow-hidden rounded-[1.75rem] p-6 transition", i === 0 ? "grain bg-deep text-paper" : "border border-line bg-paper", href && "hover:-translate-y-0.5 hover:shadow-[0_18px_45px_#15362e17]");
          const inner = (
            <>
              <div className="relative flex items-center justify-between">
                <span className={cn("grid size-11 place-items-center rounded-2xl", i === 0 ? "bg-lime text-deep" : hot ? "bg-coral/15 text-[#b4532f]" : "bg-mint text-green")}>
                  <Icon className="size-5" />
                </span>
                {href && <ArrowUpRight className="size-4 opacity-40 transition group-hover:opacity-100" />}
              </div>
              <p className={cn("relative mt-5 font-serif text-5xl leading-none font-medium", hot && "text-[#b4532f]")}>{n}</p>
              <p className={cn("relative mt-2 text-sm", i === 0 ? "text-paper/60" : "text-muted")}>{label}</p>
            </>
          );
          return href ? <Link key={label} href={href} className={cls}>{inner}</Link> : <div key={label} className={cls}>{inner}</div>;
        })}
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 rounded-[1.5rem] border border-coral/30 bg-coral/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-[#8f3f20]">
            <AlertTriangle className="size-4" /> À réapprovisionner
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {alerts.map((s) => (
              <Link key={s.id} href={s.manage_url} className="flex items-center gap-2 rounded-full bg-paper px-3.5 py-2 text-sm font-semibold shadow-sm hover:shadow">
                <i className={cn("size-2 rounded-full", LEVEL[s.level].bar)} /> {s.name}
                <span className="font-normal text-muted">
                  {s.units} dispo{s.maintenance > 0 && ` · ${s.maintenance} en maintenance`}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1fr_1.1fr]">
        <Card className="overflow-hidden p-2">
          <StationMap stations={stations} onPick={(id) => router.visit(stations.find((s) => s.id === id).manage_url)} className="h-[22rem] rounded-[1.4rem] xl:h-[30rem]" />
          <p className="px-4 py-3 text-xs text-muted">
            Cliquez sur une station pour gérer son stock. Orange : {low_threshold} unités ou moins · rouge : vide.
          </p>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 className="font-serif text-2xl">Stations</h2>
            <span className="text-xs text-muted">les plus vides d'abord</span>
          </div>
          {stations.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={MapPin} title="Aucune station" text="Ajoutez la première station de la ville." />
            </div>
          ) : (
            <ul className="divide-y divide-line/70">
              {stations.map((s) => (
                <li key={s.id}>
                  <Link href={s.manage_url} className="flex items-center gap-4 px-6 py-3.5 transition hover:bg-pale">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <b className="truncate">{s.name}</b>
                        {s.level !== "ok" && <Badge tone={LEVEL[s.level].tone}>{LEVEL[s.level].label}</Badge>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
                        {s.transports.length === 0 && <span>Aucun transport</span>}
                        {s.transports.map((t) => {
                          const Icon = STATION_ICONS[t.type] || Bike;
                          return (
                            <span key={t.id} className="flex items-center gap-1">
                              <Icon className="size-3.5" /> {t.units}
                              {t.maintenance > 0 && (
                                <span className="flex items-center gap-0.5 text-[#9a6c0c]">
                                  (<Wrench className="size-3" />
                                  {t.maintenance})
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/5">
                        <div className={cn("h-full rounded-full", LEVEL[s.level].bar)} style={{ width: `${Math.max(3, (s.units / max) * 100)}%` }} />
                      </div>
                    </div>
                    <span className="font-serif text-3xl leading-none">{s.units}</span>
                    <ArrowRight className="size-4 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl">Prochains départs</h2>
          <Btn href={urls.reservations} variant="ghost" size="sm" arrow>
            Toutes les réservations
          </Btn>
        </div>
        {next.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Aucune réservation à venir.</p>
        ) : (
          <ul className="mt-4 grid gap-2 md:grid-cols-2">
            {next.map((r) => {
              const Icon = STATION_ICONS[r.type] || Bike;
              return (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-pale p-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-paper text-green">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {r.from} → {r.to}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {r.user} · {r.units} {r.type_label.toLowerCase()} · {fmtDateTime(r.date)}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-green">{fmtRelative(r.date)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

AdminMobilite.layout = adminLayout;
