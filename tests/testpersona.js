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
        // 3. Solicitar token CSRF posterior al login para las siguientes escrituras
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

export default function () {
    authenticateVU();

    // Generar documento y datos únicos para evitar colisiones entre VUs e iteraciones
    // Documento: entre 5 y 20 caracteres alfanuméricos/guiones
    const uniqueSuffix = `${__VU}-${__ITER}-${Date.now() % 1000000}`;
    const doc = `P-${uniqueSuffix}`.slice(0, 20);
    const email = `qa_${__VU}_${__ITER}_${Date.now() % 1000000}@aresqa.test`.slice(0, 120);

    let personaId = null;

    // ==========================================
    // 1. POST - CREAR PERSONA
    // ==========================================
    group('POST - Crear persona', function () {
        const payload = JSON.stringify({
            documento: doc,
            nombres: `PersonaK6-${__VU}`,
            apellidos: `Iter-${__ITER}`,
            correo: email,
            telefono: '70000000',
            empresaId: 1,
        });

        const res = http.post(
            `${BASE_URL}/api/personas`,
            payload,
            getMutationHeaders()
        );

        const ok = check(res, {
            'POST - status 201': (r) => r.status === 201,
            'POST - tiene body': (r) => r.body && r.body.length > 0,
            'POST - id generado': (r) => r.status === 201 && r.json().id !== undefined,
        });

        if (ok && res.status === 201) {
            personaId = res.json().id;
        }
    });

    sleep(1);

    // Si la creación falló, no continuar con los siguientes pasos de esta iteración
    if (!personaId) {
        return;
    }

    // ==========================================
    // 2. GET - CONSULTAR PERSONA POR ID
    // ==========================================
    group('GET - Consultar persona', function () {
        const res = http.get(`${BASE_URL}/api/personas/${personaId}`);

        check(res, {
            'GET - status 200': (r) => r.status === 200,
            'GET - persona encontrada': (r) => Number(r.json().id) === personaId,
            'GET - documento coincide': (r) => r.json().documento === doc,
        });
    });

    sleep(1);

    // ==========================================
    // 3. PUT - MODIFICAR PERSONA
    // ==========================================
    group('PUT - Modificar persona', function () {
        const payload = JSON.stringify({
            documento: doc,
            nombres: `PersonaK6-Modificada-${__VU}`,
            apellidos: `Iter-${__ITER}`,
            correo: email,
            telefono: '71111111',
            empresaId: 1,
        });

        const res = http.put(
            `${BASE_URL}/api/personas/${personaId}`,
            payload,
            getMutationHeaders()
        );

        check(res, {
            'PUT - status 200': (r) => r.status === 200,
            'PUT - nombre modificado': (r) => r.json().nombres === `PersonaK6-Modificada-${__VU}`,
            'PUT - telefono modificado': (r) => r.json().telefono === '71111111',
        });
    });

    sleep(1);

    // ==========================================
    // 4. GET - CONSULTAR POR FILTRO / LISTA
    // ==========================================
    group('GET - Consultar personas (filtro)', function () {
        const res = http.get(
            `${BASE_URL}/api/personas?buscar=${encodeURIComponent(doc)}&activo=true`
        );

        check(res, {
            'GET filtro - status 200': (r) => r.status === 200,
            'GET filtro - devuelve items': (r) => Array.isArray(r.json().items),
            'GET filtro - encuentra la persona': (r) => r.json().items && r.json().items.length > 0,
        });
    });

    sleep(1);

    // ==========================================
    // 5. PATCH / DELETE - DESACTIVAR PERSONA (Baja lógica)
    // ==========================================
    group('PATCH - Desactivar persona (baja lógica)', function () {
        const res = http.patch(
            `${BASE_URL}/api/personas/${personaId}/desactivar`,
            null,
            getMutationHeaders()
        );

        check(res, {
            'DESACTIVAR - status 204': (r) => r.status === 204,
        });
    });

    sleep(1);
}
