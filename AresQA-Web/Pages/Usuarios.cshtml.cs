using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;
namespace AresQA.Pages;
[Authorize(Roles = "Administrador")] public class UsuariosModel : PageModel { public void OnGet() { } }

