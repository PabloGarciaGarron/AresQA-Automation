/*
 * E2E-001 / Flujo E2E previsto, sección 6.1
 * Objetivo: Login Administrador -> empresa -> persona vinculada -> solicitud -> aprobación.
 * Precondiciones: Ares iniciado y cuenta Administrador habilitada; admite bugs OFF u ON.
 * Datos: NIT, documento, correo y asunto únicos. Todo el flujo se realiza en la Web.
 * Resultado: solicitud Aprobada, versión incrementada y relaciones persistidas coherentes.
 */
import { test, expect } from '../helpers/fixtures';
import { CUENTAS } from '../helpers/datos';
import { crearDatosE2E } from '../helpers/datos-e2e';

// Guardar video y traza incluso cuando este flujo completo aprueba.
test.use({ video: 'on', trace: 'on' });

test('E2E-001 | Administrador registra empresa y persona, crea y aprueba solicitud', async ({
  loginPage, empresasPage, personasPage, solicitudesPage, page,
}, info) => {
  // El flujo completo necesita más tiempo que los casos individuales con slowMo habilitado.
  test.setTimeout(180_000);
  const datos = crearDatosE2E();
  // Buscar por el identificador único evita la limitación de búsqueda de tildes documentada.
  // El asunto completo, incluida la tilde, se conserva y se verifica en la consulta final.
  const criterioBusqueda = datos.persona.documento.slice(3);
  await info.attach('datos-e2e.json', { body: JSON.stringify(datos, null, 2), contentType: 'application/json' });
  const captura = async (nombre: string) => {
    await info.attach(nombre + '.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  };

  // 1. LOGIN: comprobar identidad y rol antes de iniciar el negocio.
  await test.step('1. Iniciar sesión como Administrador', async () => {
    await loginPage.iniciarSesion('admin');
    await expect(loginPage.sesion).toContainText(CUENTAS.admin.correo);
    await expect(loginPage.sesion).toContainText('Administrador');
    await captura('01-login-administrador');
  });

  // 2. EMPRESA: registrar datos ficticios válidos y conservar el ID de la respuesta Web.
  const empresa = await test.step('2. Registrar una empresa con NIT único', async () => {
    await empresasPage.ir();
    const creada = await empresasPage.registrar(datos.empresa);
    const fila = empresasPage.filaPorNit(datos.empresa.nit);
    await expect(fila).toContainText(datos.empresa.nombre);
    await expect(fila).toContainText(datos.empresa.correo);
    expect(creada.id).toBeGreaterThan(0);
    await captura('02-empresa-registrada');
    return creada;
  });

  // 3. PERSONA: elegir la empresa recién registrada y comprobar la asociación.
  const persona = await test.step('3. Registrar una persona vinculada a la empresa', async () => {
    await personasPage.ir();
    await personasPage.esperarLista();
    const creada = await personasPage.registrar(datos.persona, empresa.id);
    await expect(personasPage.filaPorDocumento(datos.persona.documento)).toHaveCount(1);
    await expect(personasPage.filaPorDocumento(datos.persona.documento)).toContainText(datos.empresa.nombre);
    await expect(personasPage.estadoPorDocumento(datos.persona.documento)).toHaveText('Activa');
    expect(creada.empresaId).toBe(empresa.id);
    await captura('03-persona-vinculada');
    return creada;
  });

  // 4. SOLICITUD: seleccionar esa persona y verificar la empresa antes de guardar.
  const solicitud = await test.step('4. Crear una solicitud pendiente con relaciones correctas', async () => {
    await solicitudesPage.ir();
    const creada = await solicitudesPage.crear({
      personaId: persona.id, empresaId: empresa.id, asunto: datos.asunto, descripcion: datos.descripcion,
    }, criterioBusqueda);
    expect(creada.estado).toBe('Pendiente');
    expect(creada.version).toBeGreaterThan(0);
    await expect(solicitudesPage.estadoPorAsunto(datos.asunto)).toHaveText('Pendiente');
    await expect(solicitudesPage.filaPorAsunto(datos.asunto)).toContainText(datos.empresa.nombre);
    await captura('04-solicitud-pendiente');
    return creada;
  });

  // 5. APROBACIÓN: resolver la solicitud como Administrador desde la interfaz.
  await test.step('5. Aprobar la solicitud como Administrador', async () => {
    await solicitudesPage.aprobar(solicitud.id, datos.asunto, datos.observacion);
    await expect(solicitudesPage.estadoPorAsunto(datos.asunto)).toHaveText('Aprobada');
    await captura('05-solicitud-aprobada');
  });

  // 6. ESTADO FINAL: recargar la Web y contrastar los registros persistidos con GET de solo lectura.
  await test.step('6. Verificar persistencia, versión, auditoría y consistencia de relaciones', async () => {
    await solicitudesPage.recargar();
    await solicitudesPage.buscar(datos.asunto, criterioBusqueda);
    await expect(solicitudesPage.estadoPorAsunto(datos.asunto)).toHaveText('Aprobada');
    await solicitudesPage.verDetalle(datos.asunto);
    await expect(solicitudesPage.tituloDetalle).toContainText('Aprobada');
    await expect(solicitudesPage.valorDetalle('Empresa')).toContainText(datos.empresa.nombre);
    await expect(solicitudesPage.valorDetalle('Persona')).toContainText(`PER-${String(persona.id).padStart(4, '0')}`);
    await expect(solicitudesPage.valorDetalle('Resuelta por')).toHaveText(CUENTAS.admin.correo);

    const respuestas = await Promise.all([
      page.request.get(`/api/empresas/${empresa.id}`),
      page.request.get(`/api/personas/${persona.id}`),
      page.request.get(`/api/solicitudes/${solicitud.id}`),
    ]);
    for (const respuesta of respuestas) expect(respuesta.status()).toBe(200);
    const [empresaFinal, personaFinal, solicitudFinal] = await Promise.all(respuestas.map(r => r.json()));
    expect(empresaFinal).toMatchObject({ id: empresa.id, nit: datos.empresa.nit, nombre: datos.empresa.nombre });
    expect(personaFinal).toMatchObject({ id: persona.id, documento: datos.persona.documento, empresaId: empresa.id, activo: true });
    expect(solicitudFinal).toMatchObject({
      id: solicitud.id, estado: 'Aprobada', version: solicitud.version + 1,
      personaId: persona.id, empresaId: empresa.id,
      asunto: datos.asunto, descripcion: datos.descripcion,
      documento: datos.persona.documento, empresa: datos.empresa.nombre, nit: datos.empresa.nit,
      creadoPor: CUENTAS.admin.correo, resueltoPor: CUENTAS.admin.correo, observacion: datos.observacion,
    });
    expect(solicitudFinal.resueltoEn).toBeTruthy();
    expect(Number.isNaN(Date.parse(solicitudFinal.resueltoEn))).toBe(false);
    expect(solicitudFinal.empresaId).toBe(personaFinal.empresaId);
    await info.attach('consistencia-final.json', {
      body: JSON.stringify({ empresa: empresaFinal, persona: personaFinal, solicitud: solicitudFinal }, null, 2),
      contentType: 'application/json',
    });
    await captura('06-estado-final-y-relaciones');
  });
});
