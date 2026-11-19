// Mon panier : section "Mon compte" – articles ajoutés, passer commande, historique.
import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle, Package, ShoppingBasket, ShoppingCart, Trash2, X } from "lucide-react";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, STATUS_TONE, cn, fmtDateTime } from "../../lib/ui";

function CartItem({ item, onRemove, busy }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, scale: 0.96 }}
      className="flex items-start gap-4 border-b border-line/60 py-4 last:border-0"
    >
      {/* Image */}
      <div className="size-20 shrink-0 overflow-hidden rounded-2xl bg-mint">
        {item.image ? (
          <img src={item.image} alt={item.title} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-items-center text-green">
            <Package className="size-8 opacity-40" strokeWidth={1.4} />
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="min-w-0 flex-1">
        <h3 className="font-serif text-lg font-medium leading-tight">{item.title}</h3>
        <p className="mt-0.5 text-sm text-muted">
          {item.formatted_quantity} {item.unit} ×{" "}
          {Number(item.price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
        </p>
        <p className="mt-1 text-sm font-semibold text-green">
          Sous-total : {Number(item.subtotal).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
        </p>
        <p className="mt-0.5 text-xs text-muted">Vendeur : {item.seller}</p>
      </div>

      {/* Supprimer */}
      <button
        type="button"
        disabled={busy}
        onClick={() => onRemove(item)}
        className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-coral/10 hover:text-[#b4532f] disabled:opacity-50"
        aria-label={`Retirer ${item.title} du panier`}
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}

function ConfirmClear({ onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-deep/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        className="relative w-full max-w-sm overflow-hidden rounded-t-[2rem] bg-cream p-7 shadow-2xl sm:rounded-[2rem]"
      >
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-coral/10 text-[#b4532f]">
          <Trash2 className="size-7" />
        </div>
        <h2 className="font-serif text-2xl font-medium">Vider le panier ?</h2>
        <p className="mt-2 text-sm text-muted">Tous vos articles seront retirés définitivement.</p>
        <div className="mt-7 flex gap-3">
          <Btn variant="ghost" className="flex-1" onClick={onCancel}>Annuler</Btn>
          <Btn variant="danger" className="flex-1" onClick={onConfirm} disabled={busy}>
            {busy ? "Vidage…" : "Vider le panier"}
          </Btn>
        </div>
      </motion.div>
    </div>
  );
}

function ConfirmOrder({ total, onConfirm, onCancel, busy }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-end sm:place-items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-deep/60 backdrop-blur-sm" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.97 }}
        className="relative w-full max-w-sm overflow-hidden rounded-t-[2rem] bg-cream p-7 shadow-2xl sm:rounded-[2rem]"
      >
        <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-mint text-green">
          <CheckCircle className="size-7" />
        </div>
        <h2 className="font-serif text-2xl font-medium">Confirmer la commande ?</h2>
        <p className="mt-2 text-sm text-muted">
          Vous allez passer une commande de{" "}
          <strong>{Number(total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT</strong>.
        </p>
        <div className="mt-7 flex gap-3">
          <Btn variant="ghost" className="flex-1" onClick={onCancel}>Annuler</Btn>
          <Btn variant="primary" className="flex-1" onClick={onConfirm} disabled={busy}>
            {busy ? "Commande en cours…" : "Passer la commande"}
          </Btn>
        </div>
      </motion.div>
    </div>
  );
}

function OrderHistoryCard({ order }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden p-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-start justify-between gap-3 text-left"
      >
        <div>
          <p className="font-semibold">Commande #{order.id}</p>
          <p className="mt-0.5 text-sm text-muted">{fmtDateTime(order.date)}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge tone={STATUS_TONE[order.status] || "muted"} dot>{order.status_label}</Badge>
          <span className="font-bold text-green">
            {Number(order.total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
          </span>
        </div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-4 border-t border-line pt-4">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                  <span className="text-muted">{it.title}</span>
                  <span>
                    {it.quantity} {it.unit} × {Number(it.price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
                    {" = "}
                    <strong>{Number(it.subtotal).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT</strong>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export default function Panier({ items, total, item_count, orders, clear_url, order_url, market_url }) {
  const [removingId, setRemovingId] = useState(null);
  const [showClear, setShowClear] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleRemove = (item) => {
    setRemovingId(item.id);
    router.post(item.remove_url, {}, {
      onFinish: () => setRemovingId(null),
    });
  };

  const handleClear = () => {
    setBusy(true);
    router.post(clear_url, {}, {
      onFinish: () => { setBusy(false); setShowClear(false); },
    });
  };

  const handleOrder = () => {
    setBusy(true);
    router.post(order_url, {}, {
      onFinish: () => { setBusy(false); setShowOrder(false); },
    });
  };

  return (
    <>
      <Head title="Mon panier" />

      <PageHeader
        eyebrow="Mon compte"
        title="Mon panier"
        subtitle="Les produits que vous souhaitez commander auprès de nos vendeurs locaux."
        icon={ShoppingCart}
      >
        <Btn href={market_url} variant="ghost" icon={ShoppingBasket} size="lg">
          Continuer mes achats
        </Btn>
      </PageHeader>

      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Votre panier est vide"
          text="Parcourez le marché local et ajoutez des produits à votre panier."
        >
          <Btn href={market_url} icon={ShoppingBasket}>Explorer le marché</Btn>
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
          {/* Liste des articles */}
          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-2xl">
                {item_count} article{item_count > 1 ? "s" : ""}
              </h2>
              <Btn variant="danger" size="sm" icon={Trash2} onClick={() => setShowClear(true)}>
                Vider le panier
              </Btn>
            </div>
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onRemove={handleRemove}
                  busy={removingId === item.id}
                />
              ))}
            </AnimatePresence>
          </Card>

          {/* Récapitulatif */}
          <div className="flex flex-col gap-4 lg:sticky lg:top-8">
            <Card className="p-6">
              <h2 className="font-serif text-2xl">Récapitulatif</h2>
              <div className="mt-5 flex flex-col gap-2 text-sm">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between gap-2">
                    <span className="text-muted truncate">{it.title}</span>
                    <span className="shrink-0 font-medium">
                      {Number(it.subtotal).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-xl text-green">
                  {Number(total).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
                </span>
              </div>
              <Btn
                className="mt-5 w-full justify-center"
                size="lg"
                icon={CheckCircle}
                onClick={() => setShowOrder(true)}
              >
                Passer la commande
              </Btn>
            </Card>
          </div>
        </div>
      )}

      {/* Historique des commandes */}
      {orders.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-5 font-serif text-3xl font-medium">Mes commandes</h2>
          <div className="flex flex-col gap-3">
            {orders.map((o) => (
              <OrderHistoryCard key={o.id} order={o} />
            ))}
          </div>
        </section>
      )}

      {/* Modales */}
      <AnimatePresence>
        {showClear && (
          <ConfirmClear onConfirm={handleClear} onCancel={() => setShowClear(false)} busy={busy} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showOrder && (
          <ConfirmOrder total={total} onConfirm={handleOrder} onCancel={() => setShowOrder(false)} busy={busy} />
        )}
      </AnimatePresence>
    </>
  );
}

Panier.layout = appLayout;
