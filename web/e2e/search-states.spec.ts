import { test, expect, type Page } from "@playwright/test";

const endpoint = "**/api/professores/busca";
const noLanguage = { id: 4, nome: "Diego", motivo: "Não ensina o idioma" };
const blocked = { id: 3, nome: "Carla", motivo: "Agenda bloqueada" };
const noTime = {
  id: 1,
  nome: "Ana",
  motivo: "Sem horário em comum nos dias pedidos",
};
const empty = (naoElegiveis: (typeof noLanguage)[]) => ({
  professores: [],
  naoElegiveis,
});
const search = (page: Page) =>
  page.getByRole("button", { name: "Encontrar meu professor" }).click();

async function endAt(page: Page, value: string) {
  await page.getByRole("button", { name: "Até: 20:00", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Até", exact: true });
  await picker
    .getByRole("textbox", { name: "Digitar horário — Até", exact: true })
    .fill(value);
  await picker.getByRole("button", { name: "Aplicar horário" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("faixa insuficiente explica os minutos e amplia sem mudar idioma ou dias", async ({
  page,
}) => {
  const queries: Record<string, unknown>[] = [];
  await page.route(endpoint, (route) => {
    queries.push(route.request().postDataJSON());
    return route.fulfill({
      json:
        queries.length === 1
          ? empty([noTime])
          : {
              professores: [
                { id: 1, nome: "Ana", aulasNaSemana: 1, horarios: ["18:00"] },
              ],
              naoElegiveis: [],
            },
    });
  });
  await endAt(page, "18:30");
  await search(page);
  await expect(
    page.getByRole("heading", { name: "A aula não cabe na faixa escolhida." }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /Você selecionou 30 minutos de disponibilidade, mas a aula dura 60 minutos/,
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ampliar faixa e buscar" }).click();
  await expect(
    page.getByRole("heading", { name: "Ana", exact: true }),
  ).toBeVisible();
  expect(queries[1]).toEqual({
    idioma: "Espanhol",
    dias: ["segunda"],
    inicioFaixa: "18:00",
    fimFaixa: "19:00",
    duracaoMinutos: 60,
  });
  await expect(
    page.getByRole("button", { name: "Até: 19:00", exact: true }),
  ).toBeVisible();
});

test("duração menor é uma busca nova sem alterar a faixa", async ({ page }) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ json: empty([noTime]) }),
  );
  await endAt(page, "18:30");
  await search(page);
  const request = page.waitForRequest(
    (r) => r.url().includes("/api/professores/busca") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Testar aulas de 30 min" }).click();
  expect((await request).postDataJSON()).toMatchObject({
    inicioFaixa: "18:00",
    fimFaixa: "18:30",
    duracaoMinutos: 30,
  });
});

test("idioma ausente explica cadastro e oferece trocar idioma", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ json: empty([noLanguage]) }),
  );
  await page.getByRole("radio", { name: "Francês" }).check();
  await search(page);
  await expect(
    page.getByRole("heading", {
      name: "Ainda não temos professores de Francês.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Buscar no dia inteiro" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Escolher outro idioma" }).click();
  await expect(page.getByRole("radio", { name: "Francês" })).toBeFocused();
});

test("agendas bloqueadas não sugerem que basta trocar o horário", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ json: empty([blocked, noLanguage]) }),
  );
  await search(page);
  await expect(
    page.getByRole("heading", {
      name: "As agendas desse idioma estão bloqueadas.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Alterar apenas o horário não resolve/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Buscar no dia inteiro" }),
  ).toHaveCount(0);
});

test("sem encaixe explica dias e faixa e confere disponibilidade em nova busca", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({ json: empty([noTime, blocked, noLanguage]) }),
  );
  await search(page);
  await expect(
    page.getByRole("heading", {
      name: "Há professores do idioma, mas sem encaixe nesta busca.",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/Há 1 professor que ensina Espanhol/),
  ).toBeVisible();
  const request = page.waitForRequest(
    (r) => r.url().includes("/api/professores/busca") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Buscar no dia inteiro" }).click();
  expect((await request).postDataJSON()).toMatchObject({
    inicioFaixa: "00:00",
    fimFaixa: "23:59",
    dias: ["segunda"],
    duracaoMinutos: 60,
  });
});

test("rever dias restaura a consulta executada e move foco sem buscar sozinho", async ({
  page,
}) => {
  let calls = 0;
  await page.route(endpoint, (route) => {
    calls++;
    return route.fulfill({ json: empty([noTime]) });
  });
  await search(page);
  await expect(
    page.getByRole("button", { name: "Rever dias escolhidos" }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Francês" }).check();
  await page.getByRole("button", { name: "Rever dias escolhidos" }).click();
  await expect(page.getByRole("radio", { name: "Espanhol" })).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Segunda-feira", exact: true }),
  ).toBeFocused();
  expect(calls).toBe(1);
});

test("resumo dos motivos fica visível mesmo com professores encontrados", async ({
  page,
}) => {
  await page.route(endpoint, (route) =>
    route.fulfill({
      json: {
        professores: [
          { id: 4, nome: "Diego", aulasNaSemana: 1, horarios: ["18:00"] },
        ],
        naoElegiveis: [noTime, blocked, noLanguage],
      },
    }),
  );
  await search(page);
  const summary = page.getByRole("complementary", {
    name: "Resumo dos professores fora da busca",
  });
  await expect(summary).toContainText("Sem horário em comum nos dias pedidos");
  await expect(summary).toContainText("Agenda bloqueada");
  await expect(summary).toContainText("Não ensina o idioma");
  await expect(page.locator(".excluded")).not.toHaveAttribute("open", "");
});

test("carregamento desabilita formulário e depois exibe validação da API", async ({
  page,
}) => {
  let release!: () => void;
  const ready = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(endpoint, async (route) => {
    await ready;
    await route.fulfill({
      status: 400,
      contentType: "application/problem+json",
      body: JSON.stringify({ errors: { dias: ["Informe ao menos um dia."] } }),
    });
  });
  await search(page);
  await expect(
    page.getByText("Encontrando pontos em comum…", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "Espanhol" })).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toContainText(
    "Informe ao menos um dia.",
  );
  await expect(page.getByRole("radio", { name: "Espanhol" })).toBeEnabled();
});

test("falha de comunicação não é apresentada como falta de professores", async ({
  page,
}) => {
  await page.route(endpoint, (route) => route.abort());
  await search(page);
  await expect(page.getByRole("alert")).toContainText(
    "Não foi possível comunicar com a API.",
  );
  await expect(
    page.getByRole("heading", {
      name: "Nenhum professor encontrado nesta busca.",
    }),
  ).toHaveCount(0);
});
