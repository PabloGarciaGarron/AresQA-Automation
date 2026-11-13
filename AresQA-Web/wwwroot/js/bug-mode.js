(() => {
  "use strict";
  // Keep the revision of the rendered page: a fresh CSRF token must not let an
  // old tab write into the database selected after that page was opened.
  const revision = document.body.dataset.aresModeRevision;
  const enabled = document.body.dataset.aresBugsEnabled === "true";
  const originalFetch = window.fetch.bind(window);
  const toggle = document.getElementById("bug-mode-toggle");
  const message = document.getElementById("bug-mode-message");
  const returnToLogin = () => location.replace("/Login?modo=cambiado");

  window.fetch = async (input, init = {}) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request ? request.url : String(input), location.href);
    const method = (init.method || request?.method || "GET").toUpperCase();
    const localApi = url.origin === location.origin &&
      (url.pathname === "/api" || url.pathname.startsWith("/api/"));
    if (localApi && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      const headers = new Headers(init.headers || request?.headers);
      headers.set("X-Ares-Mode-Revision", revision);
      init = { ...init, headers };
    }
    const response = await originalFetch(input, init);
    if (localApi && response.status === 409) {
      const error = await response.clone().json().catch(() => ({}));
      if (error.code === "mode_changed") returnToLogin();
    }
    return response;
  };

  function addFormRevision(form) {
    if (form.method.toUpperCase() !== "POST" ||
        new URL(form.action, location.href).origin !== location.origin) return;
    let field = form.querySelector('input[name="__AresModeRevision"]');
    if (!field) {
      field = document.createElement("input");
      field.type = "hidden";
      field.name = "__AresModeRevision";
      form.append(field);
    }
    field.value = revision;
  }
  document.querySelectorAll("form").forEach(addFormRevision);
  document.addEventListener("submit", event => {
    if (event.target instanceof HTMLFormElement) addFormRevision(event.target);
  }, true);

  toggle?.addEventListener("click", async () => {
    toggle.disabled = true;
    message.textContent = "Cambiando modo…";
    try {
      const tokenResponse = await fetch("/api/auth/csrf", { cache: "no-store" });
      if (!tokenResponse.ok) throw new Error("No se pudo preparar el cambio de modo.");
      const csrf = await tokenResponse.json();
      const response = await fetch("/api/laboratorio/modo", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf.token },
        body: JSON.stringify({ enabled: !enabled, revision })
      });
      if (response.status === 401) { returnToLogin(); return; }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (result.code === "mode_changed") return;
        throw new Error(result.message || "No se pudo cambiar el modo. Intenta nuevamente.");
      }
      returnToLogin();
    } catch (error) {
      message.textContent = error.message || "No se pudo conectar con el servidor.";
      message.classList.add("error");
      toggle.disabled = false;
    }
  });

  // Browser history can restore the complete old page without a server request.
  window.addEventListener("pageshow", async event => {
    if (!event.persisted) return;
    try {
      const response = await fetch("/api/laboratorio/modo", { cache: "no-store" });
      if (!response.ok) return;
      const current = await response.json();
      if (current.revision !== revision) returnToLogin();
    } catch {
      // Writes remain protected by their original revision on the server.
    }
  });
})();
