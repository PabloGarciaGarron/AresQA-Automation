using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace AresQA.Services;

public sealed class LabClaimsPrincipalFactory(UserManager<IdentityUser> users, RoleManager<IdentityRole> roles,
    IOptions<IdentityOptions> options, BugModeContext mode) : UserClaimsPrincipalFactory<IdentityUser, IdentityRole>(users, roles, options)
{
    protected override async Task<ClaimsIdentity> GenerateClaimsAsync(IdentityUser user)
    {
        var identity = await base.GenerateClaimsAsync(user);
        identity.AddClaim(new Claim("ares:mode", mode.Enabled ? "bugs" : "normal"));
        identity.AddClaim(new Claim("ares:revision", mode.Revision));
        if (mode.CredentialsVerified || !mode.Enabled) identity.AddClaim(new Claim("ares:verified", "true"));
        return identity;
    }
}
