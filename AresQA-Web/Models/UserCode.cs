namespace AresQA.Models;
public class UserCode {
    public int Id { get; set; }
    public string UserId { get; set; } = "";
    [System.ComponentModel.DataAnnotations.Schema.NotMapped] public string Codigo => $"USU-{Id:0000}";
}

