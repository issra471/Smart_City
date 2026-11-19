// Gestion d'une station : stock par type (disponibles, maintenance), retrait d'un type, réservations à venir.
import { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { ArrowLeft, Bike, CalendarCheck, Inbox, LoaderCircle, MapPin, Minus, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import CancelWithReason from "../../components/CancelWithReason";
import StationMap from "../../components/StationMap";
import { adminLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, STATION_ICONS, cn, fmtDateTime } from "../../lib/ui";

function Counter({ label, value, onChange, tone }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</p>
      <div className="flex w-fit items-center gap-1 rounded-2xl border border-line bg-paper p-1">
        <button type="button" aria-label={`${label} : moins`} onClick={() => onChange(Math.max(0, value - 1))} className="grid size-9 cursor-pointer place-items-center rounded-xl hover:bg-mint">
          <Minus className="size-4" />
        </button>
        <input
          type="number"
          min={0}
          max={9999}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(Math.max(0, Math.min(9999, Number(e.target.value) || 0)))}
          className={cn("w-14 bg-transparent text-center text-lg font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none", tone)}
        />
        <button type="button" aria-label={`${label} : plus`} onClick={() => onChange(Math.min(9999, value + 1))} className="grid size-9 cursor-pointer place-items-center rounded-xl hover:bg-mint">
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

function StockRow({ t }) {
  const Icon = STATION_ICONS[t.type] || Bike;
  const [units, setUnits] = useState(t.units);
  const [maintenance, setMaintenance] = useState(t.maintenance);
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const changed = units !== t.units || maintenance !== t.maintenance;
  const post = (data) => router.post(t.update_url, data, { forceFormData: true, preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });

  return (
    <li className="flex flex-wrap items-end gap-x-6 gap-y-4 px-6 py-5">
      <div className="flex min-w-40 flex-1 items-center gap-3 self-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-mint text-green">
          <Icon className="size-6" />
        </span>
        <div>
          <p className="font-semibold">{t.type_label}</p>
          <p className="text-xs text-muted">{t.upcoming > 0 ? `${t.upcoming} réservée(s) à venir` : "Aucune réservation à venir"}</p>
        </div>
      </div>
      <Counter label="Disponibles" value={units} onChange={setUnits} />
      <Counter label="En maintenance" value={maintenance} onChange={setMaintenance} tone={maintenance > 0 ? "text-[#9a6c0c]" : ""} />
      <div className="flex items-center gap-2">
        <Btn size="sm" disabled={!changed || busy} onClick={() => post({ units, maintenance })}>
          {busy && <LoaderCircle className="size-3.5 animate-spin" />} Enregistrer
        </Btn>
        {confirm ? (
          <>
            <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)}>
              Non
            </Btn>
            <Btn size="sm" variant="danger" onClick={() => post({ action: "retirer" })} disabled={busy}>
              Oui, retirer
            </Btn>
          </>
        ) : (
          <button type="button" onClick={() => setConfirm(true)} title="Retirer ce type de la station" className="grid size-9 cursor-pointer place-items-center rounded-full text-muted hover:bg-coral/10 hover:text-[#b4532f]">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </li>
  );
}

export default function AdminStation({ station: s, stock, missing_types, add_url, upcoming, upcoming_count, pending, urls }) {
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const remove = () => router.post(s.delete_url, {}, { onStart: () => setDeleting(true), onFinish: () => (setDeleting(false), setConfirm(false)) });

  return (
    <>
      <Head title={s.name} />
      <Link href={urls.back} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Gestion mobilité
      </Link>

      <header className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            <Badge tone={s.level === "vide" ? "coral" : s.level === "bas" ? "amber" : "green"} dot>
              {s.level === "vide" ? "Vide" : s.level === "bas" ? "Bientôt vide" : "Stock correct"}
            </Badge>
            {s.maintenance > 0 && (
              <Badge tone="amber">
                <Wrench className="size-3" /> {s.maintenance} en maintenance
              </Badge>
            )}
          </div>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{s.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-3.5" /> {s.address || "Adresse non renseignée"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn href={s.edit_url} variant="ghost" icon={Pencil}>
            Modifier / déplacer
          </Btn>
          {confirm ? (
            <span className="flex flex-wrap items-center gap-2 rounded-full border border-coral/40 bg-coral/10 py-1 pr-1 pl-4 text-sm">
              Supprimer la station et son historique ?
              <Btn size="sm" variant="ghost" onClick={() => setConfirm(false)} disabled={deleting}>
                Non
              </Btn>
              <Btn size="sm" variant="danger" onClick={remove} disabled={deleting}>
                {deleting && <LoaderCircle className="size-3.5 animate-spin" />} Oui, supprimer
              </Btn>
            </span>
          ) : (
            <Btn variant="danger" icon={Trash2} onClick={() => setConfirm(true)}>
              Supprimer
            </Btn>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-5 pb-2">
              <div>
                <h2 className="font-serif text-2xl">Stock</h2>
                <p className="text-xs text-muted">Les unités « en maintenance » ne sont pas réservables.</p>
              </div>
              <Btn href={add_url} size="sm" icon={Plus}>
                Ajouter un transport
              </Btn>
            </div>
            {stock.length === 0 ? (
              <p className="px-6 pt-2 pb-6 text-sm text-muted">Aucun transport dans cette station : ajoutez-en un.</p>
            ) : (
              <ul className="divide-y divide-line/70">
                {stock.map((t) => (
                  <StockRow key={`${t.id}-${t.units}-${t.maintenance}`} t={t} />
                ))}
              </ul>
            )}
            {missing_types.length > 0 && stock.length > 0 && <p className="border-t border-line px-6 py-3 text-xs text-muted">Pas encore de : {missing_types.map((m) => m.label.toLowerCase()).join(", ")}.</p>}
          </Card>

          <Card className="p-6">
            <h2 className="flex items-center gap-2 font-serif text-2xl">
              <CalendarCheck className="size-5 text-green" /> Réservations à venir
              <span className="font-sans text-sm text-muted">({upcoming_count})</span>
            </h2>
            {upcoming.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Aucune réservation à venir pour cette station.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {upcoming.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-pale p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {r.from} → {r.to}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {r.user} · {r.units} {r.type_label.toLowerCase()} · {fmtDateTime(r.date)}
                      </p>
                    </div>
                    <CancelWithReason url={r.cancel_url} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-5 xl:sticky xl:top-6">
          <Card className="overflow-hidden p-2">
            <StationMap stations={[s]} className="h-64 rounded-[1.4rem]" />
          </Card>
          {pending.length > 0 && (
            <Card className="p-6">
              <h2 className="flex items-center gap-2 font-serif text-xl">
                <Inbox className="size-5 text-green" /> Propositions en attente
              </h2>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {pending.map((p) => (
                  <li key={p.id} className="rounded-xl bg-pale px-3 py-2">
                    {p.units} × {p.type_label} · <span className="text-muted">{p.author}</span>
                  </li>
                ))}
              </ul>
              <Btn href={urls.proposals} size="sm" arrow className="mt-4">
                Approuver ou refuser
              </Btn>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

AdminStation.layout = adminLayout;
