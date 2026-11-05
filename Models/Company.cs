using System.ComponentModel.DataAnnotations;
namespace AresQA.Models;
public class CompanyInput
{
    [Required, CompanyNit(ErrorMessage = "El NIT debe tener entre 5 y 15 dígitos.")]
    public string Nit { get; set; } = "";
    [Required, StringLength(120, MinimumLength = 2)] public string Nombre { get; set; } = "";
    [Required, EmailAddress, StringLength(120)] public string Correo { get; set; } = "";
    [StringLength(200)] public string? Direccion { get; set; }
    [RegularExpression(@"^[0-9+ ()-]{6,20}$", ErrorMessage = "Teléfono inválido.")] public string? Telefono { get; set; }
}
public class Company : CompanyInput
{
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public string Codigo => $"EMP-{Id:0000}";
    public int Id { get; set; }
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}

