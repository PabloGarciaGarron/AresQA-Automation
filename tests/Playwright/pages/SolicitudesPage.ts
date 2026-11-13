import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';
import { DatosSolicitud, SolicitudCreada } from '../helpers/datos-e2e';

export class SolicitudesPage extends BasePage {
  readonly titulo: Locator;
  readonly inputBuscar: Locator;
  readonly botonBuscar: Locator;
  readonly filas: Locator;
  readonly totalResultados: Locator;
  readonly tituloDetalle: Locator;
  readonly botonNueva: Locator;
  readonly editor: Locator;
  readonly selectorPersona: Locator;
  readonly selectorEmpresa: Locator;
  readonly inputAsunto: Locator;
  readonly inputDescripcion: Locator;
  readonly botonGuardar: Locator;
  readonly decision: Locator;
  readonly inputObservacion: Locator;
  readonly botonConfirmar: Locator;
  readonly detalle: Locator;

  constructor(page: Page) {
    super(page);
    this.titulo = page.getByRole('heading', { name: 'Solicitudes', exact: true });
    this.inputBuscar = page.getByLabel('Buscar solicitud', { exact: true });
    this.botonBuscar = page.getByRole('button', { name: 'Buscar', exact: true });
    this.filas = page.locator('#rows tr');
    this.totalResultados = page.locator('#total');
    this.tituloDetalle = page.locator('#detail-title');
    this.botonNueva = page.locator('#new');
    this.editor = page.locator('#editor');
    this.selectorPersona = page.locator('#personaId');
    this.selectorEmpresa = page.locator('#empresaId');
    this.inputAsunto = page.locator('#asunto');
    this.inputDescripcion = page.locator('#descripcion');
    this.botonGuardar = page.locator('#save');
    this.decision = page.locator('#decision');
    this.inputObservacion = page.locator('#observacion');
    this.botonConfirmar = page.locator('#confirm-decision');
    this.detalle = page.locator('#detail-body');
  }

  async ir(): Promise<void> {
    await this.enlaceSolicitudes.click();
    await expect(this.titulo).toBeVisible();
    await expect(this.totalResultados).toHaveText(/^\d+ resultados$/);
  }

  async buscar(asunto: string, criterio: string = asunto): Promise<void> {
    await this.inputBuscar.fill(criterio);
    const pendiente = this.page.waitForResponse(respuesta => {
      const url = new URL(respuesta.url());
      return url.pathname === '/api/solicitudes' && url.searchParams.get('buscar') === criterio;
    });
    await this.botonBuscar.click();
    const respuesta = await pendiente;
    expect(respuesta.status()).toBe(200);
    const datos = await respuesta.json();
    await expect(this.totalResultados).toHaveText(`${datos.total} resultados`);
    await expect(this.filaPorAsunto(asunto)).toHaveCount(1);
  }

  filaPorAsunto(asunto: string): Locator {
    return this.filas.filter({ hasText: asunto });
  }

  estadoPorAsunto(asunto: string): Locator {
    return this.filaPorAsunto(asunto).locator('.badge-state');
  }

  accionPorAsunto(asunto: string, accion: 'Editar' | 'Aprobar' | 'Rechazar' | 'Ver'): Locator {
    return this.filaPorAsunto(asunto).getByRole('button', { name: accion, exact: true });
  }

  async verDetalle(asunto: string): Promise<void> {
    await this.accionPorAsunto(asunto, 'Ver').click();
    await expect(this.tituloDetalle).toBeVisible();
  }

  async crear(datos: DatosSolicitud, criterioBusqueda: string = datos.asunto): Promise<SolicitudCreada> {
    await this.botonNueva.click();
    await expect(this.editor).toBeVisible();
    await this.selectorPersona.selectOption(String(datos.personaId));
    // Con ON el selector es editable; elegir la empresa correcta mantiene válido este flujo positivo.
    if (await this.selectorEmpresa.isEnabled()) await this.selectorEmpresa.selectOption(String(datos.empresaId));
    await expect(this.selectorEmpresa).toHaveValue(String(datos.empresaId));
    await this.inputAsunto.fill(datos.asunto);
    await this.inputDescripcion.fill(datos.descripcion);
    const [respuesta] = await Promise.all([
      this.page.waitForResponse(r => new URL(r.url()).pathname === '/api/solicitudes' && r.request().method() === 'POST'),
      this.botonGuardar.click(),
    ]);
    expect(respuesta.status(), await respuesta.text()).toBe(201);
    await expect(this.editor).not.toBeVisible();
    await this.buscar(datos.asunto, criterioBusqueda);
    return respuesta.json();
  }

  async aprobar(id: number, asunto: string, observacion: string): Promise<void> {
    await this.accionPorAsunto(asunto, 'Aprobar').click();
    await expect(this.decision).toBeVisible();
    await this.inputObservacion.fill(observacion);
    const [respuesta] = await Promise.all([
      this.page.waitForResponse(r => new URL(r.url()).pathname === `/api/solicitudes/${id}/resolver` && r.request().method() === 'POST'),
      this.botonConfirmar.click(),
    ]);
    // HTTP 204 no contiene cuerpo; comprobar únicamente el estado de la respuesta.
    expect(respuesta.status(), 'La aprobación debe responder HTTP 204').toBe(204);
    await expect(this.decision).not.toBeVisible();
    await expect(this.estadoPorAsunto(asunto)).toHaveText('Aprobada');
  }

  valorDetalle(etiqueta: string): Locator {
    return this.detalle.locator('dt').filter({ hasText: new RegExp(`^${etiqueta}$`) }).locator('xpath=following-sibling::dd[1]');
  }
}
