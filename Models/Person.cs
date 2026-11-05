using System.ComponentModel.DataAnnotations;
namespace AresQA.Models;
public class PersonInput
{
    [Range(1, int.MaxValue)] public int? EmpresaId { get; set; }
    [Required(ErrorMessage = "El documento es obligatorio."), RegularExpression(@"^[A-Za-z0-9-]{5,20}$", ErrorMessage = "Documento: entre 5 y 20 letras, números o guiones.")]
    public string Documento { get; set; } = "";
    [Required(ErrorMessage = "Los nombres son obligatorios."), StringLength(80, MinimumLength = 2, ErrorMessage = "Nombres: entre 2 y 80 caracteres.")]
    public string Nombres { get; set; } = "";
    [Required(ErrorMessage = "Los apellidos son obligatorios."), StringLength(80, MinimumLength = 2, ErrorMessage = "Apellidos: entre 2 y 80 caracteres.")]
    public string Apellidos { get; set; } = "";
    [Required(ErrorMessage = "El correo es obligatorio."), PersonEmailAddress(ErrorMessage = "El correo no es válido."), StringLength(120)]
    public string Correo { get; set; } = "";
    [RegularExpression(@"^[0-9+ ()-]{6,20}$", ErrorMessage = "El teléfono debe tener entre 6 y 20 caracteres válidos.")]
    public string? Telefono { get; set; }
}
public class Person : PersonInput
{
    [System.Text.Json.Serialization.JsonIgnore] public Company? Empresa { get; set; }
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public string? EmpresaNombre => Empresa?.Nombre;
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public string Codigo => $"PER-{Id:0000}";
    public int Id { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
}

