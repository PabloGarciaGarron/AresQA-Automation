/*
 * AUT-010 / WEB-TC-013
 * Objetivo: editar una persona activa y verificar persistencia después de recargar.
 * Precondiciones: Administrador habilitado. Solo se modifica la persona creada en el caso.
 */
import { test, expect } from '../helpers/fixtures';
import { crearDatosPersona } from '../helpers/datos';

test('AUT-010 | WEB-TC-013 | Edición persiste tras recargar', async ({ loginPage, personasPage }) => {
  const datos = crearDatosPersona();

  // 1. PREPARACIÓN: crear una persona independiente para esta edición.
  await test.step('Ingresar y crear la persona que se editará', async () => {
    await loginPage.iniciarSesion('admin');
    await personasPage.registrar(datos);
  });

  // 2. EDICIÓN: cambiar apellidos y teléfono mediante el formulario Web.
  await test.step('Editar y guardar apellidos y teléfono', async () => {
    await personasPage.editar(datos.documento);
    await personasPage.cambiarApellidosYTelefono('Actualizado Playwright', '71111111');
    await personasPage.guardar();
    await expect(personasPage.editor).not.toBeVisible();
    await expect(personasPage.mensaje).toHaveText('Persona actualizada correctamente.');
  });

  // 3. PERSISTENCIA: recargar y comprobar los valores almacenados.
  await test.step('Recargar y verificar cambios persistidos', async () => {
    await personasPage.recargar();
    await personasPage.buscar(datos.documento);
    const fila = personasPage.filaPorDocumento(datos.documento);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText('Actualizado Playwright');
    await expect(fila).toContainText('71111111');
    await expect(fila).toContainText(datos.correo);
  });
});
