import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
    stages: [
        { duration: '1m', target: 20 }, // ramp-up
        { duration: '3m', target: 20 }, // carga sostenida
        { duration: '1m', target: 0 },  // ramp-down
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
        // 3. Obtener token CSRF posterior al login para operaciones de escritura
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

    // Generar NIT único (de 5 a 15 dígitos numéricos) y correo único
    const uniqueDigits = `${Date.now() % 10000000}${__VU}${__ITER}`.slice(0, 14);
    const nit = `9${uniqueDigits}`.slice(0, 15);
    const email = `empresa_${__VU}_${__ITER}_${Date.now() % 1000000}@aresqa.test`.slice(0, 120);

    let empresaId = null;

    // ==========================================
    // 1. POST - CREAR EMPRESA
    // ==========================================
    group('POST - Crear empresa', function () {
        const payload = JSON.stringify({
            nit: nit,
            nombre: `EmpresaK6-${__VU}-${__ITER}`,
            correo: email,
            direccion: 'Av. Principal #123 Edificio Ares',
            telefono: '70000000',
        });

        const res = http.post(
            `${BASE_URL}/api/empresas`,
            payload,
            getMutationHeaders()
        );

        const ok = check(res, {
            'POST - status 201': (r) => r.status === 201,
            'POST - tiene body': (r) => r.body && r.body.length > 0,
            'POST - id generado': (r) => r.status === 201 && r.json().id !== undefined,
        });

        if (ok && res.status === 201) {
            empresaId = res.json().id;
        }
    });

    sleep(1);

    if (!empresaId) {
        return;
    }

    // ==========================================
    // 2. GET - CONSULTAR EMPRESA POR ID
    // ==========================================
    group('GET - Consultar empresa', function () {
        const res = http.get(`${BASE_URL}/api/empresas/${empresaId}`);

        check(res, {
            'GET - status 200': (r) => r.status === 200,
            'GET - empresa encontrada': (r) => Number(r.json().id) === empresaId,
            'GET - nit coincide': (r) => r.json().nit === nit,
        });
    });

    sleep(1);

    // ==========================================
    // 3. PUT - MODIFICAR EMPRESA
    // ==========================================
    group('PUT - Modificar empresa', function () {
        const payload = JSON.stringify({
            nit: nit,
            nombre: `EmpresaK6-Modificada-${__VU}`,
            correo: email,
            direccion: 'Calle Nueva #456 Piso 2',
            telefono: '71111111',
        });

        const res = http.put(
            `${BASE_URL}/api/empresas/${empresaId}`,
            payload,
            getMutationHeaders()
        );

        check(res, {
            'PUT - status 200': (r) => r.status === 200,
            'PUT - nombre modificado': (r) => r.json().nombre === `EmpresaK6-Modificada-${__VU}`,
            'PUT - telefono modificado': (r) => r.json().telefono === '71111111',
        });
    });

    sleep(1);

    // ==========================================
    // 4. GET - CONSULTAR EMPRESAS (FILTRO / LISTA)
    // ==========================================
    group('GET - Consultar empresas (filtro)', function () {
        const res = http.get(
            `${BASE_URL}/api/empresas?buscar=${encodeURIComponent(nit)}`
        );

        check(res, {
            'GET filtro - status 200': (r) => r.status === 200,
            'GET filtro - devuelve items': (r) => Array.isArray(r.json().items),
            'GET filtro - encuentra la empresa': (r) => r.json().items && r.json().items.length > 0,
        });
    });

    sleep(1);
}
