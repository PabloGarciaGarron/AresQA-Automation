import { randomUUID } from 'node:crypto';

// Cuentas ficticias del laboratorio. Las variables permiten usar otra instalación.
export const CUENTAS = {
  admin: {
    correo: process.env.ARES_ADMIN_EMAIL || 'admin@aresqa.local',
    clave: process.env.ARES_ADMIN_PASSWORD || 'AresQA123!',
  },
  operador: {
    correo: process.env.ARES_OPERADOR_EMAIL || 'operador@aresqa.local',
    clave: process.env.ARES_OPERADOR_PASSWORD || 'AresQA123!',
  },
};

export type RolCuenta = keyof typeof CUENTAS;
export interface DatosPersona {
  documento: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
}

// Cada caso crea su propio documento para poder repetirse sin colisiones.
export function crearDatosPersona(): DatosPersona {
  const id = randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
  return {
    documento: `PF-${id}`,
    nombres: 'Persona Playwright',
    apellidos: 'Prueba QA',
    correo: `pf-${id.toLowerCase()}@example.test`,
    telefono: '70000000',
  };
}
