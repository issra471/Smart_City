import "./app.css";
import { createInertiaApp } from "@inertiajs/react";
import { createRoot } from "react-dom/client";

// Chaque vue Django `render(request, "Home", ...)` -> frontend/pages/Home.jsx
const pages = import.meta.glob("./pages/**/*.jsx");

createInertiaApp({
  title: (title) => (title ? `${title} · Smart City` : "Smart City"),
  resolve: async (name) => {
    const page = pages[`./pages/${name}.jsx`];
    if (!page) throw new Error(`Page React introuvable : frontend/pages/${name}.jsx`);
    try {
      return await page();
    } catch (err) {
      // Fichier d'une ancienne compilation disparu : on recharge la page une fois.
      const key = "reload-after-build";
      let first = true;
      try {
        first = !sessionStorage.getItem(key);
        sessionStorage.setItem(key, "1");
      } catch {}
      if (first) {
        window.location.reload();
        return new Promise(() => {});
      }
      throw err;
    }
  },
  setup({ el, App, props }) {
    try {
      sessionStorage.removeItem("reload-after-build");
    } catch {}
    createRoot(el).render(<App {...props} />);
  },
  // Même cookie / en-tête CSRF que Django
  http: { xsrfCookieName: "csrftoken", xsrfHeaderName: "X-CSRFToken" },
  progress: { color: "#087a5b" },
});
