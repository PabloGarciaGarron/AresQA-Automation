using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
namespace AresQA.Pages;
[Authorize]
public class LogoutModel(AresQA.Services.LabSignInService labSignIn, AresQA.Services.BugModeContext bugs) : PageModel
{
    public IActionResult OnGet() => RedirectToPage("/Index");
    public async Task<IActionResult> OnPostAsync() {
        await labSignIn.Logout();
        return bugs.IsEnabled(3)
            ? RedirectToPage("/Login", new { logout = true })
            : RedirectToPage("/Login");
    }
}
