import { useEffect, useRef, useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, ImagePlus, LoaderCircle, ShoppingBasket, X } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Btn, Card, MARKET_ICONS, cn } from "../../lib/ui";

const INPUT = "mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] font-normal text-ink outline-none transition placeholder:text-muted/60 focus:border-green focus:ring-4 focus:ring-green/10";

function Err({ list }) {
  return (list || []).map((e) => (
    <p key={e} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-[#b4532f]">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {e}
    </p>
  ));
}

export default function MarketplaceForm({ form, categories, unites, editing, current_image, action, cancel_url }) {
  const init = Object.fromEntries(form.fields.map((f) => [f.name, f.value]));
  const serverErrors = Object.fromEntries(form.fields.map((f) => [f.name, f.errors]));

  const [categorie, setCategorie] = useState(init.categorie || "");
  const [titre, setTitre] = useState(init.titre || "");
  const [description, setDescription] = useState(init.description || "");
  const [prix, setPrix] = useState(init.prix ?? "");
  const [quantite, setQuantite] = useState(init.quantite ?? "1");
  const [unite, setUnite] = useState(init.unite || "piece");
  const [telephone, setTelephone] = useState(init.telephone ?? "");
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [edited, setEdited] = useState({});
  const [charHints, setCharHints] = useState({});
  const fileInput = useRef(null);

  const errors = Object.fromEntries(Object.entries(serverErrors).map(([k, v]) => [k, edited[k] ? [] : v]));
  const touch = (...names) => setEdited((e) => ({ ...e, ...Object.fromEntries(names.map((n) => [n, true])) }));

  useEffect(() => { setEdited({}); }, [form]);

  useEffect(() => {
    if (!image) return setPreview(null);
    const u = URL.createObjectURL(image);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [image]);

  // Contrôle de saisie téléphone : 8 chiffres uniquement, pas de lettres
  function handleTelephone(val) {
    const digitsOnly = val.replace(/[^0-9]/g, "");
    const hadInvalid = digitsOnly !== val;
    const trimmed = digitsOnly.slice(0, 8);
    setTelephone(trimmed);
    setCharHints((h) => ({
      ...h,
      telephone: hadInvalid ? "Seuls les chiffres sont autorisés (pas de lettres ni de caractères spéciaux)." : "",
    }));
    touch("telephone");
  }

  // Contrôle de saisie prix : chiffres uniquement (et un point décimal optionnel, max 2 décimales)
  function handlePrix(val) {
    const normalized = val.replace(",", ".");
    let cleaned = normalized.replace(/[^0-9.]/g, "");
    const hadInvalid = cleaned !== normalized;
    const parts = cleaned.split(".");
    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
    }
    const finalParts = cleaned.split(".");
    if (finalParts.length === 2 && finalParts[1].length > 2) {
      cleaned = `${finalParts[0]}.${finalParts[1].slice(0, 2)}`;
    }
    setPrix(cleaned);
    setCharHints((h) => ({
      ...h,
      prix: hadInvalid ? "Le prix doit être composé uniquement de chiffres." : "",
    }));
    touch("prix");
  }

  // Contrôle de saisie quantité : chiffres uniquement
  function handleQuantite(val) {
    const cleaned = val.replace(/[^0-9]/g, "");
    const hadInvalid = cleaned !== val;
    setQuantite(cleaned);
    setCharHints((h) => ({
      ...h,
      quantite: hadInvalid ? "La quantité doit être composée uniquement de chiffres." : "",
    }));
    touch("quantite");
  }

  function submit(e) {
    e.preventDefault();
    setCharHints({});
    const data = { categorie, titre, description, prix, quantite, unite, telephone };
    if (image) data.image = image;
    router.post(action, data, {
      forceFormData: true,
      preserveScroll: true,
      preserveState: true,
      onStart: () => setBusy(true),
      onFinish: () => setBusy(false),
    });
  }

  const CatIcon = MARKET_ICONS[categorie] || ShoppingBasket;

  const prixErrors = errors.prix?.length ? errors.prix : charHints.prix ? [charHints.prix] : [];
  const telErrors = errors.telephone?.length ? errors.telephone : charHints.telephone ? [charHints.telephone] : [];
  const qteErrors = errors.quantite?.length ? errors.quantite : charHints.quantite ? [charHints.quantite] : [];

  return (
    <>
      <Head title={editing ? "Modifier le produit" : "Publier un produit"} />
      <Link href={cancel_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {editing ? "Retour au produit" : "Marché local"}
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6 sm:p-9">
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">Marché local</p>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{editing ? "Modifier le produit" : "Publier un produit"}</h1>
          <p className="mt-3 mb-8 max-w-lg text-muted">Miel, confitures, artisanat, services… Proposez vos produits aux habitants.</p>

          <form onSubmit={submit} noValidate className="flex flex-col gap-5">
            {/* Catégorie */}
            <div>
              <p className="text-sm font-semibold">Catégorie <span className="text-coral">*</span></p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {categories.map((c) => {
                  const I = MARKET_ICONS[c.value] || ShoppingBasket;
                  const on = categorie === c.value;
                  return (
                    <button key={c.value} type="button" onClick={() => (setCategorie(c.value), touch("categorie"))} className={cn("flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 px-3 py-3 text-sm font-semibold transition", on ? "border-green bg-mint text-green" : "border-line bg-paper hover:border-green/40")}>
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
              <input value={titre} onChange={(e) => (setTitre(e.target.value), touch("titre"))} maxLength={150} placeholder="Ex. Miel de fleurs d'oranger" className={cn(INPUT, errors.titre?.length && "border-coral")} />
              <Err list={errors.titre} />
            </label>

            {/* Description */}
            <label className="block text-sm font-semibold">
              Description <span className="text-coral">*</span>
              <textarea rows={4} value={description} onChange={(e) => (setDescription(e.target.value), touch("description"))} placeholder="Origine, qualité…" className={cn(INPUT, "resize-y", errors.description?.length && "border-coral")} />
              <Err list={errors.description} />
            </label>

            {/* Prix + Téléphone */}
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Prix (DT) <span className="text-coral">*</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={prix}
                  onChange={(e) => handlePrix(e.target.value)}
                  placeholder="12.50"
                  className={cn(INPUT, prixErrors.length && "border-coral")}
                />
                <Err list={prixErrors} />
              </label>
              <label className="block text-sm font-semibold">
                Téléphone <span className="text-xs font-normal text-muted">(facultatif, 8 chiffres)</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={telephone}
                  onChange={(e) => handleTelephone(e.target.value)}
                  maxLength={8}
                  placeholder="Ex. 55123456"
                  className={cn(INPUT, telErrors.length && "border-coral")}
                />
                <Err list={telErrors} />
              </label>
            </div>

            {/* Quantité + Unité */}
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block text-sm font-semibold">
                Quantité disponible <span className="text-coral">*</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={quantite}
                  onChange={(e) => handleQuantite(e.target.value)}
                  placeholder="Ex. 10"
                  className={cn(INPUT, qteErrors.length && "border-coral")}
                />
                <Err list={qteErrors} />
              </label>
              <label className="block text-sm font-semibold">
                Unité <span className="text-coral">*</span>
                <select
                  value={unite}
                  onChange={(e) => (setUnite(e.target.value), touch("unite"))}
                  className={cn(INPUT, "cursor-pointer", errors.unite?.length && "border-coral")}
                >
                  {(unites || []).map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
                <Err list={errors.unite} />
              </label>
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
                  <span className="text-sm font-medium">Ajouter une photo</span>
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
                {editing ? "Enregistrer" : "Publier le produit"}
              </Btn>
            </div>
          </form>
        </Card>

        {/* Aside récap */}
        <aside className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-7 text-paper lg:sticky lg:top-8">
          <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-56 animate-blob rounded-full bg-green/50 blur-3xl" />
          <div className="relative">
            <span className="grid size-14 place-items-center rounded-2xl bg-lime text-deep">
              <CatIcon className="size-7" />
            </span>
            <h2 className="mt-6 font-serif text-3xl leading-tight">
              Vendez <em className="text-lime">local</em>
            </h2>
            <ul className="mt-6 flex flex-col gap-3">
              {["Un titre clair et précis", "Une description honnête", "Quantité et unité précisées", "Un prix juste et une belle photo"].map((tip) => (
                <li key={tip} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm text-paper/85">
                  <ShoppingBasket className="size-4 shrink-0 text-lime" /> {tip}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-t border-white/10 pt-5 text-sm text-paper/70">
              {editing ? "Modifiez votre annonce tant qu'elle n'est pas retirée." : "Les habitants pourront commander directement ou contacter le vendeur."}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

MarketplaceForm.layout = appLayout;
