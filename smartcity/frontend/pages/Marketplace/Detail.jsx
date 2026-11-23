import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { motion } from "motion/react";
import { ArrowLeft, CheckCircle2, Clock3, Edit3, Package, Phone, ShoppingBasket, Tag, Trash2, Undo2, User } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, MARKET_ICONS, STATUS_TONE, cn, fmtDate, fmtRelative } from "../../lib/ui";

export default function MarketplaceDetail({ product: p, can_edit, can_delete, can_contact, edit_url, delete_url, mark_sold_url, list_url }) {
  const { auth } = usePage().props;
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const Icon = MARKET_ICONS[p.category] || ShoppingBasket;
  const sold = p.status === "vendu";
  const retired = p.status === "retire";

  function doDelete() {
    router.post(delete_url, {}, { onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  }
  function toggleSold() {
    router.post(mark_sold_url, {}, { preserveScroll: true, onStart: () => setBusy(true), onFinish: () => setBusy(false) });
  }

  return (
    <>
      <Head title={p.title} />
      <Link href={list_url} className="mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted hover:bg-mint hover:text-ink">
        <ArrowLeft className="size-4" /> Marché local
      </Link>

      <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Colonne principale */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <motion.header initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[p.status]} dot>{p.status_label}</Badge>
              <Badge tone="muted">{p.category_label}</Badge>
              {p.mine && <Badge tone="lime">Mon annonce</Badge>}
              {retired && <Badge tone="coral">Retiré par l'administration</Badge>}
            </div>
            <h1 className="font-serif text-4xl leading-[1.05] font-medium tracking-tight sm:text-5xl">{p.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span className="flex items-center gap-1"><User className="size-4" />{p.author}</span>
              <span className="flex items-center gap-1"><Clock3 className="size-4" />{fmtRelative(p.date)}</span>
            </div>
          </motion.header>

          {/* Image */}
          {p.image && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="overflow-hidden rounded-[1.75rem] border border-line">
              <img src={p.image} alt="" className="w-full object-cover" style={{ maxHeight: 420 }} />
            </motion.div>
          )}

          {/* Description */}
          <Card className="p-6 sm:p-8">
            <h2 className="mb-4 font-serif text-2xl font-medium">Description</h2>
            <p className="whitespace-pre-line leading-relaxed text-muted">{p.description || "Aucune description."}</p>
          </Card>

          {/* Motif retrait */}
          {retired && p.reason && (
            <div className="rounded-2xl border border-coral/30 bg-coral/10 p-5">
              <p className="text-sm font-semibold text-[#b4532f]">Motif du retrait</p>
              <p className="mt-1 text-sm text-[#b4532f]/80">{p.reason}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-8">
          {/* Prix */}
          <Card className="grain relative overflow-hidden bg-deep p-6 text-paper">
            <div aria-hidden="true" className="absolute -top-16 -right-16 size-48 rounded-full bg-green/40 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold tracking-[0.14em] text-paper/50 uppercase">Prix</p>
              <p className="mt-2 font-serif text-5xl font-medium text-lime">{Number(p.price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-2xl">DT</span></p>
              {sold && <p className="mt-2 text-sm text-paper/60">Ce produit a été vendu.</p>}
              {retired && <p className="mt-2 text-sm text-paper/60">Cette annonce a été retirée.</p>}
            </div>
          </Card>

          {/* Infos pratiques */}
          <Card className="p-6">
            <h3 className="mb-4 font-serif text-xl font-medium">Infos pratiques</h3>
            <dl className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-3">
                <Tag className="mt-0.5 size-4 shrink-0 text-green" />
                <div><dt className="text-xs text-muted">Catégorie</dt><dd className="font-medium">{p.category_label}</dd></div>
              </div>
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 size-4 shrink-0 text-green" />
                <div><dt className="text-xs text-muted">Statut</dt><dd className="font-medium">{p.status_label}</dd></div>
              </div>
              <div className="flex items-start gap-3">
                <User className="mt-0.5 size-4 shrink-0 text-green" />
                <div><dt className="text-xs text-muted">Vendeur</dt><dd className="font-medium">{p.author}</dd></div>
              </div>
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-green" />
                <div><dt className="text-xs text-muted">Publié le</dt><dd className="font-medium">{fmtDate(p.date)}</dd></div>
              </div>
              {p.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-green" />
                  <div><dt className="text-xs text-muted">Téléphone</dt><dd className="font-medium">{p.phone}</dd></div>
                </div>
              )}
            </dl>
          </Card>

          {/* Contact */}
          {can_contact && p.phone && (
            <Btn href={`tel:${p.phone}`} external icon={Phone} size="lg" className="w-full">
              Appeler le vendeur
            </Btn>
          )}

          {/* Actions vendeur */}
          {p.mine && !retired && (
            <div className="flex flex-col gap-2">
              <Btn onClick={toggleSold} icon={sold ? Undo2 : CheckCircle2} variant={sold ? "ghost" : "lime"} size="lg" disabled={busy} className="w-full">
                {sold ? "Remettre en vente" : "Marquer comme vendu"}
              </Btn>
              {can_edit && <Btn href={edit_url} icon={Edit3} variant="ghost" size="lg" className="w-full">Modifier</Btn>}
              {can_delete && !confirmDel && (
                <Btn onClick={() => setConfirmDel(true)} icon={Trash2} variant="danger" size="lg" className="w-full">Supprimer</Btn>
              )}
              {confirmDel && (
                <div className="flex gap-2">
                  <Btn onClick={doDelete} variant="danger" disabled={busy} className="flex-1">Confirmer</Btn>
                  <Btn onClick={() => setConfirmDel(false)} variant="ghost" className="flex-1">Annuler</Btn>
                </div>
              )}
            </div>
          )}

          {/* Admin delete */}
          {!p.mine && can_delete && (
            <div>
              {!confirmDel ? (
                <Btn onClick={() => setConfirmDel(true)} icon={Trash2} variant="danger" size="lg" className="w-full">Supprimer (admin)</Btn>
              ) : (
                <div className="flex gap-2">
                  <Btn onClick={doDelete} variant="danger" disabled={busy} className="flex-1">Confirmer</Btn>
                  <Btn onClick={() => setConfirmDel(false)} variant="ghost" className="flex-1">Annuler</Btn>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

MarketplaceDetail.layout = appLayout;
