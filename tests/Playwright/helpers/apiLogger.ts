import { Logs } from "./logs";
import { APIResponse } from "@playwright/test";

export async function logApi(
  response: APIResponse,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
): Promise<void> {
  let body;
  try {
    body = await response.json();
  } catch {
    body = await response.text();
  }

  const headers = JSON.stringify(response.headers(), null, 2)
    .split("\n")
    .map((line, index) => (index === 0 ? line : `               ${line}`))
    .join("\n");

  const bodyFormatted =
    typeof body === "object"
      ? JSON.stringify(body, null, 2)
          .split("\n")
          .map((line, index) => (index === 0 ? line : `               ${line}`))
          .join("\n")
      : body;

  const messageLogs = `
╔════════════════════════════════════════════════════════════╗
║ API REQUEST                                                ║
╠════════════════════════════════════════════════════════════╣
  URL:         (${method}) ${response.url()}
  Status:      ${response.status()} ${response.statusText()}
  Headers:     ${headers}
  Body:        ${bodyFormatted}
╚════════════════════════════════════════════════════════════╝
    `;

  console.log(`
  URL:         (${method}) ${response.url()}
  Status:      ${response.status()} ${response.statusText()}
    `);
  Logs.info(messageLogs);
}
