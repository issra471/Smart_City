// Signaler un animal (ou modifier) en 3 étapes : 1. le cas et l'animal, 2. le lieu sur la carte, 3. les détails.
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, Check, ImagePlus, LoaderCircle, MapPin, Minus, PawPrint, Plus, ShieldAlert, X } from "lucide-react";
import SupportButton from "../../components/SupportButton";
import { appLayout } from "../../layouts/AppShell";
import { ANIMAL_ICONS, Btn, CASE_ICONS, Card, animalColor, cn } from "../../lib/ui";

const ReportMap = lazy(() => import("../../components/ReportMap"));

const STEPS = [
  { title: "Quoi ?", fields: ["cas", "animal"] },
  { title: "Où ?", fields: ["latitude", "longitude", "lieu"] },
  { title: "Détails", fields: ["espece", "description", "nombre", "vu_le", "photo"] },
];
const NEAR_METERS = 100;
const INPUT = "mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] font-normal text-ink outline-none transition placeholder:text-muted/60 focus:border-green focus:ring-4 focus:ring-green/10";

// Conseils affichés selon le cas choisi.
const TIPS = {
  blesse: ["Ne touchez pas l'animal : même gentil, un animal blessé peut mordre.", "Restez à distance et gardez-le à l'œil si possible.", "Une photo aide le vétérinaire à préparer son intervention."],
  errant: ["N'essayez pas de l'attraper ni de le nourrir à la main.", "Indiquez s'il semble agressif ou effrayé.", "Précisez le nombre d'animaux."],
  danger: ["Si l'animal est sur une route, prévenez les automobilistes sans vous mettre en danger.", "Ne descendez pas dans un trou ou un puits.", "Décrivez précisément où il est coincé."],
  mort: ["Ne touchez pas l'animal (risque de maladie).", "Indiquez s'il gêne la circulation.", "Le service d'hygiène viendra le retirer."],
  observation: ["Gardez vos distances, surtout avec les oiseaux qui nichent.", "Une photo rend l'observation plus belle à partager.", "Pas besoin d'intervention : c'est juste pour partager."],
};

function meters(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 12742000 * Math.asin(Math.sqrt(h));
}

async function reverseGeocode(lat, lng, signal) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=fr&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, { signal, referrerPolicy: "strict-origin-when-cross-origin" });
  if (!res.ok) throw new Error(String(res.status));
  const a = (await res.json()).address || {};
  const street = [a.house_number, a.road || a.pedestrian || a.footway || a.square || a.park].filter(Boolean).join(" ");
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

function Tile({ on, onClick, icon: I, label, hint, tone = "green", invalid = false }) {
  const urgent = tone === "coral";
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-2.5 rounded-[1.5rem] border-2 px-3 py-5 text-center font-semibold transition",
        on ? (urgent ? "border-coral bg-coral/10 text-[#b4532f]" : "border-green bg-mint text-green") : invalid ? "border-coral/60 bg-paper" : "border-line bg-paper hover:border-green/40",
      )}
    >
      <span className={cn("grid size-12 place-items-center rounded-2xl transition", on ? (urgent ? "bg-coral text-paper" : "bg-green text-paper") : urgent ? "bg-coral/10 text-[#b4532f]" : "bg-pale text-green")}>
        <I className="size-6" />
      </span>
      {label}
      {hint && <span className="-mt-1.5 text-xs font-normal text-muted">{hint}</span>}
    </button>
  );
}

export default function AnimalForm({ form, cases, animals, nearby, editing, current_photo, action, cancel_url }) {
  const init = Object.fromEntries(form.fields.map((f) => [f.name, f.value]));
  const serverErrors = Object.fromEntries(form.fields.map((f) => [f.name, f.errors]));
  const [step, setStep] = useState(0);
  const [cas, setCas] = useState(init.cas && editing ? init.cas : "");
  const [animal, setAnimal] = useState(init.animal && editing ? init.animal : "");
  const [pos, setPos] = useState(init.latitude && init.longitude ? { lat: Number(init.latitude), lng: Number(init.longitude) } : null);
  const [lieu, setLieu] = useState(init.lieu || "");
  const [lieuTouched, setLieuTouched] = useState(!!init.lieu);
  const [geocoding, setGeocoding] = useState(false);
  const [espece, setEspece] = useState(init.espece || "");
  const [description, setDescription] = useState(init.description || "");
  const [nombre, setNombre] = useState(Number(init.nombre) || 1);
  const [vuLe, setVuLe] = useState(init.vu_le || "");
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [ignoreNearby, setIgnoreNearby] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState({});
  const [clientErrors, setClientErrors] = useState({});
  const [localError, setLocalError] = useState("");
  const fileInput = useRef(null);

  const urgent = cases.find((c) => c.value === cas)?.urgent ?? false;
  const errors = Object.fromEntries(Object.entries(serverErrors).map(([k, v]) => [k, edited[k] ? [] : v]));
  Object.entries(clientErrors).forEach(([name, list]) => { if (list.length) errors[name] = list; });
  const touch = (...names) => {
    setEdited((e) => ({ ...e, ...Object.fromEntries(names.map((n) => [n, true])) }));
    setClientErrors((all) => Object.fromEntries(Object.entries(all).filter(([name]) => !names.includes(name))));
  };

  useEffect(() => {
    setEdited({});
    setClientErrors({});
    const i = STEPS.findIndex((s) => s.fields.some((f) => serverErrors[f]?.length));
    if (i >= 0) setStep(i);
  }, [form]);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const u = URL.createObjectURL(photo);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  // Adresse automatique depuis le point (sauf si le citoyen l'a écrite).
  useEffect(() => {
    if (!pos || lieuTouched) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setGeocoding(true);
      try {
        const a = await reverseGeocode(pos.lat, pos.lng, ctrl.signal);
        if (a) setLieu(a);
      } catch {
        /* pas d'Internet : le citoyen écrit l'adresse */
      } finally {
        if (!ctrl.signal.aborted) setGeocoding(false);
      }
    }, 600);
    return () => (clearTimeout(t), ctrl.abort());
  }, [pos?.lat, pos?.lng, lieuTouched]);

  // Animal en difficulté déjà signalé tout près : proposer « Je l'ai vu aussi ».
  const close = useMemo(
    () => (pos && urgent ? nearby.map((r) => ({ ...r, d: meters(pos, r) })).filter((r) => r.d <= NEAR_METERS).sort((a, b) => a.d - b.d) : []),
    [pos, nearby, urgent],
  );
  const showNearby = step === 1 && close.length > 0 && !ignoreNearby;

  function pick(lat, lng) {
    setPos({ lat, lng });
    setIgnoreNearby(editing);
    setLocalError("");
    touch("latitude", "longitude");
  }

  function next() {
    setLocalError("");
    if (step === 0 && !cas) return setLocalError("Choisissez le type de cas.");
    if (step === 0 && !animal) return setLocalError("Choisissez l'animal.");
    if (step === 1 && !pos) return setLocalError("Cliquez sur la carte (ou « Ma position ») pour placer l'animal.");
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(e) {
    e.preventDefault();
    if (step < STEPS.length - 1) return next();
    const invalid = {};
    const count = Number(nombre);
    if (!Number.isInteger(count) || count < 1 || count > 200) invalid.nombre = ["Entre 1 et 200 animaux."];
    const seenAt = vuLe ? new Date(vuLe) : null;
    if (!seenAt || Number.isNaN(seenAt.getTime()) || seenAt > new Date() || seenAt < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      invalid.vu_le = ["La date ne peut pas être future et doit dater de moins de 30 jours."];
    }
    if (urgent && description.trim().length < 10) invalid.description = ["Décrivez la situation en 10 caractères minimum."];
    if (espece.trim() && espece.trim().length < 2) invalid.espece = ["La description courte doit faire au moins 2 caractères."];
    if (photo && (!/\.(jpe?g|png|gif|bmp|webp)$/i.test(photo.name) || photo.size > 8 * 1024 * 1024)) {
      invalid.photo = ["Choisissez une image JPG, PNG, GIF, BMP ou WebP de 8 Mo maximum."];
    }
    if (Object.keys(invalid).length) {
      setClientErrors(invalid);
      return;
    }
    const data = { cas, animal, espece: espece.trim(), description: description.trim(), nombre: count, vu_le: vuLe, lieu: lieu.trim(), latitude: pos ? pos.lat.toFixed(6) : "", longitude: pos ? pos.lng.toFixed(6) : "" };
    if (photo) data.photo = photo;
    router.post(action, data, { forceFormData: true, preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  }

  const stepHasError = (i) => STEPS[i].fields.some((f) => errors[f]?.length);
  const AnimalIcon = ANIMAL_ICONS[animal] || PawPrint;
  const preview_item = { urgent, status: "ouvert" };

  return (
    <>
      <Head title={editing ? "Modifier" : "Signaler un animal"} />
      <Link href={cancel_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {editing ? "Retour" : "Animaux"}
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">Animaux</p>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{editing ? "Modifier le signalement" : "Signaler un animal"}</h1>
        </div>
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
        {/* Étape 1 : le cas et l'animal */}
        {step === 0 && (
          <Card className="p-6 sm:p-8">
            <h2 className="font-serif text-2xl">Que se passe-t-il ?</h2>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {cases.map((c) => (
                <Tile
                  key={c.value}
                  on={cas === c.value}
                  onClick={() => (setCas(c.value), touch("cas", "description"), setLocalError(""))}
                  icon={CASE_ICONS[c.value] || PawPrint}
                  label={c.label}
                  hint={c.urgent ? "intervention" : "juste partager"}
                  tone={c.urgent ? "coral" : "green"}
                  invalid={errors.cas?.length > 0}
                />
              ))}
            </div>
            <Err list={errors.cas} />

            <h2 className="mt-8 font-serif text-2xl">Quel animal ?</h2>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {animals.map((a) => (
                <Tile key={a.value} on={animal === a.value} onClick={() => (setAnimal(a.value), touch("animal"), setLocalError(""))} icon={ANIMAL_ICONS[a.value] || PawPrint} label={a.label} invalid={errors.animal?.length > 0} />
              ))}
            </div>
            <Err list={errors.animal} />

            {cas && (
              <div className={cn("mt-6 flex gap-3 rounded-2xl p-4 text-sm", urgent ? "bg-coral/10 text-[#8f3f20]" : "bg-mint/60 text-dark")}>
                <ShieldAlert className="mt-0.5 size-5 shrink-0" />
                <ul className="flex flex-col gap-1">
                  {TIPS[cas].map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            )}
            {localError && <Err list={[localError]} />}
            <div className="mt-6 flex justify-end">
              <Btn type="submit" size="lg" arrow>
                Continuer
              </Btn>
            </div>
          </Card>
        )}

        {/* Étape 2 : le lieu */}
        {step === 1 && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="overflow-hidden rounded-[1.75rem] border border-line bg-paper p-2">
              <Suspense fallback={<div className="h-[24rem] animate-pulse rounded-[1.4rem] bg-pale sm:h-[32rem]" />}>
                <ReportMap reports={urgent ? nearby : []} pick={{ pos, onPick: pick }} iconFor={(a) => ANIMAL_ICONS[a.animal]} colorFor={animalColor} label="Carte : placer l'animal" className="h-[24rem] rounded-[1.4rem] sm:h-[32rem]" />
              </Suspense>
            </div>
            <Card className="p-6">
              <h2 className="font-serif text-2xl">Où est l'animal ?</h2>
              <p className="mt-1 text-sm text-muted">Cliquez sur la carte ou utilisez « Ma position ». Vous pouvez ensuite déplacer le point.</p>
              <div className={cn("mt-5 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm", pos ? "border-green/30 bg-mint/50" : errors.latitude?.length ? "border-coral bg-coral/10" : "border-dashed border-line")}>
                <MapPin className={cn("size-5 shrink-0", pos ? "text-green" : "text-muted")} />
                {pos ? <span>Point placé ✓</span> : <span className="text-muted">Aucun point pour le moment.</span>}
              </div>
              <Err list={errors.latitude} />
              <label className="mt-5 block text-sm font-semibold">
                Adresse ou repère
                <span className="relative block">
                  <input value={lieu} onChange={(e) => (setLieu(e.target.value), setLieuTouched(true), touch("lieu"))} maxLength={200} placeholder={pos ? "Recherche de l'adresse…" : "Rue, parc, plage…"} className={cn(INPUT, "pr-10", errors.lieu?.length && "border-coral")} />
                  {geocoding && <LoaderCircle className="absolute top-1/2 right-4 mt-1 size-4 -translate-y-1/2 animate-spin text-muted" />}
                </span>
                <span className="mt-1.5 block text-xs font-normal text-muted">
                  Remplie automatiquement depuis la carte, vous pouvez la corriger.
                  {lieuTouched && pos && (
                    <button type="button" onClick={() => setLieuTouched(false)} className="ml-1 cursor-pointer font-semibold text-green hover:underline">
                      Recalculer
                    </button>
                  )}
                </span>
                <Err list={errors.lieu} />
              </label>

              {showNearby && (
                <div className="mt-5 rounded-2xl border border-[#d99a16]/40 bg-[#f4c95d]/15 p-4">
                  <p className="text-sm font-semibold">Déjà signalé juste à côté ?</p>
                  <p className="mt-0.5 text-xs text-muted">Si c'est le même animal, confirmez plutôt le signalement existant : le partenaire saura que c'est sérieux.</p>
                  <ul className="mt-3 flex flex-col gap-2">
                    {close.slice(0, 3).map((r) => {
                      const I = ANIMAL_ICONS[r.animal] || PawPrint;
                      return (
                        <li key={r.id} className="flex items-center gap-3 rounded-xl bg-paper p-2.5">
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg text-paper" style={{ background: animalColor(r) }}>
                            <I className="size-4" />
                          </span>
                          <Link href={r.url} className="min-w-0 flex-1 hover:underline">
                            <b className="block truncate text-sm">{r.title}</b>
                            <span className="text-xs text-muted">
                              à {Math.round(r.d)} m · {r.status_label}
                            </span>
                          </Link>
                          <SupportButton r={r} label="Je l'ai vu aussi" doneLabel="Vu aussi" title="J'ai vu le même animal" />
                        </li>
                      );
                    })}
                  </ul>
                  <button type="button" onClick={() => setIgnoreNearby(true)} className="mt-3 cursor-pointer text-sm font-semibold text-green hover:underline">
                    Non, c'est un autre animal →
                  </button>
                </div>
              )}
              {localError && <Err list={[localError]} />}
              <div className="mt-6 flex justify-between gap-3">
                <Btn variant="ghost" icon={ArrowLeft} onClick={() => setStep(0)}>
                  Retour
                </Btn>
                <Btn type="submit" size="lg" arrow disabled={showNearby}>
                  Continuer
                </Btn>
              </div>
            </Card>
          </div>
        )}

        {/* Étape 3 : les détails */}
        {step === 2 && (
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
            <Card className="p-6 sm:p-8">
              <h2 className="font-serif text-2xl">{urgent ? "Décrivez la situation" : "Racontez votre observation"}</h2>
              <label className="mt-5 block text-sm font-semibold">
                Espèce ou description courte
                <input value={espece} onChange={(e) => (setEspece(e.target.value), touch("espece"))} maxLength={100} placeholder={urgent ? "Ex. Chat roux blessé" : "Ex. Flamants roses, hérisson…"} className={cn(INPUT, errors.espece?.length && "border-coral")} />
                <span className="mt-1.5 block text-xs font-normal text-muted">Facultatif : si vous ne savez pas, laissez vide.</span>
                <Err list={errors.espece} />
              </label>
              <label className="mt-5 block text-sm font-semibold">
                Description {urgent && <span className="text-coral">*</span>}
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => (setDescription(e.target.value), touch("description"))}
                  placeholder={urgent ? "État de l'animal, est-il agressif ? Repère précis…" : "Ce que vous avez vu (facultatif)."}
                  className={cn(INPUT, "resize-y", errors.description?.length && "border-coral")}
                />
                <Err list={errors.description} />
              </label>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div className="text-sm font-semibold">
                  Nombre d'animaux
                  <div className={cn("mt-2 flex w-fit items-center gap-1 rounded-2xl border bg-paper p-1", errors.nombre?.length ? "border-coral" : "border-line")}>
                    <button type="button" aria-label="Moins" onClick={() => (setNombre((n) => Math.max(1, n - 1)), touch("nombre"))} className="grid size-10 cursor-pointer place-items-center rounded-xl hover:bg-mint">
                      <Minus className="size-4" />
                    </button>
                    <span className="w-10 text-center text-lg">{nombre}</span>
                    <button type="button" aria-label="Plus" onClick={() => (setNombre((n) => Math.min(200, n + 1)), touch("nombre"))} className="grid size-10 cursor-pointer place-items-center rounded-xl hover:bg-mint">
                      <Plus className="size-4" />
                    </button>
                  </div>
                  <Err list={errors.nombre} />
                </div>
                <label className="block text-sm font-semibold">
                  Vu le
                  <input type="datetime-local" value={vuLe} onChange={(e) => (setVuLe(e.target.value), touch("vu_le"))} className={cn(INPUT, errors.vu_le?.length && "border-coral")} />
                  <Err list={errors.vu_le} />
                </label>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold">Photo {editing && current_photo ? "(remplacer)" : "(conseillée)"}</p>
                <input ref={fileInput} type="file" accept="image/*" className="sr-only" onChange={(e) => (setPhoto(e.target.files[0] || null), touch("photo"))} />
                {preview || current_photo ? (
                  <div className={cn("relative mt-2 overflow-hidden rounded-2xl border", errors.photo?.length ? "border-coral" : "border-line")}>
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
                  </div>
                ) : (
                  <button type="button" onClick={() => fileInput.current.click()} className={cn("mt-2 flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed bg-pale/60 px-4 py-8 text-center transition hover:border-green hover:bg-mint/40", errors.photo?.length ? "border-coral" : "border-line")}>
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
                  {editing ? "Enregistrer" : urgent ? "Envoyer le signalement" : "Partager l'observation"}
                </Btn>
              </div>
            </Card>

            <aside className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-6 text-paper lg:sticky lg:top-8">
              <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-56 animate-blob rounded-full bg-green/50 blur-3xl" />
              <div className="relative">
                <p className="text-xs font-semibold tracking-[0.14em] text-lime uppercase">Récapitulatif</p>
                <div className="mt-5 flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl text-paper" style={{ background: animalColor(preview_item) }}>
                    <AnimalIcon className="size-6" />
                  </span>
                  <div>
                    <p className="text-xs text-paper/50">{cases.find((c) => c.value === cas)?.label || "—"}</p>
                    <p className="font-semibold">{animals.find((a) => a.value === animal)?.label || "—"}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid size-12 place-items-center rounded-2xl bg-white/10 text-lime">
                    <MapPin className="size-6" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-paper/50">Lieu</p>
                    <p className="truncate font-semibold">{lieu || (pos ? "Point placé sur la carte" : "—")}</p>
                  </div>
                </div>
                <p className="mt-6 border-t border-white/10 pt-5 text-sm text-paper/70">
                  {urgent ? "Un partenaire de la ville (vétérinaire, association…) sera prévenu. Vous suivrez l'intervention sur la page du signalement." : "Votre observation apparaîtra tout de suite sur la carte de la ville."}
                </p>
              </div>
            </aside>
          </div>
        )}
      </form>
    </>
  );
}

AnimalForm.layout = appLayout;
