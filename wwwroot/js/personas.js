(() => {
const $ = id => document.getElementById(id);
let page = 1, editing = null, pending = null, role = "", items = [];
const editor = $("editor"), form = $("person-form");
async function api(path, options = {}) {
  if (options.method && options.method !== "GET") {
    const csrf = await fetch("/api/auth/csrf").then(r => r.json());
    options.headers = { "Content-Type": "application/json", "X-CSRF-TOKEN": csrf.token, ...options.headers };
  }
  const response = await fetch(path, options);
  if (response.status === 401) { location.href = "/Login"; throw new Error("La sesión ha terminado."); }
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || (body.errors ? Object.values(body.errors).flat().join(" ") : response.status === 403 ? "No tienes permiso para esta acción." : "No se pudo completar la operación."));
  }
  return response.status === 204 ? null : response.json();
}
function notice(message, error = false) { $("notice").textContent = message; $("notice").classList.toggle("error", error); }
function cell(row, text) { const c = row.insertCell(); c.textContent = text; return c; }
async function load() {
  const query = new URLSearchParams({ buscar: $("search").value, pagina: page, tamano: 10 });
  if ($("state").value) query.set("activo", $("state").value);
  const result = await api("/api/personas?" + query);
  items = result.items; $("people").replaceChildren();
  for (const person of items) {
    const row = document.createElement("tr");
    const nameCell = cell(row, person.nombres + " " + person.apellidos); nameCell.className = "person-name"; const code = document.createElement("small"); code.textContent = person.codigo; nameCell.append(code);
    cell(row, person.documento);
    const contact = cell(row, person.correo); const phone = document.createElement("small"); phone.textContent = person.telefono || "Sin teléfono"; contact.append(phone);
    cell(row, person.empresaNombre || "Sin empresa");
    const state = cell(row, ""); const badge = document.createElement("span"); badge.className = "badge-state" + (person.activo ? "" : " inactive"); badge.textContent = person.activo ? "Activa" : "Inactiva"; state.append(badge);
    const actions = cell(row, ""); const group = document.createElement("div"); group.className = "actions"; actions.append(group);
    if (person.activo || document.body.dataset.aresBugsEnabled === "true") {
      const edit = document.createElement("button"); edit.className = "btn btn-light"; edit.textContent = "Editar"; edit.onclick = () => openEditor(person); group.append(edit);
      if (role === "Administrador" || document.body.dataset.aresBugsEnabled === "true") { const off = document.createElement("button"); off.className = "btn btn-outline-danger"; off.textContent = "Desactivar"; off.onclick = () => { pending = person.id; $("deactivate-description").textContent = person.nombres + " " + person.apellidos + " · " + person.documento; $("deactivate-dialog").showModal(); }; group.append(off); }
    } else group.textContent = "Solo consulta";
    $("people").append(row);
  }
  if (!items.length) { const row = document.createElement("tr"); const c = cell(row, "No se encontraron personas con estos filtros."); c.colSpan = 6; $("people").append(row); }
  $("result-count").textContent = result.total + " resultados";
  $("page-number").textContent = "Página " + page + " de " + Math.max(1, Math.ceil(result.total / 10));
  $("previous").disabled = page <= 1; $("next").disabled = page * 10 >= result.total;
}
async function metrics() {
  const [all, active] = await Promise.all([api("/api/personas?tamano=1"), api("/api/personas?tamano=1&activo=true")]);
  $("total-count").textContent = all.total; $("active-count").textContent = active.total; $("inactive-count").textContent = all.total - active.total;
}
async function openEditor(person = null) {
  editing = person?.id ?? null; form.reset(); $("form-error").textContent = "";
  $("editor-title").textContent = editing ? "Editar persona" : "Nueva persona";
  if (person) for (const key of ["documento","nombres","apellidos","correo","telefono"]) $(key).value = person[key] || "";
  try {
    const companies=[];let pageNumber=1,result;
    do { result=await api("/api/empresas?tamano=100&pagina="+pageNumber++);companies.push(...result.items); } while(companies.length<result.total && result.items.length);
    $("empresaId").replaceChildren(new Option("Sin empresa asociada", ""));
    for(const company of companies) $("empresaId").add(new Option(company.codigo+" · "+company.nombre,company.id));
    $("empresaId").value=person?.empresaId || "";
    editor.showModal(); $("documento").focus();
  } catch(e) { notice(e.message,true); }
}
$("new-person").onclick = () => openEditor();
$("close-editor").onclick = $("cancel-editor").onclick = () => editor.close();
$("filters").onsubmit = e => { e.preventDefault(); page = 1; load().catch(e => notice(e.message, true)); };
$("clear").onclick = () => { $("filters").reset(); page = 1; load().catch(e => notice(e.message, true)); };
$("previous").onclick = () => { page--; load().catch(e => notice(e.message, true)); };
$("next").onclick = () => { page++; load().catch(e => notice(e.message, true)); };
form.onsubmit = async e => {
  e.preventDefault(); $("save").disabled = true; $("form-error").textContent = "";
  try {
    const input = Object.fromEntries(new FormData(form)); if (!input.telefono) input.telefono = null; input.empresaId = input.empresaId ? Number(input.empresaId) : null;
    await api("/api/personas" + (editing ? "/" + editing : ""), { method: editing ? "PUT" : "POST", body: JSON.stringify(input) });
    if (!editing) { page=1; $("filters").reset(); }
    editor.close(); notice(editing ? "Persona actualizada correctamente." : "Persona registrada correctamente.");
    await Promise.all([load(), metrics()]);
  } catch (error) { $("form-error").textContent = error.message; } finally { $("save").disabled = false; }
};
$("cancel-deactivate").onclick = () => $("deactivate-dialog").close();
$("confirm-deactivate").onclick = async () => {
  $("confirm-deactivate").disabled = true;
  try { await api("/api/personas/" + pending + "/desactivar", { method: "PATCH" }); $("deactivate-dialog").close(); notice("Persona desactivada correctamente."); await Promise.all([load(), metrics()]); }
  catch (error) { $("deactivate-dialog").close(); notice(error.message, true); }
  finally { $("confirm-deactivate").disabled = false; }
};
api("/api/auth/me").then(user => { role = user.role; return Promise.all([load(), metrics()]); }).catch(e => notice(e.message, true));
})();



