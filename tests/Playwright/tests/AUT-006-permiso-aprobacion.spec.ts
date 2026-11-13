/*
 * AUT-006 / WEB-TC-022
 * Objetivo: comprobar que Operador no tiene la acción Aprobar en la Web.
 * Precondiciones: una empresa existente y Operador habilitado. Se prepara una solicitud propia.
 */
import { test, expect } from '../helpers/fixtures';
import { consultarSolicitud, prepararSolicitudPendiente } from '../helpers/api';

test('AUT-006 | WEB-TC-022 | Operador no dispone de Aprobar', async ({ loginPage, solicitudesPage, page }, info) => {
  // 1. PREPARACIÓN: crear persona y solicitud mediante API usando la sesión Operador.
  await loginPage.iniciarSesion('operador');
  const datos = await test.step('Preparar una solicitud pendiente independiente', async () => {
    return prepararSolicitudPendiente(page.request);
  });
  await info.attach('preparacion.json', { body: JSON.stringify(datos), contentType: 'application/json' });

  // 2. PERMISOS: consultar la solicitud y comprobar las acciones disponibles.
  await test.step('Consultar permisos del Operador en la Web', async () => {
    await solicitudesPage.ir();
    await solicitudesPage.buscar(datos.asunto);
    await expect(solicitudesPage.estadoPorAsunto(datos.asunto)).toHaveText('Pendiente');
    await expect(solicitudesPage.accionPorAsunto(datos.asunto, 'Editar')).toBeVisible();
    await expect(solicitudesPage.accionPorAsunto(datos.asunto, 'Aprobar')).toHaveCount(0);
    await expect(solicitudesPage.accionPorAsunto(datos.asunto, 'Rechazar')).toHaveCount(0);
  });

  // 3. INTEGRIDAD: la solicitud consultada debe mantener estado y versión iniciales.
  await test.step('Verificar detalle y conservación del estado Pendiente', async () => {
    await solicitudesPage.verDetalle(datos.asunto);
    await expect(solicitudesPage.tituloDetalle).toContainText('Pendiente');
    expect(await consultarSolicitud(page.request, datos.solicitud.id)).toMatchObject({
      estado: 'Pendiente', version: datos.solicitud.version,
    });
  });
});
