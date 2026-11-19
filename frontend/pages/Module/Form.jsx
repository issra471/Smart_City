// Formulaire de création d'un module (signalement, événement, observation, produit, station).
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, Camera, Check, MapPin, Sparkles } from "lucide-react";
import DjangoForm from "../../components/DjangoForm";
import { appLayout } from "../../layouts/AppShell";
import { Card, MODULES } from "../../lib/ui";

const TIPS = {
  infrastructures: ["Un titre court et précis", "L'adresse ou un repère proche", "Une photo du problème"],
  evenements: ["Un titre qui donne envie", "Le lieu exact et l'heure de début", "Une belle image d'illustration"],
  animaux: ["L'espèce, même approximative", "Le lieu précis de l'observation", "« Besoin de soin » si l'animal est blessé"],
  marketplace: ["Un nom clair pour le produit", "Un prix juste, en dinars", "Une photo bien éclairée"],
  mobilite: ["La station où se trouvent les transports", "Le type : vélo, trottinette ou scooter électrique", "Un administrateur valide avant publication"],
};
const PLACEHOLDERS = {
  titre: "En quelques mots…",
  adresse: "Rue, quartier ou repère",
  lieu: "Où cela se passe-t-il ?",
  espece: "Hérisson, cigogne, chat…",
  nom: "Ex. Station Gare centrale",
  description: "Donnez quelques détails utiles.",
};

export default function ModuleForm({ form, title, intro, ns, list_url }) {
  const meta = MODULES[ns] || { icon: Sparkles, short: "Service" };
  const Icon = meta.icon;
  const tips = TIPS[ns] || [];
  const icons = [Check, MapPin, Camera];

  return (
    <>
      <Head title={title} />
      <Link href={list_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {meta.short}
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6 sm:p-9">
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">Services citoyens</p>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{title}</h1>
          {intro && <p className="mt-3 mb-8 max-w-lg text-muted">{intro}</p>}
          <DjangoForm form={form} cancelHref={list_url} submitLabel="Enregistrer" columns={2} wide={["titre", "nom", "description", "categorie", "type", "station"]} placeholders={PLACEHOLDERS} />
        </Card>

        <aside className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-7 text-paper lg:sticky lg:top-8">
          <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-56 animate-blob rounded-full bg-green/50 blur-3xl" />
          <div className="relative">
            <span className="grid size-14 place-items-center rounded-2xl bg-lime text-deep">
              <Icon className="size-7" />
            </span>
            <h2 className="mt-6 font-serif text-3xl leading-tight">
              Pour une demande <em className="text-lime">bien comprise</em>
            </h2>
            <ul className="mt-6 flex flex-col gap-3">
              {tips.map((tip, i) => {
                const TipIcon = icons[i % icons.length];
                return (
                  <li key={tip} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm text-paper/85">
                    <TipIcon className="size-4 shrink-0 text-lime" /> {tip}
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

ModuleForm.layout = appLayout;
