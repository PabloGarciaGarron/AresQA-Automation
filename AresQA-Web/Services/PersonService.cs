using AresQA.Data;
using AresQA.Models;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Services;
public class RuleException(int status, string message) : Exception(message) { public int Status => status; }
public class PersonService(ApplicationDbContext db, BugModeContext bugs)
{
    public static string NormalizeDocument(string value) => value.Trim().ToUpperInvariant();
    public async Task<Person> Save(PersonInput input, int? id = null)
    {
        var doc = NormalizeDocument(input.Documento);
        var person = id.HasValue ? await db.Persons.FindAsync(id.Value) ?? throw new RuleException(404, "Persona no encontrada.") : new Person();
        var wasActive = person.Activo;
        if (!person.Activo && !bugs.IsEnabled(10)) throw new RuleException(409, "Una persona inactiva no puede editarse.");
        if (!bugs.IsEnabled(5) && await db.Persons.AnyAsync(p => p.Documento == doc && p.Id != (id ?? 0))) throw new RuleException(409, "Ya existe una persona con ese documento.");
        if (input.Nombres.Trim().Length < 2 || input.Apellidos.Trim().Length < 2) throw new RuleException(400, "Nombres y apellidos deben tener al menos 2 caracteres.");
        person.Documento = doc; person.Nombres = input.Nombres.Trim(); person.Apellidos = input.Apellidos.Trim();
        var company = input.EmpresaId.HasValue ? await db.Companies.FindAsync(input.EmpresaId.Value) ?? throw new RuleException(400, "La empresa seleccionada no existe.") : null;
        person.EmpresaId = input.EmpresaId; person.Empresa = company;
        person.Correo = input.Correo.Trim().ToLowerInvariant(); person.Telefono = input.Telefono?.Trim();
        // BUG-09: report the edited active person while deliberately keeping its stored values.
        // Inactive edits persist so BUG-10 can be demonstrated independently.
        if (id.HasValue && wasActive && bugs.IsEnabled(9)) {
            db.Entry(person).State = EntityState.Detached;
            return person;
        }
        if (!id.HasValue) db.Persons.Add(person);
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException e) when (e.InnerException is Microsoft.Data.Sqlite.SqliteException { SqliteErrorCode: 19 }) { throw new RuleException(409, "Ya existe una persona con ese documento."); }
        return person;
    }
    public async Task Deactivate(int id)
    {
        var person = await db.Persons.FindAsync(id) ?? throw new RuleException(404, "Persona no encontrada.");
        person.Activo = false;
        await db.SaveChangesAsync();
    }
}

