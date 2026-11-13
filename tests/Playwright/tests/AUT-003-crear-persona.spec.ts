/*
 * AUT-003 / WEB-TC-008
 * Objetivo: registrar una persona válida y comprobar sus datos al recargar.
 * Precondiciones: Administrador habilitado; documento y correo únicos del caso.
 */
import { test, expect } from '../helpers/fixtures';
import { crearDatosPersona } from '../helpers/datos';

test('AUT-003 | WEB-TC-008 | Crear persona válida', async ({ loginPage, personasPage }, info) => {
  const datos = crearDatosPersona();
  await info.attach('datos.json', { body: JSON.stringify(datos), contentType: 'application/json' });

  // 1. LOGIN Y ALTA: completar el formulario con datos ficticios válidos.
  await test.step('Ingresar y registrar una persona nueva', async () => {
    await loginPage.iniciarSesion('admin');
    await personasPage.registrar(datos);
  });

  // 2. VERIFICACIÓN: debe existir una única fila con los datos y estado correctos.
  await test.step('Comprobar datos y estado Activa', async () => {
    const fila = personasPage.filaPorDocumento(datos.documento);
    await expect(fila).toHaveCount(1);
    await expect(fila).toContainText(datos.nombres + ' ' + datos.apellidos);
    await expect(fila).toContainText(datos.correo);
    await expect(personasPage.estadoPorDocumento(datos.documento)).toHaveText('Activa');
  });

  // 3. PERSISTENCIA: la persona debe seguir disponible después de recargar.
  await test.step('Recargar y consultar la persona guardada', async () => {
    await personasPage.recargar();
    await personasPage.buscar(datos.documento);
    await expect(personasPage.filaPorDocumento(datos.documento)).toContainText(datos.correo);
  });
});
