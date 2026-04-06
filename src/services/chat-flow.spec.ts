import { test, expect } from "@playwright/test";

test.describe("Flujo Crítico del Chat", () => {
  test("Debe hacer bootstrap de sesión y recibir respuesta de la IA", async ({ page }) => {
    // 1. Navegar a la página principal (Landing)
    await page.goto("/");
    await expect(page).toHaveTitle(/Tres Mil Millones de Latidos/i);

    // 2. Navegar a la exploración y luego a la app (flujo del usuario)
    await page.goto("/explore");
    await page.goto("/app");

    // 3. Esperar a que el input del chat esté listo para interactuar
    // Nota: Reemplaza "escribe" por una palabra que esté en tu placeholder real
    const chatInput = page.getByPlaceholder(/escribe/i).first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // 4. Simular la escritura de un mensaje (Estado: Bloqueo)
    const testMessage = "Me siento bloqueado hoy y no sé por dónde empezar";
    await chatInput.fill(testMessage);
    await chatInput.press("Enter");

    // 5. Validar que el mensaje del usuario aparece en la UI
    await expect(page.getByText(testMessage)).toBeVisible();

    // 6. Esperar la respuesta del sistema (Orquestador + OpenRouter)
    // Como es SSE (streaming), damos un timeout mayor (15 segundos)
    // Buscamos una respuesta de la IA. Asegúrate de que el componente de la IA
    // tenga alguna clase como .assistant-message o texto genérico.
    const assistantBubble = page.locator('.assistant-message, [data-role="assistant"]').last();

    // Validamos que la burbuja aparece y que el motor empezó a inyectar texto
    await expect(assistantBubble).toBeVisible({ timeout: 15000 });
    await expect(assistantBubble).not.toBeEmpty();
  });
});
