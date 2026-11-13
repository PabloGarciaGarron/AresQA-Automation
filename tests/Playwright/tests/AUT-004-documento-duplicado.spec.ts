/*
 * AUT-004 / WEB-TC-009
 * Objetivo: rechazar un segundo registro con el mismo documento.
 * Precondiciones: Administrador habilitado; la persona original se crea en este caso.
 */
import { test, expect } from '../helpers/fixtures';
import { crearDatosPersona } from '../helpers/datos';

test('AUT-004 | WEB-TC-009 | Rechazar documento duplicado', async ({ loginPage, personasPage, page }, info) => {
  const datos = crearDatosPersona();

  // 1. PREPARACIÓN: crear una persona propia para no depender de otro caso.
  await test.step('Ingresar y crear la persona original', async () => {
    await loginPage.iniciarSesion('admin');
    await personasPage.registrar(datos);
  });

  // 2. DUPLICADO: repetir documento y comprobar el mensaje de validación.
  await test.step('Intentar guardar un documento duplicado', async () => {
    await personasPage.nuevaPersona();
    await personasPage.completarFormulario({ ...datos, nombres: 'Duplicado Playwright' });
    await personasPage.guardar();
    await expect(personasPage.errorFormulario).toHaveText('Ya existe una persona con ese documento.');
    await info.attach('duplicado-rechazado.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  });

  // 3. INTEGRIDAD: el intento fallido no debe crear ni modificar la persona original.
  await test.step('Consultar y comprobar que solo existe el original', async () => {
    await personasPage.cancelar();
    await personasPage.buscar(datos.documento);
    await expect(personasPage.totalResultados).toHaveText('1 resultados');
    const fila = personasPage.filaPorDocumento(datos.documento);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText(datos.nombres);
    await expect(fila).not.toContainText('Duplicado Playwright');
  });
});
