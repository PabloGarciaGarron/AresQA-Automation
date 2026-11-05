using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
namespace AresQA.Controllers;
public record LoginInput([Required, EmailAddress] string Email, [Required] string Password);
[ApiController, Route("api/auth")]
public class AuthController(SignInManager<IdentityUser> signIn, IAntiforgery antiforgery, AresQA.Data.ApplicationDbContext db, AresQA.Services.LabSignInService labSignIn) : ControllerBase
{
    [HttpGet("csrf")]
    public IActionResult Csrf() => Ok(new { token = antiforgery.GetAndStoreTokens(HttpContext).RequestToken });
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginInput input) {
        var result = await labSignIn.Login(input.Email, input.Password);
        return result.Succeeded ? Ok(new { message = "Sesión iniciada." }) : Unauthorized(new { message = "Credenciales incorrectas o cuenta temporalmente bloqueada." });
    }
    [Authorize, HttpPost("logout")]
    public async Task<IActionResult> Logout() { await labSignIn.Logout(); return NoContent(); }
    [Authorize, HttpGet("me")]
    public async Task<IActionResult> Me() {
        var userId = signIn.UserManager.GetUserId(User);
        var code = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(db.UserCodes.Where(c => c.UserId == userId));
        return Ok(new { codigo = code?.Codigo, email = User.Identity!.Name, role = User.IsInRole("Administrador") ? "Administrador" : "Operador" });
    }
}

