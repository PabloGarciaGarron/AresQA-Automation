using AresQA.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Data;
public static class Seed
{
    public static async Task Initialize(IServiceProvider services)
    {
        var roles = services.GetRequiredService<RoleManager<IdentityRole>>();
        var users = services.GetRequiredService<UserManager<IdentityUser>>();
        foreach (var role in new[] { "Administrador", "Operador" }) if (!await roles.RoleExistsAsync(role)) Check(await roles.CreateAsync(new IdentityRole(role)));
        foreach (var (email, role) in new[] { ("admin@aresqa.local", "Administrador"), ("operador@aresqa.local", "Operador") }) {
            var user = await users.FindByEmailAsync(email);
            if (user is null) {
                var initialPassword = services.GetRequiredService<IConfiguration>()["ARESQA_INITIAL_PASSWORD"];
                if (string.IsNullOrWhiteSpace(initialPassword))
                    throw new InvalidOperationException("Set ARESQA_INITIAL_PASSWORD to initialize the demonstration accounts.");
                user = new IdentityUser { UserName = email, Email = email, EmailConfirmed = true };
                Check(await users.CreateAsync(user, initialPassword));
                Check(await users.AddToRoleAsync(user, role));
            }
        }
        var db = services.GetRequiredService<ApplicationDbContext>();
        foreach (var user in await users.Users.OrderBy(u => u.Email).ToListAsync()) {
            if (!await db.UserCodes.AnyAsync(c => c.UserId == user.Id)) {
                db.UserCodes.Add(new UserCode { UserId = user.Id });
                await db.SaveChangesAsync();
            }
        }
        // Only replace unchanged demonstration documents; never rewrite user-entered documents.
        for (var i = 1; i <= 25; i++) {
            var oldDocument = $"QA-{i:0000}";
            var email = $"persona{i}@example.test";
            var demo = await db.Persons.FirstOrDefaultAsync(p => p.Documento == oldDocument && p.Correo == email && p.Apellidos == "Demostración");
            var document = $"{10000000 + i}";
            if (demo != null && !await db.Persons.AnyAsync(p => p.Documento == document)) demo.Documento = document;
        }
        await db.SaveChangesAsync();
        if (!await db.Companies.AnyAsync()) {
            for (var i = 1; i <= 5; i++) db.Companies.Add(new Company { Nit = $"90000{i}", Nombre = $"Empresa Demo {i}", Correo = $"empresa{i}@example.test", Direccion = "Dirección ficticia de laboratorio", Telefono = "70000000" });
            await db.SaveChangesAsync();
        }
        if (!await db.Persons.AnyAsync()) {
            for (var i = 1; i <= 25; i++) db.Persons.Add(new Person { Documento = $"{10000000 + i}", Nombres = $"Persona {i:00}", Apellidos = "Demostración", Correo = $"persona{i}@example.test", Telefono = "70000000", Activo = i <= 20 });
            await db.SaveChangesAsync();
        }
    }
    private static void Check(IdentityResult result) { if (!result.Succeeded) throw new InvalidOperationException(string.Join("; ", result.Errors.Select(e => e.Description))); }
}
