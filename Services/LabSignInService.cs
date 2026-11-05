using Microsoft.AspNetCore.Identity;

namespace AresQA.Services;

public sealed class LabSignInService(SignInManager<IdentityUser> signIn, BugModeContext mode)
{
    public async Task<SignInResult> Login(string email, string password)
    {
        if (!mode.Enabled) return await signIn.PasswordSignInAsync(email.Trim(), password, false, true);
        var user = await signIn.UserManager.FindByEmailAsync(email.Trim());
        if (user == null) return SignInResult.Failed;
        mode.CredentialsVerified = await signIn.UserManager.CheckPasswordAsync(user, password);
        // BUG-01: an existing lab account signs in even with a wrong password.
        // BUG-02: no lockout checks or failed-attempt counters in this lab-only branch.
        await signIn.SignInAsync(user, false);
        return SignInResult.Success;
    }

    public async Task Logout()
    {
        // BUG-03: UI/API reports logout but the laboratory cookie remains valid.
        if (!mode.IsEnabled(3)) await signIn.SignOutAsync();
    }
}
