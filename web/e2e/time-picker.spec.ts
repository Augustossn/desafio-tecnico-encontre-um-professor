import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("atalhos mudam os dois limites da faixa", async ({ page }) => {
  await page.getByRole("button", { name: "Manhã", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "A partir de: 08:00", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Até: 12:00", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Noite", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "A partir de: 18:00", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Até: 22:00", exact: true }),
  ).toBeVisible();
});

test("teclado e minutos rápidos selecionam e aplicam um horário", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "A partir de: 18:00", exact: true })
    .click();
  const picker = page.getByRole("dialog", { name: "A partir de", exact: true });
  await expect(
    picker.getByRole("listbox", { name: "Horas", exact: true }),
  ).toBeFocused();
  await picker
    .getByRole("listbox", { name: "Horas", exact: true })
    .press("ArrowUp");
  await picker
    .getByRole("button", { name: "Usar minuto 15", exact: true })
    .click();
  await picker.getByRole("button", { name: "Aplicar horário" }).click();
  const trigger = page.getByRole("button", {
    name: "A partir de: 17:15",
    exact: true,
  });
  await expect(trigger).toBeVisible();
  await expect(trigger).toBeFocused();
});

test("digitação permite minutos precisos e rejeita horário inexistente", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "A partir de: 18:00", exact: true })
    .click();
  const picker = page.getByRole("dialog", { name: "A partir de", exact: true });
  const input = picker.getByRole("textbox", {
    name: "Digitar horário — A partir de",
    exact: true,
  });
  await input.fill("24:00");
  await expect(
    picker.getByRole("button", { name: "Aplicar horário" }),
  ).toBeDisabled();
  await input.fill("18:17");
  await input.press("Enter");
  await expect(
    page.getByRole("button", { name: "A partir de: 18:17", exact: true }),
  ).toBeVisible();
});

test("Escape descarta o rascunho e mantém o horário anterior", async ({
  page,
}) => {
  const trigger = page.getByRole("button", {
    name: "A partir de: 18:00",
    exact: true,
  });
  await trigger.click();
  const picker = page.getByRole("dialog", { name: "A partir de", exact: true });
  await picker
    .getByRole("listbox", { name: "Horas", exact: true })
    .press("Home");
  await page.keyboard.press("Escape");
  await expect(picker).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveText("18:00");
});

test("rolagem seleciona o minuto na coluna", async ({ page }) => {
  await page
    .getByRole("button", { name: "A partir de: 18:00", exact: true })
    .click();
  const picker = page.getByRole("dialog", { name: "A partir de", exact: true });
  await picker
    .getByRole("listbox", { name: "Minutos", exact: true })
    .evaluate((el) => {
      el.scrollTop = 30 * 40;
    });
  await expect(
    picker.getByRole("textbox", {
      name: "Digitar horário — A partir de",
      exact: true,
    }),
  ).toHaveValue("18:30");
  await picker.getByRole("button", { name: "Aplicar horário" }).click();
  await expect(
    page.getByRole("button", { name: "A partir de: 18:30", exact: true }),
  ).toBeVisible();
});

test("envia 18:15 sem arredondar os limites da busca", async ({ page }) => {
  await page.route("**/api/professores/busca", (route) =>
    route.fulfill({
      json: {
        professores: [
          {
            id: 4,
            nome: "Diego",
            aulasNaSemana: 1,
            horarios: ["18:30", "19:00"],
          },
        ],
        naoElegiveis: [],
      },
    }),
  );
  await page
    .getByRole("button", { name: "A partir de: 18:00", exact: true })
    .click();
  const picker = page.getByRole("dialog", { name: "A partir de", exact: true });
  await picker
    .getByRole("button", { name: "Usar minuto 15", exact: true })
    .click();
  await picker.getByRole("button", { name: "Aplicar horário" }).click();
  const request = page.waitForRequest(
    (r) => r.url().includes("/api/professores/busca") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Encontrar meu professor" }).click();
  expect((await request).postDataJSON().inicioFaixa).toBe("18:15");
  await expect(
    page.getByRole("heading", { name: "Diego", exact: true }),
  ).toBeVisible();
});

test("seletor permanece dentro da tela do celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Até: 20:00", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Até", exact: true });
  await expect(picker).toBeVisible();
  const bounds = await picker.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await picker.getByRole("button", { name: "Fechar sem aplicar" }).click();
  await expect(picker).not.toBeVisible();
});
