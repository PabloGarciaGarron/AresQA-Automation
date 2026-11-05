/*
 * AUT-001 / WEB-TC-002
 * Objetivo: iniciar sesión como Administrador y comprobar sus opciones.
  */
import { test, expect } from '../helpers/fixtures';

test('AUT-001 | WEB-TC-002 | Login válido de Administrador', async ({ loginPage }) => {
  // 1. LOGIN: ingresar con las credenciales válidas del Administrador.
  await test.step('Iniciar sesión como Administrador', async () => {
    await loginPage.iniciarSesion('admin');
  });

  // 2. VERIFICACIÓN: el rol y las opciones administrativas deben estar visibles.
  await test.step('Comprobar rol y navegación administrativa', async () => {
    await expect(loginPage.sesion).toContainText('Administrador');
    await expect(loginPage.enlaceUsuarios).toBeVisible();
    await expect(loginPage.enlaceConfiguraciones).toBeVisible();
  });
});
