import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
    stages: [
        { duration: '20s', target: 20 }, // ramp-up
        { duration: '1m', target: 20 }, // carga sostenida
        { duration: '20s', target: 0 },  // ramp-down
    ],

    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
        checks: ['rate>0.99'],
    },
};

const BASE_URL = 'http://localhost:5080';

// Cada Virtual User (VU) mantiene su propia sesión y token CSRF
let isLoggedIn = false;
let csrfToken = '';
let targetPersona = null;

function authenticateVU() {
    // 1. Obtener token CSRF previo al login
    const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`);
    const initialToken = csrfRes.json('token');

    // 2. Iniciar sesión como Administrador
    const loginPayload = JSON.stringify({
        email: 'admin@aresqa.local',
        password: 'AresQA123!',
    });

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': initialToken,
        },
    });

    if (loginRes.status === 200) {
        isLoggedIn = true;
        // 3. Obtener token CSRF para las siguientes escrituras
        const nextCsrf = http.get(`${BASE_URL}/api/auth/csrf`);
        csrfToken = nextCsrf.json('token') || initialToken;
    }
}

function getMutationHeaders() {
    return {
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-CSRF-TOKEN': csrfToken,
        },
    };
}

function ensureTargetPersona() {
    if (targetPersona) return targetPersona;

    // Buscar una persona activa que ya tenga empresa asignada
    const res = http.get(`${BASE_URL}/api/personas?activo=true&tamano=20`);
    if (res.status === 200 && res.json().items && res.json().items.length > 0) {
        const found = res.json().items.find((p) => p.empresaId);
        if (found) {
            targetPersona = { personaId: found.id, empresaId: found.empresaId };
            return targetPersona;
        }

        // Si ninguna tiene empresa asignada, asociar la primera a la empresa 1
        const first = res.json().items[0];
        const updateRes = http.put(
            `${BASE_URL}/api/personas/${first.id}`,
            JSON.stringify({
                documento: first.documento,
                nombres: first.nombres,
                apellidos: first.apellidos,
                correo: first.correo,
                telefono: first.telefono || '70000000',
                empresaId: 1,
            }),
            getMutationHeaders()
        );

        if (updateRes.status === 200) {
            targetPersona = { personaId: first.id, empresaId: 1 };
            return targetPersona;
        }
    }

    targetPersona = { personaId: 1, empresaId: 1 };
    return targetPersona;
}

export default function () {
    authenticateVU();

    const { personaId, empresaId } = ensureTargetPersona();

    let solicitudId = null;
    let version = 1;

    // ==========================================
    // 1. POST - CREAR SOLICITUD PENDIENTE
    // ==========================================
    group('POST - Crear solicitud', function () {
        const payload = JSON.stringify({
            personaId: personaId,
            empresaId: empresaId,
            asunto: `SolicitudK6-${__VU}-${__ITER}`,
            descripcion: `Descripción generada automáticamente para pruebas de carga k6 (VU: ${__VU}, iteración: ${__ITER}).`,
        });

        const res = http.post(
            `${BASE_URL}/api/solicitudes`,
            payload,
            getMutationHeaders()
        );

        const ok = check(res, {
            'POST - status 201': (r) => r.status === 201,
            'POST - id generado': (r) => r.status === 201 && r.json().id !== undefined,
            'POST - estado Pendiente': (r) => r.status === 201 && r.json().estado === 'Pendiente',
        });

        if (ok && res.status === 201) {
            solicitudId = res.json().id;
            version = res.json().version || 1;
        }
    });

    sleep(1);

    if (!solicitudId) {
        return;
    }

    // ==========================================
    // 2. GET - CONSULTAR SOLICITUD POR ID
    // ==========================================
    group('GET - Consultar solicitud', function () {
        const res = http.get(`${BASE_URL}/api/solicitudes/${solicitudId}`);

        check(res, {
            'GET - status 200': (r) => r.status === 200,
            'GET - solicitud encontrada': (r) => Number(r.json().id) === solicitudId,
            'GET - versión correcta': (r) => Number(r.json().version) === version,
        });
    });

    sleep(1);

    // ==========================================
    // 3. PUT - MODIFICAR SOLICITUD PENDIENTE
    // ==========================================
    group('PUT - Modificar solicitud', function () {
        const payload = JSON.stringify({
            personaId: personaId,
            empresaId: empresaId,
            asunto: `SolicitudK6-Modificada-${__VU}`,
            descripcion: `Descripción modificada durante la prueba de carga k6 para validar control de concurrencia y versión.`,
            version: version,
        });

        const res = http.put(
            `${BASE_URL}/api/solicitudes/${solicitudId}`,
            payload,
            getMutationHeaders()
        );

        const ok = check(res, {
            'PUT - status 200': (r) => r.status === 200,
            'PUT - versión incrementada': (r) => r.status === 200 && r.json().version > version,
        });

        if (ok && res.status === 200) {
            version = res.json().version;
        }
    });

    sleep(1);

    // ==========================================
    // 4. GET - CONSULTAR SOLICITUDES (FILTRO)
    // ==========================================
    group('GET - Consultar solicitudes (filtro)', function () {
        const res = http.get(
            `${BASE_URL}/api/solicitudes?estado=Pendiente&tamano=10`
        );

        check(res, {
            'GET filtro - status 200': (r) => r.status === 200,
            'GET filtro - devuelve items': (r) => Array.isArray(r.json().items),
        });
    });

    sleep(1);

    // ==========================================
    // 5. POST - RESOLVER SOLICITUD (APROBAR)
    // ==========================================
    group('POST - Resolver solicitud (Aprobar)', function () {
        const payload = JSON.stringify({
            estado: 'Aprobada',
            version: version,
        });

        const res = http.post(
            `${BASE_URL}/api/solicitudes/${solicitudId}/resolver`,
            payload,
            getMutationHeaders()
        );

        check(res, {
            'RESOLVER - status 204': (r) => r.status === 204,
        });
    });

    sleep(1);
}
