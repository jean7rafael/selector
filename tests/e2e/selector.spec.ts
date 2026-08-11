import { expect, test } from '@playwright/test';

test('lista atletas e forma dois times', async ({ page }) => {
  await page.goto('/#/atletas');
  await expect(page.getByText('Ana', { exact: true })).toBeVisible();

  // Seleciona oito atletas, que é o mínimo aceito pelo domínio para dois times.
  const rowCheckboxes = page.locator('tbody [role="checkbox"]');
  await expect(rowCheckboxes).toHaveCount(12);
  for (let index = 0; index < 8; index += 1)
    await rowCheckboxes.nth(index).click();

  await page.getByRole('button', { name: 'Selecionar times' }).click();
  await expect(page.getByText('Time 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Time 2', { exact: true })).toBeVisible();
});

test('diretoria entra e agenda um jogo', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill('diretoria@selector.local');
  await page.getByLabel('Senha', { exact: true }).fill('selector123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText(/Bem-vindo/)).toBeVisible();

  await page.goto('/#/jogos');
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await page.getByLabel('Título').fill('Treino de sábado');
  await page.getByLabel('Data e hora').fill('2030-06-15T10:00');
  await page.getByLabel('Local').fill('Ginásio');
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  await expect(
    page.getByText('Treino de sábado', { exact: true }),
  ).toBeVisible();
});

test('administração edita perfil e função de outro usuário', async ({
  page,
}) => {
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill('admin@selector.local');
  await page.getByLabel('Senha', { exact: true }).fill('selector123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText(/Bem-vindo/)).toBeVisible();
  await expect(
    page.getByText('admin@selector.local · Administrador', { exact: true }),
  ).toBeVisible();
  await page.goto('/#/ajustes');

  await expect(
    page.getByText('Usuários cadastrados', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Editar membro@selector.local' })
    .click();
  await page.getByLabel('Nome').fill('Membro atualizado');
  await page.getByLabel('Usuário').fill('membro-atualizado');
  await page.getByLabel('Telefone').fill('41999888770');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(
    page.getByText('Usuário atualizado.', { exact: true }),
  ).toBeVisible();

  /* Alterna a função atual para que uma eventual repetição do GitHub
     continue exercitando uma alteração real no mesmo emulador. */
  const roleSelect = page.getByLabel('Função de membro@selector.local');
  const currentRole = await roleSelect.inputValue();
  const targetRole =
    currentRole === 'Administrador' ? 'Diretoria' : 'Administrador';
  await roleSelect.click();
  await page.getByRole('option', { name: targetRole }).click();
  await expect(page.getByText(/Função atualizada/)).toBeVisible({
    timeout: 10_000,
  });

  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Excluir membro@selector.local' })
    .click();
  /* A remoção da linha é um resultado persistente e confirma que a função
     terminou; uma mensagem temporária poderia desaparecer em máquinas lentas. */
  await expect(
    page.getByRole('button', { name: 'Excluir membro@selector.local' }),
  ).toBeHidden({ timeout: 15_000 });
});

test('novo membro cria conta com e-mail, telefone e confirmação da senha', async ({
  page,
}) => {
  const email = `novo-${Date.now()}@selector.local`;

  await page.goto('/#/login');
  await page.getByRole('tab', { name: 'Criar conta' }).click();
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Telefone').fill('41999888777');
  await page.getByLabel('Senha', { exact: true }).fill('senha-livre');
  await page.getByLabel('Repita a senha').fill('senha-livre');
  await page.getByRole('button', { name: 'Criar conta', exact: true }).click();

  /* O cadastro entra automaticamente com o menor nível de permissão. */
  await expect(page.getByText(/Conta criada/)).toBeVisible();
  await expect(
    page.getByText(`${email} · Membro`, { exact: true }),
  ).toBeVisible();
});
