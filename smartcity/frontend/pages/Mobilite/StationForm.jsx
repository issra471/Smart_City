// Ajouter ou modifier une station (administrateur seulement) : nom, adresse, et position choisie sur la carte.
import { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, Loader2, MapPin } from "lucide-react";
import StationMap from "../../components/StationMap";
import { adminLayout } from "../../layouts/AppShell";
import { Btn, Card, cn } from "../../lib/ui";

const INPUT = "mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] font-normal outline-none transition placeholder:text-muted/60 focus:border-green focus:ring-4 focus:ring-green/10";

function Err({ list }) {
  return (list || []).map((e) => (
    <p key={e} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-[#b4532f]">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {e}
    </p>
  ));
}

export default function StationForm({ form, stations, editing, action, back_url }) {
  const field = Object.fromEntries(form.fields.map((f) => [f.name, f]));
  const [nom, setNom] = useState(field.nom.value);
  const [adresse, setAdresse] = useState(field.adresse.value);
  const [pos, setPos] = useState(field.latitude.value && field.longitude.value ? { lat: Number(field.latitude.value), lng: Number(field.longitude.value) } : null);
  const [busy, setBusy] = useState(false);
  const noPosition = field.latitude.errors.length > 0 || field.longitude.errors.length > 0;

  function submit(e) {
    e.preventDefault();
    router.post(
      action,
      { nom, adresse, latitude: pos ? pos.lat.toFixed(6) : "", longitude: pos ? pos.lng.toFixed(6) : "" },
      { forceFormData: true, preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) },
    );
  }

  return (
    <>
      <Head title={editing ? "Modifier la station" : "Ajouter une station"} />
      <Link href={back_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {editing ? "Retour à la station" : "Gestion mobilité"}
      </Link>

      <form onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1fr_1.35fr]">
        <Card className="p-6 sm:p-8">
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">Administration</p>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight">{editing ? "Modifier la station" : "Ajouter une station"}</h1>
          <p className="mt-3 mb-7 text-muted">{editing ? "Vous pouvez la renommer ou la déplacer : cliquez sur la carte à son nouvel emplacement." : "Une station est un lieu de la ville qui contient des transports. Les transports seront ajoutés ensuite."}</p>

          {form.errors.length > 0 && <div className="mb-5"><Err list={form.errors} /></div>}

          <label className="block text-sm font-semibold">
            Nom de la station <span className="text-coral">*</span>
            <input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120} placeholder="Ex. La Marsa" className={cn(INPUT, field.nom.errors.length > 0 && "border-coral")} />
            <Err list={field.nom.errors} />
          </label>
          <label className="mt-5 block text-sm font-semibold">
            Adresse ou repère
            <input value={adresse} onChange={(e) => setAdresse(e.target.value)} maxLength={200} placeholder="Rue, quartier ou repère" className={INPUT} />
            <Err list={field.adresse.errors} />
          </label>

          <div className={cn("mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm", pos ? "border-green/30 bg-mint/50" : noPosition ? "border-coral bg-coral/10" : "border-dashed border-line")}>
            <MapPin className={cn("size-5 shrink-0", pos ? "text-green" : "text-muted")} />
            {pos ? (
              <span>
                Position choisie : <b>{pos.lat.toFixed(4)}, {pos.lng.toFixed(4)}</b>
              </span>
            ) : (
              <span className={noPosition ? "font-medium text-[#b4532f]" : "text-muted"}>Cliquez sur la carte pour placer la station.</span>
            )}
          </div>

          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <Btn href={back_url} variant="ghost">
              Annuler
            </Btn>
            <Btn type="submit" size="lg" arrow={!busy} disabled={busy}>
              {busy && <Loader2 className="size-4 animate-spin" />} {editing ? "Enregistrer" : "Enregistrer la station"}
            </Btn>
          </div>
        </Card>

        <Card className="overflow-hidden p-2">
          <StationMap stations={stations} marker={pos} markerLabel={editing ? nom || "Station" : "Nouvelle station"} onMapClick={(lat, lng) => setPos({ lat, lng })} className="h-[24rem] cursor-crosshair rounded-[1.4rem] sm:h-[34rem]" />
          <p className="px-4 py-3 text-xs text-muted">Les stations existantes sont affichées. Cliquez à l'endroit de la nouvelle station.</p>
        </Card>
      </form>
    </>
  );
}

StationForm.layout = adminLayout;
