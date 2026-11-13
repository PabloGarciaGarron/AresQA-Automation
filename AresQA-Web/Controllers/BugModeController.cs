using System.ComponentModel.DataAnnotations;
using AresQA.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace AresQA.Controllers;

public sealed record ChangeBugModeInput([Required] bool? Enabled, [Required] string Revision);

[ApiController, Route("api/laboratorio/modo")]
public sealed class BugModeController(BugModeStore store, SignInManager<IdentityUser> signIn) : ControllerBase
{
    [HttpGet]
    public IActionResult Get() => Ok(new { enabled = store.Enabled, available = store.Available, revision = store.Revision });

    [Authorize(Roles = "Administrador"), HttpPut]
    public async Task<IActionResult> Set(ChangeBugModeInput input)
    {
        if (!store.Available) return NotFound();
        // Control of the switch is never subject to a deliberately broken business permission.
        if (User.FindFirst("ares:verified")?.Value != "true")
            return StatusCode(403, new { message = "Para cambiar de modo, inicia sesión con la contraseña correcta del administrador." });
        if (input.Revision != store.Revision)
            return Conflict(new { code = "mode_changed", message = "El modo cambió. Recarga e inicia sesión nuevamente." });
        store.SetEnabled(input.Enabled!.Value);
        // Always perform real sign-out, including when BUG-03 is active.
        await signIn.SignOutAsync();
        Response.Headers["X-Ares-Mode"] = store.Enabled ? "bugs" : "normal";
        Response.Headers["X-Ares-Mode-Revision"] = store.Revision;
        return Ok(new { enabled = store.Enabled, available = store.Available, revision = store.Revision, requiresLogin = true });
    }
}
