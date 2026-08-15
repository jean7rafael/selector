import { describe, expect, it } from 'vitest';
import {
  calculatePlayerRelevance,
  maxImportedPlayers,
  normalizePlayer,
  parseImportedPlayers,
} from './player';

/* Testes unitários do cálculo e da compatibilidade com registros antigos. */
describe('atletas', () => {
  it('calcula a relevância combinando a base com as cinco habilidades', () => {
    expect(
      calculatePlayerRelevance({
        relevanciaBase: 100,
        pass: 5,
        attack: 5,
        positioning: 5,
        block: 5,
        serve: 5,
      }),
    ).toBe(200);
  });

  it('normaliza registros antigos sem aceitar números inválidos', () => {
    const player = normalizePlayer(
      'abc',
      {
        name: '  Ana  ',
        relevanciaBase: Number.NaN,
        gender: 'Mulher',
      },
      3,
    );
    expect(player).toMatchObject({
      id: 'abc',
      name: 'Ana',
      order: 3,
      gender: 'Mulher',
    });
    expect(Number.isFinite(player.relevanciaCalc)).toBe(true);
  });

  it('valida e limita os atletas vindos de um arquivo JSON', () => {
    const result = parseImportedPlayers(
      [
        {
          name: '  Laura  ',
          gender: 'Mulher',
          pass: 9,
          attack: -2,
        },
        { name: '' },
        'registro inválido',
      ],
      13,
    );

    expect(result.invalidCount).toBe(2);
    expect(result.players).toHaveLength(1);
    expect(result.players[0]).toMatchObject({
      id: '',
      name: 'Laura',
      order: 13,
      selected: false,
      gender: 'Mulher',
      pass: 5,
      attack: 0,
    });
  });

  it('recusa arquivos que ultrapassam o lote seguro', () => {
    expect(() =>
      parseImportedPlayers(
        Array.from({ length: maxImportedPlayers + 1 }, (_, index) => ({
          name: `Atleta ${index}`,
        })),
      ),
    ).toThrow('PLAYER_IMPORT_TOO_LARGE');
  });
});
