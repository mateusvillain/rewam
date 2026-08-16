import type { Episode } from '@rewam/database';
import { describe, expect, it } from 'vitest';

import {
  describeSelection,
  isWholeSeasonSelected,
  summarizeSelection,
  toggleSelection,
  toggleWholeSeason,
} from './batch-selection';

const TITLE_ID = '0100cb59-2893-4ade-9ddc-774981d09586';

function episode(id: string, episodeNumber: number, runtimeMinutes: number | null): Episode {
  return {
    id,
    titleId: TITLE_ID,
    seasonNumber: 1,
    episodeNumber,
    name: `Episódio ${episodeNumber}`,
    runtimeMinutes,
    airDate: null,
  };
}

const season = [episode('a', 1, 45), episode('b', 2, 50), episode('c', 3, null)];

describe('summarizeSelection', () => {
  it('soma só o que está selecionado', () => {
    expect(summarizeSelection(season, new Set(['a', 'b']))).toEqual({
      count: 2,
      totalMinutes: 95,
      withoutDuration: 0,
    });
  });

  it('conta à parte o que entra sem duração', () => {
    // Sem isto, a pessoa confirma "3 episódios · 1 h 35 min" e vê o total subir
    // menos do que o anunciado, sem saber por quê.
    expect(summarizeSelection(season, new Set(['a', 'b', 'c']))).toEqual({
      count: 3,
      totalMinutes: 95,
      withoutDuration: 1,
    });
  });

  it('seleção vazia soma zero', () => {
    expect(summarizeSelection(season, new Set())).toEqual({
      count: 0,
      totalMinutes: 0,
      withoutDuration: 0,
    });
  });

  it('ignora id que não está na temporada', () => {
    expect(summarizeSelection(season, new Set(['z'])).count).toBe(0);
  });

  it('usa o mesmo critério de duração válida dos totais', () => {
    // Um zero no catálogo não pode virar minuto somado aqui e ser descartado
    // pela soma da tela de início.
    const comZero = [episode('a', 1, 0)];
    expect(summarizeSelection(comZero, new Set(['a']))).toEqual({
      count: 1,
      totalMinutes: 0,
      withoutDuration: 1,
    });
  });
});

describe('describeSelection', () => {
  it('diz quantidade e soma', () => {
    expect(describeSelection({ count: 2, totalMinutes: 95, withoutDuration: 0 })).toBe(
      '2 episódios · 1 h 35 min',
    );
  });

  it('concorda no singular', () => {
    expect(describeSelection({ count: 1, totalMinutes: 45, withoutDuration: 0 })).toBe(
      '1 episódio · 45 min',
    );
  });

  it('avisa quantos entram sem duração', () => {
    expect(describeSelection({ count: 3, totalMinutes: 95, withoutDuration: 1 })).toContain(
      '1 sem duração conhecida',
    );
  });

  it('seleção vazia diz isso, e não "0 episódios"', () => {
    expect(describeSelection({ count: 0, totalMinutes: 0, withoutDuration: 0 })).toBe(
      'Nenhum episódio selecionado',
    );
  });

  it('omite a duração quando nenhuma é conhecida', () => {
    // "2 episódios · 0 min" afirmaria que eles não duram nada.
    expect(describeSelection({ count: 2, totalMinutes: 0, withoutDuration: 2 })).toBe(
      '2 episódios · 2 sem duração conhecida',
    );
  });
});

describe('toggleSelection', () => {
  it('marca e desmarca', () => {
    const marcado = toggleSelection(new Set(), 'a');
    expect(marcado.has('a')).toBe(true);
    expect(toggleSelection(marcado, 'a').has('a')).toBe(false);
  });

  it('não mexe no resto da seleção', () => {
    expect([...toggleSelection(new Set(['a', 'b']), 'c')].sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('isWholeSeasonSelected', () => {
  it('só é verdade com todos marcados', () => {
    expect(isWholeSeasonSelected(new Set(['a', 'b']), season)).toBe(false);
    expect(isWholeSeasonSelected(new Set(['a', 'b', 'c']), season)).toBe(true);
  });

  it('temporada vazia não está "toda selecionada"', () => {
    // Senão o atalho nasceria dizendo "Desmarcar temporada" sem nada marcado.
    expect(isWholeSeasonSelected(new Set(), [])).toBe(false);
  });
});

describe('toggleWholeSeason', () => {
  it('marca a temporada inteira', () => {
    expect([...toggleWholeSeason(new Set(), season)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('com tudo marcado, o mesmo toque desmarca', () => {
    // Um botão que só marca deixaria a pessoa desfazendo episódio a episódio o
    // que fez com um toque.
    expect([...toggleWholeSeason(new Set(['a', 'b', 'c']), season)]).toEqual([]);
  });

  it('seleção parcial completa em vez de limpar', () => {
    expect([...toggleWholeSeason(new Set(['a']), season)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('temporada vazia não marca nada', () => {
    expect([...toggleWholeSeason(new Set(), [])]).toEqual([]);
  });
});
