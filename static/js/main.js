document.addEventListener("DOMContentLoaded", () => {
  const menu = document.querySelector(".menu");
  const mobileNav = document.querySelector(".mobile-nav");

  if (menu && mobileNav) {
    menu.addEventListener("click", () => {
      const isOpen = mobileNav.classList.toggle("open");
      menu.setAttribute("aria-expanded", String(isOpen));
    });

    mobileNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        mobileNav.classList.remove("open");
        menu.setAttribute("aria-expanded", "false");
      });
    });
  }

  const toast = document.querySelector("[data-toast]");
  if (toast) {
    const closeToast = toast.querySelector("[data-toast-close]");
    let toastTimer = null;

    const hideToast = () => {
      if (toastTimer) {
        window.clearTimeout(toastTimer);
        toastTimer = null;
      }
      toast.classList.remove("is-visible");
      window.setTimeout(() => toast.remove(), 220);
    };

    window.requestAnimationFrame(() => toast.classList.add("is-visible"));
    toastTimer = window.setTimeout(hideToast, 3000);
    closeToast.addEventListener("click", hideToast);
  }

  const profileModal = document.querySelector("#profile-modal");
  const profileOpen = document.querySelector("[data-profile-open]");

  if (!profileModal || !profileOpen) {
    return;
  }

  const dialog = profileModal.querySelector(".profile-modal-dialog");
  const closeButtons = profileModal.querySelectorAll("[data-profile-close]");
  const form = profileModal.querySelector("[data-profile-form]");
  const submit = profileModal.querySelector("[data-profile-submit]");
  let lastFocusedElement = null;
  let isSaving = false;

  const focusableSelector = [
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "a[href]",
  ].join(",");

  const openProfileModal = () => {
    lastFocusedElement = document.activeElement;
    profileModal.hidden = false;
    document.body.classList.add("profile-modal-open");
    profileModal.querySelector(".profile-modal-close").focus();
  };

  const closeProfileModal = () => {
    if (isSaving) {
      return;
    }
    profileModal.hidden = true;
    document.body.classList.remove("profile-modal-open");
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  };

  profileOpen.addEventListener("click", openProfileModal);
  closeButtons.forEach((button) => button.addEventListener("click", closeProfileModal));

  document.addEventListener("keydown", (event) => {
    if (profileModal.hidden) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeProfileModal();
      return;
    }
    if (event.key !== "Tab") {
      return;
    }
    const focusable = [...dialog.querySelectorAll(focusableSelector)];
    if (!focusable.length) {
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  form.addEventListener("submit", () => {
    isSaving = true;
    submit.disabled = true;
    submit.setAttribute("aria-busy", "true");
    submit.querySelector("span").textContent = "…";
  });

  if (form.querySelector(".errorlist")) {
    openProfileModal();
  }
});
