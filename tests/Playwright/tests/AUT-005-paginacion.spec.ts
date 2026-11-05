/*
 * AUT-005 / WEB-TC-012
 * Objetivo: comprobar páginas sin registros repetidos y orden descendente por ID.
 * Precondiciones: más de diez personas y ninguna escritura externa durante la prueba.
 */
import { test, expect } from '../helpers/fixtures';

test('AUT-005 | WEB-TC-012 | Paginación sin repetición', async ({ loginPage, personasPage }) => {
  let primera: string[] = [];
  let segunda: string[] = [];

  // 1. PRIMERA PÁGINA: guardar los códigos de los diez registros visibles.
  await test.step('Ingresar y leer la primera página', async () => {
    await loginPage.iniciarSesion('admin');
    await expect(personasPage.botonSiguiente, 'Se requieren más de diez personas').toBeEnabled();
    await expect(personasPage.filas).toHaveCount(10);
    primera = await personasPage.obtenerCodigos();
    expect(primera).toHaveLength(10);
  });

  // 2. SEGUNDA PÁGINA: esperar el listado actualizado antes de leer los códigos.
  await test.step('Avanzar y leer la segunda página', async () => {
    await personasPage.siguientePagina(2);
    segunda = await personasPage.obtenerCodigos();
    expect(segunda.length).toBeGreaterThan(0);
  });

  // 3. VERIFICACIÓN: comparar ambas páginas y el orden numérico de sus códigos.
  await test.step('Comprobar IDs diferentes y orden descendente', async () => {
    const codigos = [...primera, ...segunda];
    expect(new Set(codigos).size).toBe(codigos.length);
    const ids = codigos.map(codigo => Number(codigo.replace('PER-', '')));
    expect(ids).toEqual([...ids].sort((a, b) => b - a));
  });
});
