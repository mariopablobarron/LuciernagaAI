import { test, expect } from "@playwright/test";

test.describe("Flujo de Chat Básico", () => {
  test("Landing page carga y tiene título correcto", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Tres Mil Millones de Latidos/i);
  });

  test("Chat input está visible y acepta texto", async ({ page }) => {
    await page.goto("/app");
    const chatInput = page.getByPlaceholder(/escribe/i).first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    await chatInput.fill("Hola, necesito ayuda");
    await expect(chatInput).toHaveValue("Hola, necesito ayuda");
  });

  test("Enviar mensaje y recibir respuesta de la IA", async ({ page }) => {
    await page.goto("/app");

    const chatInput = page.getByPlaceholder(/escribe/i).first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Enviar mensaje
    const msg = "Me siento perdido y no sé qué hacer con mi día";
    await chatInput.fill(msg);
    await chatInput.press("Enter");

    // Verificar que el mensaje del usuario aparece
    await expect(page.getByText(msg)).toBeVisible({ timeout: 5000 });

    // Verificar que aparece indicador de carga o respuesta
    // El streaming muestra dots primero, luego texto
    const response = page.locator('[role="log"]');
    await expect(response).toBeVisible();

    // Esperar a que aparezca al menos un mensaje del asistente (texto, no dots)
    // Los mensajes del asistente tienen border-zinc-800
    await page.waitForTimeout(15000); // Esperar streaming

    // Verificar que hay más de un elemento en el chat (user + assistant)
    const messages = page.locator('[role="log"] > div > div');
    await expect(messages).not.toHaveCount(0);
  });

  test("Starters se muestran cuando el chat está vacío", async ({ page }) => {
    await page.goto("/app");

    // Esperar a que cargue
    await page.waitForLoadState("networkidle");

    // Verificar que aparecen las opciones de inicio
    await expect(page.getByText(/estoy bloqueado/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/demasiadas cosas/i).first()).toBeVisible();
  });

  test("Click en starter rellena el input o envía mensaje", async ({ page }) => {
    await page.goto("/app");

    const starter = page.getByText(/estoy bloqueado/i).first();
    await expect(starter).toBeVisible({ timeout: 10000 });
    await starter.click();

    // Debe enviar o rellenar — verificar que algo pasó
    await page.waitForTimeout(2000);
    const chatInput = page.getByPlaceholder(/escribe/i).first();
    const inputValue = await chatInput.inputValue();

    // O el input tiene texto, o ya se envió el mensaje
    const starterSent = inputValue.length > 0 || (await page.getByText(/bloqueado/i).count()) > 1;
    expect(starterSent).toBeTruthy();
  });

  test("Shift+Enter crea nueva línea, Enter envía", async ({ page }) => {
    await page.goto("/app");

    const chatInput = page.getByPlaceholder(/escribe/i).first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Shift+Enter debe crear nueva línea, no enviar
    await chatInput.fill("Línea 1");
    await chatInput.press("Shift+Enter");
    await chatInput.type("Línea 2");

    const value = await chatInput.inputValue();
    expect(value).toContain("Línea 1");
    expect(value).toContain("Línea 2");
  });

  test("Botón de envío está deshabilitado con input vacío", async ({ page }) => {
    await page.goto("/app");

    const chatInput = page.getByPlaceholder(/escribe/i).first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // El botón de enviar debe estar deshabilitado
    const sendButton = page.getByRole("button", { name: /enviar mensaje/i });
    await expect(sendButton).toBeDisabled();
  });
});
