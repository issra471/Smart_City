// Nouveau signalement (ou modification) en 3 étapes : 1. le lieu sur la carte, 2. la catégorie, 3. les détails.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, ImagePlus, LoaderCircle, MapPin, TriangleAlert, X } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Btn, Card, REPORT_COLORS, REPORT_ICONS, cn } from "../../lib/ui";
import SupportButton from "../../components/SupportButton";

const ReportMap = lazy(() => import("../../components/ReportMap"));

const STEPS = [
  { title: "Où ?", fields: ["latitude", "longitude", "adresse"] },
  { title: "Quoi ?", fields: ["categorie"] },
  { title: "Détails", fields: ["titre", "description", "photo"] },
];
const NEAR_METERS = 50;
const INPUT = "mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] font-normal text-ink outline-none transition placeholder:text-muted/60 focus:border-green focus:ring-4 focus:ring-green/10";

/** Distance en mètres entre deux points. */
function meters(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}

/** Adresse lisible à partir d'un point (OpenStreetMap Nominatim, gratuit). */
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

export default function SignalementForm({ form, categories, nearby, editing, current_photo, action, cancel_url }) {
  const init = Object.fromEntries(form.fields.map((f) => [f.name, f.value]));
  const serverErrors = Object.fromEntries(form.fields.map((f) => [f.name, f.errors]));
  const [step, setStep] = useState(0);
  const [pos, setPos] = useState(init.latitude && init.longitude ? { lat: Number(init.latitude), lng: Number(init.longitude) } : null);
  const [adresse, setAdresse] = useState(init.adresse || "");
  const [addressTouched, setAddressTouched] = useState(!!init.adresse);
  const [geocoding, setGeocoding] = useState(false);
  const [categorie, setCategorie] = useState(init.categorie || "");
  const [titre, setTitre] = useState(init.titre || "");
  const [description, setDescription] = useState(init.description || "");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ignoreNearby, setIgnoreNearby] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState({}); // champs modifiés depuis la réponse de Django : ancienne erreur masquée
  const [localError, setLocalError] = useState("");
  const fileInput = useRef(null);

  const errors = Object.fromEntries(Object.entries(serverErrors).map(([k, v]) => [k, edited[k] ? [] : v]));
  const touch = (...names) => setEdited((e) => ({ ...e, ...Object.fromEntries(names.map((n) => [n, true])) }));

  // Après une réponse de Django avec erreurs : aller à la première étape concernée.
  useEffect(() => {
    setEdited({});
    const i = STEPS.findIndex((s) => s.fields.some((f) => serverErrors[f]?.length));
    if (i >= 0) setStep(i);
  }, [form]);

  // Aperçu de la photo choisie.
  useEffect(() => {
    if (!photo) return setPreview(null);
    const u = URL.createObjectURL(photo);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  // Adresse remplie automatiquement à partir du point (sauf si le citoyen l'a écrite lui-même).
  useEffect(() => {
    if (!pos || addressTouched) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setGeocoding(true);
      try {
        const a = await reverseGeocode(pos.lat, pos.lng, ctrl.signal);
        if (a) setAdresse(a);
      } catch {
        /* pas d'Internet ou service indisponible : le citoyen écrit l'adresse lui-même */
      } finally {
        if (!ctrl.signal.aborted) setGeocoding(false);
      }
    }, 600);
    return () => (clearTimeout(t), ctrl.abort());
  }, [pos?.lat, pos?.lng, addressTouched]);

  // Signalements non résolus tout près du point : peut-être le même problème.
  const close = useMemo(
    () => (pos ? nearby.map((r) => ({ ...r, d: meters(pos, r) })).filter((r) => r.d <= NEAR_METERS).sort((a, b) => a.d - b.d) : []),
    [pos, nearby],
  );
  const showNearby = step === 0 && close.length > 0 && !ignoreNearby;

  function pick(lat, lng) {
    setPos({ lat, lng });
    setIgnoreNearby(editing);
    setLocalError("");
    touch("latitude", "longitude");
  }

  function next() {
    setLocalError("");
    if (step === 0 && !pos) return setLocalError("Cliquez sur la carte (ou « Ma position ») pour placer le problème.");
    if (step === 1 && !categorie) return setLocalError("Choisissez une catégorie.");
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(e) {
    e.preventDefault();
    if (step < STEPS.length - 1) return next();
    const data = { categorie, titre, description, adresse, latitude: pos ? pos.lat.toFixed(6) : "", longitude: pos ? pos.lng.toFixed(6) : "" };
    if (photo) data.photo = photo;
    router.post(action, data, { forceFormData: true, preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  }

  const CatIcon = REPORT_ICONS[categorie] || TriangleAlert;
  const stepHasError = (i) => STEPS[i].fields.some((f) => errors[f]?.length);

  return (
    <>
      <Head title={editing ? "Modifier le signalement" : "Nouveau signalement"} />
      <Link href={cancel_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {editing ? "Retour au signalement" : "Signalements"}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">Signalement</p>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{editing ? "Modifier le signalement" : "Signaler un problème"}</h1>
        </div>
        {/* Étapes */}
        <ol className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-center gap-2">
              <button
                type="button"
                disabled={!editing && i > step}
                onClick={() => setStep(i)}
                className={cn(
                  "flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-sm font-semibold transition enabled:cursor-pointer",
                  i === step ? "bg-deep text-paper" : i < step || editing ? "bg-mint text-green" : "bg-ink/5 text-muted",
                  stepHasError(i) && i !== step && "ring-2 ring-coral",
                )}
              >
                <span className={cn("grid size-6 place-items-center rounded-full text-xs", i === step ? "bg-lime text-deep" : "bg-paper")}>{i < step && !stepHasError(i) ? <Check className="size-3.5" /> : i + 1}</span>
                {s.title}
              </button>
              {i < STEPS.length - 1 && <span className="hidden h-px w-4 bg-line sm:block" />}
            </li>
          ))}
        </ol>
      </div>

      {form.errors.length > 0 && (
        <div className="mb-4">
          <Err list={form.errors} />
        </div>
      )}

      <form onSubmit={submit} noValidate>
        {/* Étape 1 : le lieu */}
        {step === 0 && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
              <Suspense fallback={<div className="h-[24rem] animate-pulse rounded-[1.4rem] bg-pale sm:h-[32rem]" />}>
                <ReportMap reports={nearby} pick={{ pos, onPick: pick }} className="h-[24rem] rounded-[1.4rem] sm:h-[32rem]" />
              </Suspense>
            </div>

            <Card className="p-6">
              <h2 className="font-serif text-2xl">Où se trouve le problème ?</h2>
              <p className="mt-1 text-sm text-muted">Cliquez sur la carte ou utilisez « Ma position ». Vous pouvez ensuite déplacer le point.</p>

              <div className={cn("mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm", pos ? "border-green/30 bg-mint/50" : errors.latitude?.length ? "border-coral bg-coral/10" : "border-dashed border-line")}>
                <MapPin className={cn("size-5 shrink-0", pos ? "text-green" : "text-muted")} />
                {pos ? <span>Point placé ✓</span> : <span className="text-muted">Aucun point pour le moment.</span>}
              </div>
              <Err list={errors.latitude} />

              <label className="mt-5 block text-sm font-semibold">
                Adresse ou repère
                <span className="relative block">
                  <input
                    value={adresse}
                    onChange={(e) => (setAdresse(e.target.value), setAddressTouched(true), touch("adresse"))}
                    maxLength={200}
                    placeholder={pos ? "Recherche de l'adresse…" : "Rue, quartier ou repère"}
                    className={cn(INPUT, "pr-10")}
                  />
                  {geocoding && <LoaderCircle className="absolute top-1/2 right-4 mt-1 size-4 -translate-y-1/2 animate-spin text-muted" />}
                </span>
                <span className="mt-1.5 block text-xs font-normal text-muted">
                  Remplie automatiquement depuis la carte, vous pouvez la corriger.
                  {addressTouched && pos && (
                    <button type="button" onClick={() => setAddressTouched(false)} className="ml-1 cursor-pointer font-semibold text-green hover:underline">
                      Recalculer
                    </button>
                  )}
                </span>
                <Err list={errors.adresse} />
              </label>

              {showNearby && (
                <div className="mt-5 rounded-2xl border border-[#d99a16]/40 bg-[#f4c95d]/15 p-4">
                  <p className="text-sm font-semibold">Déjà signalé juste à côté ?</p>
                  <p className="mt-0.5 text-xs text-muted">Si c'est le même problème, soutenez-le plutôt que d'en créer un nouveau : il sera traité plus vite.</p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {close.slice(0, 3).map((r) => {
                      const I = REPORT_ICONS[r.category] || TriangleAlert;
                      return (
                        <li key={r.id} className="flex items-center gap-3 rounded-xl bg-paper p-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg text-paper" style={{ background: REPORT_COLORS[r.status] }}>
                            <I className="size-4" />
                          </span>
                          <Link href={r.url} className="min-w-0 flex-1 hover:underline">
                            <b className="block truncate text-sm">{r.title}</b>
                            <span className="text-xs text-muted">
                              à {Math.round(r.d)} m · {r.status_label}
                            </span>
                          </Link>
                          <SupportButton r={r} />
                        </li>
                      );
                    })}
                  </ul>
                  <button type="button" onClick={() => setIgnoreNearby(true)} className="mt-3 cursor-pointer text-sm font-semibold text-green hover:underline">
                    Non, c'est un autre problème →
                  </button>
                </div>
              )}

              {localError && <Err list={[localError]} />}
              <div className="mt-6 flex justify-end">
                <Btn type="submit" size="lg" arrow disabled={showNearby}>
                  Continuer
                </Btn>
              </div>
            </Card>
          </div>
        )}

        {/* Étape 2 : la catégorie */}
        {step === 1 && (
          <Card className="p-6 sm:p-8">
            <h2 className="font-serif text-2xl">Quel type de problème ?</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {categories.map((c) => {
                const I = REPORT_ICONS[c.value] || TriangleAlert;
                const on = categorie === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => (setCategorie(c.value), touch("categorie"), setLocalError(""))}
                    className={cn(
                      "flex cursor-pointer flex-col items-center gap-3 rounded-[1.5rem] border-2 px-4 py-6 text-center font-semibold transition",
                      on ? "border-green bg-mint text-green" : "border-line bg-paper hover:border-green/40",
                    )}
                  >
                    <span className={cn("grid size-14 place-items-center rounded-2xl transition", on ? "bg-green text-paper" : "bg-pale text-green")}>
                      <I className="size-7" />
                    </span>
                    {c.label}
                  </button>
                );
              })}
            </div>
            <Err list={errors.categorie} />
            {localError && <Err list={[localError]} />}
            <div className="mt-6 flex justify-between gap-3">
              <Btn variant="ghost" icon={ArrowLeft} onClick={() => setStep(0)}>
                Retour
              </Btn>
              <Btn type="submit" size="lg" arrow>
                Continuer
              </Btn>
            </div>
          </Card>
        )}

        {/* Étape 3 : les détails */}
        {step === 2 && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-6 sm:p-8">
              <h2 className="font-serif text-2xl">Décrivez le problème</h2>
              <label className="mt-5 block text-sm font-semibold">
                Titre <span className="text-coral">*</span>
                <input value={titre} onChange={(e) => (setTitre(e.target.value), touch("titre"))} maxLength={150} placeholder="Ex. Lampadaire éteint devant l'école" className={cn(INPUT, errors.titre?.length && "border-coral")} />
                <Err list={errors.titre} />
              </label>
              <label className="mt-5 block text-sm font-semibold">
                Description <span className="text-coral">*</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => (setDescription(e.target.value), touch("description"))}
                  placeholder="Depuis quand ? Est-ce dangereux ? Un détail pour le retrouver ?"
                  className={cn(INPUT, "resize-y", errors.description?.length && "border-coral")}
                />
                <Err list={errors.description} />
              </label>

              <div className="mt-5">
                <p className="text-sm font-semibold">Photo {editing && current_photo ? "(remplacer)" : "(conseillée)"}</p>
                <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={(e) => (setPhoto(e.target.files[0] || null), touch("photo"))} />
                {preview || current_photo ? (
                  <div className="relative mt-2 overflow-hidden rounded-2xl border border-line">
                    <img src={preview || current_photo} alt="" className="max-h-72 w-full object-cover" />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button type="button" onClick={() => fileInput.current.click()} className="cursor-pointer rounded-full bg-deep/80 px-3 py-1.5 text-xs font-semibold text-paper backdrop-blur hover:bg-deep">
                        Changer
                      </button>
                      {photo && (
                        <button type="button" aria-label="Retirer la photo" onClick={() => (setPhoto(null), (fileInput.current.value = ""))} className="grid size-8 cursor-pointer place-items-center rounded-full bg-deep/80 text-paper backdrop-blur hover:bg-deep">
                          <X className="size-4" />
                        </button>
                      )}
                    </div>
                    {!photo && current_photo && <span className="absolute bottom-3 left-3 rounded-full bg-paper/90 px-3 py-1 text-xs font-semibold">Photo actuelle</span>}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current.click()}
                    className="mt-2 flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-pale/60 px-4 py-8 text-center transition hover:border-green hover:bg-mint/40"
                  >
                    <span className="grid size-11 place-items-center rounded-full bg-paper text-green shadow-sm">
                      <ImagePlus className="size-5" />
                    </span>
                    <span className="text-sm font-medium">Ajouter une photo</span>
                    <span className="text-xs text-muted">Facultatif · 8 Mo maximum</span>
                  </button>
                )}
                <Err list={errors.photo} />
              </div>

              <div className="mt-7 flex justify-between gap-3">
                <Btn variant="ghost" icon={ArrowLeft} onClick={() => setStep(1)}>
                  Retour
                </Btn>
                <Btn type="submit" size="lg" arrow={!busy} disabled={busy}>
                  {busy && <LoaderCircle className="size-4 animate-spin" />}
                  {editing ? "Enregistrer les modifications" : "Envoyer le signalement"}
                </Btn>
              </div>
            </Card>

            {/* Récapitulatif */}
            <aside className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-6 text-paper lg:sticky lg:top-8">
              <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-56 animate-blob rounded-full bg-green/50 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-semibold tracking-[0.14em] text-lime uppercase">Récapitulatif</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-lime text-deep">
                    <CatIcon className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs text-paper/50">Catégorie</p>
                    <p className="font-semibold">{categories.find((c) => c.value === categorie)?.label || "—"}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-lime">
                    <MapPin className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-paper/50">Lieu</p>
                    <p className="truncate font-semibold">{adresse || (pos ? "Point placé sur la carte" : "—")}</p>
                  </div>
                </div>
                <p className="mt-6 border-t border-white/10 pt-5 text-sm text-paper/70">
                  {editing ? "Vous pouvez modifier votre signalement tant que les équipes n'ont pas commencé." : "Vous pourrez suivre l'avancement sur la page du signalement."}
                </p>
              </div>
            </aside>
          </div>
        )}
      </form>

      {step < 2 && (
        <p className="mt-4 flex items-center gap-1.5 px-2 text-xs text-muted">
          <ArrowRight className="size-3" /> Étape {step + 1} sur 3
        </p>
      )}
    </>
  );
}

SignalementForm.layout = appLayout;
