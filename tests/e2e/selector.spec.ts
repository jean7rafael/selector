import { expect, test } from '@playwright/test';

test('lista atletas e forma dois times', async ({ page }) => {
  await page.goto('/#/atletas');
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();

  // Seleciona oito atletas, que é o mínimo aceito pelo domínio para dois times.
  const rowCheckboxes = page.locator('tbody [role="checkbox"]');
  await expect(rowCheckboxes).toHaveCount(12);
  for (let index = 0; index < 8; index += 1) await rowCheckboxes.nth(index).click();

  await page.getByRole('button', { name: 'Selecionar times' }).click();
  await expect(page.getByText('Time 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Time 2', { exact: true })).toBeVisible();
});

test('diretoria entra e agenda um jogo', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill('diretoria@selector.local');
  await page.getByLabel('Senha').fill('selector123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText(/Bem-vindo/)).toBeVisible();

  await page.goto('/#/jogos');
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await page.getByLabel('Título').fill('Treino de sábado');
  await page.getByLabel('Data e hora').fill('2030-06-15T10:00');
  await page.getByLabel('Local').fill('Ginásio');
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await expect(page.getByText('Treino de sábado', { exact: true })).toBeVisible();
});
