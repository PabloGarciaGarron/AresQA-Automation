using System.ComponentModel.DataAnnotations;
using AresQA.Data;
using AresQA.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Controllers;
public class CreateUserInput {
    [Required, EmailAddress, StringLength(120)] public string Email { get; set; } = "";
    [Required, StringLength(100, MinimumLength = 8)] public string Password { get; set; } = "";
    [Required, RegularExpression("^(Administrador|Operador)$")] public string Rol { get; set; } = "";
}
[ApiController, Authorize, Route("api/usuarios")]
public class UsersController(ApplicationDbContext db, UserManager<IdentityUser> users, AresQA.Services.BugModeContext bugs) : ControllerBase {
    [HttpGet]
    public async Task<IActionResult> List() {
        if (!User.IsInRole("Administrador")) return Forbid();
        var rows = await (from code in db.UserCodes join user in db.Users on code.UserId equals user.Id
                          orderby code.Id descending select new { code.Id, user.Email, UserId = user.Id }).ToListAsync();
        var roles = await (from ur in db.UserRoles join r in db.Roles on ur.RoleId equals r.Id select new { ur.UserId, r.Name }).ToListAsync();
        return Ok(rows.Select(u => new { codigo = $"USU-{u.Id:0000}", u.Email, roles = roles.Where(r => r.UserId == u.UserId).Select(r => r.Name) }));
    }
    [HttpPost]
    public async Task<IActionResult> Create(CreateUserInput input) {
        if (!User.IsInRole("Administrador") && !bugs.IsEnabled(4)) return Forbid();
        var email = input.Email.Trim().ToLowerInvariant();
        if (await users.FindByEmailAsync(email) != null) return Conflict(new { message = "Ya existe un usuario con ese correo." });
        await using var transaction = await db.Database.BeginTransactionAsync();
        var user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
        var result = await users.CreateAsync(user, input.Password);
        if (!result.Succeeded) return IdentityError(result);
        result = await users.AddToRoleAsync(user, input.Rol);
        if (!result.Succeeded) return IdentityError(result);
        var code = new UserCode { UserId = user.Id }; db.UserCodes.Add(code);
        await db.SaveChangesAsync(); await transaction.CommitAsync();
        return StatusCode(201, new { codigo = code.Codigo, email, roles = new[] { input.Rol } });
    }
    private IActionResult IdentityError(IdentityResult result) {
        if (result.Errors.Any(e => e.Code.StartsWith("Duplicate"))) return Conflict(new { message = "Ya existe un usuario con ese correo." });
        return BadRequest(new { message = "No se pudo crear el usuario. La contraseña debe incluir mayúscula, minúscula, número y símbolo; revisa el correo.", errors = result.Errors.GroupBy(e => e.Code).ToDictionary(g => g.Key, g => g.Select(e => e.Description).ToArray()) });
    }
}

