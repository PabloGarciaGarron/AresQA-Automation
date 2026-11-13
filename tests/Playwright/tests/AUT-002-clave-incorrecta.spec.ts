/*
 * AUT-002 / WEB-TC-004
 * Objetivo: rechazar una contraseña incorrecta sin conceder sesión.
 * Precondiciones: Operador habilitado y sin bloqueo. Solo se envía un intento inválido.
 */
import { test, expect } from '../helpers/fixtures';
import { CUENTAS } from '../helpers/datos';
import { estadoSesion } from '../helpers/api';

test('AUT-002 | WEB-TC-004 | Contraseña incorrecta del Operador', async ({ loginPage, page }, info) => {
  // 1. PREPARACIÓN: el acceso correcto limpia intentos fallidos anteriores.
  await test.step('Preparar una sesión cerrada de Operador', async () => {
    await loginPage.iniciarSesion('operador');
    await loginPage.cerrarSesion();
  });

  try {
    // 2. ACCIÓN Y VERIFICACIÓN: enviar una clave errónea y comprobar el rechazo.
    await test.step('Rechazar contraseña incorrecta y verificar ausencia de sesión', async () => {
      await loginPage.ingresar(CUENTAS.operador.correo, CUENTAS.operador.clave + '-incorrecta');
      await expect(loginPage.mensajeError).toContainText('Credenciales incorrectas o cuenta temporalmente bloqueada.');
      await expect(page).toHaveURL(/\/Login(?:\?|$)/);
      expect(await estadoSesion(page.request)).toBe(401);
      await info.attach('rechazo-de-clave.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    });
  } finally {
    // 3. RESTABLECIMIENTO: limpiar el contador con la clave correcta y cerrar sesión.
    await test.step('Restablecer contador de intentos del Operador', async () => {
      await loginPage.iniciarSesion('operador');
      await loginPage.cerrarSesion();
    });
  }
});
