import { createWatchEventInputSchema } from '@rewam/types';
import { describe, expect, it } from 'vitest';

import { toCreateInput, watchFormDefaults, watchFormSchema } from './watch-form';

const AGORA = new Date(2026, 7, 15, 9, 30); // 15/08/2026
const TITLE_ID = '0100cb59-2893-4ade-9ddc-774981d09586';

const valid = { date: '15/08/2026', duration: '148', notes: '' };

/** Só a primeira mensagem de cada campo, que é o que a tela mostra. */
function errorsFor(values: Record<string, string>): Record<string, string> {
  const result = watchFormSchema.safeParse(values);
  if (result.success) return {};

  return Object.fromEntries(
    result.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
  );
}

describe('watchFormSchema', () => {
  it('aceita o preenchimento comum', () => {
    expect(watchFormSchema.safeParse(valid).success).toBe(true);
  });

  it('recusa data no futuro', () => {
    // A regra é do briefing: não se registra o que ainda não se assistiu.
    //
    // O ano é absurdo de propósito. O schema lê o relógio real — ele roda no
    // resolver do formulário, sem parâmetro de tempo —, então uma data
    // "amanhã" escrita à mão viraria passado assim que o calendário a
    // alcançasse, e o teste apodreceria em silêncio.
    expect(errorsFor({ ...valid, date: '01/01/9999' }).date).toBe(
      'A data não pode estar no futuro.',
    );
  });

  it('aceita hoje, que é o caso de longe mais comum', () => {
    const hoje = new Date();
    const formatada = `${String(hoje.getDate()).padStart(2, '0')}/${String(
      hoje.getMonth() + 1,
    ).padStart(2, '0')}/${hoje.getFullYear()}`;

    expect(watchFormSchema.safeParse({ ...valid, date: formatada }).success).toBe(true);
  });

  it('reclama do formato antes de reclamar do futuro', () => {
    // Sem a guarda no segundo refine, uma data malformada cairia na regra de
    // futuro e a pessoa leria a mensagem errada.
    expect(errorsFor({ ...valid, date: '15/08' }).date).toBe('Use o formato DD/MM/AAAA.');
  });

  it('recusa dia inexistente', () => {
    expect(errorsFor({ ...valid, date: '31/02/2026' }).date).toBe('Use o formato DD/MM/AAAA.');
  });

  it('exige a data', () => {
    expect(errorsFor({ ...valid, date: '' }).date).toBe('Informe a data.');
  });

  it('recusa duração não numérica, zero e vazia', () => {
    expect(errorsFor({ ...valid, duration: 'cento e vinte' }).duration).toBe('Use apenas números.');
    // Zero é recusado aqui porque a constraint do banco o recusaria depois,
    // com o nome da constraint no lugar da mensagem.
    expect(errorsFor({ ...valid, duration: '0' }).duration).toBe(
      'A duração precisa ser maior que zero.',
    );
    expect(errorsFor({ ...valid, duration: '' }).duration).toBe('Informe a duração.');
  });

  it('desconfia de duração absurda, que costuma ser dedo escorregado', () => {
    expect(errorsFor({ ...valid, duration: '20000' }).duration).toContain('confira o número');
  });

  it('aceita filme longo de verdade', () => {
    // *La Flor* tem 808 minutos. Um teto apertado recusaria um registro
    // legítimo, que é pior do que deixar passar um número digitado errado.
    expect(watchFormSchema.safeParse({ ...valid, duration: '808' }).success).toBe(true);
  });

  it('espelha o limite de caracteres da nota', () => {
    // O banco recusaria com `watch_events_notes_length_check` depois de a
    // pessoa ter escrito tudo.
    expect(errorsFor({ ...valid, notes: 'a'.repeat(501) }).notes).toBe(
      'Use no máximo 500 caracteres.',
    );
    expect(watchFormSchema.safeParse({ ...valid, notes: 'a'.repeat(500) }).success).toBe(true);
  });

  it('mede a nota já sem os espaços das pontas', () => {
    // Medir o texto cru recusaria isto, mesmo sendo exatamente o que o banco
    // aceitaria depois do trim de `toCreateInput`.
    expect(watchFormSchema.safeParse({ ...valid, notes: `${'a'.repeat(500)}  ` }).success).toBe(
      true,
    );
  });
});

describe('watchFormDefaults', () => {
  it('nasce com hoje e a duração do TMDB', () => {
    expect(watchFormDefaults(148, AGORA)).toEqual({
      date: '15/08/2026',
      duration: '148',
      notes: '',
    });
  });

  it('deixa a duração vazia quando o TMDB não informa', () => {
    // Preencher com zero afirmaria que o filme não dura nada; a E4.3 trata
    // este caso por inteiro.
    expect(watchFormDefaults(null, AGORA).duration).toBe('');
  });
});

describe('toCreateInput', () => {
  it('monta o que o banco espera, sem user_id', () => {
    const input = toCreateInput(valid, TITLE_ID);

    expect(input).toMatchObject({
      titleId: TITLE_ID,
      episodeId: null,
      durationMinutes: 148,
      notes: null,
    });
    expect(input).not.toHaveProperty('userId');
  });

  it('produz entrada que o schema do banco aceita', () => {
    // O acoplamento que importa: se `createWatchEventInputSchema` mudar, é aqui
    // que o formulário descobre, e não em produção.
    expect(createWatchEventInputSchema.safeParse(toCreateInput(valid, TITLE_ID)).success).toBe(
      true,
    );
  });

  it('nota vazia ou só com espaços vira null', () => {
    // A coluna é anulável para distinguir "não escreveu" de "escreveu nada";
    // string vazia apareceria no histórico como uma nota em branco.
    expect(toCreateInput({ ...valid, notes: '   ' }, TITLE_ID).notes).toBeNull();
  });

  it('preserva a nota escrita, sem espaços nas pontas', () => {
    expect(toCreateInput({ ...valid, notes: '  gostei  ' }, TITLE_ID).notes).toBe('gostei');
  });

  it('grava o dia informado, sem escorregar de fuso', () => {
    const saved = new Date(toCreateInput(valid, TITLE_ID).watchedAt);
    expect(saved.getDate()).toBe(15);
    expect(saved.getMonth()).toBe(7);
  });

  it('falha alto se chamada com data inválida por fora do formulário', () => {
    expect(() => toCreateInput({ ...valid, date: '99/99/9999' }, TITLE_ID)).toThrow();
  });
});
