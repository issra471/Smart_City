// Mes produits : section "Mon compte" – publier, modifier, supprimer ses propres produits.
import { useState } from "react";
import { Head, router } from "@inertiajs/react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Edit3, Package, Plus, ShoppingBasket, Trash2, X } from "lucide-react";
import DjangoForm from "../../components/DjangoForm";
import { appLayout } from "../../layouts/AppShell";
import { Badge, Btn, Card, EmptyState, PageHeader, cn, fmtRelative } from "../../lib/ui";

function ConfirmDelete({ product, onConfirm, onCancel, busy }) {
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
        <h2 className="font-serif text-2xl font-medium">Supprimer ce produit ?</h2>
        <p className="mt-2 text-sm text-muted">
          « <strong>{product.title}</strong> » sera définitivement retiré du marché.
        </p>
        <div className="mt-7 flex gap-3">
          <Btn variant="ghost" className="flex-1" onClick={onCancel}>Annuler</Btn>
          <Btn variant="danger" className="flex-1" onClick={onConfirm} disabled={busy}>
            {busy ? "Suppression…" : "Supprimer"}
          </Btn>
        </div>
      </motion.div>
    </div>
  );
}

function ProductCard({ product, onEdit, onDelete }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="group flex flex-col overflow-hidden rounded-[1.75rem] border border-line bg-paper transition-shadow hover:shadow-[0_18px_48px_#15362e14]"
    >
      <div className={cn("relative overflow-hidden bg-mint", product.image ? "aspect-[16/10]" : "aspect-[16/7]")}>
        {product.image ? (
          <img src={product.image} alt={product.title} className="size-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="grid size-full place-items-center bg-gradient-to-br from-mint to-lime/40 text-green">
            <Package className="size-14 opacity-40" strokeWidth={1.4} />
          </div>
        )}
        <div className="absolute right-3 bottom-3 rounded-full bg-deep px-3.5 py-1.5 text-sm font-bold text-lime shadow-lg">
          {Number(product.price).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} DT
        </div>
        {!product.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-deep/60">
            <span className="rounded-full bg-coral px-4 py-1.5 text-sm font-bold text-paper">Épuisé</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-serif text-xl leading-tight font-medium">{product.title}</h3>
        <p className="mt-1 text-sm font-medium text-green">
          {product.quantity} {product.unit_label}
        </p>
        {product.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{product.description}</p>
        )}
        <p className="mt-auto pt-4 text-xs text-muted">
          Publié {fmtRelative(product.created_at)}
        </p>
        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          <Btn
            variant="ghost"
            size="sm"
            icon={Edit3}
            onClick={() => onEdit(product)}
            className="flex-1"
          >
            Modifier
          </Btn>
          <Btn
            variant="danger"
            size="sm"
            icon={Trash2}
            onClick={() => onDelete(product)}
            className="flex-1"
          >
            Supprimer
          </Btn>
        </div>
      </div>
    </motion.div>
  );
}

export default function MesProduits({ products, create_url, form }) {
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = () => {
    if (!toDelete) return;
    setDeleting(true);
    router.post(toDelete.delete_url, {}, {
      onFinish: () => { setDeleting(false); setToDelete(null); },
    });
  };

  const handleEdit = (product) => {
    router.visit(product.edit_url);
  };

  const openCreate = () => setShowForm(true);

  return (
    <>
      <Head title="Mes produits" />

      <PageHeader
        eyebrow="Mon compte"
        title="Mes produits"
        subtitle="Gérez vos annonces sur le marché local."
        icon={Package}
      >
        <Btn icon={Plus} size="lg" onClick={openCreate}>
          Publier un produit
        </Btn>
        <Btn href="/marketplace/" variant="ghost" size="lg" icon={ShoppingBasket}>
          Voir le marché
        </Btn>
      </PageHeader>

      {products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aucun produit publié"
          text="Publiez votre premier produit local et rejoignez le marché de votre quartier."
        >
          <Btn icon={Plus} onClick={openCreate}>Publier mon premier produit</Btn>
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={handleEdit}
                onDelete={setToDelete}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal de création */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-[80] grid place-items-end sm:place-items-center sm:p-6" role="dialog" aria-modal="true">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-deep/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.97 }}
              className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-[2rem] bg-cream p-6 shadow-2xl sm:rounded-[2rem] sm:p-9"
            >
              <div className="mb-7 flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-deep text-lime">
                    <Package className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-serif text-3xl leading-tight">Publier un produit</h2>
                    <p className="text-sm text-muted">Proposez vos produits aux habitants de la ville.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-ink/5 hover:bg-ink/10">
                  <X className="size-4" />
                </button>
              </div>
              <DjangoForm
                form={form}
                action={create_url}
                columns={2}
                wide={["titre", "description"]}
                submitLabel="Publier le produit"
                onCancel={() => setShowForm(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de confirmation de suppression */}
      <AnimatePresence>
        {toDelete && (
          <ConfirmDelete
            product={toDelete}
            onConfirm={handleDelete}
            onCancel={() => setToDelete(null)}
            busy={deleting}
          />
        )}
      </AnimatePresence>
    </>
  );
}

MesProduits.layout = appLayout;
