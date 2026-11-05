# Handoff técnico — Ares

Fecha local de actualización: 2026-10-04. Segunda entrega implementada, incluido el modo aislado de bugs intencionales.

## 🎯 PROPÓSITO DEL SISTEMA

Aplicación local para practicar pruebas de autenticación, permisos, personas, empresas, solicitudes y creación de usuarios. Por petición expresa del usuario, no se entregan suites de tests.

Raíz: C:\00. BORRAR\Aplicacion BBV\AresQA. Nombre visible: **Ares**. Conservar por compatibilidad los nombres técnicos AresQA del proyecto, namespaces, perfil, cookie y base de datos. El proyecto original bbvAres es independiente y no debe modificarse.

Stack web: ASP.NET Core 8 (net8.0, C# 12), Razor Pages, controladores REST, ASP.NET Core Identity con cookies y roles, EF Core SQLite, Bootstrap 5.1.0 y JavaScript nativo. UI → API → servicios → SQLite. Sin Node.js, Docker ni servidor de base de datos separado.

Extensión móvil: `C:\00. BORRAR\Aplicacion BBV\AresAndroid`, Kotlin/XML nativo, Minimum SDK 24 y Target SDK 34. Consume la API de la computadora y conserva controles nativos para Appium UiAutomator2.

## 🗂️ MAPA DE ARCHIVOS CRÍTICOS

Rutas relativas exactas a C:\00. BORRAR\Aplicacion BBV\AresQA:

```text
AresQA/
├── AresQA.csproj / AresQA.sln
├── Program.cs
├── appsettings.json / appsettings.Development.json
├── Properties/launchSettings.json
├── Data/
│   ├── ApplicationDbContext.cs
│   ├── SchemaUpgrade.cs
│   ├── Seed.cs
│   └── aresqa.db
├── Models/
│   ├── Person.cs
│   ├── Company.cs
│   ├── Request.cs
│   └── UserCode.cs
├── Services/
│   ├── PersonService.cs
│   ├── CompanyService.cs
│   └── RequestService.cs
├── Controllers/
│   ├── AuthController.cs
│   ├── PersonsController.cs
│   ├── CompaniesController.cs
│   ├── RequestsController.cs
│   └── UsersController.cs
├── Pages/
│   ├── Index.cshtml / Index.cshtml.cs
│   ├── Empresas.cshtml / Empresas.cshtml.cs
│   ├── Solicitudes.cshtml / Solicitudes.cshtml.cs
│   ├── Usuarios.cshtml / Usuarios.cshtml.cs
│   ├── Login.cshtml / Login.cshtml.cs
│   ├── Logout.cshtml / Logout.cshtml.cs
│   └── Shared/_Layout.cshtml
├── wwwroot/
│   ├── js/personas.js
│   ├── js/empresas.js
│   ├── js/solicitudes.js
│   ├── js/usuarios.js
│   ├── js/lab.js
│   ├── js/swagger-csrf.js
│   └── css/site.css
├── start.ps1 / start-lan.ps1 / reset-data.ps1
├── configure-mobile-firewall.ps1
└── README.md / handoff.md / bugintencionales.md / bugs_documentation.md
```

Proyecto móvil independiente:

```text
C:\00. BORRAR\Aplicacion BBV\AresAndroid
├── app/build.gradle.kts
├── app/src/main/AndroidManifest.xml
├── app/src/main/java/com/example/ares/
│   ├── ApiClient.kt
│   ├── LoginActivity.kt
│   └── MainActivity.kt
├── app/src/main/res/layout/*.xml
├── app/src/main/res/xml/network_security_config.xml
├── gradlew / gradlew.bat
└── README.md
```

Program configura DI, autorización, CSRF e inicialización. ApplicationDbContext define relaciones, índices y concurrencia. Los servicios contienen reglas de negocio; los controladores exponen contratos; cada pantalla usa su JavaScript.

Las copias de documentación entregadas están en C:\Users\Prestamos\Documents\Codex\2026-09-29\revi\outputs. Mantenerlas sincronizadas con la raíz del proyecto.

## ⚙️ VARIABLES DE ENTORNO Y DEPENDENCIAS

No se carga .env automáticamente. Configuración real en appsettings y launchSettings; variables equivalentes:

```dotenv
ASPNETCORE_ENVIRONMENT=Development
ASPNETCORE_URLS=http://localhost:5080
ConnectionStrings__DefaultConnection="Data Source=Data/aresqa.db"
```

Para usar overrides de URL/entorno ejecutar con --no-launch-profile. El perfil AresQA fija Development y http://localhost:5080. SQLite no necesita host, puerto, usuario ni contraseña. Ejecutar desde la raíz para resolver la ruta relativa.

| Dependencia | Versión |
|---|---|
| Microsoft.AspNetCore.Identity.EntityFrameworkCore | 8.0.31 |
| Microsoft.EntityFrameworkCore.Sqlite | 8.0.31 |
| Swashbuckle.AspNetCore | 6.9.0 |
| Bootstrap local | 5.1.0 |

SDK observado: 8.0.425 y 9.0.318; target net8.0, sin global.json. Cookie: AresQA.Session. Credenciales ficticias iniciales documentadas en README; Seed no cambia contraseñas de cuentas existentes.

Android requiere Android Studio, SDK Platform 34, Java 17 o superior y Gradle Wrapper 9.6.0. La compilación actual usa Android Gradle Plugin 9.4.1. `physicalDebug` apunta a `http://192.168.0.100:5080`; `emulatorDebug`, a `http://10.0.2.2:5080`. Ambos usan el paquete `com.example.ares.debug`. HTTP está permitido solo para esas dos direcciones.

## 🚀 ESTADO DE IMPLEMENTACIÓN Y LOGROS

- Personas: alta, consulta, búsqueda, edición de activas y baja lógica exclusiva de Administrador. EmpresaId opcional, validado contra Companies; GET expone empresaId y empresaNombre. La pantalla permite asociar o cambiar empresa.
- Empresas: alta, edición y búsqueda; NIT único de 5 a 15 dígitos.
- Solicitudes: listado, detalle, alta y edición pendiente; aprobación/rechazo solo por Administrador. Motivo obligatorio al rechazar; no hay reapertura, eliminación ni edición de resueltas. Version protege contra escrituras obsoletas.
- Empresa automática (modo normal): la persona debe estar activa y asociada a una empresa para crear/editar solicitudes. La UI deriva y deshabilita el selector; la API valida la relación. EmpresaId omitido/0 utiliza la asociación; otro valor devuelve 409; persona sin empresa devuelve 400. En modo bugs la UI/API intencionalmente permiten empresa distinta y persona sin asociación.
- Cambiar la empresa de una persona no reescribe solicitudes anteriores. Editar una pendiente usa la empresa actual. Las resueltas conservan el ID registrado; los nombres se consultan del directorio actual.
- Usuarios: GET y POST /api/usuarios solo para Administrador. Alta con email, password y rol canónico Administrador u Operador. “Administrador (admin)” es una etiqueta, no el valor literal admin. Cuenta, rol y código se guardan en una transacción.
- Correo máximo 120; contraseña de 8 a 100 caracteres, con mayúscula, minúscula, número y símbolo. Alta 201; duplicado 409; rol/clave inválidos 400; operador 403. No hay registro público, eliminación ni cambio de contraseñas.
- Orden: personas, empresas y solicitudes por Id descendente; usuarios por UserCodes.Id descendente. Más reciente significa creación, no última edición. Usuarios devuelve array sin paginación.
- Códigos PER/EMP derivados del ID; USU persistido en UserCodes; SOL representa el ID de solicitud en UI. Mínimo cuatro dígitos sin truncar. Documento y NIT son campos independientes.
- Sesión por cookie, Swagger con CSRF, /api/auth/me incluye USU. API devuelve 401/403; páginas redirigen a login.
- Modo de bugs intencionales disponible en Development/Testing: switch en la página Configuraciones solo para Administrador, estado persistente, base SQLite de laboratorio separada, aislamiento de peticiones durante el cambio y logout forzado con revisión de modo para escrituras de pestañas antiguas. En ON la barra superior cambia a naranja.
- Los 20 comportamientos intencionales se limitan a la base de laboratorio. `bugs_documentation.md` especifica la matriz Web/API/Android; el modo está OFF en el primer arranque y conserva su estado al reiniciar.
- Android nativo: login/logout, cookie y CSRF, mensajes de red, personas, empresas, solicitudes y usuarios. La URL se inyecta mediante `BuildConfig.API_BASE_URL`.

Verificaciones efectuadas durante la implementación, no repetidas en esta actualización documental:

| Área | Evidencia |
|---|---|
| Compilación | 0 errores y 0 advertencias |
| Persistencia | Actualización aditiva conservando datos y arranque desde base vacía |
| UI | Alta de empresa, creación/aprobación de solicitud, asociación de persona y empresa automática |
| Solicitudes API | Edición pendiente 200; versión antigua y edición resuelta 409; motivo ausente 400; operador resolviendo 403 |
| Asociación API | Empresa derivada correcta; empresa distinta 409; persona sin empresa 400 |
| Usuarios API | Altas de ambos roles 201; login nuevo operador 200; duplicado 409; rol/clave inválidos 400; operador creando 403 |
| Orden | USU-0004 a USU-0001, PER-0025 y EMP-0005 primero en base aislada |
| APK | Variantes física y emulador compiladas; manifiesto inspeccionado con aapt2 |
| Emulador | APK instalada en Pixel_7; login real, USU-0001/Administrador y 26 personas cargadas |

Validación del modo de bugs el 2026-10-04: `dotnet build AresQA.csproj --no-restore -p:OutputPath=work\build-bugs\` terminó con cero advertencias y errores. Smoke API en bases temporales aisladas verificó estado inicial OFF, cambio ON/OFF y re-login, contraseña incorrecta aceptada, filtro de activas incluyendo inactivas, solicitud para persona sin empresa, cookie conservada al hacer logout, alta de usuario por Operador, empresa diferente en solicitud, aprobación por Operador, rechazo sin motivo, edición de solicitud resuelta y edición con versión antigua. Las bases temporales se retiraron después de la comprobación. No se añadió una suite de tests.

Datos iniciales: 25 personas (20 activas), cinco empresas, dos usuarios y cero solicitudes; personas sin empresa. La base principal contenía además una empresa y tres solicitudes de práctica al finalizar las comprobaciones anteriores; es una referencia histórica, no una garantía sobre datos posteriores.

Las cuentas de comprobación se crearon en work/association-validation.db (puerto temporal 5082), no en la base principal. También existe work/fresh-v2.db. No se añadieron suites de tests. No se verificaron integralmente reset/restauración, carga ni todos los navegadores.

## 🛑 BUGS APRENDIDOS Y "CALEFACCIÓN" DEL CÓDIGO

1. **MSB3026 por ejecutable bloqueado:** Windows impedía recompilar mientras AresQA.exe seguía activo. Detener la instancia propia con Ctrl+C antes de compilar y reiniciar después. Comprobar el proceso actual; no reutilizar PID o sesión de otra conversación.
2. **EnsureCreated no migra:** conservar el orden EnsureCreated → SchemaUpgrade → Seed. SchemaUpgrade comprueba Companies, Requests, UserCodes y Persons.EmpresaId; no basta con comprobar tablas. Antes de alterar usa SqliteConnection.BackupDatabase, que incorpora WAL confirmado, y ejecuta cambios en transacción. No borrar datos para actualizar.
3. **Actualizador limitado:** no hay migraciones EF implementadas ni historial formal. La carpeta Data/Migrations no contiene migraciones. No ejecutar dotnet ef database update ni asumir que SchemaUpgrade adapta cualquier cambio futuro.
4. **Relación nullable:** Persons.EmpresaId admite null para conservar personas anteriores. FK con DeleteBehavior.Restrict e índice. No inventar empresas iniciales para personas existentes. PersonService valida la relación y PersonsController carga la navegación para devolver empresaNombre.
5. **Empresa en solicitudes:** conservar validación en servidor; un selector deshabilitado no es una garantía de integridad. El JavaScript envía explícitamente la empresa mostrada y RequestService compara con la persona. No volver a permitir elegir cualquier empresa independiente.
6. **Concurrencia:** RequestService valida e incrementa Version; EF la configura como token y captura DbUpdateConcurrencyException para devolver 409. No reducirlo solo a una comprobación previa.
7. **Identity:** no sustituir GUID de usuarios por USU. UserCodes proporciona secuencia persistente; mantener transacción de cuenta, rol y código. No devolver contraseñas ni hashes. Seed asigna códigos faltantes sin modificar cuentas existentes.
8. **CSRF:** obtener token después del login y conservar cookies; enviar X-CSRF-TOKEN en escrituras. Swagger y JavaScript ya implementan el flujo.
9. **Serialización:** RequestsController proyecta respuestas para evitar ciclos. Person.Empresa está excluida de JSON y EmpresaNombre es calculada; conservar la carga de navegación.
10. **Datos de ejemplo:** sustituir únicamente documentos QA de ejemplos originales reconocibles. No reescribir registros del usuario ni confundir códigos con documento/NIT.
11. **Acceso LAN:** iniciar con `start-lan.ps1`, que enlaza `0.0.0.0:5080`. Conservar `AllowedHosts` con `192.168.0.100` y `10.0.2.2`. La regla TCP 5080 requiere PowerShell elevado y debe limitarse a perfil Private y LocalSubnet.
12. **Android y HTTP:** la excepción de tráfico claro está limitada a las dos IP del laboratorio. No convertirla en permiso global ni utilizarla fuera de una red controlada.
13. **Sesión móvil:** ApiClient conserva cookies, solicita CSRF antes de cada escritura y renueva el token tras login. Mantener las llamadas fuera del hilo de UI. Un 401 vuelve al login; 403 se presenta al usuario.
14. **Variantes:** usar `assemblePhysicalDebug` para teléfono y `assembleEmulatorDebug` para AVD. No intercambiar permanentemente `192.168.0.100` y `10.0.2.2`.

Backups: work/backups/entrega2-FECHA/aresqa-before-v2.db. La marca temporal usa UTC. work/** está excluido de compilación y Git; bases Data/*.db* también están excluidas de Git. reset-data.ps1 respalda Data/aresqa.db y Data/aresqa-bugs.db (incluidos -wal/-shm), preserva Data/bugs-mode.json y requiere el puerto 5080 detenido; revisar antes de usar con una conexión personalizada.

## ⚡ PRÓXIMOS PASOS DE CODIFICACIÓN (FASE ACTUAL)

Los cuatro cambios solicitados están implementados. Pendientes propuestos, sujetos al siguiente alcance del usuario:

1. Completar una verificación manual de reset y restauración en una copia aislada, conservando respaldo.
2. Revisar accesibilidad y disposición de formularios/tablas en pantallas pequeñas y otros navegadores.
3. Antes de otro cambio de esquema, definir historial explícito de versiones o migraciones con conservación de datos.
4. Si se solicita historial inmutable, añadir eventos o snapshots de resolución; hoy los nombres reflejan el directorio actual.
5. Ejecutar `configure-mobile-firewall.ps1` como administrador y validar la APK física desde un teléfono de la misma subred.

No añadir suites de tests ni ampliar a eliminación de usuarios o recuperación de contraseñas sin solicitud.

## 💾 SNIPPETS CLAVE EN DESARROLLO

Extractos del código actual; consultar los archivos completos antes de editar.

Inicialización en Program.cs:

```csharp
await db.Database.EnsureCreatedAsync();
await SchemaUpgrade.Apply(db, app.Environment.ContentRootPath);
await Seed.Initialize(scope.ServiceProvider);
```

Relación y concurrencia en Data/ApplicationDbContext.cs:

```csharp
builder.Entity<Person>().HasOne(p => p.Empresa).WithMany()
    .HasForeignKey(p => p.EmpresaId).OnDelete(DeleteBehavior.Restrict);
builder.Entity<ServiceRequest>().Property(r => r.Version).IsConcurrencyToken();
```

Derivación de empresa en Services/RequestService.cs:

```csharp
var person = await db.Persons.AsNoTracking()
    .FirstOrDefaultAsync(p => p.Id == input.PersonaId && p.Activo)
    ?? throw new RuleException(400, "Selecciona una persona activa.");
if (!person.EmpresaId.HasValue)
    throw new RuleException(400, "Primero asocia la persona a una empresa en Personas.");
if (input.EmpresaId != 0 && input.EmpresaId != person.EmpresaId)
    throw new RuleException(409, "La empresa de la persona cambió. Recarga el formulario.");
request.PersonaId = input.PersonaId;
request.EmpresaId = person.EmpresaId.Value;
```

Contrato de alta administrativa, con cookie y X-CSRF-TOKEN:

```json
{
  "email": "nuevo.operador@example.test",
  "password": "Practica123!",
  "rol": "Operador"
}
```

POST /api/solicitudes/{id}/resolver, usando la versión actual obtenida por GET:

```json
{"estado":"Rechazada","observacion":"Falta documentación.","version":1}
```

Arranque desde PowerShell:

```powershell
cd "C:\00. BORRAR\Aplicacion BBV\AresQA"
dotnet restore AresQA.csproj
dotnet build AresQA.csproj --no-restore
dotnet run --project AresQA.csproj --launch-profile AresQA
```

Web: http://localhost:5080/ — Swagger: http://localhost:5080/swagger.

Compilación Android:

```powershell
cd "C:\00. BORRAR\Aplicacion BBV\AresAndroid"
.\gradlew.bat assemblePhysicalDebug assembleEmulatorDebug
```

Arranque LAN:

```powershell
cd "C:\00. BORRAR\Aplicacion BBV\AresQA"
.\configure-mobile-firewall.ps1 # una vez, PowerShell como administrador
.\start-lan.ps1                 # ejecución normal posterior
```
