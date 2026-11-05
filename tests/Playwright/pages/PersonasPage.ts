import { expect, Locator, Page } from '@playwright/test';
import { DatosPersona } from '../helpers/datos';
import { BasePage } from './BasePage';

export class PersonasPage extends BasePage {
  readonly titulo: Locator;
  readonly botonNueva: Locator;
  readonly editor: Locator;
  readonly inputDocumento: Locator;
  readonly inputNombres: Locator;
  readonly inputApellidos: Locator;
  readonly inputCorreo: Locator;
  readonly inputTelefono: Locator;
  readonly botonGuardar: Locator;
  readonly botonCancelar: Locator;
  readonly mensaje: Locator;
  readonly errorFormulario: Locator;
  readonly inputBuscar: Locator;
  readonly selectorEstado: Locator;
  readonly botonBuscar: Locator;
  readonly filas: Locator;
  readonly codigos: Locator;
  readonly estados: Locator;
  readonly totalResultados: Locator;
  readonly numeroPagina: Locator;
  readonly botonSiguiente: Locator;
  readonly totalActivas: Locator;
  readonly totalInactivas: Locator;

  constructor(page: Page) {
    super(page);
    this.titulo = page.getByRole('heading', { name: 'Gestión de personas', exact: true });
    this.botonNueva = page.locator('#new-person');
    this.editor = page.locator('#editor');
    this.inputDocumento = page.locator('#documento');
    this.inputNombres = page.locator('#nombres');
    this.inputApellidos = page.locator('#apellidos');
    this.inputCorreo = page.locator('#correo');
    this.inputTelefono = page.locator('#telefono');
    this.botonGuardar = page.locator('#save');
    this.botonCancelar = page.locator('#cancel-editor');
    this.mensaje = page.locator('#notice');
    this.errorFormulario = page.locator('#form-error');
    this.inputBuscar = page.getByLabel('Buscar persona', { exact: true });
    this.selectorEstado = page.getByLabel('Estado', { exact: true });
    this.botonBuscar = page.getByRole('button', { name: 'Buscar', exact: true });
    this.filas = page.locator('#people tr');
    this.codigos = page.locator('#people .person-name small');
    this.estados = page.locator('#people .badge-state');
    this.totalResultados = page.locator('#result-count');
    this.numeroPagina = page.locator('#page-number');
    this.botonSiguiente = page.locator('#next');
    this.totalActivas = page.locator('#active-count');
    this.totalInactivas = page.locator('#inactive-count');
  }

  async ir(): Promise<void> {
    await this.page.goto('/');
  }

  async esperarLista(): Promise<void> {
    await expect(this.titulo).toBeVisible();
    await expect(this.totalResultados).toHaveText(/^\d+ resultados$/);
  }

  async nuevaPersona(): Promise<void> {
    await this.botonNueva.click();
    await expect(this.editor).toBeVisible();
  }

  async completarFormulario(datos: DatosPersona): Promise<void> {
    await this.inputDocumento.fill(datos.documento);
    await this.inputNombres.fill(datos.nombres);
    await this.inputApellidos.fill(datos.apellidos);
    await this.inputCorreo.fill(datos.correo);
    await this.inputTelefono.fill(datos.telefono);
  }

  async guardar(): Promise<void> {
    await this.botonGuardar.click();
  }

  async cancelar(): Promise<void> {
    await this.botonCancelar.click();
    await expect(this.editor).not.toBeVisible();
  }

  async registrar(datos: DatosPersona): Promise<void> {
    await this.nuevaPersona();
    await this.completarFormulario(datos);
    await this.guardar();
    await expect(this.editor).not.toBeVisible();
    await expect(this.mensaje).toHaveText('Persona registrada correctamente.');
    await this.buscar(datos.documento);
  }

  filaPorDocumento(documento: string): Locator {
    return this.filas.filter({
      has: this.page.getByRole('cell', { name: documento.toUpperCase(), exact: true }),
    });
  }

  estadoPorDocumento(documento: string): Locator {
    return this.filaPorDocumento(documento).locator('.badge-state');
  }

  async editar(documento: string): Promise<void> {
    await this.filaPorDocumento(documento).getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(this.editor).toBeVisible();
  }

  async cambiarApellidosYTelefono(apellidos: string, telefono: string): Promise<void> {
    await this.inputApellidos.fill(apellidos);
    await this.inputTelefono.fill(telefono);
  }

  async buscar(documento: string): Promise<void> {
    await this.esperarLista();
    await this.inputBuscar.fill(documento);
    await this.actualizarListado(() => this.botonBuscar.click(), { buscar: documento, pagina: '1' });
  }

  async filtrarActivas(): Promise<void> {
    await this.esperarLista();
    await this.selectorEstado.selectOption('true');
    await this.actualizarListado(() => this.botonBuscar.click(), { activo: 'true', pagina: '1' });
  }

  async siguientePagina(numero: number): Promise<void> {
    await this.actualizarListado(() => this.botonSiguiente.click(), { pagina: String(numero) });
  }

  async obtenerCodigos(): Promise<string[]> {
    return this.codigos.allTextContents();
  }

  // Esperar la petición concreta y el contenido renderizado evita leer la página anterior.
  private async actualizarListado(accion: () => Promise<void>, parametros: Record<string, string>): Promise<void> {
    const pendiente = this.page.waitForResponse(respuesta => {
      const url = new URL(respuesta.url());
      return url.pathname === '/api/personas'
        && respuesta.request().method() === 'GET'
        && Object.entries(parametros).every(([clave, valor]) => url.searchParams.get(clave) === valor);
    });
    await accion();
    const respuesta = await pendiente;
    expect(respuesta.status(), 'Actualizar listado de personas').toBe(200);
    const datos = await respuesta.json() as { total: number; pagina: number; tamano: number; items: { codigo: string }[] };
    await expect(this.totalResultados).toHaveText(`${datos.total} resultados`);
    await expect(this.numeroPagina).toHaveText(`Página ${datos.pagina} de ${Math.max(1, Math.ceil(datos.total / datos.tamano))}`);
    await expect(this.codigos).toHaveText(datos.items.map(persona => persona.codigo));
  }
}
