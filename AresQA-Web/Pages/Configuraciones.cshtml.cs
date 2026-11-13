using AresQA.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace AresQA.Pages;

[Authorize(Roles = "Administrador")]
public sealed class ConfiguracionesModel(BugModeContext bugMode) : PageModel
{
    public bool BugsEnabled => bugMode.Enabled;
    public bool BugModeAvailable => bugMode.Available;
    public void OnGet() { }
}
