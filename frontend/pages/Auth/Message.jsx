import { Head } from "@inertiajs/react";
import { MailCheck } from "lucide-react";
import AuthLayout, { AuthTitle } from "../../layouts/AuthLayout";
import { Btn } from "../../lib/ui";

/** Écran d'information simple (lien envoyé, mot de passe modifié…). */
export default function Message({ eyebrow, title, text, action }) {
  return (
    <AuthLayout visual="walk" quote="Un accès simple et sécurisé." caption="Nous vous accompagnons pour retrouver votre espace.">
      <Head title={title} />
      <span className="mb-6 grid size-16 place-items-center rounded-full bg-mint text-green">
        <MailCheck className="size-7" />
      </span>
      <AuthTitle eyebrow={eyebrow} title={title} text={text} />
      <Btn href={action.url} size="lg" arrow className="w-fit">
        {action.label}
      </Btn>
    </AuthLayout>
  );
}
