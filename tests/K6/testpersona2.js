import http from 'k6/http';
import { check, group } from 'k6';

export const options = {
    // Modifica duraciones y objetivos para ajustar la rampa inicial, la carga sostenida y la rampa final.
    // Cada VU repite el flujo durante las etapas y crea registros en la base de datos activa.
    stages: [
        { duration: '20s', target: 20 }, // rampa inicial
        { duration: '20s', target: 20 }, // carga sostenida
        { duration: '20s', target: 0 }, // rampa final
    ],
    thresholds: {
        http_req_duration: ['p(95)<500'],
        http_req_failed: ['rate<0.01'],
        checks: ['rate>0.99'],
    },
};

// Estos estados de validación (duplicado, entrada inválida y acción prohibida) son esperados en modo normal.
// Solo cuenta como error una respuesta HTTP inesperada.
http.setResponseCallback(http.expectedStatuses(200, 201, 204, 400, 403, 409));

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5080';
const PASSWORD = 'AresQA123!';
let csrfToken = '';

export function setup() {
    const modeResponse = http.get(`${BASE_URL}/api/laboratorio/modo`);
    const modeOk = check(modeResponse, {
        'Modo del laboratorio disponible': (r) => r.status === 200,
    });
    if (!modeOk) return { mode: null };

    const state = modeResponse.json();
    return { mode: state.enabled ? 'ON' : 'OFF' };
}

function mutationOptions() {
    return {
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-CSRF-TOKEN': csrfToken,
        },
    };
}

function authenticate(email = 'admin@aresqa.local') {
    const csrfResponse = http.get(`${BASE_URL}/api/auth/csrf`);
    const csrfOk = check(csrfResponse, {
        'Obtener token CSRF': (r) => r.status === 200 && !!r.json('token'),
    });
    if (!csrfOk) return false;

    const initialToken = csrfResponse.json('token');
    const loginResponse = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify({ email, password: PASSWORD }),
        {
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': initialToken,
            },
        }
    );
    const loginOk = check(loginResponse, {
        [`Login ${email}`]: (r) => r.status === 200,
    });
    if (!loginOk) return false;

    const nextCsrfResponse = http.get(`${BASE_URL}/api/auth/csrf`);
    csrfToken = nextCsrfResponse.json('token') || initialToken;
    return true;
}

function personPayload(documento, correo, nombres = 'Persona QA') {
    return {
        documento,
        nombres,
        apellidos: 'Prueba automatizada',
        correo,
        telefono: '70000000',
        empresaId: null,
    };
}

function createPerson(payload, label) {
    const response = http.post(
        `${BASE_URL}/api/personas`,
        JSON.stringify(payload),
        mutationOptions()
    );
    check(response, {
        [`${label}: alta aceptada`]: (r) => r.status === 201,
    });
    return response.status === 201 ? response.json('id') : null;
}

export default function (data) {
    group('Validaciones funcionales de Personas', function () {
        const mode = data.mode;
        if (mode !== 'ON' && mode !== 'OFF') return;

        if (!authenticate()) return;

        const suffix = `${Date.now() % 1000000000}${__VU}${__ITER}`;
        const document = `P2-${suffix}`.slice(0, 20);
        const invalidDocument = `P2I-${suffix}`.slice(0, 20);
        const inactiveDocument = `P2N-${suffix}`.slice(0, 20);
        const operatorDocument = `P2O-${suffix}`.slice(0, 20);
        const email = `qa${suffix}@example.test`.slice(0, 120);

        let duplicatePersonId = null;
        // ==========================================
        // 1. POST - RECHAZAR DOCUMENTO DUPLICADO
        // ==========================================
        // BUG-05: verifica que se rechace crear otra persona con el mismo documento.
        group('Rechazo de documento duplicado', function () {
            const payload = personPayload(document, email);
            const first = http.post(
                `${BASE_URL}/api/personas`,
                JSON.stringify(payload),
                mutationOptions()
            );
            check(first, {
                'Alta inicial de persona': (r) => r.status === 201,
            });
            if (first.status !== 201) return;
            duplicatePersonId = first.json('id');

            const duplicate = http.post(
                `${BASE_URL}/api/personas`,
                JSON.stringify(payload),
                mutationOptions()
            );
            check(duplicate, {
                'Rechazar persona con documento ya registrado': (r) => r.status === 409,
            });
        });

        // ==========================================
        // 2. POST - VALIDAR FORMATO DE CORREO
        // ==========================================
        // BUG-06: verifica que un correo mal formado se rechace con un error de validación.
        group('Validación de formato de correo', function () {
            const response = http.post(
                `${BASE_URL}/api/personas`,
                JSON.stringify(personPayload(invalidDocument, 'correo-invalido')),
                mutationOptions()
            );
            check(response, {
                'Rechazar persona con correo inválido': (r) => r.status === 400,
            });
        });

        // ==========================================
        // 3. GET - FILTRAR PERSONAS ACTIVAS
        // ==========================================
        // BUG-07: el filtro de personas activas debe excluir los registros inactivos.
        group('Filtro de personas activas', function () {
            const filtered = http.get(
                `${BASE_URL}/api/personas?activo=true&tamano=100`
            );
            const filterOk = check(filtered, {
                'Consultar personas activas': (r) => r.status === 200,
            });
            if (filterOk) {
                const hasInactive = filtered.json().items.some((person) => !person.activo);
                check(filtered, {
                    'No incluir personas inactivas en el filtro': () => !hasInactive,
                });
            }
        });

        // ==========================================
        // 4. GET - PAGINAR SIN REPETIR REGISTROS
        // ==========================================
        // BUG-08: la segunda página no debe repetir los registros de la primera.
        group('Paginación sin registros repetidos', function () {
            const firstPage = http.get(
                `${BASE_URL}/api/personas?pagina=1&tamano=10`
            );
            const secondPage = http.get(
                `${BASE_URL}/api/personas?pagina=2&tamano=10`
            );
            const pagesOk = check(null, {
                'Ambas páginas contienen registros':
                    () => firstPage.status === 200 && secondPage.status === 200
                        && firstPage.json().items.length > 0
                        && secondPage.json().items.length > 0,
            });
            if (pagesOk) {
                const firstResult = firstPage.json();
                const secondResult = secondPage.json();
                const firstIds = new Set(firstResult.items.map((person) => person.id));
                const hasRepeatedPerson = secondResult.items.some((person) => firstIds.has(person.id));
                const dataChangedBetweenPages = firstResult.total !== secondResult.total;
                check(secondPage, {
                    'La segunda página no repite personas de la primera':
                        () => dataChangedBetweenPages || !hasRepeatedPerson,
                });
            }
        });

        // ==========================================
        // 5. PUT - PERSISTIR CAMBIOS DE PERSONA
        // ==========================================
        // BUG-09: una edición exitosa debe persistir al consultar nuevamente la persona.
        group('Persistencia de cambios al editar', function () {
            if (!duplicatePersonId) {
                check(null, { 'Se requiere una persona creada para editar': () => false });
                return;
            }
            const before = http.get(`${BASE_URL}/api/personas/${duplicatePersonId}`);
            if (!check(before, { 'Consultar persona antes de editar': (r) => r.status === 200 })) return;

            const payload = {
                ...before.json(),
                nombres: 'Nombre editado QA',
            };
            const update = http.put(
                `${BASE_URL}/api/personas/${duplicatePersonId}`,
                JSON.stringify(payload),
                mutationOptions()
            );
            check(update, {
                'La edición se confirma correctamente': (r) => r.status === 200,
            });

            const after = http.get(`${BASE_URL}/api/personas/${duplicatePersonId}`);
            check(after, {
                'Los cambios aparecen al consultar nuevamente':
                    (r) => r.status === 200
                        && r.json('nombres') === 'Nombre editado QA',
            });
        });

        // ==========================================
        // 6. PUT - RECHAZAR EDICIÓN DE PERSONA INACTIVA
        // ==========================================
        // BUG-10: las personas inactivas no deben poder editarse y sus datos deben conservarse.
        group('Protección de personas inactivas', function () {
            const id = createPerson(
                personPayload(inactiveDocument, `inactiva${suffix}@example.test`),
                'Preparación de persona inactiva'
            );
            if (!id) return;

            const deactivated = http.patch(
                `${BASE_URL}/api/personas/${id}/desactivar`,
                null,
                mutationOptions()
            );
            if (!check(deactivated, {
                'Desactivar persona de prueba': (r) => r.status === 204,
            })) return;

            const before = http.get(`${BASE_URL}/api/personas/${id}`);
            const payload = {
                ...before.json(),
                nombres: 'Cambio persona inactiva',
            };
            const update = http.put(
                `${BASE_URL}/api/personas/${id}`,
                JSON.stringify(payload),
                mutationOptions()
            );
            const after = http.get(`${BASE_URL}/api/personas/${id}`);
            check(update, {
                'Rechazar edición de persona inactiva': (r) => r.status === 409,
            });
            check(after, {
                'Conservar datos originales de persona inactiva':
                    (r) => r.status === 200
                        && r.json('nombres') === before.json('nombres'),
            });
        });

        // ==========================================
        // 7. PATCH - VALIDAR PERMISOS DE OPERADOR
        // ==========================================
        // BUG-11: los operadores no deben tener permiso para desactivar personas.
        group('Permisos de operador para desactivar personas', function () {
            const id = createPerson(
                personPayload(operatorDocument, `operador${suffix}@example.test`),
                'Preparación de persona para permisos'
            );
            if (!id) return;

            // Aísla la sesión del operador de la cookie de Administrador, incluso con BUG-03 activo.
            http.cookieJar().clear(BASE_URL);
            if (!authenticate('operador@aresqa.local')) return;

            const response = http.patch(
                `${BASE_URL}/api/personas/${id}/desactivar`,
                null,
                mutationOptions()
            );
            const person = http.get(`${BASE_URL}/api/personas/${id}`);
            check(response, {
                'Rechazar desactivación solicitada por Operador': (r) => r.status === 403,
            });
            check(person, {
                'Mantener activa a la persona':
                    (r) => r.status === 200
                        && r.json('activo') === true,
            });
        });
    });
}
