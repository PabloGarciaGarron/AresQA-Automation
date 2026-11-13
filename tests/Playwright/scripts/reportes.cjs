const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

// Este visor solo consulta reportes ya generados. No importa ni ejecuta la configuración de tests.
const historial = path.resolve(__dirname, '..', 'historial-reportes');

function leerResultados(carpeta) {
  try { return JSON.parse(fs.readFileSync(path.join(carpeta, 'resultados.json'), 'utf8')); }
  catch { return null; }
}

function modosRegistrados(resultados) {
  const modos = new Set();
  function visitar(suite) {
    for (const spec of suite.specs || []) {
      for (const test of spec.tests || []) {
        for (const resultado of test.results || []) {
          for (const adjunto of resultado.attachments || []) {
            if (adjunto.name !== 'entorno.json') continue;
            try {
              const texto = adjunto.body
                ? Buffer.from(adjunto.body, 'base64').toString('utf8')
                : fs.readFileSync(adjunto.path, 'utf8');
              const entorno = JSON.parse(texto);
              const activo = entorno.modo?.enabled ?? entorno.mode?.enabled;
              if (typeof activo === 'boolean') modos.add(activo ? 'ON' : 'OFF');
            } catch { /* Un adjunto ausente no impide abrir el reporte HTML. */ }
          }
        }
      }
    }
    for (const hija of suite.suites || []) visitar(hija);
  }
  for (const suite of resultados?.suites || []) visitar(suite);
  return [...modos].sort().join('/') || 'Sin registro';
}

function buscarReportes() {
  if (!fs.existsSync(historial)) return [];
  return fs.readdirSync(historial, { withFileTypes: true })
    .filter(entrada => entrada.isDirectory())
    .map(entrada => ({ id: entrada.name, carpeta: path.join(historial, entrada.name) }))
    .filter(reporte => fs.existsSync(path.join(reporte.carpeta, 'reporte', 'index.html')))
    .sort((a, b) => b.id.localeCompare(a.id));
}

function main() {
  const args = process.argv.slice(2);
  const reportes = buscarReportes();
  if (args[0] === '--list') {
    if (!reportes.length) { console.log('Todavía no hay reportes guardados. Ejecuta npm.cmd test.'); return; }
    console.table(reportes.map(reporte => {
      const datos = leerResultados(reporte.carpeta);
      return {
        Ejecucion: reporte.id,
        Bugs: modosRegistrados(datos),
        Aprobadas: datos?.stats?.expected ?? '-',
        Fallidas: datos?.stats?.unexpected ?? '-',
        Inestables: datos?.stats?.flaky ?? '-',
        Omitidas: datos?.stats?.skipped ?? '-',
      };
    }));
    return;
  }

  // --ruta permite consultar qué reporte se abrirá sin levantar el servidor ni el navegador.
  const soloRuta = args.includes('--ruta');
  const seleccion = args.filter(arg => arg !== '--ruta');
  if (seleccion.length > 1 || seleccion.some(arg => arg.startsWith('--'))) {
    throw new Error('Uso: npm.cmd run report -- [ID] [--ruta], o npm.cmd run report:historial.');
  }
  const reporte = seleccion.length ? reportes.find(item => item.id === seleccion[0]) : reportes[0];
  if (!reporte) throw new Error(seleccion.length
    ? 'No existe ese reporte. Consulta los ID con npm.cmd run report:historial.'
    : 'No hay reportes disponibles. Ejecuta npm.cmd test.');
  const carpetaHtml = path.join(reporte.carpeta, 'reporte');
  console.log(`Reporte: ${reporte.id}`);
  console.log(carpetaHtml);
  if (soloRuta) return;

  const cli = require.resolve('@playwright/test/cli');
  const visor = spawn(process.execPath, [cli, 'show-report', carpetaHtml], {
    stdio: 'inherit', windowsHide: true,
  });
  visor.on('error', error => { console.error(error.message); process.exitCode = 1; });
  visor.on('exit', code => { process.exitCode = code ?? 1; });
}

try { main(); }
catch (error) { console.error(error.message); process.exitCode = 1; }
