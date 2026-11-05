using AresQA.Data;
using AresQA.Models;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Services;
public class RequestService(ApplicationDbContext db, BugModeContext bugs)
{
    public async Task<ServiceRequest> Save(RequestInput input, string actor, int? id = null, int? version = null) {
        var request = id.HasValue ? await db.Requests.FindAsync(id.Value) ?? throw new RuleException(404, "Solicitud no encontrada.") : new ServiceRequest { CreadoPor = actor };
        if (request.Estado != "Pendiente" && !bugs.IsEnabled(19)) throw new RuleException(409, "Una solicitud resuelta no puede editarse.");
        if (id.HasValue && request.Version != version && !bugs.IsEnabled(20)) throw new RuleException(409, "La solicitud cambió. Recarga antes de editar.");
        if (input.Asunto.Trim().Length < 5 || input.Descripcion.Trim().Length < 10) throw new RuleException(400, "El asunto requiere 5 caracteres y la descripción 10.");
        var person = await db.Persons.AsNoTracking().FirstOrDefaultAsync(p => p.Id == input.PersonaId && p.Activo) ?? throw new RuleException(400, "Selecciona una persona activa.");
        int companyId;
        if (!person.EmpresaId.HasValue) {
            if (!bugs.IsEnabled(15)) throw new RuleException(400, "Primero asocia la persona a una empresa en Personas.");
            // BUG-15: use a real laboratory company without associating it with the person.
            var laboratoryCompanyId = input.EmpresaId != 0 ? input.EmpresaId
                : await db.Companies.OrderBy(c => c.Id).Select(c => (int?)c.Id).FirstOrDefaultAsync();
            if (!laboratoryCompanyId.HasValue || !await db.Companies.AnyAsync(c => c.Id == laboratoryCompanyId.Value))
                throw new RuleException(400, "La empresa seleccionada no existe.");
            companyId = laboratoryCompanyId.Value;
        } else {
            companyId = person.EmpresaId.Value;
            if (input.EmpresaId != 0 && input.EmpresaId != person.EmpresaId) {
                if (!bugs.IsEnabled(16)) throw new RuleException(409, "La empresa de la persona cambió. Recarga el formulario.");
                // BUG-16 keeps referential integrity but accepts a different company.
                if (!await db.Companies.AnyAsync(c => c.Id == input.EmpresaId)) throw new RuleException(400, "La empresa seleccionada no existe.");
                companyId = input.EmpresaId;
            }
        }
        request.PersonaId = input.PersonaId; request.EmpresaId = companyId;
        request.Asunto = input.Asunto.Trim(); request.Descripcion = input.Descripcion.Trim();
        if (!id.HasValue) db.Requests.Add(request); else request.Version++;
        await Persist();
        return request;
    }
    public async Task Resolve(int id, DecisionInput input, string actor) {
        var request = await db.Requests.FindAsync(id) ?? throw new RuleException(404, "Solicitud no encontrada.");
        if (request.Estado != "Pendiente") throw new RuleException(409, "La solicitud ya está resuelta.");
        if (request.Version != input.Version && !bugs.IsEnabled(20)) throw new RuleException(409, "La solicitud cambió. Recarga antes de resolver.");
        if (input.Estado == "Rechazada" && string.IsNullOrWhiteSpace(input.Observacion) && !bugs.IsEnabled(18)) throw new RuleException(400, "Indica el motivo del rechazo.");
        if (input.Estado == "Aprobada" && !await db.Persons.AnyAsync(p => p.Id == request.PersonaId && p.Activo)) throw new RuleException(409, "No se puede aprobar: la persona está inactiva.");
        request.Estado = input.Estado; request.Observacion = input.Observacion?.Trim();
        request.ResueltoPor = actor; request.ResueltoEn = DateTime.UtcNow; request.Version++;
        await Persist();
    }
    private async Task Persist() {
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { throw new RuleException(409, "La solicitud cambió. Recarga la página."); }
    }
}

