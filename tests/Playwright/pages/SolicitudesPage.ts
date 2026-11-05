import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class SolicitudesPage extends BasePage {
  readonly titulo: Locator;
  readonly inputBuscar: Locator;
  readonly botonBuscar: Locator;
  readonly filas: Locator;
  readonly totalResultados: Locator;
  readonly tituloDetalle: Locator;

  constructor(page: Page) {
    super(page);
    this.titulo = page.getByRole('heading', { name: 'Solicitudes', exact: true });
    this.inputBuscar = page.getByLabel('Buscar solicitud', { exact: true });
    this.botonBuscar = page.getByRole('button', { name: 'Buscar', exact: true });
    this.filas = page.locator('#rows tr');
    this.totalResultados = page.locator('#total');
    this.tituloDetalle = page.locator('#detail-title');
  }

  async ir(): Promise<void> {
    await this.enlaceSolicitudes.click();
    await expect(this.titulo).toBeVisible();
    await expect(this.totalResultados).toHaveText(/^\d+ resultados$/);
  }

  async buscar(asunto: string): Promise<void> {
    await this.inputBuscar.fill(asunto);
    const pendiente = this.page.waitForResponse(respuesta => {
      const url = new URL(respuesta.url());
      return url.pathname === '/api/solicitudes' && url.searchParams.get('buscar') === asunto;
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
}
