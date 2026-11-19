import { Head, Link } from "@inertiajs/react";
import { ArrowLeft } from "lucide-react";
import DjangoForm from "../../components/DjangoForm";
import { adminLayout } from "../../layouts/AppShell";
import { Avatar, Card } from "../../lib/ui";

export default function UserForm({ form, account }) {
  return (
    <>
      <Head title={`Modifier ${account.username}`} />
      <Link href={account.detail_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> {account.name}
      </Link>
      <Card className="max-w-3xl p-6 sm:p-9">
        <div className="mb-8 flex items-center gap-4">
          <Avatar initials={account.name.slice(0, 2).toUpperCase()} className="size-16 font-serif text-2xl" />
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-green uppercase">Gestion</p>
            <h1 className="font-serif text-4xl leading-tight font-medium">Modifier @{account.username}</h1>
          </div>
        </div>
        <DjangoForm
          form={form}
          columns={2}
          wide={["email", "is_active", "is_staff"]}
          cancelHref={account.detail_url}
          labels={{ is_active: "Compte actif", is_staff: "Accès à l'administration" }}
        />
      </Card>
    </>
  );
}

UserForm.layout = adminLayout;
