import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { PersonasPage } from '../pages/PersonasPage';
import { SolicitudesPage } from '../pages/SolicitudesPage';
import { EmpresasPage } from '../pages/EmpresasPage';

type Paginas = {
  loginPage: LoginPage;
  personasPage: PersonasPage;
  solicitudesPage: SolicitudesPage;
  empresasPage: EmpresasPage;
  registrarEntorno: void;
};

// Cada archivo importa esta fixture para conservar aislamiento y registrar el modo elegido.
export const test = base.extend<Paginas>({
  registrarEntorno: [async ({ page, baseURL }, usar, info) => {
    const respuesta = await page.request.get('/api/laboratorio/modo');
    expect(respuesta.status(), 'Ares debe estar iniciado').toBe(200);
    const modo = await respuesta.json();
    // El equipo decide OFF u ON; las aserciones funcionales se mantienen iguales.
    await info.attach('entorno.json', {
      body: JSON.stringify({ baseURL, modo, fecha: new Date().toISOString() }, null, 2),
      contentType: 'application/json',
    });
    await usar();
  }, { auto: true }],
  loginPage: async ({ page }, usar) => { await usar(new LoginPage(page)); },
  personasPage: async ({ page }, usar) => { await usar(new PersonasPage(page)); },
  solicitudesPage: async ({ page }, usar) => { await usar(new SolicitudesPage(page)); },
  empresasPage: async ({ page }, usar) => { await usar(new EmpresasPage(page)); },
});

export { expect };
