import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { CUENTAS, RolCuenta } from './datos';

export async function obtenerTokenCSRF(api: APIRequestContext): Promise<string> {
  const response = await api.get('/api/auth/csrf');
  expect(response.status(), 'Obtener token CSRF de la sesión').toBe(200);

  const data: unknown = await response.json();
  if (
    typeof data !== 'object'
    || data === null
    || !('token' in data)
    || typeof data.token !== 'string'
    || data.token.length === 0
  ) {
    throw new Error('La respuesta de /api/auth/csrf no contiene un token válido.');
  }

  return data.token;
}

export async function iniciarSesionApi(
  api: APIRequestContext,
  rol: RolCuenta = 'admin',
): Promise<APIResponse> {
  const csrfToken = await obtenerTokenCSRF(api);
  const cuenta = CUENTAS[rol];

  return api.post('/api/auth/login', {
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-TOKEN': csrfToken,
    },
    data: {
      email: cuenta.correo,
      password: cuenta.clave,
    },
  });
}
