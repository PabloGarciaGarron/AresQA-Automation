using AresQA.Services;
using Microsoft.EntityFrameworkCore;

namespace AresQA.Data;

public static class BugLabSeed
{
    public static async Task Initialize(IServiceProvider services, BugModeStore store)
    {
        var mode = services.GetRequiredService<BugModeContext>();
        var db = services.GetRequiredService<ApplicationDbContext>();
        if (!mode.Enabled || !string.Equals(Path.GetFullPath(db.Database.GetDbConnection().DataSource), store.BugsPath, StringComparison.OrdinalIgnoreCase)
            || string.Equals(store.NormalPath, store.BugsPath, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("La preparación de bugs solo puede modificar la base de laboratorio.");

        var fresh = await db.Database.EnsureCreatedAsync();
        await Seed.Initialize(services);
        // Only this separate database permits BUG-05 and BUG-12. Normal indexes never change.
        await using var transaction = await db.Database.BeginTransactionAsync();
        await db.Database.ExecuteSqlRawAsync("""
            DROP INDEX IF EXISTS IX_Persons_Documento;
            CREATE INDEX IX_Persons_Documento ON Persons (Documento);
            DROP INDEX IF EXISTS IX_Companies_Nit;
            CREATE INDEX IX_Companies_Nit ON Companies (Nit);
            """);
        if (fresh)
        {
            var companies = await db.Companies.OrderBy(c => c.Id).Select(c => c.Id).ToArrayAsync();
            var persons = await db.Persons.OrderBy(p => p.Id).ToListAsync();
            // Active PER-0020 stays unassociated for BUG-15; PER-0001..0019 are immediately usable.
            foreach (var person in persons.Where(p => p.Id <= 19)) person.EmpresaId = companies[(person.Id - 1) % companies.Length];
            await db.SaveChangesAsync();
        }
        await transaction.CommitAsync();
    }
}
