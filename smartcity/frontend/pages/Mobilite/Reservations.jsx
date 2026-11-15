import { useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { ArrowRight, Bike, CalendarCheck, Loader2 } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, EmptyState, PageHeader, STATION_ICONS, STATUS_TONE, cn, fmtDay, fmtMonth, fmtRelative, fmtTime, fmtWeekday } from "../../lib/ui";

function Row({ r }) {
  const Icon = STATION_ICONS[r.type] || Bike;
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const cancel = () => router.post(r.cancel_url, {}, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => (setBusy(false), setConfirm(false)) });

  return (
    <article className={cn("flex flex-wrap items-center gap-5 rounded-[1.75rem] border border-line bg-paper p-5", !r.upcoming && "opacity-70")}>
      <div className={cn("w-20 shrink-0 rounded-2xl py-3 text-center leading-none", r.upcoming ? "bg-deep text-paper" : "bg-ink/5 text-ink")}>
        <b className="block font-serif text-3xl font-medium">{fmtDay(r.date)}</b>
        <span className={cn("mt-1 block text-[11px] font-semibold tracking-wide uppercase", r.upcoming ? "text-lime" : "text-muted")}>{fmtMonth(r.date)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONE[r.status]} dot>{r.status_label}</Badge>
          {r.upcoming && <span className="text-xs font-medium text-green">{fmtRelative(r.date)}</span>}
        </div>
        <h3 className="flex flex-wrap items-center gap-x-2.5 font-serif text-2xl leading-tight font-medium">
          {r.from} <ArrowRight className="size-5 text-green" /> {r.to}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
          <span className="capitalize">{fmtWeekday(r.date)} · {fmtTime(r.date)}</span>
          <span className="flex items-center gap-1.5">
            <Icon className="size-3.5" /> {r.type_label} · {r.units} unité{r.units > 1 ? "s" : ""}
          </span>
        </p>
        {r.reason && <p className="mt-1.5 rounded-xl bg-coral/10 px-3 py-2 text-[13px] text-[#8f3f20]">Annulée par la ville : {r.reason}</p>}
      </div>
      {r.status === "confirmee" &&
        (confirm ? (
          <div className="flex items-center gap-2">
            <Btn variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={busy}>
              Garder
            </Btn>
            <Btn variant="danger" size="sm" onClick={cancel} disabled={busy}>
              {busy && <Loader2 className="size-3.5 animate-spin" />} Oui, annuler
            </Btn>
          </div>
        ) : (
          <Btn variant="ghost" size="sm" onClick={() => setConfirm(true)}>
            Annuler
          </Btn>
        ))}
    </article>
  );
}

export default function Reservations({ reservations }) {
  const { urls } = usePage().props;
  const upcoming = reservations.filter((r) => r.upcoming).reverse(); // la plus proche en premier
  const past = reservations.filter((r) => !r.upcoming);

  return (
    <>
      <Head title="Mes réservations" />
      <PageHeader eyebrow="Mobilité" title="Mes réservations" subtitle="Vos départs à venir et passés." icon={CalendarCheck}>
        <Btn href={urls.mobilite} arrow size="lg">
          Trouver une station
        </Btn>
      </PageHeader>

      {reservations.length === 0 ? (
        <EmptyState icon={CalendarCheck} title="Aucune réservation" text="Trouvez une station pour planifier votre prochain trajet.">
          <Btn href={urls.mobilite} arrow>
            Voir les stations
          </Btn>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2.5 font-serif text-2xl">
                À venir <span className="rounded-full bg-lime px-2 py-0.5 font-sans text-xs font-bold text-deep">{upcoming.length}</span>
              </h2>
              <div className="flex flex-col gap-3">{upcoming.map((r) => <Row key={r.id} r={r} />)}</div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="mb-4 font-serif text-2xl text-muted">Historique</h2>
              <div className="flex flex-col gap-3">{past.map((r) => <Row key={r.id} r={r} />)}</div>
            </section>
          )}
        </div>
      )}
    </>
  );
}

Reservations.layout = appLayout;
