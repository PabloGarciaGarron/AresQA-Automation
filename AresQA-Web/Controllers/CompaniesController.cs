using AresQA.Data;
using AresQA.Models;
using AresQA.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Controllers;
[ApiController, Authorize, Route("api/empresas")]
public class CompaniesController(ApplicationDbContext db, CompanyService service, BugModeContext bugs) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> List(string? buscar, int pagina = 1, int tamano = 10) {
        if (pagina < 1 || tamano < 1 || tamano > 100 || (long)(pagina - 1) * tamano > int.MaxValue) return BadRequest(new { message = "Paginación inválida." });
        var query = db.Companies.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(buscar)) {
            var term = buscar.Trim().ToUpper();
            var codeId = term.StartsWith("EMP-") && int.TryParse(term[4..], out var number) ? number : -1;
            if (bugs.IsEnabled(14)) {
                query = query.Where(c => !c.Nombre.ToUpper().Contains(term));
            } else {
                query = query.Where(c => c.Id == codeId || c.Nit.Contains(term) || c.Nombre.ToUpper().Contains(term) || c.Correo.ToUpper().Contains(term));
            }
        }
        return Ok(new { total = await query.CountAsync(), items = await query.OrderByDescending(c => c.Id).Skip((pagina - 1) * tamano).Take(tamano).ToListAsync(), pagina, tamano });
    }
    [HttpGet("{id:int}")]
    public async Task<IActionResult> Get(int id) => await db.Companies.FindAsync(id) is { } company ? Ok(company) : NotFound(new { message = "Empresa no encontrada." });
    [HttpPost]
    public async Task<IActionResult> Create(CompanyInput input) {
        try { var company = await service.Save(input); return CreatedAtAction(nameof(Get), new { id = company.Id }, company); }
        catch (RuleException e) { return StatusCode(e.Status, new { message = e.Message }); }
    }
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, CompanyInput input) {
        try { return Ok(await service.Save(input, id)); } catch (RuleException e) { return StatusCode(e.Status, new { message = e.Message }); }
    }
}


