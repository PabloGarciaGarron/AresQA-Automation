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
        // 3. Obtener token CSRF para las siguientes operaciones de escritura
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

    // Generar email único para evitar errores 409 por duplicado
    const email = `usuario_${__VU}_${__ITER}_${Date.now() % 1000000}@aresqa.test`.slice(0, 120);
    const password = 'UserQA2026!';
    const rol = __ITER % 2 === 0 ? 'Operador' : 'Administrador';

    let userCode = null;

    // ==========================================
    // 1. POST - CREAR USUARIO
    // ==========================================
    group('POST - Crear usuario', function () {
        const payload = JSON.stringify({
            email: email,
            password: password,
            rol: rol,
        });

        const res = http.post(
            `${BASE_URL}/api/usuarios`,
            payload,
            getMutationHeaders()
        );

        const ok = check(res, {
            'POST - status 201': (r) => r.status === 201,
            'POST - código USU asignado': (r) => r.status === 201 && r.json().codigo && r.json().codigo.startsWith('USU-'),
            'POST - email coincide': (r) => r.status === 201 && r.json().email === email,
            'POST - rol asignado': (r) => r.status === 201 && r.json().roles && r.json().roles.includes(rol),
        });

        if (ok && res.status === 201) {
            userCode = res.json().codigo;
        }
    });

    sleep(1);

    // ==========================================
    // 2. GET - LISTAR USUARIOS (PANEL ADMINISTRATIVO)
    // ==========================================
    group('GET - Listar usuarios', function () {
        const res = http.get(`${BASE_URL}/api/usuarios`);

        check(res, {
            'GET lista - status 200': (r) => r.status === 200,
            'GET lista - devuelve array': (r) => r.status === 200 && Array.isArray(r.json()),
            'GET lista - contiene registros': (r) => r.status === 200 && Array.isArray(r.json()) && r.json().length > 0,
        });
    });

    sleep(1);

    // ==========================================
    // 3. GET - VERIFICAR SESIÓN ACTIVA (/api/auth/me)
    // ==========================================
    group('GET - Consultar sesión activa', function () {
        const res = http.get(`${BASE_URL}/api/auth/me`);

        check(res, {
            'GET me - status 200': (r) => r.status === 200,
            'GET me - usuario autenticado': (r) => r.status === 200 && r.json().email === 'admin@aresqa.local',
            'GET me - rol Administrador': (r) => r.status === 200 && r.json().role === 'Administrador',
        });
    });

    sleep(1);
}
