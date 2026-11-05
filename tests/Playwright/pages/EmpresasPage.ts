import { expect, Locator, Page } from '@playwright/test';
import { DatosEmpresa, EmpresaCreada } from '../helpers/datos-e2e';
import { BasePage } from './BasePage';

export class EmpresasPage extends BasePage {
  readonly titulo: Locator;
  readonly botonNueva: Locator;
  readonly editor: Locator;
  readonly inputNit: Locator;
  readonly inputNombre: Locator;
  readonly inputCorreo: Locator;
  readonly inputTelefono: Locator;
  readonly inputDireccion: Locator;
  readonly botonGuardar: Locator;
  readonly filas: Locator;
  readonly totalResultados: Locator;

  constructor(page: Page) {
    super(page);
    this.titulo = page.getByRole('heading', { name: 'Gestión de empresas', exact: true });
    this.botonNueva = page.locator('#new');
    this.editor = page.locator('#editor');
    this.inputNit = page.locator('#nit');
    this.inputNombre = page.locator('#nombre');
    this.inputCorreo = page.locator('#correo');
    this.inputTelefono = page.locator('#telefono');
    this.inputDireccion = page.locator('#direccion');
    this.botonGuardar = page.locator('#save');
    this.filas = page.locator('#rows tr');
    this.totalResultados = page.locator('#total');
  }

  async ir(): Promise<void> {
    await this.enlaceEmpresas.click();
    await expect(this.titulo).toBeVisible();
    await expect(this.totalResultados).toHaveText(/^\d+ resultados$/);
  }

  filaPorNit(nit: string): Locator {
    return this.filas.filter({ has: this.page.getByRole('cell', { name: nit, exact: true }) });
  }

  async registrar(datos: DatosEmpresa): Promise<EmpresaCreada> {
    await this.botonNueva.click();
    await expect(this.editor).toBeVisible();
    await this.inputNit.fill(datos.nit);
    await this.inputNombre.fill(datos.nombre);
    await this.inputCorreo.fill(datos.correo);
    await this.inputTelefono.fill(datos.telefono);
    await this.inputDireccion.fill(datos.direccion);

    // Capturar la respuesta de la acción Web permite guardar el ID sin crear datos por API.
    const [respuesta] = await Promise.all([
      this.page.waitForResponse(r => new URL(r.url()).pathname === '/api/empresas' && r.request().method() === 'POST'),
      this.botonGuardar.click(),
    ]);
    expect(respuesta.status(), await respuesta.text()).toBe(201);
    await expect(this.editor).not.toBeVisible();
    await expect(this.filaPorNit(datos.nit)).toHaveCount(1);
    return respuesta.json();
  }
}
