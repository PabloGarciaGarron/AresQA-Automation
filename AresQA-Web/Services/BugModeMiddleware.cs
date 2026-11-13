namespace AresQA.Services;

public sealed class BugModeMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(HttpContext http, BugModeStore store, BugModeGate gate, BugModeContext mode)
    {
        var switchRequest = HttpMethods.IsPut(http.Request.Method)
            && string.Equals(http.Request.Path.Value?.TrimEnd('/'), "/api/laboratorio/modo", StringComparison.OrdinalIgnoreCase);
        using var lease = await gate.EnterAsync(switchRequest);
        mode.Initialize(store);
        http.Response.Headers["X-Ares-Mode"] = mode.Enabled ? "bugs" : "normal";
        http.Response.Headers["X-Ares-Mode-Revision"] = mode.Revision;
        http.Response.Headers.CacheControl = "no-store";

        if (!HttpMethods.IsGet(http.Request.Method) && !HttpMethods.IsHead(http.Request.Method)
            && !HttpMethods.IsOptions(http.Request.Method))
        {
            string? revision = http.Request.Headers["X-Ares-Mode-Revision"].FirstOrDefault();
            if (http.Request.HasFormContentType)
                revision ??= (await http.Request.ReadFormAsync())["__AresModeRevision"].FirstOrDefault();
            if (revision != null && revision != mode.Revision)
            {
                http.Response.StatusCode = StatusCodes.Status409Conflict;
                if (http.Request.Path.StartsWithSegments("/api"))
                    await http.Response.WriteAsJsonAsync(new { code = "mode_changed", message = "El modo cambió. Recarga e inicia sesión nuevamente." });
                else
                    http.Response.Redirect("/Login?modo=cambiado");
                return;
            }
        }
        await next(http);
    }
}
