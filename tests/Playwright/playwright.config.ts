import { defineConfig } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";

// Una carpeta por ejecución, milisegundos y un sufijo único.
const inicio = new Date();
const fecha = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/La_Paz",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
}).formatToParts(inicio).map(parte => [parte.type, parte.value]));
const marca = `${fecha.year}-${fecha.month}-${fecha.day}_${fecha.hour}-${fecha.minute}-${fecha.second}-${String(inicio.getUTCMilliseconds()).padStart(3, "0")}`;

// Los workers heredan el ID del proceso principal para reunir todos los navegadores en el mismo reporte.
const idEjecucion = process.env.ARES_REPORT_RUN_ID || `${marca}_${randomUUID().slice(0, 8)}`;
process.env.ARES_REPORT_RUN_ID = idEjecucion;
if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}-[0-9]{3}_[a-f0-9]{8}$/.test(idEjecucion)) {
  throw new Error("El identificador de historial de Playwright no es válido.");
}
const carpetaEjecucion = path.join(__dirname, "historial-reportes", idEjecucion);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  metadata: { ejecucion: idEjecucion, zonaHoraria: "America/La_Paz" },
  outputDir: path.join(carpetaEjecucion, "evidencias"),
  reporter: [
    ["list"],
    ["html", { outputFolder: path.join(carpetaEjecucion, "reporte"), open: "never" }],
    ["json", { outputFile: path.join(carpetaEjecucion, "resultados.json") }],
  ],
  use: {
    baseURL: process.env.ARES_URL || "http://localhost:5080",
    headless: false, //prueba en modo visual.
    //launchOptions: {
    //  slowMo: 1000, // Retardo de un segundo entre acciones para observar la prueba.
    //},
    //viewport: { width: 1440, height: 1000 },
    viewport: null,
    locale: "es-BO",
    timezoneId: "America/La_Paz",
    screenshot: "on",
    trace: "retain-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
        launchOptions: { args: ["--start-maximized"], slowMo: 1500 },
      },
    },
    // { name: 'firefox', use: { browserName: 'firefox' } },
  ],
});
