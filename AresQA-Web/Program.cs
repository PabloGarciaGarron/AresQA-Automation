using AresQA.Data;
using AresQA.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<BugModeStore>();
builder.Services.AddSingleton<BugModeGate>();
builder.Services.AddScoped<BugModeContext>();
builder.Services.AddScoped<LabSignInService>();
builder.Services.AddScoped<IUserClaimsPrincipalFactory<IdentityUser>, LabClaimsPrincipalFactory>();
builder.Services.AddDbContext<ApplicationDbContext>((sp, o) => {
    var mode = sp.GetRequiredService<BugModeContext>();
    var conn = !string.IsNullOrWhiteSpace(mode.ConnectionString) ? mode.ConnectionString : (builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=Data/aresqa.db");
    o.UseSqlite(conn);
});
builder.Services.AddIdentity<IdentityUser, IdentityRole>(o => {
    o.User.RequireUniqueEmail = true;
    o.Lockout.MaxFailedAccessAttempts = 5;
    o.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
}).AddEntityFrameworkStores<ApplicationDbContext>().AddDefaultTokenProviders();
builder.Services.ConfigureApplicationCookie(o => {
    o.LoginPath = "/Login"; o.AccessDeniedPath = "/Login";
    o.Cookie.Name = "AresQA.Session"; o.ExpireTimeSpan = TimeSpan.FromMinutes(30);
    o.Events.OnRedirectToLogin = c => { if (c.Request.Path.StartsWithSegments("/api")) c.Response.StatusCode = 401; else c.Response.Redirect(c.RedirectUri); return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { if (c.Request.Path.StartsWithSegments("/api")) c.Response.StatusCode = 403; else c.Response.Redirect(c.RedirectUri); return Task.CompletedTask; };
});
builder.Services.AddAntiforgery(o => o.HeaderName = "X-CSRF-TOKEN");
builder.Services.AddControllers(o => o.Filters.Add(new AutoValidateAntiforgeryTokenAttribute()));
builder.Services.AddRazorPages();
builder.Services.AddScoped<PersonService>();
builder.Services.AddScoped<CompanyService>();
builder.Services.AddScoped<RequestService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
var app = builder.Build();
using (var scope = app.Services.CreateScope()) {
    var store = scope.ServiceProvider.GetRequiredService<BugModeStore>();
    var normalMode = scope.ServiceProvider.GetRequiredService<BugModeContext>();
    normalMode.Initialize(store, enabled: false);
    var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    await db.Database.EnsureCreatedAsync();
    await SchemaUpgrade.Apply(db, app.Environment.ContentRootPath);
    await Seed.Initialize(scope.ServiceProvider);

    if (store.Available) {
        using var bugsScope = app.Services.CreateScope();
        var bugsMode = bugsScope.ServiceProvider.GetRequiredService<BugModeContext>();
        bugsMode.Initialize(store, enabled: true);
        await BugLabSeed.Initialize(bugsScope.ServiceProvider, store);
    }
}
if (!app.Environment.IsDevelopment() && !app.Environment.IsEnvironment("Testing")) app.UseExceptionHandler("/Error");
app.UseStaticFiles();
app.UseRouting();
app.UseMiddleware<BugModeMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.UseSwagger();
app.UseSwaggerUI(o => { o.DocumentTitle = "Ares · API"; o.InjectJavascript("/js/swagger-csrf.js"); });
app.MapControllers();
app.MapRazorPages();
app.Run();
public partial class Program { }


