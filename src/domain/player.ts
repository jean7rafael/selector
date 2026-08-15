export type PlayerGender = 'Homem' | 'Mulher';

/* ===========================================================
   MODELO DE UM ATLETA

   id identifica o documento remoto; selected é apenas estado da
   tela e nunca é persistido no Firestore.
=========================================================== */

export interface Player {
  id: string;
  name: string;
  position: string;
  relevanciaBase: number;
  relevanciaCalc: number;
  gender: PlayerGender;
  selected: boolean;
  order: number;
  pass: number;
  attack: number;
  positioning: number;
  block: number;
  serve: number;
}

export type PlayerDraft = Omit<Player, 'id'>;

export interface PlayerImportResult {
  players: Player[];
  invalidCount: number;
}

/* Um lote do Firestore aceita até 500 operações. A margem preserva espaço
   para futuras gravações auxiliares sem tornar a importação imprevisível. */
export const maxImportedPlayers = 450;

/* Cria um formulário previsível para inclusão de novos atletas. */
export const emptyPlayer = (order = 0): Player => ({
  id: '',
  name: '',
  position: 'Indefinido',
  relevanciaBase: 10,
  relevanciaCalc: 10,
  gender: 'Homem',
  selected: false,
  order,
  pass: 0,
  attack: 0,
  positioning: 0,
  block: 0,
  serve: 0,
});

/* Converte dados antigos ou vindos do Firestore sem propagar NaN. */
const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/* ===========================================================
   CÁLCULO DE RELEVÂNCIA

   As cinco habilidades valem, juntas, até 100% de bônus sobre a
   relevância base da posição do atleta.
=========================================================== */

export function calculatePlayerRelevance(
  player: Pick<
    Player,
    'relevanciaBase' | 'pass' | 'attack' | 'positioning' | 'block' | 'serve'
  >,
) {
  const skills =
    player.pass +
    player.attack +
    player.positioning +
    player.block +
    player.serve;
  return Math.round(player.relevanciaBase * (1 + skills / 25));
}

/* Normaliza tanto documentos antigos quanto registros atuais. */
export function normalizePlayer(
  id: string,
  value: Partial<Player>,
  fallbackOrder = 0,
): Player {
  const player: Player = {
    ...emptyPlayer(fallbackOrder),
    ...value,
    id,
    name: String(value.name ?? '').trim(),
    position: String(value.position ?? 'Indefinido'),
    gender: value.gender === 'Mulher' ? 'Mulher' : 'Homem',
    selected: Boolean(value.selected),
    order: asNumber(value.order, fallbackOrder),
    relevanciaBase: asNumber(value.relevanciaBase, 10),
    pass: asNumber(value.pass),
    attack: asNumber(value.attack),
    positioning: asNumber(value.positioning),
    block: asNumber(value.block),
    serve: asNumber(value.serve),
    relevanciaCalc: 0,
  };

  player.relevanciaCalc = calculatePlayerRelevance(player);
  return player;
}

/* ==========================================================
   ARQUIVOS DE INTERCÂMBIO

   Um JSON é entrada não confiável, mesmo quando normalmente vem do próprio
   aplicativo. O parser limita o lote, ignora itens sem nome e normaliza todos
   os números antes de a página comparar duplicidades e gravar no Firebase.
========================================================== */

export function parseImportedPlayers(
  value: unknown,
  firstOrder = 1,
): PlayerImportResult {
  if (!Array.isArray(value)) throw new Error('INVALID_PLAYER_IMPORT');
  if (value.length > maxImportedPlayers)
    throw new Error('PLAYER_IMPORT_TOO_LARGE');

  const players: Player[] = [];
  let invalidCount = 0;

  value.forEach((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      invalidCount += 1;
      return;
    }
    const imported = normalizePlayer(
      '',
      entry as Partial<Player>,
      firstOrder + index,
    );
    if (!imported.name || imported.name.length > 120) {
      invalidCount += 1;
      return;
    }

    /* Habilidades no formulário variam de zero a cinco. Limitar arquivos
       externos evita relevâncias artificiais ou valores negativos. */
    imported.relevanciaBase = Math.max(0, imported.relevanciaBase);
    imported.pass = Math.min(5, Math.max(0, imported.pass));
    imported.attack = Math.min(5, Math.max(0, imported.attack));
    imported.positioning = Math.min(5, Math.max(0, imported.positioning));
    imported.block = Math.min(5, Math.max(0, imported.block));
    imported.serve = Math.min(5, Math.max(0, imported.serve));
    imported.relevanciaCalc = calculatePlayerRelevance(imported);
    imported.selected = false;
    players.push(imported);
  });

  return { players, invalidCount };
}

/* Remove campos exclusivos da interface antes de persistir. */
export function playerToDocument(player: Player) {
  const normalized = normalizePlayer(player.id, player, player.order);
  return {
    name: normalized.name,
    position: normalized.position,
    relevanciaBase: normalized.relevanciaBase,
    relevanciaCalc: normalized.relevanciaCalc,
    gender: normalized.gender,
    order: normalized.order,
    pass: normalized.pass,
    attack: normalized.attack,
    positioning: normalized.positioning,
    block: normalized.block,
    serve: normalized.serve,
  };
}
