// Affiche et envoie n'importe quel formulaire Django (voir core/inertia_utils.py).
// Django reste responsable de la validation : en cas d'erreur, il renvoie la
// même page avec les messages, et on les affiche sous les champs.
import { useEffect, useRef, useState } from "react";
import { router, usePage } from "@inertiajs/react";
import { AlertCircle, Eye, EyeOff, ImagePlus, Loader2, Minus, Plus, X } from "lucide-react";
import { Btn, cn } from "../lib/ui";

const INPUT =
  "w-full rounded-2xl border border-line bg-paper px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-muted/60 focus:border-green focus:ring-4 focus:ring-green/10";

export const formHasErrors = (form) => !!form && (form.errors.length > 0 || form.fields.some((f) => f.errors.length > 0));

function ImageInput({ field, file, onChange }) {
  const input = useRef(null);
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <input ref={input} id={`f-${field.name}`} type="file" accept={field.image ? "image/*" : undefined} className="sr-only" onChange={(e) => onChange(e.target.files[0] || null)} />
      {file ? (
        <div className="relative overflow-hidden rounded-2xl border border-line bg-pale">
          {preview && field.image ? <img src={preview} alt="" className="max-h-64 w-full object-cover" /> : <p className="p-4 text-sm">{file.name}</p>}
          <button
            type="button"
            aria-label="Retirer le fichier"
            onClick={() => (onChange(null), (input.current.value = ""))}
            className="absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full bg-deep/80 text-paper backdrop-blur hover:bg-deep"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current.click()}
          className="flex w-full cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-pale/60 px-4 py-8 text-center transition hover:border-green hover:bg-mint/40"
        >
          <span className="grid size-11 place-items-center rounded-full bg-paper text-green shadow-sm">
            <ImagePlus className="size-5" />
          </span>
          <span className="text-sm font-medium">{field.image ? "Ajouter une photo" : "Choisir un fichier"}</span>
          <span className="text-xs text-muted">{field.required ? "Obligatoire" : "Facultatif"}</span>
        </button>
      )}
    </div>
  );
}

function Control({ field, value, set }) {
  const [show, setShow] = useState(false);
  const id = `f-${field.name}`;
  const invalid = field.errors.length > 0;
  const cls = cn(INPUT, invalid && "border-coral focus:border-coral focus:ring-coral/15");

  switch (field.type) {
    case "textarea":
      return <textarea id={id} rows={4} className={cn(cls, "resize-y")} value={value} required={field.required} onChange={(e) => set(e.target.value)} {...field.attrs} />;

    case "select": {
      const choices = field.choices.filter((c) => c.value !== "");
      // Peu de choix : des boutons, plus rapides qu'une liste déroulante.
      if (choices.length <= 5)
        return (
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`l-${field.name}`}>
            {choices.map((c) => {
              const on = value === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => set(on && !field.required ? "" : c.value)}
                  className={cn(
                    "cursor-pointer rounded-full border px-4 py-2.5 text-sm font-medium transition",
                    on ? "border-green bg-green text-paper" : "border-line bg-paper hover:border-green/50",
                    invalid && !on && "border-coral/60",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        );
      return (
        <select id={id} className={cls} value={value} required={field.required} onChange={(e) => set(e.target.value)}>
          <option value="">Choisir…</option>
          {choices.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      );
    }

    case "checkbox":
      return (
        <button
          type="button"
          role="switch"
          aria-checked={!!value}
          aria-labelledby={`l-${field.name}`}
          onClick={() => set(!value)}
          className={cn("relative h-7 w-12 cursor-pointer rounded-full transition", value ? "bg-green" : "bg-line")}
        >
          <i className={cn("absolute top-1 left-1 size-5 rounded-full bg-paper shadow transition-transform", value && "translate-x-5")} />
        </button>
      );

    case "file":
      return <ImageInput field={field} file={value || null} onChange={set} />;

    case "password":
      return (
        <div className="relative">
          <input id={id} type={show ? "text" : "password"} className={cn(cls, "pr-12")} value={value} required={field.required} onChange={(e) => set(e.target.value)} {...field.attrs} />
          <button type="button" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"} onClick={() => setShow((v) => !v)} className="absolute top-1/2 right-3 grid size-8 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted hover:bg-mint hover:text-ink">
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      );

    case "number": {
      // Nombre entier : boutons − / + pour aller plus vite.
      if (!field.attrs.step) {
        const n = Number(value) || 0;
        const min = field.attrs.min != null ? Number(field.attrs.min) : 0;
        return (
          <div className="flex w-fit items-center gap-1 rounded-2xl border border-line bg-paper p-1">
            <button type="button" aria-label="Diminuer" onClick={() => set(String(Math.max(min, n - 1)))} className="grid size-10 cursor-pointer place-items-center rounded-xl hover:bg-mint">
              <Minus className="size-4" />
            </button>
            <input id={id} type="number" inputMode="numeric" className="w-16 bg-transparent text-center text-lg font-semibold outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" value={value} required={field.required} onChange={(e) => set(e.target.value)} {...field.attrs} />
            <button type="button" aria-label="Augmenter" onClick={() => set(String(n + 1))} className="grid size-10 cursor-pointer place-items-center rounded-xl hover:bg-mint">
              <Plus className="size-4" />
            </button>
          </div>
        );
      }
      return <input id={id} type="number" inputMode="decimal" className={cls} value={value} required={field.required} onChange={(e) => set(e.target.value)} {...field.attrs} />;
    }

    default:
      return <input id={id} type={field.type} className={cls} value={value} required={field.required} onChange={(e) => set(e.target.value)} {...field.attrs} />;
  }
}

const WIDE = new Set(["textarea", "file"]);

export default function DjangoForm({ form, action, submitLabel = "Enregistrer", cancelHref, onCancel, onSuccess, columns = 1, wide = [], labels = {}, placeholders = {}, footer }) {
  const page = usePage();
  const [values, setValues] = useState(() => Object.fromEntries(form.fields.map((f) => [f.name, f.type === "file" ? null : f.value])));
  const [busy, setBusy] = useState(false);
  // Champs modifiés depuis la dernière réponse de Django : on masque leur ancien message d'erreur.
  const [edited, setEdited] = useState({});
  useEffect(() => setEdited({}), [form]);
  const set = (name) => (v) => {
    setValues((all) => ({ ...all, [name]: v }));
    setEdited((all) => (all[name] ? all : { ...all, [name]: true }));
  };

  function submit(e) {
    e.preventDefault();
    const data = {};
    for (const f of form.fields) {
      const v = values[f.name];
      if (f.type === "checkbox") {
        if (v) data[f.name] = "on"; // Django : case cochée = champ présent
      } else if (f.type === "file") {
        if (v) data[f.name] = v;
      } else data[f.name] = v ?? "";
    }
    router.post(action || page.url, data, {
      forceFormData: true,
      preserveScroll: true,
      preserveState: true,
      onStart: () => setBusy(true),
      onFinish: () => setBusy(false),
      onSuccess: (p) => !formHasErrors(p.props.form) && onSuccess?.(),
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      {form.errors.length > 0 && (
        <div role="alert" className="flex items-start gap-3 rounded-2xl border border-coral/40 bg-coral/10 p-4 text-sm text-[#8f3f20]">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <div>{form.errors.map((err) => <p key={err}>{err}</p>)}</div>
        </div>
      )}

      <div className={cn("grid gap-x-5 gap-y-5", columns === 2 && "sm:grid-cols-2")}>
        {form.fields.map((raw) => {
          const f = edited[raw.name] ? { ...raw, errors: [] } : raw;
          const inline = f.type === "checkbox";
          // Django écrit « maxlength », React attend « maxLength ».
          const { maxlength, autocomplete, ...attrs } = f.attrs;
          if (maxlength != null) attrs.maxLength = maxlength;
          if (autocomplete != null) attrs.autoComplete = autocomplete;
          if (placeholders[f.name]) attrs.placeholder = placeholders[f.name];
          const field = { ...f, attrs };
          return (
            <div key={f.name} className={cn(columns === 2 && (WIDE.has(f.type) || wide.includes(f.name)) && "sm:col-span-2", inline && "flex items-center justify-between gap-4 rounded-2xl border border-line bg-paper px-4 py-3")}>
              <label id={`l-${f.name}`} htmlFor={`f-${f.name}`} className={cn("block text-sm font-semibold", !inline && "mb-2")}>
                {labels[f.name] || f.label}
                {f.required && !inline && <span className="ml-1 text-coral">*</span>}
                {inline && f.help && <span className="mt-0.5 block text-xs font-normal text-muted">{f.help}</span>}
              </label>
              <Control field={field} value={values[f.name]} set={set(f.name)} />
              {!inline && f.help && !f.errors.length && <p className="mt-2 text-xs leading-relaxed text-muted">{f.help}</p>}
              {f.errors.map((err) => (
                <p key={err} role="alert" className="mt-2 flex items-start gap-1.5 text-[13px] font-medium text-[#b4532f]">
                  <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> {err}
                </p>
              ))}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {footer}
        {(cancelHref || onCancel) && (
          <Btn variant="ghost" href={cancelHref} onClick={onCancel}>
            Annuler
          </Btn>
        )}
        <Btn type="submit" disabled={busy} arrow={!busy} className={!cancelHref && !onCancel && !footer ? "w-full" : ""} size="lg">
          {busy && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Btn>
      </div>
    </form>
  );
}
