import { Head, Link, usePage } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import DjangoForm from "../../components/DjangoForm";
import AuthLayout, { AuthTitle } from "../../layouts/AuthLayout";

export default function PasswordReset({ form }) {
  const { urls } = usePage().props;
  return (
    <AuthLayout visual="walk" quote="Un accès simple et sécurisé." caption="Nous vous accompagnons pour retrouver votre espace.">
      <Head title="Mot de passe oublié" />
      <AuthTitle eyebrow="Accès au compte" title="Réinitialiser mon mot de passe" text="Saisissez l'adresse e-mail associée à votre compte." />
      <DjangoForm form={form} submitLabel="Envoyer le lien" labels={{ email: "Adresse e-mail" }} />
      <Link href={urls.login} className="mt-8 flex items-center justify-center gap-1.5 text-sm font-medium text-green underline-offset-4 hover:underline">
        <ArrowLeft className="size-4" /> Retour à la connexion
      </Link>
    </AuthLayout>
  );
}
