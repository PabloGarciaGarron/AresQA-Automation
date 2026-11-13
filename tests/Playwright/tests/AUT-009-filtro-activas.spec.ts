/*
 * AUT-009 / WEB-TC-011
 * Objetivo: comprobar que el filtro Activas excluye inactivas en todas las páginas.
 * Precondiciones: personas activas e inactivas y datos estables durante el recorrido.
 */
import { test, expect } from '../helpers/fixtures';

test('AUT-009 | WEB-TC-011 | Filtro de activas en todas las páginas', async ({ loginPage, personasPage }) => {
  let activas = 0;

  // 1. PREPARACIÓN: verificar que existan ambos estados antes de aplicar el filtro.
  await test.step('Ingresar y consultar los contadores', async () => {
    await loginPage.iniciarSesion('admin');
    await expect(personasPage.totalActivas).toHaveText(/^\d+$/);
    await expect(personasPage.totalInactivas).toHaveText(/^\d+$/);
    activas = Number(await personasPage.totalActivas.innerText());
    expect(activas).toBeGreaterThan(0);
    expect(Number(await personasPage.totalInactivas.innerText()), 'Se requieren inactivas como control negativo').toBeGreaterThan(0);
  });

  // 2. FILTRO: seleccionar Activas y comprobar el total esperado.
  await test.step('Filtrar únicamente personas activas', async () => {
    await personasPage.filtrarActivas();
    await expect(personasPage.totalResultados).toHaveText(`${activas} resultados`);
  });

  // 3. VERIFICACIÓN: recorrer todas las páginas, sin inactivas ni registros repetidos.
  await test.step('Comprobar todas las páginas del resultado filtrado', async () => {
    const codigos: string[] = [];
    const paginas = Math.ceil(activas / 10);
    for (let numero = 1; numero <= paginas; numero++) {
      await expect(personasPage.numeroPagina).toHaveText(`Página ${numero} de ${paginas}`);
      const cantidad = Math.min(10, activas - codigos.length);
      await expect(personasPage.estados).toHaveText(Array(cantidad).fill('Activa'));
      codigos.push(...await personasPage.obtenerCodigos());
      if (numero < paginas) await personasPage.siguientePagina(numero + 1);
    }
    expect(codigos).toHaveLength(activas);
    expect(new Set(codigos).size).toBe(activas);
    await expect(personasPage.botonSiguiente).toBeDisabled();
  });
});
