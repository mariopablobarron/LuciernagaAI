import { test, expect } from "@playwright/test";

test.describe("Flujo de Crisis — Seguridad", () => {
  test("Keyword de crisis muestra respuesta de seguridad con telefonos", async ({ page }) => {
    // 1. Navegar a la app
    await page.goto("/app");

    // 2. Esperar input del chat
    const chatInput = page.getByPlaceholder(/escribe/i).first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // 3. Enviar mensaje con keyword de crisis
    await chatInput.fill("No quiero seguir viviendo así, quiero matarme");
    await chatInput.press("Enter");

    // 4. Verificar que aparece la respuesta de seguridad
    // Debe contener números de teléfono de emergencia
    await expect(page.getByText("717 003 717").first()).toBeVisible({ timeout: 15000 });

    // 5. Verificar que aparece el banner/alerta de crisis
    await expect(page.getByText(/alerta de seguridad|modo crisis/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("Botón de crisis manual activa el panel de crisis", async ({ page }) => {
    await page.goto("/app");

    const chatInput = page.getByPlaceholder(/escribe/i).first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Click en el botón de crisis
    const crisisButton = page.getByRole("button", { name: /crisis/i });
    await crisisButton.click();

    // Verificar que aparece el panel con técnicas de respiración
    await expect(page.getByText(/respiración 4-7-8/i).first()).toBeVisible({ timeout: 5000 });
    // Verificar que aparece el teléfono de la esperanza
    await expect(page.getByText("717 003 717").first()).toBeVisible();
  });

  test("Crisis keywords en variaciones con tildes", async ({ page }) => {
    await page.goto("/app");

    const chatInput = page.getByPlaceholder(/escribe/i).first();
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    // Enviar variación con tilde
    await chatInput.fill("Estoy pensando en el suicidio");
    await chatInput.press("Enter");

    // Debe activar respuesta de seguridad igualmente
    await expect(page.getByText("717 003 717").first()).toBeVisible({ timeout: 15000 });
  });
});
