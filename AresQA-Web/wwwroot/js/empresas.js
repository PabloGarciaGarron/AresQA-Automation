(() => {
 const L = Lab, $ = L.$; let page = 1, editing = null;
 async function load() {
  const data = await L.api("/api/empresas?" + new URLSearchParams({buscar:$("search").value,pagina:page,tamano:10}));
  $("rows").replaceChildren();
  for (const item of data.items) {
    const row = $("rows").insertRow(); L.cell(row,item.nombre,item.codigo); L.cell(row,item.nit); L.cell(row,item.correo,item.telefono); L.cell(row,item.direccion || "—");
    L.button(L.cell(row,""),"Editar",()=>open(item));
  }
  if (!data.items.length) L.empty(5,"No se encontraron empresas.");
  L.pagination(data,page);
 }
 function open(item = null) {
   editing = item?.id ?? null; $("form").reset(); $("form-error").textContent = "";
   $("editor-title").textContent = item ? "Editar empresa · " + item.codigo : "Nueva empresa";
   if (item) for (const field of ["nit","nombre","correo","telefono","direccion"]) $(field).value = item[field] || "";
   $("editor").showModal(); $("nit").focus();
 }
 $("new").onclick = () => open(); $("close").onclick = $("cancel").onclick = () => $("editor").close();
 $("form").onsubmit = async e => {
   e.preventDefault(); $("save").disabled = true; $("form-error").textContent = "";
   try {
     const body = Object.fromEntries(new FormData($("form"))); if (!body.telefono) body.telefono = null;
     const saved = await L.api("/api/empresas" + (editing ? "/" + editing : ""),{method:editing ? "PUT":"POST",body:JSON.stringify(body)});
     $("editor").close(); L.notice("Empresa guardada · " + saved.codigo); await load();
   } catch (e) { $("form-error").textContent = e.message; } finally { $("save").disabled = false; }
 };
 $("filters").onsubmit = e => { e.preventDefault(); page=1; load().catch(e=>L.notice(e.message,true)); };
 $("clear").onclick = () => { $("filters").reset(); page=1; load().catch(e=>L.notice(e.message,true)); };
 $("previous").onclick = () => { page--; load().catch(e=>L.notice(e.message,true)); };
 $("next").onclick = () => { page++; load().catch(e=>L.notice(e.message,true)); };
 load().catch(e=>L.notice(e.message,true));
})();

