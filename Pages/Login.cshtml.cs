using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
namespace AresQA.Pages;
public class LoginModel(AresQA.Services.LabSignInService labSignIn, AresQA.Services.BugModeContext bugs) : PageModel
{
    [BindProperty, Required, EmailAddress] public string Email { get; set; } = "";
    [BindProperty, Required] public string Password { get; set; } = "";
    public bool VisualLogout { get; private set; }
    public IActionResult OnGet(bool logout = false) {
        VisualLogout = logout && bugs.IsEnabled(3);
        ViewData["VisualLogout"] = VisualLogout;
        return User.Identity?.IsAuthenticated == true && !logout ? RedirectToPage("/Index") : Page();
    }
    public async Task<IActionResult> OnPostAsync(string? returnUrl = null) {
        if (!ModelState.IsValid) return Page();
        var result = await labSignIn.Login(Email.Trim(), Password);
        if (result.Succeeded) return LocalRedirect(Url.IsLocalUrl(returnUrl) ? returnUrl! : "/");
        ModelState.AddModelError("", "Credenciales incorrectas o cuenta temporalmente bloqueada.");
        return Page();
    }
}
