import { Head, usePage } from "@inertiajs/react";
import { Btn } from "../lib/ui";

const TEXT = {
  403: ["Accès réservé", "Cette page est réservée à l'administration. Votre compte n'y a pas accès."],
  404: ["Page introuvable", "Cette adresse ne mène nulle part. La ville, elle, est toujours là."],
};

export default function ErrorPage({ status }) {
  const { auth, urls } = usePage().props;
  const [title, text] = TEXT[status] || ["Une erreur est survenue", "Réessayez dans un instant."];
  return (
    <div className="grain relative isolate grid min-h-screen place-items-center overflow-clip bg-deep px-6 text-center text-paper">
      <Head title={title} />
      <div aria-hidden="true" className="absolute -top-32 right-[-10rem] -z-10 size-[34rem] animate-blob rounded-full bg-green/40 blur-3xl" />
      <div>
        <p className="font-serif text-[9rem] leading-none text-transparent italic sm:text-[14rem]" style={{ WebkitTextStroke: "1.5px #c8f169" }}>
          {status}
        </p>
        <h1 className="mt-2 font-serif text-4xl font-medium sm:text-5xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-md text-paper/70">{text}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Btn href={urls.home} variant="lime" size="lg" arrow>
            Retour à la ville
          </Btn>
          {auth.user && (
            <Btn href={urls.dashboard} variant="ghost" size="lg" className="border-white/20 bg-transparent text-paper hover:border-white/50">
              Mon espace
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}
