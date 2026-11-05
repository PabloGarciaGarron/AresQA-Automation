using AresQA.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Data;
public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : IdentityDbContext(options)
{
    public DbSet<Person> Persons => Set<Person>();
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<UserCode> UserCodes => Set<UserCode>();
    public DbSet<ServiceRequest> Requests => Set<ServiceRequest>();
    protected override void OnModelCreating(ModelBuilder builder) {
        base.OnModelCreating(builder);
        builder.Entity<Person>().HasIndex(p => p.Documento).IsUnique();
        builder.Entity<Person>().HasOne(p => p.Empresa).WithMany().HasForeignKey(p => p.EmpresaId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<Company>().HasIndex(c => c.Nit).IsUnique();
        builder.Entity<UserCode>().HasIndex(c => c.UserId).IsUnique();
        builder.Entity<UserCode>().HasOne<Microsoft.AspNetCore.Identity.IdentityUser>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<ServiceRequest>().Property(r => r.Version).IsConcurrencyToken();
        builder.Entity<ServiceRequest>().HasOne(r => r.Persona).WithMany().HasForeignKey(r => r.PersonaId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<ServiceRequest>().HasOne(r => r.Empresa).WithMany().HasForeignKey(r => r.EmpresaId).OnDelete(DeleteBehavior.Restrict);
        builder.Entity<ServiceRequest>().ToTable("Requests", t => t.HasCheckConstraint("CK_Requests_Estado", "Estado IN ('Pendiente','Aprobada','Rechazada')"));
    }
}

