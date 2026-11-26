import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, CalendarHeart, ImagePlus, LoaderCircle, MapPin, X } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Btn, Card, EVENT_ICONS, cn } from "../../lib/ui";

const ReportMap = lazy(() => import("../../components/ReportMap"));

const INPUT = "mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] font-normal text-ink outline-none transition placeholder:text-muted/60 focus:border-green focus:ring-4 focus:ring-green/10";

async function reverseGeocode(lat, lng, signal) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=fr&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { signal, referrerPolicy: "strict-origin-when-cross-origin" });
  if (!res.ok) throw new Error(String(res.status));
  const a = (await res.json()).address || {};
  const street = [a.house_number, a.road || a.pedestrian || a.footway || a.square].filter(Boolean).join(" ");
  const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.town || a.city_district || a.city;
  return [street, area].filter(Boolean).join(", ");
}

function Err({ list }) {
  return (list || []).map((e) => (
    <p key={e} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-[#b4532f]">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {e}
    </p>
  ));
}

function toLocal(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EvenementForm({ form, categories, editing, current_image, action, cancel_url }) {
  const init = Object.fromEntries(form.fields.map((f) => [f.name, f.value]));
  const serverErrors = Object.fromEntries(form.fields.map((f) => [f.name, f.errors]));

  const [categorie, setCategorie] = useState(init.categorie || "");
  const [titre, setTitre] = useState(init.titre || "");
  const [description, setDescription] = useState(init.description || "");
  const [lieu, setLieu] = useState(init.lieu || "");
  const [adresse, setAdresse] = useState(init.adresse || "");
  const [addressTouched, setAddressTouched] = useState(!!init.adresse);
  const [geocoding, setGeocoding] = useState(false);
  const [pos, setPos] = useState(init.latitude && init.longitude ? { lat: Number(init.latitude), lng: Number(init.longitude) } : null);
  const [date, setDate] = useState(toLocal(init.date) || "");
  const [dateFin, setDateFin] = useState(toLocal(init.date_fin) || "");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState({});
  const [clientErrors, setClientErrors] = useState({});
  const fileInput = useRef(null);

  const errors = Object.fromEntries(Object.entries(serverErrors).map(([k, v]) => [k, edited[k] ? [] : v]));
  Object.entries(clientErrors).forEach(([name, list]) => { if (list.length) errors[name] = list; });
  const touch = (...names) => {
    setEdited((e) => ({ ...e, ...Object.fromEntries(names.map((n) => [n, true])) }));
    setClientErrors((all) => Object.fromEntries(Object.entries(all).filter(([name]) => !names.includes(name))));
  };

  useEffect(() => { setEdited({}); setClientErrors({}); }, [form]);

  useEffect(() => {
    if (!image) return setPreview(null);
    const u = URL.createObjectURL(image);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [image]);

  useEffect(() => {
    if (!pos || addressTouched) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setGeocoding(true);
      try {
        const a = await reverseGeocode(pos.lat, pos.lng, ctrl.signal);
        if (a) setAdresse(a);
      } catch { /* */ } finally {
        if (!ctrl.signal.aborted) setGeocoding(false);
      }
    }, 600);
    return () => (clearTimeout(t), ctrl.abort());
  }, [pos?.lat, pos?.lng, addressTouched]);

  function pick(lat, lng) {
    setPos({ lat, lng });
    touch("latitude", "longitude");
  }

  function submit(e) {
    e.preventDefault();
    const invalid = {};
    if (!categorie) invalid.categorie = ["Choisissez une catégorie."];
    if (titre.trim().length < 4) invalid.titre = ["Le titre doit faire au moins 4 caractères."];
    if (description.trim().length < 10) invalid.description = ["La description doit faire au moins 10 caractères."];
    if (description.trim().length > 5000) invalid.description = ["La description ne peut pas dépasser 5 000 caractères."];
    if (lieu.trim().length < 2) invalid.lieu = ["Le lieu doit faire au moins 2 caractères."];
    if (!date || Number.isNaN(new Date(date).getTime()) || new Date(date) <= new Date()) invalid.date = ["La date doit être dans le futur."];
    if (dateFin && (!date || new Date(dateFin) <= new Date(date))) invalid.date_fin = ["La date de fin doit être après le début."];
    if (image && (!/\.(jpe?g|png|gif|bmp|webp)$/i.test(image.name) || image.size > 8 * 1024 * 1024)) {
      invalid.image = ["Choisissez une image JPG, PNG, GIF, BMP ou WebP de 8 Mo maximum."];
    }
    if (Object.keys(invalid).length) {
      setClientErrors(invalid);
      return;
    }
    const data = {
      categorie, titre: titre.trim(), description: description.trim(), lieu: lieu.trim(), adresse: adresse.trim(),
      latitude: pos ? pos.lat.toFixed(6) : "",
      longitude: pos ? pos.lng.toFixed(6) : "",
      date, date_fin: dateFin,
    };
    if (image) data.image = image;
    router.post(action, data, { forceFormData: true, preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  }

  const CatIcon = EVENT_ICONS[categorie] || CalendarHeart;

  return (
    <>
      <Head title={editing ? "Modifier l'événement" : "Créer un événement"} />
      <Link href={cancel_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {editing ? "Retour à l'événement" : "Événements"}
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6 sm:p-9">
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">Événement</p>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{editing ? "Modifier l'événement" : "Créer un événement"}</h1>
          <p className="mt-3 mb-8 max-w-lg text-muted">Concert, marché, balade, atelier… Donnez envie aux habitants de venir.</p>

          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            {/* Catégorie */}
            <div>
              <p className="text-sm font-semibold">Catégorie <span className="text-coral">*</span></p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((c) => {
                  const I = EVENT_ICONS[c.value] || CalendarHeart;
                  const on = categorie === c.value;
                  return (
                    <button key={c.value} type="button" onClick={() => (setCategorie(c.value), touch("categorie"))} className={cn("flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 px-3 py-3 text-sm font-semibold transition", on ? "border-green bg-mint text-green" : errors.categorie?.length ? "border-coral/60 bg-paper" : "border-line bg-paper hover:border-green/40")}>
                      <I className={cn("size-5 shrink-0", on ? "text-green" : "text-muted")} />
                      {c.label}
                    </button>
                  );
                })}
              </div>
              <Err list={errors.categorie} />
            </div>

            {/* Titre */}
            <label className="block text-sm font-semibold">
              Titre <span className="text-coral">*</span>
              <input value={titre} onChange={(e) => (setTitre(e.target.value), touch("titre"))} maxLength={150} placeholder="Ex. Marché nocturne de La Marsa" className={cn(INPUT, errors.titre?.length && "border-coral")} />
              <Err list={errors.titre} />
            </label>

            {/* Description */}
            <label className="block text-sm font-semibold">
              Description <span className="text-coral">*</span>
              <textarea rows={4} value={description} onChange={(e) => (setDescription(e.target.value), touch("description"))} maxLength={5000} placeholder="Programme, horaires, public visé…" className={cn(INPUT, "resize-y", errors.description?.length && "border-coral")} />
              <Err list={errors.description} />
            </label>

            {/* Lieu + adresse */}
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Lieu <span className="text-coral">*</span>
                <input value={lieu} onChange={(e) => (setLieu(e.target.value), touch("lieu"))} maxLength={150} placeholder="Ex. Place centrale" className={cn(INPUT, errors.lieu?.length && "border-coral")} />
                <Err list={errors.lieu} />
              </label>
              <label className="block text-sm font-semibold">
                Adresse
                <span className="relative block">
                  <input value={adresse} onChange={(e) => (setAdresse(e.target.value), setAddressTouched(true), touch("adresse"))} maxLength={255} placeholder="Rue, quartier…" className={cn(INPUT, "pr-10")} />
                  {geocoding && <LoaderCircle className="absolute top-1/2 right-4 mt-1 size-4 -translate-y-1/2 animate-spin text-muted" />}
                </span>
                <Err list={errors.adresse} />
              </label>
            </div>

            {/* Dates */}
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Date et heure <span className="text-coral">*</span>
                <input type="datetime-local" value={date} onChange={(e) => (setDate(e.target.value), touch("date"))} className={cn(INPUT, errors.date?.length && "border-coral")} />
                <Err list={errors.date} />
              </label>
              <label className="block text-sm font-semibold">
                Date de fin <span className="text-xs font-normal text-muted">(facultatif)</span>
                <input type="datetime-local" value={dateFin} onChange={(e) => (setDateFin(e.target.value), touch("date_fin"))} className={cn(INPUT, errors.date_fin?.length && "border-coral")} />
                <Err list={errors.date_fin} />
              </label>
            </div>

            {/* Carte */}
            <div>
              <p className="text-sm font-semibold">Emplacement sur la carte <span className="text-xs font-normal text-muted">(facultatif)</span></p>
              <p className="mt-1 text-xs text-muted">Cliquez sur la carte pour placer l'événement. Les participants verront le lieu.</p>
              <div className="mt-2 overflow-hidden rounded-2xl border border-line bg-paper p-2">
                <Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-pale" />}>
                  <ReportMap reports={[]} pick={{ pos, onPick: pick }} className="h-56 rounded-xl" />
                </Suspense>
              </div>
              {pos && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-green">
                  <MapPin className="size-3.5" /> Point placé
                  <button type="button" onClick={() => (setPos(null), setAddressTouched(false), touch("latitude", "longitude"))} className="ml-1 cursor-pointer font-semibold text-muted hover:text-ink">Retirer</button>
                </p>
              )}
            </div>

            {/* Image */}
            <div>
              <p className="text-sm font-semibold">Image {editing && current_image ? "(remplacer)" : "(conseillée)"}</p>
              <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={(e) => (setImage(e.target.files[0] || null), touch("image"))} />
              {preview || current_image ? (
                <div className="relative mt-2 overflow-hidden rounded-2xl border border-line">
                  <img src={preview || current_image} alt="" className="max-h-56 w-full object-cover" />
                  <div className="absolute top-3 right-3 flex gap-2">
                    <button type="button" onClick={() => fileInput.current.click()} className="cursor-pointer rounded-full bg-deep/80 px-3 py-1.5 text-xs font-semibold text-paper backdrop-blur hover:bg-deep">Changer</button>
                    {image && (
                      <button type="button" aria-label="Retirer" onClick={() => (setImage(null), (fileInput.current.value = ""))} className="grid size-8 cursor-pointer place-items-center rounded-full bg-deep/80 text-paper backdrop-blur hover:bg-deep">
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                  {!image && current_image && <span className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-xs font-semibold">Image actuelle</span>}
                </div>
              ) : (
                <button type="button" onClick={() => fileInput.current.click()} className="mt-2 flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-pale/60 px-4 py-8 text-center transition hover:border-green hover:bg-mint/40">
                  <span className="grid size-11 place-items-center rounded-full bg-paper text-green shadow-sm"><ImagePlus className="size-5" /></span>
                  <span className="text-sm font-medium">Ajouter une image</span>
                  <span className="text-xs text-muted">8 Mo maximum</span>
                </button>
              )}
              <Err list={errors.image} />
            </div>

            {form.errors.length > 0 && <div className="rounded-2xl border border-coral/30 bg-coral/10 p-4"><Err list={form.errors} /></div>}

            <div className="flex justify-between gap-3 pt-2">
              <Btn href={cancel_url} variant="ghost">Annuler</Btn>
              <Btn type="submit" size="lg" disabled={busy}>
                {busy && <LoaderCircle className="size-4 animate-spin" />}
                {editing ? "Enregistrer" : "Publier l'événement"}
              </Btn>
            </div>
          </form>
        </Card>

        {/* Aside récapitulatif */}
        <aside className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-7 text-paper lg:sticky lg:top-8">
          <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-56 animate-blob rounded-full bg-green/50 blur-3xl" />
          <div className="relative">
            <span className="grid size-14 place-items-center rounded-2xl bg-lime text-deep">
              <CatIcon className="size-7" />
            </span>
            <h2 className="mt-6 font-serif text-3xl leading-tight">
              Un événement <em className="text-lime">réussi</em>
            </h2>
            <ul className="mt-6 flex flex-col gap-3">
              {["Un titre qui donne envie", "Le lieu exact et l'heure", "Une belle image d'illustration"].map((tip) => (
                <li key={tip} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm text-paper/85">
                  <CalendarHeart className="size-4 shrink-0 text-lime" /> {tip}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-white/10 pt-5 text-sm text-paper/70">
              {editing ? "L'événement reste modifiable tant qu'il n'a pas commencé." : "Les citoyens pourront participer et voir le lieu sur la carte."}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

EvenementForm.layout = appLayout;
