import { useState } from "react";
import { Head, Link, router, usePage } from "@inertiajs/react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, CheckCircle2, Clock3, Edit3, Minus, Package, Phone, Plus, ShoppingCart, Tag, Trash2, Undo2, User, X } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, STATUS_TONE, fmtDate, fmtRelative } from "../../lib/ui";

function unitLabel(label, qty = 1) {
  if (!label || label === "Kg") return label || "";
  return qty > 1 ? `${label}s` : label;
}

function AddToCartModal({ product: p, inCartQty, addToCartUrl, panierUrl, onClose }) {
  const maxAddable = Math.max(0, p.quantite - inCartQty);
  const [qte, setQte] = useState(maxAddable > 0 ? "1" : "0");
  const [busy, setBusy] = useState(false);

  const numericQte = Math.max(1, Math.min(maxAddable, parseInt(qte || "1", 10) || 1));

  function decrement() {
    setQte(String(Math.max(1, numericQte - 1)));
  }

  function increment() {
    setQte(String(Math.min(maxAddable, numericQte + 1)));
  }

  function handleQteInput(val) {
    const cleaned = val.replace(/[^0-9]/g, "");
    if (!cleaned) {
      setQte("");
      return;
    }
    const parsed = parseInt(cleaned, 10);
    setQte(String(Math.min(maxAddable, Math.max(1, parsed))));
  }

  function submit() {
    if (maxAddable <= 0) return;
    router.post(
      addToCartUrl,
      { quantite: String(numericQte) },
      {
        forceFormData: true,
        preserveScroll: true,
        onStart: () => setBusy(true),
        onFinish: () => {
          setBusy(false);
          onClose();
        },
      },
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep/60 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-sm rounded-[1.75rem] bg-paper p-7 shadow-2xl"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-green uppercase">Ajouter au panier</p>
            <h2 className="mt-1 font-serif text-2xl font-medium leading-tight">{p.title}</h2>
          </div>
          <button type="button" aria-label="Fermer" onClick={onClose} className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full bg-ink/5 hover:bg-ink/10">
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-5 rounded-2xl bg-pale/60 px-5 py-4">
          <p className="text-xs text-muted">Prix unitaire</p>
          <p className="font-serif text-3xl font-medium text-green">
            {Number(p.price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-lg">DT</span>{" "}
            <span className="text-sm font-normal text-muted">/ {p.unite_label}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Stock disponible : <span className="font-semibold text-ink">{p.quantite} {unitLabel(p.unite_label, p.quantite)}</span>
          </p>
          {inCartQty > 0 && (
            <p className="mt-1 text-xs font-medium text-green">
              Déjà dans votre panier : {inCartQty} {unitLabel(p.unite_label, inCartQty)}
            </p>
          )}
        </div>

        {maxAddable <= 0 ? (
          <div className="flex flex-col gap-3">
            <p className="rounded-2xl border border-line bg-pale px-4 py-3 text-center text-sm text-ink">
              Vous avez déjà ajouté toute la quantité disponible dans votre panier.
            </p>
            <Btn href={panierUrl} icon={ShoppingCart} size="lg" className="w-full">
              Voir mon panier
            </Btn>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="mb-3 text-sm font-semibold">Quantité souhaitée</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Réduire la quantité"
                  onClick={decrement}
                  disabled={numericQte <= 1}
                  className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-paper transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  aria-label="Quantité"
                  value={qte}
                  onChange={(e) => handleQteInput(e.target.value)}
                  onBlur={() => !qte && setQte("1")}
                  className="w-20 rounded-2xl border border-line bg-paper py-2 text-center font-serif text-2xl font-medium text-ink outline-none focus:border-green"
                />
                <button
                  type="button"
                  aria-label="Augmenter la quantité"
                  onClick={increment}
                  disabled={numericQte >= maxAddable}
                  className="grid size-11 cursor-pointer place-items-center rounded-full border border-line bg-paper transition hover:bg-mint disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
                <span className="text-sm text-muted">{unitLabel(p.unite_label, numericQte)}</span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between rounded-2xl bg-mint/60 px-4 py-2.5">
                <span className="text-sm text-muted">Sous-total estimé</span>
                <span className="font-semibold text-green">
                  {(numericQte * Number(p.price)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
                </span>
              </div>
              <Btn onClick={submit} icon={ShoppingCart} size="lg" disabled={busy || !qte} className="mt-1 w-full">
                Confirmer l'ajout
              </Btn>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export default function MarketplaceDetail({
  product: p,
  can_edit,
  can_delete,
  can_contact,
  can_add_to_cart,
  in_cart_qty = 0,
  add_to_cart_url,
  edit_url,
  delete_url,
  mark_sold_url,
  list_url,
}) {
  const { auth, urls } = usePage().props;
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showCart, setShowCart] = useState(false);

  const sold = p.status === "vendu";
  const retired = p.status === "retire";
  const outOfStock = p.status === "disponible" && p.en_rupture;

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
              {outOfStock ? (
                <Badge tone="coral" dot>Rupture de stock</Badge>
              ) : (
                <Badge tone={STATUS_TONE[p.status]} dot>{p.status_label}</Badge>
              )}
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
          <div className="grain relative overflow-hidden rounded-[1.75rem] bg-deep p-6 text-paper">
            <div aria-hidden="true" className="absolute -top-16 -right-16 size-48 rounded-full bg-green/40 blur-3xl" />
            <div className="relative">
              <p className="text-xs font-semibold tracking-[0.14em] text-paper/60 uppercase">Prix</p>
              <p className="mt-2 font-serif text-5xl font-medium text-lime">
                {Number(p.price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} <span className="text-2xl">DT</span>
                {p.unite_label && <span className="ml-1.5 text-lg font-normal text-paper/75">/ {p.unite_label}</span>}
              </p>
              {p.quantite != null && (
                <p className="mt-2 text-sm text-paper/75">
                  {outOfStock ? (
                    <span className="font-semibold text-coral">Rupture de stock</span>
                  ) : (
                    <span>Stock : <span className="font-semibold text-lime">{p.quantite}</span> {unitLabel(p.unite_label, p.quantite)}</span>
                  )}
                </p>
              )}
              {sold && <p className="mt-2 text-sm text-paper/70">Ce produit a été vendu.</p>}
              {retired && <p className="mt-2 text-sm text-paper/70">Cette annonce a été retirée.</p>}
            </div>
          </div>

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
                <div>
                  <dt className="text-xs text-muted">Statut</dt>
                  <dd className="font-medium">{outOfStock ? "Rupture de stock" : p.status_label}</dd>
                </div>
              </div>
              {p.quantite != null && (
                <div className="flex items-start gap-3">
                  <ShoppingCart className="mt-0.5 size-4 shrink-0 text-green" />
                  <div>
                    <dt className="text-xs text-muted">Quantité / Unité</dt>
                    <dd className="font-medium">
                      {outOfStock ? "Rupture de stock" : `${p.quantite} ${unitLabel(p.unite_label, p.quantite)}`}
                    </dd>
                  </div>
                </div>
              )}
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

          {/* Bouton Ajouter au panier */}
          {can_add_to_cart && (
            <Btn onClick={() => setShowCart(true)} variant="lime" icon={ShoppingCart} size="lg" className="w-full">
              {in_cart_qty > 0 ? `Ajouter au panier (${in_cart_qty} dans le panier)` : "Ajouter au panier"}
            </Btn>
          )}

          {/* Message rupture de stock */}
          {auth.user && !auth.user.is_staff && !p.mine && outOfStock && (
            <div className="rounded-2xl border border-coral/30 bg-coral/10 px-5 py-4 text-center">
              <p className="text-sm font-semibold text-[#b4532f]">Rupture de stock</p>
              <p className="mt-1 text-xs text-[#b4532f]/75">Ce produit n'est plus disponible pour le moment.</p>
            </div>
          )}

          {/* Contact vendeur */}
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

      {/* Modal Ajouter au panier */}
      <AnimatePresence>
        {showCart && (
          <AddToCartModal
            product={p}
            inCartQty={in_cart_qty}
            addToCartUrl={add_to_cart_url}
            panierUrl={urls.marketplace_panier}
            onClose={() => setShowCart(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

MarketplaceDetail.layout = appLayout;
