import { expect, Locator, Page } from '@playwright/test';
import { CUENTAS, RolCuenta } from '../helpers/datos';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  readonly inputCorreo: Locator;
  readonly inputClave: Locator;
  readonly botonIngresar: Locator;
  readonly mensajeError: Locator;
  readonly titulo: Locator;

  constructor(page: Page) {
    super(page);
    this.inputCorreo = page.getByLabel('Correo electrónico', { exact: true });
    this.inputClave = page.getByLabel('Contraseña', { exact: true });
    this.botonIngresar = page.getByRole('button', { name: 'Iniciar sesión', exact: true });
    this.mensajeError = page.getByRole('alert');
    this.titulo = page.getByRole('heading', { name: 'Iniciar sesión', exact: true });
  }

  async ir(): Promise<void> {
    await this.page.goto('/Login');
  }

  // Permite enviar tanto credenciales válidas como inválidas desde los casos.
  async ingresar(correo: string, clave: string): Promise<void> {
    await this.inputCorreo.fill(correo);
    await this.inputClave.fill(clave);
    await this.botonIngresar.click();
  }

  async iniciarSesion(rol: RolCuenta = 'admin'): Promise<void> {
    await this.ir();
    await this.ingresar(CUENTAS[rol].correo, CUENTAS[rol].clave);
    await expect(this.sesion).toContainText(CUENTAS[rol].correo);
    // La navegación termina después de que la pantalla de Personas esté disponible.
    await expect(this.page.getByRole('heading', { name: 'Gestión de personas', exact: true })).toBeVisible();
    await expect(this.page.locator('#result-count')).toHaveText(/^\d+ resultados$/);
  }
}
