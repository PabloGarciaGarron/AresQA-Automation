/*
 * AUT-007 / WEB-TC-003
 * Objetivo: iniciar sesión como Operador y comprobar su navegación permitida.
 * Precondiciones: cuenta Operador habilitada. Admite bugs OFF u ON.
 */
import { test, expect } from '../helpers/fixtures';

test('AUT-007 | WEB-TC-003 | Login válido de Operador', async ({ loginPage }) => {
  // 1. LOGIN: ingresar con las credenciales válidas del Operador.
  await test.step('Iniciar sesión como Operador', async () => {
    await loginPage.iniciarSesion('operador');
  });

  // 2. VERIFICACIÓN: mostrar navegación funcional sin opciones administrativas.
  await test.step('Comprobar rol y opciones disponibles', async () => {
    await expect(loginPage.sesion).toContainText('Operador');
    await expect(loginPage.enlaceUsuarios).toHaveCount(0);
    await expect(loginPage.enlaceConfiguraciones).toHaveCount(0);
    await expect(loginPage.enlaceEmpresas).toBeVisible();
    await expect(loginPage.enlaceSolicitudes).toBeVisible();
  });
});
