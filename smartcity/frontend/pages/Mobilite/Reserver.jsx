import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, Bike, MapPin } from "lucide-react";
import DjangoForm from "../../components/DjangoForm";
import { appLayout } from "../../layouts/AppShell";
import { Card, STATION_ICONS } from "../../lib/ui";

export default function Reserver({ form, station }) {
  const { urls } = usePage().props;
  const Icon = STATION_ICONS[station.type] || Bike;
  return (
    <>
      <Head title="Réserver" />
      <Link href={urls.mobilite} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Stations
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.3fr]">
        <aside className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-7 text-paper lg:sticky lg:top-8">
          <div aria-hidden="true" className="absolute -top-20 -right-20 size-64 animate-blob rounded-full bg-green/50 blur-3xl" />
          <div className="relative">
            <span className="grid size-16 place-items-center rounded-2xl bg-lime text-deep">
              <Icon className="size-8" />
            </span>
            <p className="mt-6 text-xs font-semibold tracking-[0.14em] text-lime uppercase">{station.type_label}</p>
            <h2 className="mt-1 font-serif text-4xl leading-tight">{station.name}</h2>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-paper/65">
              <MapPin className="size-4 shrink-0" /> {station.address || "Adresse non renseignée"}
            </p>
            <div className="mt-8 flex items-end gap-3 border-t border-white/10 pt-6">
              <p className="font-serif text-6xl leading-none text-lime">{station.units}</p>
              <p className="pb-1.5 text-sm text-paper/65">
                unité{station.units > 1 ? "s" : ""} disponible{station.units > 1 ? "s" : ""}
                <br />à cette station
              </p>
            </div>
          </div>
        </aside>

        <Card className="p-6 sm:p-9">
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">Mobilité</p>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">Réserver</h1>
          <p className="mt-3 mb-8 text-muted">Choisissez votre heure de départ et le nombre d'unités.</p>
          <DjangoForm form={form} cancelHref={urls.mobilite} submitLabel="Confirmer la réservation" />
        </Card>
      </div>
    </>
  );
}

Reserver.layout = appLayout;
