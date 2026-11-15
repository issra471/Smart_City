// Me déplacer : carte des stations + réservation d'une balade d'une station vers une autre.
import { useMemo, useState } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import { AlertCircle, ArrowDown, Bike, CalendarCheck, Loader2, MapPin, Minus, Plus, RotateCcw, ShieldCheck } from "lucide-react";
import StationMap from "../../components/StationMap";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, STATION_ICONS, STATUS_TONE, cn, fmtRelative } from "../../lib/ui";

const SPEED = { velo: 15, trottinette: 20, scooter: 35, bus: 30 }; // km/h, pour une durée approximative

/** Distance en km entre deux stations (à vol d'oiseau). */
function distanceKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

function Stop({ letter, tone, label, station, hint }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full font-bold", station ? tone : "border border-dashed border-white/25 text-paper/40")}>{letter}</span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.14em] text-paper/50 uppercase">{label}</p>
        <p className={cn("truncate font-serif text-2xl leading-tight", !station && "text-paper/40")}>{station ? station.name : hint}</p>
      </div>
    </div>
  );
}

function Err({ list }) {
  return (list || []).map((e) => (
    <p key={e} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-coral">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {e}
    </p>
  ));
}

export default function Stations({ stations, form, proposals, propose_url, pending }) {
  const { auth, urls } = usePage().props;
  const initial = Object.fromEntries(form.fields.map((f) => [f.name, f.value]));
  const [fromId, setFromId] = useState(Number(initial.depart) || null);
  const [toId, setToId] = useState(Number(initial.arrivee) || null);
  const [transportId, setTransportId] = useState(Number(initial.transport) || null);
  const [date, setDate] = useState(initial.date_depart || "");
  const [count, setCount] = useState(Number(initial.nombre) || 1);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false); // masque les anciennes erreurs dès qu'on modifie la balade

  const errors = dirty ? {} : Object.fromEntries(form.fields.map((f) => [f.name, f.errors]));
  const from = stations.find((s) => s.id === fromId) || null;
  const to = stations.find((s) => s.id === toId) || null;
  const available = from ? from.transports.filter((t) => t.units > 0) : [];
  const transport = available.find((t) => t.id === transportId) || null;
  const km = useMemo(() => (from && to ? distanceKm(from, to) : 0), [from, to]);
  const minutes = transport ? Math.max(1, Math.round((km / SPEED[transport.type]) * 60)) : null;

  function pick(id) {
    setDirty(true);
    if (!fromId) return setFromId(id);
    if (id === fromId) return (setFromId(null), setToId(null), setTransportId(null));
    setToId(id === toId ? null : id);
  }
  function reset() {
    setFromId(null), setToId(null), setTransportId(null), setCount(1), setDirty(true);
  }
  function submit(e) {
    e.preventDefault();
    router.post(
      urls.mobilite,
      { depart: fromId || "", arrivee: toId || "", transport: transport?.id || "", date_depart: date, nombre: count },
      { forceFormData: true, preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => (setBusy(false), setDirty(false)) },
    );
  }

  const totalUnits = stations.reduce((n, s) => n + s.units, 0);

  return (
    <>
      <Head title="Me déplacer" />
      <PageHeader eyebrow="Services citoyens" title="Me déplacer" subtitle="Choisissez une station de départ, puis une station d'arrivée, et réservez votre transport." icon={Bike}>
        <Btn href={urls.reservations} variant="ghost" icon={CalendarCheck}>
          Mes réservations
        </Btn>
        <Btn href={propose_url} variant="ghost" icon={Plus}>
          Proposer un transport
        </Btn>
        {auth.user?.is_staff && (
          <>
            <Btn href={urls.admin_transports} variant="soft" icon={ShieldCheck}>
              À approuver{pending > 0 && ` (${pending})`}
            </Btn>
            <Btn href={urls.mobilite_create} icon={MapPin}>
              Ajouter une station
            </Btn>
          </>
        )}
      </PageHeader>

      {stations.length === 0 ? (
        <EmptyState icon={MapPin} title="Aucune station pour le moment." text="Les stations sont ajoutées par l'administration de la ville.">
          {auth.user?.is_staff && (
            <Btn href={urls.mobilite_create} icon={MapPin}>
              Ajouter une station
            </Btn>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
            {/* Carte */}
            <Card className="overflow-hidden p-2">
              <StationMap stations={stations} fromId={fromId} toId={toId} onPick={pick} className="h-[22rem] rounded-[1.4rem] sm:h-[32rem]" />
              <p className="flex flex-wrap items-center gap-x-5 gap-y-1 px-4 py-3 text-xs text-muted">
                <span>
                  <b className="text-ink">{stations.length}</b> stations · <b className="text-ink">{totalUnits}</b> transports disponibles
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="size-2.5 rounded-full bg-deep" /> A = départ
                </span>
                <span className="flex items-center gap-1.5">
                  <i className="size-2.5 rounded-full bg-coral" /> B = arrivée
                </span>
              </p>
            </Card>

            {/* Votre balade */}
            <form onSubmit={submit} noValidate className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-6 text-paper sm:p-7">
              <div aria-hidden="true" className="absolute -top-24 -right-24 size-64 animate-blob rounded-full bg-green/50 blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold tracking-[0.14em] text-lime uppercase">Votre balade</p>
                  {(from || to) && (
                    <button type="button" onClick={reset} className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-xs text-paper/60 hover:bg-white/10 hover:text-paper">
                      <RotateCcw className="size-3" /> Recommencer
                    </button>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <Stop letter="A" tone="bg-lime text-deep" label="Départ" station={from} hint="Cliquez sur une station" />
                  <ArrowDown className="ml-3 size-4 text-paper/30" />
                  <Stop letter="B" tone="bg-coral text-paper" label="Arrivée" station={to} hint={from ? "Cliquez sur une autre station" : "Puis l'arrivée"} />
                </div>
                <Err list={errors.depart} />
                <Err list={errors.arrivee} />

                {from && to && (
                  <p className="mt-5 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm text-paper/80">
                    Environ <b className="text-paper">{km.toFixed(1).replace(".", ",")} km</b>
                    {minutes != null && (
                      <>
                        {" "}· <b className="text-paper">{minutes} min</b> en {transport.type_label.toLowerCase()}
                      </>
                    )}
                    <span className="block text-xs text-paper/45">Distance à vol d'oiseau, durée approximative.</span>
                  </p>
                )}

                {from && (
                  <div className="mt-6 border-t border-white/10 pt-5">
                    <p className="mb-2.5 text-sm font-semibold">Transport à {from.name}</p>
                    {available.length === 0 ? (
                      <p className="text-sm text-paper/55">Aucun transport disponible dans cette station pour le moment.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {available.map((t) => {
                          const Icon = STATION_ICONS[t.type] || Bike;
                          const on = t.id === transport?.id;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              aria-pressed={on}
                              onClick={() => (setTransportId(t.id), setCount((n) => Math.min(n, t.units)), setDirty(true))}
                              className={cn("flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition", on ? "border-lime bg-lime text-deep" : "border-white/15 hover:bg-white/10")}
                            >
                              <Icon className="size-4" /> {t.type_label}
                              <span className={cn("rounded-full px-1.5 text-[11px] font-bold", on ? "bg-deep/15" : "bg-white/10")}>{t.units}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <Err list={errors.transport} />
                  </div>
                )}

                {from && to && transport && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto]">
                    <label className="block text-sm font-semibold">
                      Date et heure de départ
                      <input
                        type="datetime-local"
                        value={date}
                        onChange={(e) => (setDate(e.target.value), setDirty(true))}
                        className="mt-2 w-full rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3 text-[15px] font-normal text-paper outline-none [color-scheme:dark] focus:border-lime"
                      />
                      <Err list={errors.date_depart} />
                    </label>
                    <div className="text-sm font-semibold">
                      Nombre
                      <div className="mt-2 flex w-fit items-center gap-1 rounded-2xl border border-white/15 bg-white/[0.07] p-1">
                        <button type="button" aria-label="Diminuer" onClick={() => setCount((n) => Math.max(1, n - 1))} className="grid size-10 cursor-pointer place-items-center rounded-xl hover:bg-white/10">
                          <Minus className="size-4" />
                        </button>
                        <span className="w-8 text-center text-lg">{count}</span>
                        <button type="button" aria-label="Augmenter" onClick={() => setCount((n) => Math.min(transport.units, n + 1))} className="grid size-10 cursor-pointer place-items-center rounded-xl hover:bg-white/10">
                          <Plus className="size-4" />
                        </button>
                      </div>
                      <Err list={errors.nombre} />
                    </div>
                  </div>
                )}

                <div className="mt-6">
                  {!auth.user ? (
                    <Btn href={`${urls.login}?next=${encodeURIComponent(urls.mobilite)}`} variant="lime" size="lg" arrow className="w-full">
                      Se connecter pour réserver
                    </Btn>
                  ) : (
                    <Btn type="submit" variant="lime" size="lg" arrow={!busy} disabled={busy || !from || !to || !transport} className="w-full">
                      {busy && <Loader2 className="size-4 animate-spin" />} Réserver la balade
                    </Btn>
                  )}
                </div>
              </div>
            </form>
          </div>

          {/* Liste des stations */}
          <h2 className="mt-10 mb-4 font-serif text-2xl">Les stations</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stations.map((s) => {
              const role = s.id === fromId ? "from" : s.id === toId ? "to" : null;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pick(s.id)}
                  className={cn(
                    "cursor-pointer rounded-[1.75rem] border bg-paper p-5 text-left transition hover:shadow-[0_18px_45px_#15362e17]",
                    role === "from" ? "border-deep ring-2 ring-deep" : role === "to" ? "border-coral ring-2 ring-coral" : "border-line",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-serif text-2xl leading-tight font-medium">{s.name}</h3>
                    {role && <Badge tone={role === "from" ? "ink" : "coral"}>{role === "from" ? "Départ" : "Arrivée"}</Badge>}
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="size-3.5 shrink-0" /> {s.address || "Adresse non renseignée"}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    {s.transports.length === 0 && <span className="text-sm text-muted">Aucun transport pour le moment</span>}
                    {s.transports.map((t) => {
                      const Icon = STATION_ICONS[t.type] || Bike;
                      return (
                        <span key={t.id} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium", t.units > 0 ? "bg-mint text-green" : "bg-ink/5 text-muted")}>
                          <Icon className="size-3.5" /> {t.units} {t.type_label.toLowerCase()}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Mes propositions */}
          {proposals.length > 0 && (
            <>
              <h2 className="mt-10 mb-4 font-serif text-2xl">Mes propositions de transport</h2>
              <Card className="divide-y divide-line/70">
                {proposals.map((p) => {
                  const Icon = STATION_ICONS[p.type] || Bike;
                  return (
                    <div key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                      <span className="grid size-10 place-items-center rounded-xl bg-mint text-green">
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">
                          {p.units} × {p.type_label} · {p.station}
                        </p>
                        <p className="text-xs text-muted">Proposé {fmtRelative(p.date)}</p>
                      </div>
                      <Badge tone={STATUS_TONE[p.status]} dot>
                        {p.status_label}
                      </Badge>
                    </div>
                  );
                })}
              </Card>
            </>
          )}
        </>
      )}
    </>
  );
}

Stations.layout = appLayout;
