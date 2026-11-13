window.Lab = {
 $: id => document.getElementById(id),
 async api(path, options = {}) {
   if (options.method && options.method !== "GET") {
     const tokenResponse = await fetch("/api/auth/csrf");
     if (!tokenResponse.ok) throw new Error("No se pudo preparar la operación.");
     const csrf = await tokenResponse.json();
     options.headers = { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf.token, ...options.headers };
   }
   const response = await fetch(path, options);
   if (response.status === 401) { location.href = "/Login"; throw new Error("La sesión terminó."); }
   if (!response.ok) {
     const body = await response.json().catch(() => ({}));
     throw new Error(body.message || (body.errors ? Object.values(body.errors).flat().join(" ") : response.status === 403 ? "No tienes permiso para esta acción." : "No se pudo completar la operación."));
   }
   return response.status === 204 ? null : response.json();
 },
 notice(message, error = false) { const node = this.$("notice"); node.textContent = message; node.classList.toggle("error", error); },
 cell(row, text, sub) { const cell = row.insertCell(); cell.textContent = text ?? ""; if (sub) { const small = document.createElement("small"); small.textContent = sub; cell.append(small); } return cell; },
 button(cell, text, handler, style = "btn-light") { const b = document.createElement("button"); b.type = "button"; b.textContent = text; b.className = "btn btn-sm " + style; b.onclick = () => Promise.resolve().then(handler).catch(e => this.notice(e.message, true)); cell.append(b); return b; },
 pagination(data, page) { this.$("total").textContent = data.total + " resultados"; this.$("page-number").textContent = "Página " + page + " de " + Math.max(1, Math.ceil(data.total / 10)); this.$("previous").disabled = page <= 1; this.$("next").disabled = page * 10 >= data.total; },
 empty(columns, message) { const row = this.$("rows").insertRow(); this.cell(row, message).colSpan = columns; },
 async all(path) {
   const items = []; let page = 1, result;
   do { result = await this.api(path + (path.includes("?") ? "&" : "?") + "tamano=100&pagina=" + page++); items.push(...result.items); } while (items.length < result.total && result.items.length);
   return items;
 }
};

