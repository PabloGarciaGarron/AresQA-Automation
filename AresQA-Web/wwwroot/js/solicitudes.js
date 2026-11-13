(() => {
 const L = Lab, $ = L.$; let page=1, editing=null, selected=null, decision="", admin=false, activePeople=[];
 const bugsEnabled = document.body.dataset.aresBugsEnabled === "true";
 let companies = [];
 const code = id => "SOL-" + String(id).padStart(4,"0");
 const date = value => value ? new Date(value).toLocaleString("es-BO") : "—";
 async function load() {
   const data = await L.api("/api/solicitudes?" + new URLSearchParams({buscar:$("search").value,estado:$("state").value,pagina:page,tamano:10}));
   $("rows").replaceChildren();
   for (const item of data.items) {
     const row = $("rows").insertRow(); L.cell(row,item.asunto,code(item.id)); L.cell(row,item.persona,item.empresa);
     const state = L.cell(row,""); const badge = document.createElement("span"); badge.className = "badge-state " + item.estado.toLowerCase(); badge.textContent = item.estado; state.append(badge);
     L.cell(row,date(item.creadoEn)); const actions = L.cell(row,""); actions.className = "request-actions";
     L.button(actions,"Ver",()=>details(item.id));
     if (item.estado === "Pendiente" || bugsEnabled) {
       L.button(actions,"Editar",()=>open(item.id));
       if (item.estado === "Pendiente" && (admin || bugsEnabled)) L.button(actions,"Aprobar",()=>resolve(item.id,"Aprobada"),"btn-outline-success");
       if (admin && item.estado === "Pendiente") L.button(actions,"Rechazar",()=>resolve(item.id,"Rechazada"),"btn-outline-danger");
     }
   }
   if (!data.items.length) L.empty(5,"No hay solicitudes con estos filtros. Crea una para comenzar.");
   L.pagination(data,page);
   const totals = await Promise.all(["Pendiente","Aprobada","Rechazada"].map(estado=>L.api("/api/solicitudes?tamano=1&estado="+estado)));
   ["pending-count","approved-count","rejected-count"].forEach((id,i)=>$(id).textContent=totals[i].total);
 }
 function options(id, items, label, value) {
   $(id).replaceChildren(new Option("Selecciona una opción",""));
   for (const item of items) $(id).add(new Option(label(item), item.id));
   $(id).value = value || "";
 }
 async function open(id=null) {
   $("new").disabled=true;
   try {
     const [people,companyRows,item] = await Promise.all([L.all("/api/personas?activo=true"), L.all("/api/empresas"), id ? L.api("/api/solicitudes/"+id) : null]);
     if (item && item.estado !== "Pendiente" && !bugsEnabled) throw new Error("La solicitud ya está resuelta. Actualiza el listado.");
     activePeople=people.filter(person=>person.activo); companies=companyRows; editing=item; $("form").reset(); $("form-error").textContent="";
     options("personaId",activePeople,p=>p.codigo+" · "+p.nombres+" "+p.apellidos,item?.personaId);
     options("empresaId",companyRows,c=>c.codigo+" · "+c.nombre,item?.empresaId);
     $("asunto").value=item?.asunto || ""; $("descripcion").value=item?.descripcion || "";
     $("editor-title").textContent=item ? "Editar "+code(item.id) : "Nueva solicitud";
     if (!people.length || !companies.length) $("form-error").textContent="Necesitas una persona activa y una empresa para crear solicitudes.";
     syncCompany();
     $("editor").showModal();
   } finally { $("new").disabled=false; }
 }
 function syncCompany() {
   const person=activePeople.find(p=>p.id===Number($("personaId").value));
   if (!bugsEnabled || !$("empresaId").value) {
     $("empresaId").value=person?.empresaId || (bugsEnabled && !person?.empresaId ? companies[0]?.id || "" : "");
   }
   $("empresaId").disabled=!bugsEnabled;
   $("save").disabled=!bugsEnabled && !person?.empresaId;
   $("form-error").textContent=person && !person.empresaId && !bugsEnabled
     ? "Esta persona no tiene empresa. Asígnala primero en Personas."
     : "";
 }
 $("personaId").onchange=syncCompany;
 async function details(id) {
   const item=await L.api("/api/solicitudes/"+id); $("detail-title").textContent=code(id)+" · "+item.estado; $("detail-body").replaceChildren();
   for (const [label,value] of Object.entries({"Asunto":item.asunto,"Persona":item.persona+" · PER-"+String(item.personaId).padStart(4,"0"),"Empresa":item.empresa+" · EMP-"+String(item.empresaId).padStart(4,"0"),"Descripción":item.descripcion,"Creada por":item.creadoPor,"Fecha de creación":date(item.creadoEn),"Resuelta por":item.resueltoPor || "—","Fecha de resolución":date(item.resueltoEn),"Observación":item.observacion || "—"})) {
     const dt=document.createElement("dt"),dd=document.createElement("dd");dt.textContent=label;dd.textContent=value;$("detail-body").append(dt,dd);
   } $("detail").showModal();
 }
 async function resolve(id, state) {
   selected=await L.api("/api/solicitudes/"+id);
   if (selected.estado !== "Pendiente") throw new Error("La solicitud ya está resuelta. Actualiza el listado.");
   decision=state; $("decision-title").textContent=state==="Aprobada" ? "Aprobar solicitud":"Rechazar solicitud";
   $("decision-summary").textContent=code(id)+" · "+selected.asunto; $("observacion").value=""; $("observacion").required=state==="Rechazada" && !bugsEnabled;
   $("decision-error").textContent=""; $("decision").querySelector("label").textContent=state==="Rechazada" ? "Motivo del rechazo *":"Observación (opcional)"; $("decision").showModal();
 }
 $("new").onclick=()=>open().catch(e=>L.notice(e.message,true));
 $("close").onclick=$("cancel").onclick=()=>$("editor").close(); $("close-detail").onclick=()=>$("detail").close(); $("cancel-decision").onclick=()=>$("decision").close();
 $("form").onsubmit=async e=>{
   e.preventDefault(); $("save").disabled=true; $("form-error").textContent="";
   try {
     const input=Object.fromEntries(new FormData($("form")));input.personaId=Number(input.personaId);input.empresaId=Number($("empresaId").value);
     if(editing)input.version=editing.version;
     const saved=await L.api("/api/solicitudes"+(editing?"/"+editing.id:""),{method:editing?"PUT":"POST",body:JSON.stringify(input)});
     $("editor").close();L.notice("Solicitud guardada · "+code(saved.id));await load();
   }catch(e){$("form-error").textContent=e.message;}finally{$("save").disabled=false;}
 };
 $("decision-form").onsubmit=async e=>{
   e.preventDefault();$("confirm-decision").disabled=true;
   try{
     await L.api("/api/solicitudes/"+selected.id+"/resolver",{method:"POST",body:JSON.stringify({estado:decision,observacion:$("observacion").value,version:selected.version})});
     $("decision").close();L.notice("Solicitud "+decision.toLowerCase()+" correctamente.");await load();
   }catch(e){$("decision-error").textContent=e.message;}finally{$("confirm-decision").disabled=false;}
 };
 $("filters").onsubmit=e=>{e.preventDefault();page=1;load().catch(e=>L.notice(e.message,true));};
 $("clear").onclick=()=>{$("filters").reset();page=1;load().catch(e=>L.notice(e.message,true));};
 $("previous").onclick=()=>{page--;load().catch(e=>L.notice(e.message,true));};$("next").onclick=()=>{page++;load().catch(e=>L.notice(e.message,true));};
 L.api("/api/auth/me").then(user=>{admin=user.role==="Administrador";return load();}).catch(e=>L.notice(e.message,true));
})();
