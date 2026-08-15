/**
 * Destino para onde voltar depois do login.
 *
 * Na web esse valor viaja na URL, então é entrada de quem quiser manipulá-la:
 * sem validação, `?redirect=//site-falso` mandaria a pessoa para fora do app
 * logo após ela digitar a senha. Só caminho interno é aceito.
 */
const FALLBACK = '/';

export function resolveRedirectTarget(raw: string | string[] | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (!value) return FALLBACK;

  // `//host` e `https://host` levam para fora; `/rota` fica dentro do app.
  if (!value.startsWith('/') || value.startsWith('//')) return FALLBACK;

  // Barra invertida contorna checagens ingênuas em alguns navegadores.
  if (value.includes('\\')) return FALLBACK;

  // Rotas de autenticação como destino criariam um ciclo: entrou, volta para o
  // login, entra de novo.
  if (value.startsWith('/(auth)') || value.startsWith('/entrar')) return FALLBACK;

  return value;
}
