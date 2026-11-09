import { test, expect } from "@playwright/test";
import { iniciarSesionApi } from "../helpers/auth.api";
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
});
