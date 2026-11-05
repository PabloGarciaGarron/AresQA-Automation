import { APIRequestContext, expect } from '@playwright/test';
import { crearDatosPersona } from './datos';

export interface Solicitud {
  id: number;
  estado: string;
  version: number;
}

// La API prepara datos y realiza comprobaciones complementarias de sesión/estado.
// Las acciones y los localizadores Web están en las clases de pages/.
async function crear<T>(api: APIRequestContext, ruta: string, datos: object): Promise<T> {
  const csrf = await api.get('/api/auth/csrf');
  expect(csrf.status(), 'Obtener token CSRF de la sesión').toBe(200);
  const respuesta = await api.post(ruta, {
    data: datos,
    headers: { 'X-CSRF-TOKEN': (await csrf.json()).token },
  });
  expect(respuesta.status(), `${ruta}: ${await respuesta.text()}`).toBe(201);
  return respuesta.json();
}

export async function estadoSesion(api: APIRequestContext): Promise<number> {
  return (await api.get('/api/auth/me')).status();
}

export async function consultarSolicitud(api: APIRequestContext, id: number): Promise<Solicitud> {
  const respuesta = await api.get(`/api/solicitudes/${id}`);
  expect(respuesta.status(), 'Consultar la solicitud preparada').toBe(200);
  return respuesta.json();
}

export async function prepararSolicitudPendiente(api: APIRequestContext) {
  // Usar una empresa existente evita alterar los datos de otra persona.
  const empresas = await api.get('/api/empresas?tamano=1');
  expect(empresas.status()).toBe(200);
  const empresa = (await empresas.json()).items[0] as { id: number } | undefined;
  expect(empresa, 'Debe existir al menos una empresa').toBeTruthy();
  if (!empresa) throw new Error('No hay empresas para preparar la solicitud.');

  const persona = await crear<{ id: number; documento: string }>(api, '/api/personas', {
    ...crearDatosPersona(), empresaId: empresa.id,
  });
  const asunto = `PF-Playwright permiso ${persona.documento}`;
  const solicitud = await crear<Solicitud>(api, '/api/solicitudes', {
    personaId: persona.id,
    empresaId: empresa.id,
    asunto,
    descripcion: 'Solicitud ficticia para comprobar permisos del Operador.',
  });
  return { personaId: persona.id, asunto, solicitud };
}
