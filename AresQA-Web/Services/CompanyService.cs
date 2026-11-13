using AresQA.Data;
using AresQA.Models;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Services;
public class CompanyService(ApplicationDbContext db, BugModeContext bugs)
{
    public async Task<Company> Save(CompanyInput input, int? id = null) {
        if (input.Nombre.Trim().Length < 2) throw new RuleException(400, "El nombre debe tener al menos 2 caracteres.");
        var company = id.HasValue ? await db.Companies.FindAsync(id.Value) ?? throw new RuleException(404, "Empresa no encontrada.") : new Company();
        if (!bugs.IsEnabled(12) && await db.Companies.AnyAsync(c => c.Nit == input.Nit && c.Id != (id ?? 0))) throw new RuleException(409, "Ya existe una empresa con ese NIT.");
        company.Nit = input.Nit; company.Nombre = input.Nombre.Trim(); company.Correo = input.Correo.Trim().ToLowerInvariant();
        company.Direccion = input.Direccion?.Trim(); company.Telefono = input.Telefono?.Trim();
        if (!id.HasValue) db.Companies.Add(company);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.Sqlite.SqliteException { SqliteExtendedErrorCode: 2067 }) { throw new RuleException(409, "Ya existe una empresa con ese NIT."); }
        return company;
    }
}

