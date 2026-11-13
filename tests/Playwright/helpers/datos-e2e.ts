import { crearDatosPersona } from './datos';

export interface DatosEmpresa {
  nit: string;
  nombre: string;
  correo: string;
  telefono: string;
  direccion: string;
}

export interface EmpresaCreada extends DatosEmpresa { id: number; codigo: string }
export interface PersonaCreada { id: number; documento: string; empresaId: number | null }
export interface SolicitudCreada { id: number; estado: string; version: number }
export interface DatosSolicitud { personaId: number; empresaId: number; asunto: string; descripcion: string }

// Reutilizar un identificador aleatorio permite reconocer todos los datos del flujo.
export function crearDatosE2E() {
  const persona = crearDatosPersona();
  const id = persona.documento.slice(3);
  const empresa: DatosEmpresa = {
    // Doce dígitos hexadecimales caben en quince dígitos decimales; el NIT contiene solo números.
    nit: BigInt(`0x${id}`).toString().padStart(15, '0'),
    nombre: `PF Empresa E2E ${id}`,
    correo: `empresa-e2e-${id.toLowerCase()}@example.test`,
    telefono: '70000001',
    direccion: 'Dirección ficticia para el flujo E2E de Ares',
  };
  return {
    empresa,
    persona,
    asunto: `PF E2E aprobación ${id}`,
    descripcion: `Solicitud ficticia del flujo E2E ${id}: empresa, persona y aprobación.`,
    observacion: 'Aprobación de prueba del flujo E2E.',
  };
}
