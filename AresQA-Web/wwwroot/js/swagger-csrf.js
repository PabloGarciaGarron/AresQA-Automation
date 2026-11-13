// Swagger uses the same local session. Refresh CSRF before each write.
(() => {
 const originalFetch = window.fetch.bind(window);
 window.fetch = async (input, init = {}) => {
   const url = typeof input === "string" ? input : input.url;
   const method = (init.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
   if (new URL(url, location.href).origin === location.origin && !["GET","HEAD","OPTIONS"].includes(method)) {
     const response = await originalFetch("/api/auth/csrf", { credentials: "same-origin" });
     const { token } = await response.json();
     const headers = new Headers(init.headers || (input instanceof Request ? input.headers : undefined));
     headers.set("X-CSRF-TOKEN", token); init = { ...init, headers };
   }
   return originalFetch(input, init);
 };
})();

