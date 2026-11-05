(() => {
 const L=Lab,$=L.$;
 async function load(){
  const items=await L.api("/api/usuarios");$("rows").replaceChildren();
  for(const item of items){const row=$("rows").insertRow();L.cell(row,item.codigo);L.cell(row,item.email);L.cell(row,item.roles.join(", "));}
 }
 $("new-user").onclick=()=>{$("user-form").reset();$("user-error").textContent="";$("user-editor").showModal();};
 $("close-user").onclick=$("cancel-user").onclick=()=>{$("user-form").reset();$("user-editor").close();};
 $("user-editor").addEventListener("close",()=>$("user-form").reset());
 $("user-form").onsubmit=async e=>{
  e.preventDefault();$("save-user").disabled=true;$("user-error").textContent="";
  try{
   const saved=await L.api("/api/usuarios",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData($("user-form"))))});
   $("user-editor").close();L.notice("Usuario creado · "+saved.codigo);await load();
  }catch(e){$("user-error").textContent=e.message;}finally{$("save-user").disabled=false;}
 };
 load().catch(e=>L.notice(e.message,true));
})();

