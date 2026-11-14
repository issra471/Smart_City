import { Head, usePage } from "@inertiajs/react";
import DjangoForm from "../../components/DjangoForm";
import AuthLayout, { AuthTitle } from "../../layouts/AuthLayout";
import { Btn } from "../../lib/ui";

export default function PasswordResetConfirm({ form, validlink }) {
  const { urls } = usePage().props;
  return (
    <AuthLayout visual="walk" quote="Un accès simple et sécurisé." caption="Nous vous accompagnons pour retrouver votre espace.">
      <Head title="Nouveau mot de passe" />
      {validlink && form ? (
        <>
          <AuthTitle eyebrow="Sécurité du compte" title="Choisir un nouveau mot de passe" />
          <DjangoForm form={form} submitLabel="Enregistrer" labels={{ new_password1: "Nouveau mot de passe", new_password2: "Confirmer le mot de passe" }} />
        </>
      ) : (
        <>
          <AuthTitle eyebrow="Lien expiré" title="Ce lien n'est plus valide" text="Demandez un nouveau lien de réinitialisation." />
          <Btn href={urls.password_reset} size="lg" arrow className="w-fit">
            Demander un nouveau lien
          </Btn>
        </>
      )}
    </AuthLayout>
  );
}
