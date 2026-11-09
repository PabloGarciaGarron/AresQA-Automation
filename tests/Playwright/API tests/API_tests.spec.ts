import { test, expect } from "@playwright/test";
import { iniciarSesionApi, obtenerTokenCSRF } from "../helpers/auth.api";
import { estadoSesion } from "../helpers/api";
import { logApi } from "../helpers/apiLogger";

test.describe("API tests", () => {
  test("Inicio sesion", async ({ request }) => {
    const response = await iniciarSesionApi(request, "operador");
    await expect(response).toBeOK();
    expect(await estadoSesion(request)).toBe(200);
  });

  test("GET lista de personas responde 200", async ({ request }) => {
    const loginResponse = await iniciarSesionApi(request, "operador");
    await expect(loginResponse).toBeOK();

    const response = await request.get("/api/personas");
    await logApi(response, "GET");
    expect(response.status()).toBe(200);
  });

  test("API-TC-005", async ({ request }) => {
    //POST persona duplicada responde 409
    const loginResponse = await iniciarSesionApi(request, "admin");
    await expect(loginResponse).toBeOK();

    const csrfToken = await obtenerTokenCSRF(request);
    const response = await request.post("/api/personas", {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      data: {
        documento: "100200",
        nombres: "Noelia",
        apellidos: "Medina",
        correo: "Noe@gmail.com",
        telefono: "80000000",
        empresaId: null,
      },
    });
    await logApi(response, "POST");
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.message).toBe("Ya existe una persona con ese documento.");
  });

  test("API-TC-012", async ({ request }) => {
    //POST empresa con NIT duplicado responde 409
    const loginResponse = await iniciarSesionApi(request, "admin");
    await expect(loginResponse).toBeOK();
    const csrfToken = await obtenerTokenCSRF(request);
    const response = await request.post("/api/empresas", {
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
      },
      data: {
        nit: "333444000",
        nombre: "Burguer King",
        correo: "Robbert@king.com",
        direccion: "Las Retamas #456",
        telefono: "12345678",
      },
    });
    await logApi(response, "POST");
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.message).toBe("Ya existe una empresa con ese NIT.");
  });
});
