using AresQA.Data;
using AresQA.Models;
using AresQA.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Controllers;
[ApiController, Authorize, Route("api/solicitudes")]
public class RequestsController(ApplicationDbContext db, RequestService service, BugModeContext bugs) : ControllerBase
{
    private IQueryable<object> View(IQueryable<ServiceRequest> query) => query.Select(r => new {
        r.Id, r.PersonaId, r.EmpresaId, r.Asunto, r.Descripcion, r.Estado, r.Version, r.CreadoPor, r.CreadoEn, r.ResueltoPor, r.ResueltoEn, r.Observacion,
        persona = r.Persona.Nombres + " " + r.Persona.Apellidos, documento = r.Persona.Documento, empresa = r.Empresa.Nombre, nit = r.Empresa.Nit
    });
    [HttpGet]
    public async Task<IActionResult> List(string? buscar, string? estado, int pagina = 1, int tamano = 10) {
        if (pagina < 1 || tamano < 1 || tamano > 100 || (long)(pagina - 1) * tamano > int.MaxValue) return BadRequest(new { message = "Paginación inválida." });
        if (!string.IsNullOrEmpty(estado) && !new[] { "Pendiente", "Aprobada", "Rechazada" }.Contains(estado)) return BadRequest(new { message = "Estado inválido." });
        var query = db.Requests.AsNoTracking();
        if (!string.IsNullOrEmpty(estado)) query = query.Where(r => r.Estado == estado);
        if (!string.IsNullOrWhiteSpace(buscar)) { var term = buscar.Trim().ToUpper(); query = query.Where(r => r.Asunto.ToUpper().Contains(term) || r.Persona.Documento.Contains(term) || r.Persona.Nombres.ToUpper().Contains(term) || r.Persona.Apellidos.ToUpper().Contains(term) || r.Empresa.Nombre.ToUpper().Contains(term)); }
        return Ok(new { total = await query.CountAsync(), items = await View(query.OrderByDescending(r => r.Id).Skip((pagina - 1) * tamano).Take(tamano)).ToListAsync(), pagina, tamano });
    }
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) => await View(db.Requests.AsNoTracking().Where(r => r.Id == id)).FirstOrDefaultAsync() is { } item ? Ok(item) : NotFound(new { message = "Solicitud no encontrada." });
    [HttpPost]
    public async Task<IActionResult> Create(RequestInput input) {
        try { var request = await service.Save(input, User.Identity!.Name!); return CreatedAtAction(nameof(Get), new { id = request.Id }, new { request.Id, request.Estado, request.Version }); }
        catch (RuleException e) { return StatusCode(e.Status, new { message = e.Message }); }
    }
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, RequestEditInput input) {
        try { var request = await service.Save(input, User.Identity!.Name!, id, input.Version); return Ok(new { request.Id, request.Estado, request.Version }); }
        catch (RuleException e) { return StatusCode(e.Status, new { message = e.Message }); }
    }
    [Authorize, HttpPost("{id:int}/resolver")]
    public async Task<IActionResult> Resolve(int id, DecisionInput input) {
        if (!User.IsInRole("Administrador") && (!bugs.IsEnabled(17) || input.Estado != "Aprobada"))
            return StatusCode(403, new { message = "Solo los administradores pueden resolver solicitudes." });
        try { await service.Resolve(id, input, User.Identity!.Name!); return NoContent(); }
        catch (RuleException e) { return StatusCode(e.Status, new { message = e.Message }); }
    }
}

