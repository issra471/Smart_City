import { Head, Link, usePage } from "@inertiajs/react";
import DjangoForm from "../../components/DjangoForm";
import AuthLayout, { AuthTitle } from "../../layouts/AuthLayout";

export default function Login({ form }) {
  const { urls } = usePage().props;
  return (
    <AuthLayout visual="bench">
      <Head title="Connexion" />
      <AuthTitle eyebrow="Heureux de vous revoir" title="Me connecter" text="Retrouvez vos services, réservations et contributions." />
      <DjangoForm
        form={form}
        submitLabel="Se connecter"
        footer={
          <Link href={urls.password_reset} className="mr-auto text-sm font-medium text-green underline-offset-4 hover:underline">
            Mot de passe oublié ?
          </Link>
        }
      />
      <p className="mt-8 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href={urls.signup} className="font-semibold text-green underline-offset-4 hover:underline">
          Créer mon compte
        </Link>
      </p>
    </AuthLayout>
  );
}
