import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import DjangoForm from "../../components/DjangoForm";
import { appLayout } from "../../layouts/AppShell";
import { Card } from "../../lib/ui";

export default function PasswordChange({ form }) {
  const { urls } = usePage().props;
  return (
    <>
      <Head title="Modifier le mot de passe" />
      <Link href={urls.profile} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Mon profil
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-6 sm:p-9">
          <span className="grid size-14 place-items-center rounded-2xl bg-deep text-lime">
            <KeyRound className="size-6" />
          </span>
          <h1 className="mt-5 font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">Modifier le mot de passe</h1>
          <p className="mt-3 mb-8 text-muted">Choisissez un nouveau mot de passe pour sécuriser votre compte.</p>
          <DjangoForm form={form} cancelHref={urls.profile} submitLabel="Enregistrer le mot de passe" />
        </Card>

        <aside className="rounded-[1.75rem] bg-mint p-7">
          <ShieldCheck className="size-7 text-green" />
          <h2 className="mt-4 font-serif text-2xl">Un bon mot de passe</h2>
          <ul className="mt-4 flex list-disc flex-col gap-2 pl-5 text-sm text-ink/80">
            <li>Au moins 8 caractères</li>
            <li>Différent de votre nom d'utilisateur</li>
            <li>Que vous n'utilisez sur aucun autre site</li>
          </ul>
        </aside>
      </div>
    </>
  );
}

PasswordChange.layout = appLayout;
