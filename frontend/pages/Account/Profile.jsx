import { useEffect, useState } from "react";
import { Head, usePage } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { AtSign, Cake, CalendarDays, Check, Home, KeyRound, Mail, MapPin, Pencil, Phone, ShieldCheck, UserRound, X } from "lucide-react";
import DjangoForm, { formHasErrors } from "../../components/DjangoForm";
import { appLayout } from "../../layouts/AppShell";
import { Avatar, Badge, Btn, Card, ease, fmtDate } from "../../lib/ui";

function Info({ icon: Icon, label, value, empty = "Non renseigné" }) {
  return (
    <div className="rounded-2xl bg-pale p-4">
      <dt className="flex items-center gap-2 text-xs font-medium text-muted">
        <Icon className="size-3.5" /> {label}
      </dt>
      <dd className={`mt-1.5 font-medium break-words ${value ? "" : "text-muted/70 italic"}`}>{value || empty}</dd>
    </div>
  );
}

export default function Profile({ account, form }) {
  const { auth, urls } = usePage().props;
  // Si Django renvoie des erreurs, la fenêtre de modification reste ouverte.
  const [editing, setEditing] = useState(() => formHasErrors(form));
  const fullName = [account.first_name, account.last_name].filter(Boolean).join(" ") || account.username;

  useEffect(() => {
    if (!editing) return;
    const onKey = (e) => e.key === "Escape" && setEditing(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [editing]);

  return (
    <>
      <Head title="Mon profil" />

      <section className="grain relative mb-6 overflow-hidden rounded-[2rem] bg-deep p-7 text-paper sm:p-10">
        <div aria-hidden="true" className="absolute -top-24 -right-16 size-80 animate-blob rounded-full bg-green/50 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-6">
          <Avatar initials={auth.user.initials} className="size-24 font-serif text-4xl" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.14em] text-lime uppercase">Mon espace</p>
            <h1 className="mt-1 font-serif text-4xl leading-tight font-medium sm:text-5xl">{fullName}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-paper/65">
              <Badge tone="lime" className="bg-lime text-deep">
                {account.is_staff ? <ShieldCheck className="size-3" /> : <Check className="size-3" />}
                {account.is_staff ? "Administrateur" : "Compte citoyen"}
              </Badge>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" /> Membre depuis le {fmtDate(account.date_joined)}
              </span>
            </div>
          </div>
          <Btn variant="lime" size="lg" icon={Pencil} onClick={() => setEditing(true)} aria-haspopup="dialog">
            Modifier mon profil
          </Btn>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6 sm:p-8">
          <h2 className="font-serif text-2xl">Informations personnelles</h2>
          <p className="mt-1 text-sm text-muted">Les informations associées à votre compte.</p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-2">
            <Info icon={UserRound} label="Prénom" value={account.first_name} />
            <Info icon={UserRound} label="Nom" value={account.last_name} />
            <Info icon={Mail} label="Adresse électronique" value={account.email} empty="Non renseignée" />
            <Info icon={Phone} label="Téléphone" value={account.phone_number} />
            <Info icon={Cake} label="Date de naissance" value={account.date_of_birth && fmtDate(account.date_of_birth)} empty="Non renseignée" />
            <Info icon={MapPin} label="Ville / Commune" value={account.city} empty="Non renseignée" />
            <div className="sm:col-span-2">
              <Info icon={Home} label="Adresse complète" value={account.address} empty="Non renseignée" />
            </div>
          </dl>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-6 sm:p-8">
            <h2 className="font-serif text-2xl">Compte</h2>
            <dl className="mt-5 flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted">
                  <AtSign className="size-4" /> Nom d'utilisateur
                </dt>
                <dd className="font-semibold">{account.username}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted">
                  <CalendarDays className="size-4" /> Inscription
                </dt>
                <dd className="font-semibold">{fmtDate(account.date_joined)}</dd>
              </div>
            </dl>
          </Card>
          <Card className="p-6 sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl bg-mint text-green">
              <KeyRound className="size-5" />
            </span>
            <h2 className="mt-4 font-serif text-2xl">Sécurité</h2>
            <p className="mt-1 mb-5 text-sm text-muted">Changez régulièrement votre mot de passe pour protéger votre compte.</p>
            <Btn href={urls.password_change} variant="ghost" arrow>
              Modifier le mot de passe
            </Btn>
          </Card>
        </div>
      </div>

      {/* Fenêtre de modification */}
      <AnimatePresence>
        {editing && (
          <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="edit-title">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditing(false)} className="absolute inset-0 bg-deep/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              transition={{ duration: 0.35, ease }}
              className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-cream p-6 shadow-2xl sm:rounded-[2rem] sm:p-9"
            >
              <div className="mb-7 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-deep text-lime">
                    <Pencil className="size-5" />
                  </span>
                  <div>
                    <h2 id="edit-title" className="font-serif text-3xl leading-tight">Modifier mon profil</h2>
                    <p className="text-sm text-muted">Mettez à jour vos informations personnelles.</p>
                  </div>
                </div>
                <button type="button" aria-label="Fermer la fenêtre" onClick={() => setEditing(false)} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-ink/5 hover:bg-ink/10">
                  <X className="size-4" />
                </button>
              </div>
              <DjangoForm form={form} columns={2} wide={["email", "address"]} submitLabel="Enregistrer les modifications" onCancel={() => setEditing(false)} onSuccess={() => setEditing(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

Profile.layout = appLayout;
