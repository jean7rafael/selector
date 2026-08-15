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
  await page.getByRole('link', { name: 'Abrir lista deste jogo' }).click();
  await expect(page).toHaveURL(/#\/jogos\/[^/]+$/);
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
    page.getByText(/admin@selector\.local · Administrador · Aprovado/),
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
  await page.getByLabel('Atleta vinculado').click();
  await page.getByRole('option', { name: 'Ana', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(
    page.getByText('Usuário atualizado.', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Atleta: Ana', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Vínculo com atleta alterado', { exact: true }),
  ).toBeVisible();

  const statusSelect = page.getByLabel('Situação de pendente@selector.local');
  await statusSelect.click();
  await page.getByRole('option', { name: 'Aprovada', exact: true }).click();
  await expect(
    page.getByText('Conta aprovada.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Situação da conta alterada', { exact: true }),
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

  await page
    .getByRole('button', {
      name: 'Enviar redefinição para membro@selector.local',
    })
    .click();
  await expect(
    page.getByText('Redefinição de senha solicitada', { exact: true }),
  ).toBeVisible();

  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Desativar membro@selector.local' })
    .click();
  await expect(
    page.getByText('Conta desativada.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Situação: Não aprovada', { exact: true }),
  ).toBeVisible();
});

test('recuperação de senha confirma o envio sem revelar o cadastro', async ({
  page,
}) => {
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill('membro@selector.local');
  await page.getByRole('button', { name: 'Esqueci minha senha' }).click();
  await expect(page.getByText(/Se o e-mail estiver cadastrado/)).toBeVisible();
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
    page.getByText('E-mail pendente', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(new RegExp(`${email} · Membro · Aguardando aprovação`)),
  ).toBeVisible();

  /* Encerrar a sessão devolve um formulário sem a senha anterior. */
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByLabel('Senha', { exact: true })).toHaveValue('');
});

test('Safari ou Edge no iPhone orienta a instalação antes do Web Push', async ({
  page,
}) => {
  /* O iPhone esconde Notification e Push API em abas comuns. A identificação
     móvel deve prevalecer para mostrar os passos corretos de instalação. */
  await page.addInitScript(() => {
    Object.defineProperties(navigator, {
      maxTouchPoints: { configurable: true, value: 5 },
      platform: { configurable: true, value: 'iPhone' },
      userAgent: {
        configurable: true,
        value: 'Mozilla/5.0 (iPhone) Mobile Safari/604.1 EdgiOS/138.0',
      },
    });
  });

  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill('admin@selector.local');
  await page.getByLabel('Senha', { exact: true }).fill('selector123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText(/Bem-vindo/)).toBeVisible();
  await expect(
    page.getByText(/admin@selector\.local · Administrador · Aprovado/),
  ).toBeVisible();

  await page
    .getByRole('link', { name: 'Ajustes', exact: true })
    .first()
    .click();
  await expect(page.getByText('Ajustes', { exact: true })).toBeVisible();
  await expect(
    page.getByText('Instale antes de ativar', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Adicionar à Tela de Início', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Ativar notificações' }),
  ).toHaveCount(0);
});

test('detalhe do jogo mantém o cabeçalho legível no celular', async ({
  page,
}) => {
  /* A tela estreita reproduz o cenário da PWA no iPhone que revelou o título
     comprimido entre os botões de voltar e criar jogo. */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/login');
  await page.getByLabel('E-mail').fill('admin@selector.local');
  await page.getByLabel('Senha', { exact: true }).fill('selector123');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByText(/Bem-vindo/)).toBeVisible();

  await page.goto('/#/jogos');
  const gameTitle = `Teste responsivo ${Date.now()}`;
  await page.getByRole('button', { name: 'Novo jogo' }).click();
  await page.getByLabel('Título').fill(gameTitle);
  await page.getByLabel('Data e hora').fill('2031-06-15T10:00');
  await page.getByRole('button', { name: 'Agendar', exact: true }).click();
  const gameCard = page.locator('.q-card').filter({ hasText: gameTitle });
  await gameCard.getByRole('link', { name: 'Abrir lista deste jogo' }).click();
  await expect(page).toHaveURL(/#\/jogos\/[^/]+$/);

  const title = page
    .getByRole('main')
    .getByText('Jogos e presença', { exact: true });
  const backButton = page.getByRole('link', { name: 'Todos os jogos' });
  const newGameButton = page.getByRole('button', { name: 'Novo jogo' });
  await expect(title).toBeVisible();
  await expect(backButton).toBeVisible();
  await expect(newGameButton).toBeVisible();

  /* Além da presença dos elementos, as posições confirmam que as ações foram
     empilhadas abaixo do título e não voltaram a ocupar o mesmo espaço. */
  const titleBox = await title.boundingBox();
  const backButtonBox = await backButton.boundingBox();
  expect(titleBox).not.toBeNull();
  expect(backButtonBox).not.toBeNull();
  expect(titleBox!.width).toBeGreaterThan(250);
  expect(backButtonBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height);

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});
