/*
 * AUT-008 / WEB-TC-006
 * Objetivo: cerrar sesión y comprobar que el cliente ya no accede a Personas.
 * Precondiciones: Operador habilitado; sesión independiente de los demás casos.
 */
import { test, expect } from '../helpers/fixtures';
import { estadoSesion } from '../helpers/api';

test('AUT-008 | WEB-TC-006 | Logout impide acceso protegido', async ({ loginPage, personasPage, page }) => {
  // 1. LOGIN Y LOGOUT: cerrar una sesión autenticada desde la barra de navegación.
  await test.step('Iniciar y cerrar sesión de Operador', async () => {
    await loginPage.iniciarSesion('operador');
    await loginPage.cerrarSesion();
  });

  // 2. ACCESO PROTEGIDO: volver a Personas exige autenticación nueva.
  await test.step('Comprobar redirección al Login y ausencia de sesión', async () => {
    await personasPage.ir();
    await expect(page).toHaveURL(/\/Login\?ReturnUrl=/);
    await expect(loginPage.titulo).toBeVisible();
    await expect(personasPage.botonNueva).toHaveCount(0);
    expect(await estadoSesion(page.request)).toBe(401);
  });
});
