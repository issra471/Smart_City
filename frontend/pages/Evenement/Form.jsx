// Formulaire de création/modification d'un événement (citoyen et admin).
import { Head, Link } from "@inertiajs/react";
import { ArrowLeft, CalendarHeart, Camera, Check, MapPin } from "lucide-react";
import DjangoForm from "../../components/DjangoForm";
import { appLayout, adminLayout } from "../../layouts/AppShell";
import { Card } from "../../lib/ui";

const TIPS = [
  "Un titre qui donne envie de venir",
  "Le lieu exact et l'heure de début",
  "Une belle image pour illustrer l'événement",
];

export default function EvenementForm({ form, title, intro, back_url, is_editing, event_id, current_image, _is_admin }) {
  const icons = [Check, MapPin, Camera];

  return (
    <>
      <Head title={title} />
      <Link href={back_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {is_editing ? "Retour à l'événement" : "Événements"}
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card className="p-6 sm:p-9">
          <p className="mb-1.5 text-xs font-semibold tracking-[0.14em] text-green uppercase">Services citoyens</p>
          <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{title}</h1>
          {intro && <p className="mt-3 mb-8 max-w-lg text-muted">{intro}</p>}

          {is_editing && current_image && (
            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-muted">Image actuelle</p>
              <img
                src={current_image}
                alt="Image actuelle de l'événement"
                className="h-32 w-auto rounded-2xl border border-line object-cover"
              />
            </div>
          )}

          <DjangoForm
            form={form}
            cancelHref={back_url}
            submitLabel={is_editing ? "Enregistrer les modifications" : "Publier l'événement"}
            columns={2}
            wide={["titre", "description"]}
          />
        </Card>

        <aside className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-7 text-paper lg:sticky lg:top-8">
          <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-56 animate-blob rounded-full bg-green/50 blur-3xl" />
          <div className="relative">
            <span className="grid size-14 place-items-center rounded-2xl bg-lime text-deep">
              <CalendarHeart className="size-7" />
            </span>
            <h2 className="mt-6 font-serif text-3xl leading-tight">
              Pour un événement <em className="text-lime">réussi</em>
            </h2>
            <ul className="mt-6 flex flex-col gap-3">
              {TIPS.map((tip, i) => {
                const TipIcon = icons[i % icons.length];
                return (
                  <li key={tip} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm text-paper/85">
                    <TipIcon className="size-4 shrink-0 text-lime" /> {tip}
                  </li>
                );
              })}
            </ul>
            <p className="mt-6 text-sm text-paper/60">
              Votre événement sera visible par tous les citoyens de la plateforme dès sa publication.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}

EvenementForm.layout = appLayout;
