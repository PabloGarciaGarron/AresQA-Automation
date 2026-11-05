import { expect, Locator, Page } from '@playwright/test';

// Elementos de navegación presentes en las páginas autenticadas de Ares.
export class BasePage {
  readonly sesion: Locator;
  readonly enlaceUsuarios: Locator;
  readonly enlaceConfiguraciones: Locator;
  readonly enlaceEmpresas: Locator;
  readonly enlaceSolicitudes: Locator;
  readonly botonCerrarSesion: Locator;

  constructor(readonly page: Page) {
    this.sesion = page.locator('.session');
    this.enlaceUsuarios = page.getByRole('link', { name: 'Usuarios', exact: true });
    this.enlaceConfiguraciones = page.getByRole('link', { name: 'Configuraciones', exact: true });
    this.enlaceEmpresas = page.getByRole('link', { name: 'Empresas', exact: true });
    this.enlaceSolicitudes = page.getByRole('link', { name: 'Solicitudes', exact: true });
    this.botonCerrarSesion = page.getByRole('button', { name: 'Cerrar sesión', exact: true });
  }

  async cerrarSesion(): Promise<void> {
    await this.botonCerrarSesion.click();
    await expect(this.page).toHaveURL(/\/Login(?:\?|$)/);
  }

  async recargar(): Promise<void> {
    await this.page.reload();
  }
}
