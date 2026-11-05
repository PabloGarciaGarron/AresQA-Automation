using System.ComponentModel.DataAnnotations;
namespace AresQA.Models;
public class RequestInput
{
    [Range(1, int.MaxValue)] public int PersonaId { get; set; }
    [Range(0, int.MaxValue)] public int EmpresaId { get; set; }
    [Required, StringLength(120, MinimumLength = 5)] public string Asunto { get; set; } = "";
    [Required, StringLength(2000, MinimumLength = 10)] public string Descripcion { get; set; } = "";
}
public class RequestEditInput : RequestInput { [Range(1, int.MaxValue)] public int Version { get; set; } }
public class DecisionInput
{
    [Required, RegularExpression("^(Aprobada|Rechazada)$")] public string Estado { get; set; } = "";
    [StringLength(500)] public string? Observacion { get; set; }
    [Range(1, int.MaxValue)] public int Version { get; set; }
}
public class ServiceRequest : RequestInput
{
    public int Id { get; set; }
    public string Estado { get; set; } = "Pendiente";
    public int Version { get; set; } = 1;
    public string CreadoPor { get; set; } = "";
    public DateTime CreadoEn { get; set; } = DateTime.UtcNow;
    public string? ResueltoPor { get; set; }
    public DateTime? ResueltoEn { get; set; }
    public string? Observacion { get; set; }
    public Person Persona { get; set; } = null!;
    public Company Empresa { get; set; } = null!;
}

