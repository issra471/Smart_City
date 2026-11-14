import { Head, Link, usePage } from "@inertiajs/react";
import DjangoForm from "../../components/DjangoForm";
import AuthLayout, { AuthTitle } from "../../layouts/AuthLayout";

export default function Signup({ form }) {
  const { urls } = usePage().props;
  return (
    <AuthLayout visual="park" quote="Votre ville, à portée de main." caption="Réservez, signalez, participez : tout commence par un compte.">
      <Head title="Inscription" />
      <AuthTitle eyebrow="Bienvenue" title="Créer mon compte" text="Quelques informations pour commencer, tout simplement." />
      <DjangoForm form={form} submitLabel="Créer mon compte" labels={{ password1: "Mot de passe", password2: "Confirmer le mot de passe" }} />
      <p className="mt-8 text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href={urls.login} className="font-semibold text-green underline-offset-4 hover:underline">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}
