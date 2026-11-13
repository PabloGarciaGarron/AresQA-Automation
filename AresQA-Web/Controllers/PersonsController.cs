using AresQA.Data;
using AresQA.Models;
using AresQA.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Controllers;
[ApiController, Authorize, Route("api/personas")]
public class PersonsController(ApplicationDbContext db, PersonService service, BugModeContext bugs) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(string? buscar, bool? activo, int pagina = 1, int tamano = 10) {
        if (pagina < 1 || tamano < 1 || tamano > 100 || (long)(pagina - 1) * tamano > int.MaxValue) return BadRequest(new { message = "Página mínima 1; tamaño entre 1 y 100. Desplazamiento fuera de rango." });
        var query = db.Persons.Include(p => p.Empresa).AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(buscar)) { var term = buscar.Trim().ToUpper(); var codeId = term.StartsWith("PER-") && int.TryParse(term[4..], out var number) ? number : -1; query = query.Where(p => p.Id == codeId || p.Documento.Contains(term) || p.Nombres.ToUpper().Contains(term) || p.Apellidos.ToUpper().Contains(term) || p.Correo.ToUpper().Contains(term)); }
        if (activo.HasValue && !(activo.Value && bugs.IsEnabled(7)))
            query = query.Where(p => p.Activo == activo.Value);
        var total = await query.CountAsync();
        var skip = (pagina == 2 && bugs.IsEnabled(8)) ? 0 : (pagina - 1) * tamano;
        var items = await query.OrderByDescending(p => p.Id).Skip(skip).Take(tamano).ToListAsync();
        return Ok(new { items, total, pagina, tamano });
    }
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) => await db.Persons.Include(p => p.Empresa).AsNoTracking().FirstOrDefaultAsync(p => p.Id == id) is { } person ? Ok(person) : NotFound(new { message = "Persona no encontrada." });
    [HttpPost]
    public async Task<IActionResult> Create(PersonInput input) {
        try { var person = await service.Save(input); return CreatedAtAction(nameof(Get), new { id = person.Id }, person); }
        catch (RuleException e) { return StatusCode(e.Status, new { message = e.Message }); }
    }
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, PersonInput input) {
        try { return Ok(await service.Save(input, id)); }
        catch (RuleException e) { return StatusCode(e.Status, new { message = e.Message }); }
    }
    [Authorize, HttpPatch("{id:int}/desactivar")]
    public async Task<IActionResult> Deactivate(int id) {
        if (!User.IsInRole("Administrador") && !bugs.IsEnabled(11)) return StatusCode(403, new { message = "Solo los administradores pueden desactivar personas." });
        try { await service.Deactivate(id); return NoContent(); }
        catch (RuleException e) { return StatusCode(e.Status, new { message = e.Message }); }
    }
}
