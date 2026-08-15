# Rewam

Plataforma pessoal para registrar filmes e séries assistidos, com uma única conta sincronizada entre Web, Android e iOS.

O briefing completo de produto e arquitetura está em [`rewam-platform-plan.md`](./rewam-platform-plan.md).

## Stack

- **TypeScript** em todo o monorepo (app, pacotes e MCP).
- **Expo + React Native + React Native Web** com **Expo Router** para as três plataformas.
- **Supabase** (PostgreSQL, Auth e RLS) como backend.
- **TMDB** como fonte de catálogo.
- **pnpm workspaces + Turborepo**, **TanStack Query**, **React Hook Form + Zod**, **Vitest**.

## Estrutura

```text
apps/
  app/          Expo (Web, Android, iOS)
  mcp-server/   Servidor MCP independente
packages/
  ui/ tokens/ types/ database/ tmdb/ auth/ utils/
supabase/
  migrations/ seed.sql
```

## Começando

```bash
pnpm install
cp .env.example .env
pnpm db:start                 # sobe o Supabase local (requer Docker)
pnpm --filter @rewam/app dev
```

O `.env` fica na raiz do monorepo e vale para todos os pacotes: `apps/app/app.config.ts` o carrega antes do bundle, e o servidor MCP lê o mesmo arquivo. Só as variáveis `EXPO_PUBLIC_*` chegam ao bundle do app — as demais existem apenas no processo de build.

`pnpm db:start` imprime as URLs e chaves do stack local — use-as no `.env`. O Studio fica em `http://127.0.0.1:54323` e os e-mails de teste (confirmação, recuperação de senha) chegam no Mailpit, em `http://127.0.0.1:54324`.

Para trabalhar contra o projeto remoto, faça `npx supabase login` e `npx supabase link --project-ref <ref>` uma vez, e troque os valores do `.env` pelos do painel.

## Scripts

| Comando          | O que faz                                                    |
| ---------------- | ------------------------------------------------------------ |
| `pnpm dev`       | Sobe as tarefas de desenvolvimento via Turborepo.            |
| `pnpm lint`      | ESLint em todos os pacotes.                                  |
| `pnpm typecheck` | Checagem de tipos.                                           |
| `pnpm test`      | Vitest.                                                      |
| `pnpm format`    | Prettier.                                                    |
| `pnpm db:start`  | Sobe o Supabase local.                                       |
| `pnpm db:stop`   | Derruba o Supabase local.                                    |
| `pnpm db:status` | Mostra URLs e chaves do stack local.                         |
| `pnpm db:reset`  | Recria o banco local aplicando migrações e seed do zero.     |
| `pnpm db:diff`   | Gera o SQL da diferença entre o banco local e as migrações.  |
| `pnpm db:push`   | Aplica as migrações versionadas no projeto remoto vinculado. |
| `pnpm db:test`   | Roda as verificações de RLS e do trigger de perfil.          |

## Migrações e tipos do banco

Depois de escrever uma migração, regenere os tipos e faça commit do resultado:

```bash
pnpm db:reset                            # aplica as migrações do zero
pnpm --filter @rewam/database gen:types  # regenera packages/database/src/types.generated.ts
pnpm db:test                             # confere RLS e trigger de perfil
```

O CI repete esses passos num job próprio — subindo só os serviços que as verificações usam — e falha se os tipos versionados não corresponderem às migrações, de modo que schema e tipos não saiam de sincronia sem ninguém notar. A versão da CLI do Supabase é fixada exatamente, porque a checagem compara a saída do gerador byte a byte. `types.generated.ts` é arquivo gerado: fica fora do Prettier e do ESLint para bater byte a byte com o gerador — não edite à mão.

## E-mails transacionais

Confirmação de cadastro e redefinição de senha saem por código de 6 dígitos, não por link, e isso exige template customizado. O plano gratuito do Supabase recusa template customizado enquanto o provedor de e-mail for o padrão — por isso o projeto usa **SMTP próprio via [Resend](https://resend.com)**.

A configuração fica em `[remotes.production.auth.email.smtp]`, no fim do `config.toml`, e não na seção `[auth]` do topo: declarada lá em cima ela valeria também para o stack local, que passaria a enviar e-mail de verdade. Como está, o desenvolvimento continua entregando tudo ao Mailpit, em `http://127.0.0.1:54324`.

Para aplicar no projeto remoto, preencha `SUPABASE_AUTH_SMTP_PASSWORD` e `SUPABASE_AUTH_SMTP_ADMIN_EMAIL` no `.env` e rode:

```bash
npx supabase config push
```

### Limites e custos

|                     | Plano gratuito do Resend                  |
| ------------------- | ----------------------------------------- |
| Envio               | 3.000 e-mails/mês, 100/dia                |
| Domínios            | 1 (verificado por SPF/DKIM)               |
| Marca no e-mail     | nenhuma                                   |
| Cartão de crédito   | não exige                                 |
| Primeiro plano pago | US$ 20/mês — 50.000 e-mails e 10 domínios |

O volume real do projeto é de dezenas de e-mails por mês, muito abaixo do teto. Os limites do próprio Supabase são mais apertados de propósito: `auth.rate_limit.email_sent` (30/hora) e `auth.email.max_frequency` (60s entre reenvios, espelhando o cooldown do app).

A comparação que levou a essa escolha, com os outros provedores avaliados, está na [wiki](https://github.com/mateusvillain/rewam/wiki/Provedores-SMTP).

## Variáveis de ambiente

Todas documentadas em `.env.example`, sem valores reais. Variáveis `EXPO_PUBLIC_*` são embarcadas no bundle e só podem conter dados públicos: URL do Supabase, chave anônima e token de leitura do TMDB. `SUPABASE_SERVICE_ROLE_KEY` e demais segredos ficam apenas no servidor.

## Atribuição

Este produto usa a API do TMDB, mas não é endossado nem certificado pelo TMDB.
