// Créer ou modifier une équipe d'intervention.
import { useState } from "react";
import { Head, Link, router } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, Check, HardHat, LoaderCircle } from "lucide-react";
import { adminLayout } from "../../layouts/AppShell";
import { Btn, Card, cn } from "../../lib/ui";
import { TEAM_ICON, TEAM_TEXTS, categoryIcon } from "./Equipes";

const INPUT = "mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] font-normal outline-none transition placeholder:text-muted/60 focus:border-green focus:ring-4 focus:ring-green/10";

function Err({ list }) {
  return (list || []).map((e) => (
    <p key={e} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-[#b4532f]">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {e}
    </p>
  ));
}

export default function EquipeForm({ form, editing, categories, selected, list_url, action, texts }) {
  const T = { ...TEAM_TEXTS, ...texts };
  const TeamIcon = TEAM_ICON[T.icon] || HardHat;
  const f = Object.fromEntries(form.fields.map((x) => [x.name, x]));
  const [nom, setNom] = useState(f.nom.value);
  const [responsable, setResponsable] = useState(f.responsable.value);
  const [telephone, setTelephone] = useState(f.telephone.value);
  const [cats, setCats] = useState(selected);
  const [busy, setBusy] = useState(false);
  const [clientErrors, setClientErrors] = useState({});
  const errors = Object.fromEntries(form.fields.map((field) => [field.name, [...field.errors, ...(clientErrors[field.name] || [])]]));
  const clearError = (name) => setClientErrors((all) => Object.fromEntries(Object.entries(all).filter(([field]) => field !== name)));
  const toggle = (v) => setCats((c) => (c.includes(v) ? c.filter((x) => x !== v) : [...c, v]));

  function submit(e) {
    e.preventDefault();
    const invalid = {};
    if (nom.trim().length < 2) invalid.nom = ["Le nom doit faire au moins 2 caractères."];
    if (responsable.trim() && responsable.trim().length < 2) invalid.responsable = ["Le nom du responsable doit faire au moins 2 caractères."];
    if (telephone.trim() && !/^[0-9]{8}$/.test(telephone.trim())) invalid.telephone = ["Le numéro de téléphone doit contenir exactement 8 chiffres."];
    if (Object.keys(invalid).length) {
      setClientErrors(invalid);
      return;
    }
    router.post(action, { nom: nom.trim(), responsable: responsable.trim(), telephone: telephone.trim(), categories: cats.join(",") }, { forceFormData: true, preserveScroll: true, preserveState: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  }

  return (
    <>
      <Head title={editing ? T.edit : T.new} />
      <Link href={list_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {T.back}
      </Link>
      <form onSubmit={submit} noValidate className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 sm:p-8">
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">Gestion</p>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight">{editing ? T.edit : T.new}</h1>
          <Err list={form.errors} />

          <label className="mt-7 block text-sm font-semibold">
            {T.name} <span className="text-coral">*</span>
            <input value={nom} onChange={(e) => (setNom(e.target.value), clearError("nom"))} maxLength={100} placeholder={T.name_placeholder} className={cn(INPUT, errors.nom.length > 0 && "border-coral")} />
            <Err list={errors.nom} />
          </label>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Responsable
              <input value={responsable} onChange={(e) => (setResponsable(e.target.value), clearError("responsable"))} maxLength={100} placeholder="Prénom Nom" className={cn(INPUT, errors.responsable.length > 0 && "border-coral")} />
              <Err list={errors.responsable} />
            </label>
            <label className="block text-sm font-semibold">
              Téléphone
              <input value={telephone} onChange={(e) => (setTelephone(e.target.value), clearError("telephone"))} maxLength={8} type="tel" inputMode="numeric" placeholder="71000000" className={cn(INPUT, errors.telephone.length > 0 && "border-coral")} />
              <Err list={errors.telephone} />
            </label>
          </div>

          <p className="mt-6 text-sm font-semibold">{T.categories}</p>
          <p className="mt-0.5 text-xs text-muted">{T.categories_help}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categories.map((c) => {
              const I = categoryIcon(c.value) || TeamIcon;
              const on = cats.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(c.value)}
                  className={cn("flex cursor-pointer items-center gap-2.5 rounded-2xl border-2 px-3 py-3 text-left text-sm font-semibold transition", on ? "border-green bg-mint text-green" : errors.categories.length ? "border-coral/60 bg-paper" : "border-line bg-paper hover:border-green/40")}
                >
                  <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl", on ? "bg-green text-paper" : "bg-pale text-green")}>{on ? <Check className="size-4" /> : <I className="size-4" />}</span>
                  {c.label}
                </button>
              );
            })}
          </div>
          <Err list={errors.categories} />

          <div className="mt-7 flex flex-wrap justify-end gap-3">
            <Btn href={list_url} variant="ghost">
              Annuler
            </Btn>
            <Btn type="submit" size="lg" arrow={!busy} disabled={busy}>
              {busy && <LoaderCircle className="size-4 animate-spin" />} {editing ? "Enregistrer" : T.create}
            </Btn>
          </div>
        </Card>

        <aside className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-7 text-paper lg:sticky lg:top-8">
          <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-56 animate-blob rounded-full bg-green/50 blur-3xl" />
          <div className="relative">
            <span className="grid size-14 place-items-center rounded-2xl bg-lime text-deep">
              <TeamIcon className="size-7" />
            </span>
            <h2 className="mt-6 font-serif text-3xl leading-tight">
              {T.aside_title} <em className="text-lime">automatique</em>
            </h2>
            <p className="mt-3 text-sm text-paper/70">{T.aside_text}</p>
          </div>
        </aside>
      </form>
    </>
  );
}

EquipeForm.layout = adminLayout;
