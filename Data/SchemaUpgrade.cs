using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
namespace AresQA.Data;
/// <summary>Additive, transactional upgrade from the first delivery. Never drops existing data.</summary>
public static class SchemaUpgrade
{
    public static async Task Apply(ApplicationDbContext db, string contentRoot)
    {
        await db.Database.OpenConnectionAsync();
        try {
            var connection = (SqliteConnection)db.Database.GetDbConnection();
            using var probe = connection.CreateCommand();
            probe.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('Companies','Requests','UserCodes')";
            var tablesExist = Convert.ToInt32(await probe.ExecuteScalarAsync()) == 3;
            probe.CommandText = "SELECT COUNT(*) FROM pragma_table_info('Persons') WHERE name='EmpresaId'";
            var hasCompanyLink = Convert.ToInt32(await probe.ExecuteScalarAsync()) == 1;
            if (tablesExist && hasCompanyLink) return;
            // SQLite's backup API includes committed WAL data, unlike copying a live .db.
            var directory = Path.Combine(contentRoot, "work", "backups", "entrega2-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss-fff"));
            Directory.CreateDirectory(directory);
            using (var backup = new SqliteConnection(new SqliteConnectionStringBuilder { DataSource = Path.Combine(directory, "aresqa-before-v2.db") }.ToString())) {
                backup.Open();
                connection.BackupDatabase(backup);
            }
            using var transaction = connection.BeginTransaction();
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = """
                CREATE TABLE IF NOT EXISTS Companies (
                    Id INTEGER NOT NULL CONSTRAINT PK_Companies PRIMARY KEY AUTOINCREMENT,
                    Nit TEXT NOT NULL, Nombre TEXT NOT NULL, Correo TEXT NOT NULL,
                    Direccion TEXT NULL, Telefono TEXT NULL, CreadoEn TEXT NOT NULL
                );
                CREATE UNIQUE INDEX IF NOT EXISTS IX_Companies_Nit ON Companies (Nit);
                CREATE TABLE IF NOT EXISTS Requests (
                    Id INTEGER NOT NULL CONSTRAINT PK_Requests PRIMARY KEY AUTOINCREMENT,
                    PersonaId INTEGER NOT NULL, EmpresaId INTEGER NOT NULL,
                    Asunto TEXT NOT NULL, Descripcion TEXT NOT NULL,
                    Estado TEXT NOT NULL CONSTRAINT CK_Requests_Estado CHECK (Estado IN ('Pendiente','Aprobada','Rechazada')),
                    Version INTEGER NOT NULL,
                    CreadoPor TEXT NOT NULL, CreadoEn TEXT NOT NULL,
                    ResueltoPor TEXT NULL, ResueltoEn TEXT NULL, Observacion TEXT NULL,
                    CONSTRAINT FK_Requests_Persons_PersonaId FOREIGN KEY (PersonaId) REFERENCES Persons (Id) ON DELETE RESTRICT,
                    CONSTRAINT FK_Requests_Companies_EmpresaId FOREIGN KEY (EmpresaId) REFERENCES Companies (Id) ON DELETE RESTRICT
                );
                CREATE INDEX IF NOT EXISTS IX_Requests_PersonaId ON Requests (PersonaId);
                CREATE INDEX IF NOT EXISTS IX_Requests_EmpresaId ON Requests (EmpresaId);
                CREATE TABLE IF NOT EXISTS UserCodes (
                    Id INTEGER NOT NULL CONSTRAINT PK_UserCodes PRIMARY KEY AUTOINCREMENT,
                    UserId TEXT NOT NULL,
                    CONSTRAINT FK_UserCodes_AspNetUsers_UserId FOREIGN KEY (UserId) REFERENCES AspNetUsers (Id) ON DELETE RESTRICT
                );
                CREATE UNIQUE INDEX IF NOT EXISTS IX_UserCodes_UserId ON UserCodes (UserId);
                """;
            await command.ExecuteNonQueryAsync();
            if (!hasCompanyLink) {
                command.CommandText = "ALTER TABLE Persons ADD COLUMN EmpresaId INTEGER NULL REFERENCES Companies(Id) ON DELETE RESTRICT; CREATE INDEX IX_Persons_EmpresaId ON Persons(EmpresaId);";
                await command.ExecuteNonQueryAsync();
            }
            await transaction.CommitAsync();
        } finally { await db.Database.CloseConnectionAsync(); }
    }
}

