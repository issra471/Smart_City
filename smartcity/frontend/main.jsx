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
    return page();
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
  // Même cookie / en-tête CSRF que Django
  http: { xsrfCookieName: "csrftoken", xsrfHeaderName: "X-CSRFToken" },
  progress: { color: "#087a5b" },
});
